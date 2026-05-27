"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import ConfirmModal from "@/components/Modals/ConfirmModal";

function formatRp(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(n).toLocaleString("id-ID");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Hari ini · ${formatDate(iso)}`;
  if (d.toDateString() === yesterday.toDateString()) return `Kemarin · ${formatDate(iso)}`;
  return formatDate(iso);
}

export default function PosDetailPage() {
  const params = useParams();
  const posId = params.id as string;
  const { posList, transactions, cycles, cyclePosHistory, deleteTransaction } = useApp();

  const pos = posList.find((p) => p.id === posId);

  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id ?? "");
  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense">("all");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  // Reset type filter when cycle changes
  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setSelectedType("all");
  };

  // Transactions for this pos filtered by cycle only (for accurate summary totals)
  const cycleFiltered = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.pos_id !== posId) return false;
      // Cycle filter
      if (selectedCycle) {
        const txDate = new Date(tx.created_at);
        const start = new Date(selectedCycle.start_date + "T00:00:00");
        const end = new Date(selectedCycle.end_date + "T23:59:59");
        const isLatestCycle = selectedCycle.id === cycles[0]?.id;
        if (txDate < start) return false;
        if (!isLatestCycle && txDate > end) return false;
      }
      return true;
    });
  }, [transactions, posId, selectedCycle, cycles]);

  // Transactions filtered by cycle + type (for display list)
  const filtered = useMemo(() => {
    return cycleFiltered.filter((tx) => {
      if (selectedType !== "all" && tx.type !== selectedType) return false;
      return true;
    });
  }, [cycleFiltered, selectedType]);

  // Summary — always calculated from cycleFiltered (not affected by type filter)
  // Treat transactions with missing type as "expense" for safety
  const totalIncome = useMemo(() => cycleFiltered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [cycleFiltered]);
  const totalExpense = useMemo(() => cycleFiltered.filter((t) => t.type !== "income").reduce((s, t) => s + t.amount, 0), [cycleFiltered]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach((tx) => {
      const label = getDateLabel(tx.created_at);
      if (!groups[label]) groups[label] = [];
      groups[label].push(tx);
    });
    return groups;
  }, [filtered]);

  const shortLabel = (label: string) => label.replace(/\s\d{4}$/, "").replace(" – ", "–");

  if (!pos) {
    return (
      <main id="pg-pos-detail" className="page active" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "18px", fontWeight: 800 }}>Pos tidak ditemukan</div>
          <Link href="/" className="pos-detail-back" style={{ marginTop: "16px", display: "inline-flex" }}>
            ‹ Kembali ke Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Determine actual target based on selected cycle history
  const activeCycle = cycles[0];
  const isPastCycle = selectedCycleId !== activeCycle?.id;

  const snapshot = isPastCycle 
    ? cyclePosHistory.find(h => h.cycle_id === selectedCycleId && h.pos_id === posId)
    : null;

  const displayTarget = snapshot ? snapshot.monthly_target : pos.monthly_target;
  const displayGoalTarget = snapshot ? snapshot.goal_target : pos.goal_target;

  // Reconstruct balance for past cycles (for standard pos)
  const displayBalance = isPastCycle && !pos.is_goal && pos.name !== "Tabungan"
    ? displayTarget + totalIncome - totalExpense
    : pos.current_balance;

  // Budget calculations
  const isGoal = pos.is_goal;
  const fillWidth = isGoal && displayGoalTarget > 0
    ? Math.min(100, Math.max(0, (displayBalance / displayGoalTarget) * 100))
    : displayBalance < 0
      ? 100
      : Math.min(100, Math.max(0, (displayBalance / displayTarget) * 100));

  const balanceClass = displayBalance < 0
    ? "negative"
    : displayBalance / displayTarget <= 0.25
      ? "warning"
      : "positive";

  const targetLabel = isGoal && displayGoalTarget > 0
    ? `Target: ${formatRp(displayGoalTarget)}`
    : `Budget: ${formatRp(displayTarget)}`;

  const pctLabel = isGoal && displayGoalTarget > 0
    ? `${Math.round((displayBalance / displayGoalTarget) * 100)}% tercapai`
    : displayBalance < 0
      ? "Overbudget!"
      : `${Math.round(fillWidth)}% tersisa`;

  return (
    <main id="pg-pos-detail" className="page active">
      {/* Back button */}
      <Link href="/" className="pos-detail-back">
        ‹ Kembali
      </Link>

      {/* Header */}
      <div className="pos-detail-header">
        <div className="pdh-top">
          <div className="pdh-icon">{pos.icon}</div>
          <div>
            <div className="pdh-name">{pos.name}</div>
            <div className="pdh-sub">{pos.sub}</div>
          </div>
        </div>
        <div className={`pdh-balance ${balanceClass}`}>
          {formatRp(displayBalance)}
        </div>
        <div className="pdh-bar">
          <div className="pdh-fill" style={{ width: `${fillWidth}%` }} />
        </div>
        <div className="pdh-meta">
          <span>{targetLabel}</span>
          <span>{pctLabel}</span>
        </div>
      </div>

      {/* Body */}
      <div className="pos-detail-body">
        {/* Filters */}
        <div className="gh-filters">
          {/* Cycle filter */}
          <div className="frow">
            {cycles.map((c) => (
              <div
                key={c.id}
                className={`fc cycle-fc ${c.id === selectedCycleId ? "active" : ""}`}
                onClick={() => handleCycleChange(c.id)}
              >
                {shortLabel(c.label)}
              </div>
            ))}
          </div>
          {/* Type filter */}
          <div className="frow">
            <div
              className={`fc ${selectedType === "all" ? "active" : ""}`}
              onClick={() => setSelectedType("all")}
            >
              📊 Semua
            </div>
            <div
              className={`fc ${selectedType === "expense" ? "active" : ""}`}
              onClick={() => setSelectedType("expense")}
            >
              📤 Pengeluaran
            </div>
            <div
              className={`fc ${selectedType === "income" ? "active" : ""}`}
              onClick={() => setSelectedType("income")}
            >
              📥 Pemasukan
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="gh-summary">
          <div className="gh-summary-card income">
            <div className="gh-summary-label">📥 Pemasukan</div>
            <div className="gh-summary-amount">{formatRp(totalIncome)}</div>
          </div>
          <div className="gh-summary-card expense">
            <div className="gh-summary-label">📤 Pengeluaran</div>
            <div className="gh-summary-amount">{formatRp(totalExpense)}</div>
          </div>
        </div>
        {/* Nett calculation info */}
        <div style={{ padding: "8px 14px", margin: "0 0 6px", borderRadius: "10px", background: "var(--s2)", border: "1px solid var(--border)", fontSize: "11px", color: "var(--muted)", lineHeight: 1.7 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>💼 Budget</span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{formatRp(displayTarget)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>📤 Pengeluaran</span>
            <span style={{ fontWeight: 700, color: "var(--red)" }}>-{formatRp(totalExpense)}</span>
          </div>
          {totalIncome > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>📥 Pemasukan</span>
              <span style={{ fontWeight: 700, color: "var(--teal)" }}>+{formatRp(totalIncome)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "4px", marginTop: "4px" }}>
            <span style={{ fontWeight: 700 }}>📊 Sisa Saldo</span>
            <span style={{ fontWeight: 900, fontFamily: "var(--font-fraunces), serif", color: (displayTarget + totalIncome - totalExpense) < 0 ? "var(--red)" : "var(--teal)" }}>
              {formatRp(displayTarget + totalIncome - totalExpense)}
            </span>
          </div>
        </div>

        {/* Transaction List */}
        {Object.keys(grouped).length === 0 ? (
          <div className="gh-empty">
            <div className="gh-empty-icon">📭</div>
            <div className="gh-empty-title">Belum ada transaksi</div>
            <div className="gh-empty-sub">
              Belum ada transaksi untuk {pos.name} di siklus ini.
            </div>
          </div>
        ) : (
          Object.entries(grouped).map(([label, txs]) => (
            <div className="hday" key={label}>
              <div className="hday-label">{label}</div>
              {txs.map((tx) => {
                const isIncome = tx.type === "income";
                return (
                  <div className="hi" key={tx.id} style={{ position: "relative" }}>
                    <div
                      className="hi-ic"
                      style={isIncome ? { background: "rgba(0,201,167,.12)" } : {}}
                    >
                      {tx.pos_icon}
                    </div>
                    <div className="hi-info">
                      <div className="hi-desc">{tx.description}</div>
                      <div className="hi-meta">
                        {tx.user_role === "suami" ? "👨‍💼" : "👩"} {tx.user_name}
                        {isIncome && (
                          <span style={{ color: "var(--teal)", marginLeft: "6px", fontWeight: 700 }}>
                            MASUK
                          </span>
                        )}
                      </div>
                      <div className="hi-time">{formatTime(tx.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                      <div className={isIncome ? "hi-amt-in" : "hi-amt"}>
                        {isIncome ? "+" : "-"}Rp {tx.amount.toLocaleString("id-ID")}
                      </div>
                      <button
                        className="hi-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(tx);
                        }}
                        title="Hapus transaksi"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* FAB — Add Transaction */}
      <Link href={`/input?pos=${posId}`} className="pos-detail-fab">
        ＋
      </Link>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Transaksi?"
        message={
          deleteTarget
            ? `Hapus "${deleteTarget.description}" sebesar ${formatRp(deleteTarget.amount)}? Saldo pos akan dikembalikan.`
            : ""
        }
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteTarget) {
            deleteTransaction(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        isDanger={true}
      />
    </main>
  );
}
