"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import type { Pos } from "@/lib/types";
import CyclePickerModal from "@/components/Modals/CyclePickerModal";
import GajianModal from "@/components/Modals/GajianModal";
import EditPosModal from "@/components/Modals/EditPosModal";
import GeneralHistory from "@/components/GeneralHistory";
import AppHeader from "@/components/Dashboard/AppHeader";
import BudgetSummaryCard from "@/components/Dashboard/BudgetSummaryCard";
import QuickMenuGrid from "@/components/Dashboard/QuickMenuGrid";
import ContentTabs from "@/components/Dashboard/ContentTabs";
import PosCard from "@/components/Dashboard/PosCard";

function formatRp(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(n).toLocaleString("id-ID");
}

export default function Home() {
  const {
    cycles,
    cycleIndex,
    setCycleIndex,
    gajianDate,
    setGajianDate,
    posList,
    updatePos,
    debts,
    dbConnected,
    isLoading,
    cyclePosHistory,
    transactions,
    logoSettings,
  } = useApp();

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGajianModal, setShowGajianModal] = useState(false);
  const [editingPos, setEditingPos] = useState<Pos | null>(null);
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const selectedCycle = cycles[cycleIndex];

  const displayPosList = useMemo(() => {
    if (!selectedCycle || cycleIndex === 0) return posList;

    const historyForCycle = cyclePosHistory.filter((h) => h.cycle_id === selectedCycle.id);
    const cycleStart = new Date(selectedCycle.start_date + "T00:00:00");
    const cycleEnd = new Date(selectedCycle.end_date + "T23:59:59");

    return posList.map((p) => {
      const hist = historyForCycle.find((h) => h.pos_id === p.id);
      const target = hist ? hist.monthly_target : p.monthly_target;
      const goalTarget = hist ? hist.goal_target : p.goal_target;

      const txs = transactions.filter((t) => {
        const d = new Date(t.created_at);
        return t.pos_id === p.id && d >= cycleStart && d <= cycleEnd;
      });
      const incomes = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = txs.filter((t) => t.type !== "income").reduce((s, t) => s + t.amount, 0);

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

  const totalBudget = displayPosList
    .filter((p) => !p.is_goal)
    .reduce((sum, p) => sum + p.monthly_target, 0);

  const sisaBudget = displayPosList
    .filter((p) => !p.is_goal)
    .reduce((sum, p) => sum + p.current_balance, 0);

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
    const daysUntilDue =
      d.due_date >= todayDate
        ? d.due_date - todayDate
        : 30 - todayDate + d.due_date; // wrap to next month
    return daysUntilDue <= 7;
  });

  if (isLoading) {
    return (
      <main className="dash-main" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "20px",
                background: "#ffffff",
                boxShadow: "0 8px 24px rgba(40, 127, 240, 0.12)",
                border: "1px solid var(--border)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg viewBox="0 0 48 48" fill="none" style={{ width: "36px", height: "36px" }}>
                <path d="M10 13.5 31 6l2 5-20 7" stroke="#287ff0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 16h28a4 4 0 0 1 4 4v18H9a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z" fill="#287ff0" />
                <path d="M29 23h12v10H29a5 5 0 0 1 0-10Z" fill="#75b8ff" />
                <circle cx="31" cy="28" r="1.8" fill="#fff" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: "16px", fontWeight: 750, color: "var(--navy)" }}>Memuat Dompet Azla...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="dash-main" id="pg-dash">
      {/* Sky SVG backdrop */}
      <div className="sky" aria-hidden="true">
        <svg viewBox="0 0 1000 300" preserveAspectRatio="xMidYMin slice">
          <defs>
            <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#bfe5ff" stopOpacity=".9" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 170C80 150 85 108 165 124 220 70 290 98 323 140 390 102 438 117 478 155 548 99 625 119 665 155 725 86 808 100 840 144 900 91 960 113 1000 151V300H0Z"
            fill="url(#skyG)"
          />
          <g fill="#fff" opacity=".58">
            <ellipse cx="755" cy="142" rx="82" ry="35" />
            <ellipse cx="809" cy="125" rx="61" ry="48" />
            <ellipse cx="867" cy="153" rx="83" ry="33" />
            <ellipse cx="922" cy="111" rx="55" ry="44" />
          </g>
          <path d="M610 222Q725 174 810 215T1000 205V300H610Z" fill="#dcefff" opacity=".65" />
          <path
            d="m790 218 18-65 13 34 12-54 18 85m19 3 19-50 12 25 11-40 20 64"
            fill="#c6e5ff"
            opacity=".8"
          />
        </svg>
      </div>

      {/* 1. Header Aplikasi */}
      <AppHeader
        cycleLabel={selectedCycle?.label || ""}
        onOpenCyclePicker={() => setShowCycleModal(true)}
        dbConnected={dbConnected}
        logoSettings={logoSettings}
        onNotificationClick={() => showToast("Tidak ada notifikasi baru")}
      />

      {/* 2. Kartu Ringkasan Sisa Budget */}
      <BudgetSummaryCard
        sisaBudget={sisaBudget}
        totalBudget={totalBudget}
        dayInCycleStr={dayInCycleStr}
        onOpenGajianModal={() => setShowGajianModal(true)}
      />

      {/* 2.1 Peringatan Jatuh Tempo Hutang Terdekat */}
      {upcomingDebts.length > 0 && (
        <section className="debt-warning" aria-label="Peringatan jatuh tempo hutang">
          <div className="dw-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }} aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Jatuh Tempo Terdekat</span>
          </div>
          {upcomingDebts.map((d) => {
            const daysLeft =
              d.due_date >= todayDate
                ? d.due_date - todayDate
                : 30 - todayDate + d.due_date;
            return (
              <div className="dw-item" key={d.id}>
                <span>
                  {d.icon} {d.name}
                </span>
                <span className="dw-due">
                  {daysLeft === 0 ? "HARI INI!" : `${daysLeft} hari lagi`}
                  {" · "}
                  {formatRp(d.monthly_payment)}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {/* 3. Menu Cepat */}
      <QuickMenuGrid />

      {/* 4. Tab Pos Keuangan & History */}
      <ContentTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 5. Konten Sesuai Tab Aktif */}
      {activeTab === "pos" ? (
        <section className="pos-grid" id="pos-content" aria-label="Daftar pos keuangan">
          {displayPosList.map((pos) => (
            <PosCard
              key={pos.id}
              pos={pos}
              onOpenMenu={(p) => setEditingPos(p)}
            />
          ))}
        </section>
      ) : (
        <section id="history-content" className="history-wrap" aria-label="Riwayat transaksi">
          <GeneralHistory />
        </section>
      )}

      {/* Toast popup */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            zIndex: 400,
            left: "50%",
            bottom: "95px",
            transform: "translateX(-50%)",
            padding: "10px 18px",
            background: "var(--navy)",
            color: "#ffffff",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 10px 24px rgba(16, 45, 85, 0.2)",
            whiteSpace: "nowrap",
            animation: "fadeIn .2s ease",
          }}
        >
          {toastMessage}
        </div>
      )}

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

      {editingPos && (
        <EditPosModal
          isOpen={Boolean(editingPos)}
          onClose={() => setEditingPos(null)}
          posName={editingPos.name}
          posEmoji={editingPos.icon}
          posSub={editingPos.sub}
          posAmount={editingPos.monthly_target}
          posIsGoal={editingPos.is_goal}
          posGoalTarget={editingPos.goal_target}
          onSave={(name, emoji, sub, amount, isGoal, goalTarget) => {
            updatePos(editingPos.id, name, emoji, sub, amount, isGoal, goalTarget);
            setEditingPos(null);
          }}
        />
      )}
    </main>
  );
}
