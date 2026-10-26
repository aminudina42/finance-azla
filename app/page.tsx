"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import type { Pos } from "@/lib/types";
import CyclePickerModal from "@/components/Modals/CyclePickerModal";
import GajianModal from "@/components/Modals/GajianModal";
import EditPosModal from "@/components/Modals/EditPosModal";
import AllFeaturesModal from "@/components/Modals/AllFeaturesModal";
import GeneralHistory from "@/components/GeneralHistory";
import AppHeader from "@/components/Dashboard/AppHeader";
import BudgetSummaryCard from "@/components/Dashboard/BudgetSummaryCard";
import BirthdayCard from "@/components/Dashboard/BirthdayCard";
import QuickMenuGrid from "@/components/Dashboard/QuickMenuGrid";
import ContentTabs from "@/components/Dashboard/ContentTabs";
import PosCard from "@/components/Dashboard/PosCard";
import FirstCycleSetupModal from "@/components/Modals/FirstCycleSetupModal";
import NewCycleModal from "@/components/Modals/NewCycleModal";
import Skeleton from "@/components/Skeleton";
import { isDebtPaidThisMonth } from "@/lib/debt-utils";

function formatRp(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(n).toLocaleString("id-ID");
}

export default function Home() {
  const router = useRouter();
  const {
    cycles,
    cycleIndex,
    setCycleIndex,
    gajianDate,
    setGajianDate,
    posList,
    updatePos,
    startNewCycle,
    debts,
    debtPayments,
    dbConnected,
    isLoading,
    cyclePosHistory,
    transactions,
    logoSettings,
    needsFirstCycleSetup,
    isWaitingForPayday,
    currentKeluarga,
    currentMember,
  } = useApp();

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showGajianModal, setShowGajianModal] = useState(false);
  const [showAllFeaturesModal, setShowAllFeaturesModal] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
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

    // Kumpulkan semua ID pos yang relevan di siklus ini (pos aktif maupun pos yang sudah dihapus)
    const allPosIds = new Set<string>();
    posList.forEach((p) => allPosIds.add(p.id));
    historyForCycle.forEach((h) => allPosIds.add(h.pos_id));

    const result: Pos[] = [];
    allPosIds.forEach((posId) => {
      const activePos = posList.find((p) => p.id === posId);
      const hist = historyForCycle.find((h) => h.pos_id === posId);

      const txs = transactions.filter((t) => {
        const d = new Date(t.created_at);
        return t.pos_id === posId && d >= cycleStart && d <= cycleEnd;
      });

      // Jika pos tidak aktif, tidak ada di snapshot, dan tidak ada transaksi di siklus ini, lewati
      if (!activePos && !hist && txs.length === 0) return;

      const target = hist ? hist.monthly_target : (activePos?.monthly_target ?? 0);
      const goalTarget = hist ? hist.goal_target : (activePos?.goal_target ?? 0);
      const isGoal = activePos ? activePos.is_goal : goalTarget > 0;

      const incomes = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = txs.filter((t) => t.type !== "income").reduce((s, t) => s + t.amount, 0);

      // Untuk siklus lalu, hitung saldo dari target bulanan + pemasukan - pengeluaran
      const computedBalance = target + incomes - expenses;

      const posName = activePos?.name || txs[0]?.pos_name || "Pos (Dihapus)";
      const posIcon = activePos?.icon || txs[0]?.pos_icon || "📦";

      result.push({
        id: posId,
        name: posName,
        icon: posIcon,
        sub: activePos?.sub || (activePos ? "" : "Pos siklus lampau"),
        monthly_target: target,
        goal_target: goalTarget,
        current_balance: computedBalance,
        is_goal: isGoal,
        order_index: activePos?.order_index ?? 999,
      });
    });

    return result.sort((a, b) => a.order_index - b.order_index);
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
  if (isWaitingForPayday) {
    dayInCycleStr = `Gajian tgl ${gajianDate}`;
  } else if (cycleIndex === 0) {
    const dayInCycle = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    dayInCycleStr = `Hari ke-${dayInCycle}`;
  } else {
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    dayInCycleStr = `Selesai (${totalDays} hari)`;
  }

  // Upcoming debt due dates (within 7 days) yang BELUM dibayar periode ini
  const todayDate = today.getDate();
  const upcomingDebts = debts.filter((d) => {
    if (d.remaining_amount <= 0) return false;

    // Jika sudah dibayar untuk bulan/periode ini, hilangkan dari peringatan jatuh tempo
    const paidCheck = isDebtPaidThisMonth(d, debtPayments, transactions, selectedCycle);
    if (paidCheck.isPaid) return false;

    const daysUntilDue =
      d.due_date >= todayDate
        ? d.due_date - todayDate
        : 30 - todayDate + d.due_date; // wrap to next month
    return daysUntilDue <= 7;
  });

  if (isLoading) {
    return (
      <main className="dash-main" id="pg-dash">
        {/* Header Skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Skeleton width="40px" height="40px" borderRadius="12px" />
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <Skeleton width="110px" height="15px" borderRadius="4px" />
              <Skeleton width="75px" height="11px" borderRadius="4px" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Skeleton width="120px" height="30px" borderRadius="20px" />
            <Skeleton width="34px" height="34px" borderRadius="10px" />
          </div>
        </div>

        {/* Hero Budget Card Skeleton */}
        <div style={{ padding: "0 20px 16px" }}>
          <div
            style={{
              background: "linear-gradient(115deg, #ffffff 0%, #f7fbff 72%, #eaf6ff 100%)",
              border: "1.5px solid #c7e5fb",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 10px 24px rgba(38, 111, 183, 0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <Skeleton width="120px" height="11px" borderRadius="4px" />
                <Skeleton width="180px" height="30px" borderRadius="6px" />
                <Skeleton width="140px" height="12px" borderRadius="4px" />
              </div>
              <Skeleton width="70px" height="70px" borderRadius="50%" />
            </div>
            <div style={{ paddingTop: "14px", borderTop: "1px solid #d8eaf8", display: "flex", justifyContent: "space-between" }}>
              <Skeleton width="130px" height="13px" borderRadius="4px" />
              <Skeleton width="90px" height="13px" borderRadius="4px" />
            </div>
          </div>
        </div>

        {/* Quick Menu Skeleton */}
        <div style={{ padding: "0 20px 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <Skeleton width="54px" height="54px" borderRadius="16px" />
              <Skeleton width="42px" height="10px" borderRadius="3px" />
            </div>
          ))}
        </div>

        {/* Content Tabs Skeleton */}
        <div style={{ padding: "0 20px 14px", display: "flex", gap: "8px" }}>
          <Skeleton width="90px" height="32px" borderRadius="20px" />
          <Skeleton width="90px" height="32px" borderRadius="20px" />
        </div>

        {/* Pos Cards Skeleton */}
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "#ffffff",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Skeleton width="40px" height="40px" borderRadius="12px" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    <Skeleton width="120px" height="14px" borderRadius="4px" />
                    <Skeleton width="80px" height="10px" borderRadius="4px" />
                  </div>
                </div>
                <Skeleton width="75px" height="16px" borderRadius="4px" />
              </div>
              <Skeleton width="100%" height="6px" borderRadius="99px" />
            </div>
          ))}
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
        cycleLabel={isWaitingForPayday ? `Menunggu Gajian (tgl ${gajianDate})` : selectedCycle?.label || ""}
        onOpenCyclePicker={() => setShowCycleModal(true)}
        dbConnected={dbConnected}
        logoSettings={logoSettings}
        onNotificationClick={() => router.push("/notifikasi")}
      />

      {/* 1.5 Kartu Perayaan Ulang Tahun Anggota Keluarga */}
      <BirthdayCard
        keluargaId={currentKeluarga?.id}
        currentMember={currentMember}
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

      {/* 2.2 Banner: Menunggu Gajian (First-time user waiting for payday) */}
      {isWaitingForPayday && (
        <section
          aria-label="Menunggu gajian"
          style={{
            margin: "0 20px 16px",
            padding: "16px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #fff8e1 0%, #fff3c4 100%)",
            border: "1px solid #ffe082",
            boxShadow: "0 4px 14px rgba(255, 193, 7, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: "22px",
                flexShrink: 0,
                border: "1px solid #ffe082",
              }}
            >
              ⏳
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 750, color: "#b45309", marginBottom: "4px" }}>
                Menunggu Gajian Tanggal {gajianDate}
              </div>
              <p style={{ fontSize: "12px", color: "#92400e", margin: "0 0 10px 0", lineHeight: 1.5 }}>
                Aplikasi siap digunakan saat gaji masuk tanggal {gajianDate}. Jika gaji Anda sudah masuk sekarang, tekan tombol di bawah untuk mengatur pos dan memulai siklus baru:
              </p>
              <button
                type="button"
                onClick={() => setShowNewCycleModal(true)}
                style={{
                  background: "#d97706",
                  color: "#ffffff",
                  border: "none",
                  padding: "9px 14px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: 750,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(217, 119, 6, 0.2)",
                }}
              >
                <span>🎉 Gaji Sudah Masuk! Atur Pos Sekarang →</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. Menu Cepat */}
      <QuickMenuGrid onOpenAllFeatures={() => setShowAllFeaturesModal(true)} />

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

      <AllFeaturesModal
        isOpen={showAllFeaturesModal}
        onClose={() => setShowAllFeaturesModal(false)}
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

      {/* First Cycle Setup Modal (shown for first-time users) */}
      <FirstCycleSetupModal
        isOpen={needsFirstCycleSetup}
        onClose={() => {}}
      />

      {/* New Cycle Modal (Gajian Tiba - Atur Pos) */}
      <NewCycleModal
        isOpen={showNewCycleModal}
        onClose={() => setShowNewCycleModal(false)}
        onConfirm={async (posConfigs, deletedPosIds) => {
          await startNewCycle(posConfigs, deletedPosIds);
          setShowNewCycleModal(false);
          showToast("🎉 Siklus baru berhasil dimulai!");
        }}
      />
    </main>
  );
}
