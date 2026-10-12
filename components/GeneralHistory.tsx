"use client";

import { useState, useMemo } from "react";
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

export default function GeneralHistory() {
  const { transactions, posList, cycles, deleteTransaction } = useApp();

  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id ?? "");
  const [selectedPos, setSelectedPos] = useState("Semua");
  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense">("all");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const posFilters = useMemo(() => {
    return ["Semua", ...posList.map((p) => `${p.icon} ${p.name}`)];
  }, [posList]);

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  // Reset filters when cycle changes
  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setSelectedPos("Semua");
    setSelectedType("all");
  };

  // Transactions filtered by cycle only (for summary totals)
  const cycleFiltered = useMemo(() => {
    return transactions.filter((tx) => {
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
  }, [transactions, selectedCycle, cycles]);

  // Transactions filtered by cycle + pos + type (for display)
  const filtered = useMemo(() => {
    return cycleFiltered.filter((tx) => {
      // Filter by pos
      if (selectedPos !== "Semua") {
        const posName = selectedPos.replace(/^[^\s]+\s/, "");
        if (!tx.pos_name.includes(posName)) return false;
      }
      // Filter by type
      if (selectedType !== "all" && tx.type !== selectedType) return false;
      return true;
    });
  }, [cycleFiltered, selectedPos, selectedType]);

  // Summary totals — always calculated from cycleFiltered (not affected by type/pos filter)
  // Use `!== "income"` for expenses to catch transactions with missing/undefined type
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

  const handleDelete = (tx: Transaction) => {
    setDeleteTarget(tx);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
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
        {/* Pos filter */}
        <div className="frow">
          {posFilters.map((p) => (
            <div
              key={p}
              className={`fc ${p === selectedPos ? "active" : ""}`}
              onClick={() => setSelectedPos(p)}
            >
              {p}
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

      {/* Transaction List */}
      {Object.keys(grouped).length === 0 ? (
        <div className="gh-empty">
          <div className="gh-empty-icon">📭</div>
          <div className="gh-empty-title">Belum ada transaksi</div>
          <div className="gh-empty-sub">
            Belum ada transaksi di siklus ini.
            <br />
            Mulai catat pengeluaran atau pemasukan!
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
                      {tx.pos_icon} {tx.pos_name} · {tx.user_role === "suami" ? "👨‍💼" : "👩"} {tx.user_name}
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
                        handleDelete(tx);
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
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDanger={true}
      />
    </div>
  );
}
