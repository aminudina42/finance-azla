"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import CyclePickerModal from "@/components/Modals/CyclePickerModal";
import GajianModal from "@/components/Modals/GajianModal";
import GeneralHistory from "@/components/GeneralHistory";

function formatRp(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(n).toLocaleString("id-ID");
}

function getEnvColor(balance: number, target: number, isGoal: boolean): string {
  if (isGoal) return "goal";
  if (balance < 0) return "r";
  const pct = balance / target;
  if (pct <= 0.25) return "y";
  return "g";
}

function getPctLabel(balance: number, target: number, name: string, isGoal: boolean, goalTarget: number): string {
  if (isGoal && goalTarget > 0) {
    const pct = Math.round((balance / goalTarget) * 100);
    return `🎯 ${pct}% dari target ${formatRp(goalTarget)}`;
  }
  if (name === "Tabungan") {
    const diff = balance - target;
    return diff >= 0 ? `Akumulasi +${formatRp(diff)}` : `${formatRp(balance)} tersisa`;
  }
  if (balance < 0) return "⚠️ Overbudget!";
  const pct = Math.round((balance / target) * 100);
  return `${pct}% tersisa`;
}

export default function Home() {
  const {
    cycles,
    cycleIndex,
    setCycleIndex,
    shiftCycle,
    gajianDate,
    setGajianDate,
    posList,
    debts,
    dbConnected,
    isLoading,
    cyclePosHistory,
    transactions,
    logoSettings,
  } = useApp();

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGajianModal, setShowGajianModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  const selectedCycle = cycles[cycleIndex];

  const displayPosList = useMemo(() => {
    if (!selectedCycle || cycleIndex === 0) return posList;

    const historyForCycle = cyclePosHistory.filter(h => h.cycle_id === selectedCycle.id);
    const cycleStart = new Date(selectedCycle.start_date + "T00:00:00");
    const cycleEnd = new Date(selectedCycle.end_date + "T23:59:59");

    return posList.map(p => {
      const hist = historyForCycle.find(h => h.pos_id === p.id);
      const target = hist ? hist.monthly_target : p.monthly_target;
      const goalTarget = hist ? hist.goal_target : p.goal_target;
      
      const txs = transactions.filter(t => {
        const d = new Date(t.created_at);
        return t.pos_id === p.id && d >= cycleStart && d <= cycleEnd;
      });
      
      const incomes = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      
      // Untuk siklus lalu, kita hitung saldo dengan menganggap saldo awal = target bulanan
      // Ini memberikan gambaran yang akurat tentang sisa budget/penggunaan di bulan tsb
      const computedBalance = target + incomes - expenses;

      return {
        ...p,
        monthly_target: target,
        goal_target: goalTarget,
        current_balance: computedBalance,
      };
    });
  }, [cycleIndex, selectedCycle, posList, cyclePosHistory, transactions]);

  const totalBudget = displayPosList.filter((p) => !p.is_goal).reduce((sum, p) => sum + p.monthly_target, 0);
  const sisaBudget = displayPosList.filter((p) => !p.is_goal).reduce((sum, p) => sum + p.current_balance, 0);

  // Calculate day in cycle
  const startDate = new Date(selectedCycle?.start_date || new Date());
  const endDate = new Date(selectedCycle?.end_date || new Date());
  const today = new Date();
  
  let dayInCycleStr = "";
  if (cycleIndex === 0) {
    const dayInCycle = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    dayInCycleStr = `Hari ke-${dayInCycle}`;
  } else {
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    dayInCycleStr = `Selesai (${totalDays} hari)`;
  }

  // Upcoming debt due dates (within 7 days)
  const todayDate = today.getDate();
  const upcomingDebts = debts.filter((d) => {
    if (d.remaining_amount <= 0) return false;
    const daysUntilDue = d.due_date >= todayDate
      ? d.due_date - todayDate
      : 30 - todayDate + d.due_date; // wrap to next month
    return daysUntilDue <= 7;
  });

  if (isLoading) {
    const isImage = logoSettings?.type === "image" && logoSettings?.image;
    return (
      <main id="pg-dash" className="page active" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            {isImage ? (
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: logoSettings?.bg || "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  flexShrink: 0
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSettings.image}
                  alt="Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: "4px"
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: logoSettings?.bg || "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  color: "#fff",
                  border: "1px solid var(--border)"
                }}
              >
                {logoSettings?.emoji || "💳"}
              </div>
            )}
          </div>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "18px", fontWeight: 800 }}>Memuat data...</div>
        </div>
      </main>
    );
  }

  const isImage = logoSettings?.type === "image" && logoSettings?.image;

  return (
    <main id="pg-dash" className="page active">
      <div className="dash-top">
        <div className="dash-top-left">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isImage ? (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "9px",
                  background: logoSettings?.bg || "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  flexShrink: 0
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSettings.image}
                  alt="Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: "2px"
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "9px",
                  background: logoSettings?.bg || "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  color: "#fff",
                  border: "1px solid var(--border)",
                  flexShrink: 0
                }}
              >
                {logoSettings?.emoji || "💳"}
              </div>
            )}
            <h1>Dompet Azla</h1>
          </div>
          <p style={{ marginTop: "6px" }}>Selamat datang kembali!</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "6px", padding: "3px 8px", borderRadius: "6px", background: dbConnected ? "rgba(0,201,167,.12)" : "rgba(255,179,64,.12)", border: `1px solid ${dbConnected ? "rgba(0,201,167,.25)" : "rgba(255,179,64,.25)"}`, fontSize: "9px", fontWeight: 700, color: dbConnected ? "var(--teal)" : "var(--amber)", letterSpacing: ".5px", textTransform: "uppercase" }}>
            {dbConnected ? "🟢 Supabase" : "🟡 Offline"}
          </div>
        </div>
      </div>

      {/* Cycle nav */}
      <div className="cycle-nav">
        <div className="cyc-arr" onClick={() => shiftCycle(1)}>‹</div>
        <div className="cyc-btn" onClick={() => setShowCycleModal(true)}>
          {cycles[cycleIndex].label}
        </div>
        <div className="cyc-arr" onClick={() => shiftCycle(-1)}>›</div>
      </div>

      {/* Budget hero */}
      <div>
        <div className="budget-hero">
          <div className="bh-label">Sisa Budget Siklus Ini</div>
          <div className="bh-amount">{formatRp(sisaBudget)}</div>
          <div className="bh-meta">
            <span>💼 Total {formatRp(totalBudget)}</span>
            <span>📅 {dayInCycleStr}</span>
          </div>
        </div>
      </div>

      {/* Debt due date warning */}
      {upcomingDebts.length > 0 && (
        <div className="debt-warning">
          <div className="dw-title">⏰ Jatuh Tempo Terdekat</div>
          {upcomingDebts.map((d) => {
            const daysLeft = d.due_date >= todayDate
              ? d.due_date - todayDate
              : 30 - todayDate + d.due_date;
            return (
              <div className="dw-item" key={d.id}>
                <span>{d.icon} {d.name}</span>
                <span className="dw-due">
                  {daysLeft === 0 ? "HARI INI!" : `${daysLeft} hari lagi`}
                  {" · "}{formatRp(d.monthly_payment)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Gajian setting */}
      <div className="gajian-row">
        <span>
          Gajian tiap tgl <strong>{gajianDate}</strong>
        </span>
        <div className="gajian-chip" onClick={() => setShowGajianModal(true)}>
          ⚙️ Atur Tgl Gajian
        </div>
      </div>

      {/* Tab Toggle: Pos / History */}
      <div className="env-wrap">
        <div className="dash-tabs">
          <div
            className={`dash-tab ${activeTab === "pos" ? "active" : ""}`}
            onClick={() => setActiveTab("pos")}
          >
            💰 Pos
          </div>
          <div
            className={`dash-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            📋 History
          </div>
        </div>

        {activeTab === "pos" ? (
          <>
            <div className="sec-label">Pos Keuangan</div>
            <div className="env-grid">
              {displayPosList.map((pos) => {
                const isGoal = pos.is_goal;
                const color = getEnvColor(pos.current_balance, pos.monthly_target, isGoal);
                const goalProgress = isGoal && pos.goal_target > 0
                  ? Math.min(100, Math.max(0, (pos.current_balance / pos.goal_target) * 100))
                  : null;
                const fillWidth = goalProgress !== null
                  ? goalProgress
                  : pos.current_balance < 0
                    ? 100
                    : Math.min(100, Math.max(0, (pos.current_balance / pos.monthly_target) * 100));
                const isTabungan = pos.name === "Tabungan";
                const pctLabel = getPctLabel(pos.current_balance, pos.monthly_target, pos.name, isGoal, pos.goal_target);

                if (isTabungan || isGoal) {
                  return (
                    <Link key={pos.id} href={`/pos/${pos.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div className={`ec wide ${color}`}>
                        <span className="ec-icon">{pos.icon}</span>
                        <div className="ec-left">
                          <div className="ec-name">
                            {pos.name}
                            {isGoal && <span className="goal-badge">🎯 GOAL</span>}
                          </div>
                          <div className="ec-amt">{formatRp(pos.current_balance)}</div>
                          <div className="ec-bar">
                            <div className="ec-fill" style={{ width: `${fillWidth}%` }}></div>
                          </div>
                          <div className="ec-pct">{pctLabel}</div>
                        </div>
                      </div>
                    </Link>
                  );
                }

                return (
                  <Link key={pos.id} href={`/pos/${pos.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className={`ec ${color}`}>
                      <span className="ec-icon">{pos.icon}</span>
                      <div className="ec-name">{pos.name}</div>
                      <div className="ec-amt">{formatRp(pos.current_balance)}</div>
                      <div className="ec-bar">
                        <div className="ec-fill" style={{ width: `${fillWidth}%` }}></div>
                      </div>
                      <div className="ec-pct">{pctLabel}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <GeneralHistory />
        )}
      </div>

      {/* Modals */}
      <CyclePickerModal
        isOpen={showCycleModal}
        onClose={() => setShowCycleModal(false)}
        cycles={cycles.map((c) => c.label)}
        activeCycleIndex={0}
        selectedCycleIndex={cycleIndex}
        onPickCycle={(i) => setCycleIndex(i)}
      />
      <GajianModal
        isOpen={showGajianModal}
        onClose={() => setShowGajianModal(false)}
        currentDate={gajianDate}
        onSave={(d) => setGajianDate(d)}
      />
    </main>
  );
}
