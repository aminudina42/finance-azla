"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import CyclePickerModal from "@/components/Modals/CyclePickerModal";
import GajianModal from "@/components/Modals/GajianModal";

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
  } = useApp();

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGajianModal, setShowGajianModal] = useState(false);

  const totalBudget = posList.filter((p) => !p.is_goal).reduce((sum, p) => sum + p.monthly_target, 0);
  const sisaBudget = posList.filter((p) => !p.is_goal).reduce((sum, p) => sum + p.current_balance, 0);

  // Calculate day in cycle
  const activeCycle = cycles[0];
  const startDate = new Date(activeCycle.start_date);
  const today = new Date();
  const dayInCycle = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

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
    return (
      <main id="pg-dash" className="page active" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>💳</div>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "18px", fontWeight: 800 }}>Memuat data...</div>
        </div>
      </main>
    );
  }

  return (
    <main id="pg-dash" className="page active">
      <div className="dash-top">
        <div className="dash-top-left">
          <h1>Dompet Azla 💳</h1>
          <p>Selamat datang kembali!</p>
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
            <span>📅 Hari ke-{dayInCycle}</span>
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

      {/* Envelopes */}
      <div className="env-wrap">
        <div className="sec-label">Pos Keuangan</div>
        <div className="env-grid">
          {posList.map((pos) => {
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
                <div key={pos.id} className={`ec wide ${color}`}>
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
              );
            }

            return (
              <div key={pos.id} className={`ec ${color}`}>
                <span className="ec-icon">{pos.icon}</span>
                <div className="ec-name">{pos.name}</div>
                <div className="ec-amt">{formatRp(pos.current_balance)}</div>
                <div className="ec-bar">
                  <div className="ec-fill" style={{ width: `${fillWidth}%` }}></div>
                </div>
                <div className="ec-pct">{pctLabel}</div>
              </div>
            );
          })}
        </div>
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
