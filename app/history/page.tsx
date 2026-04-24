"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
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

export default function HistoryPage() {
  const { transactions, posList, cycles } = useApp();

  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id ?? "");
  const [selectedPos, setSelectedPos] = useState("Semua");

  const posFilters = ["Semua", ...Array.from(new Set(posList.filter((p) => p.name !== "Tabungan").map((p) => `${p.icon} ${p.name}`)))];
  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  // Filter by cycle date range
  const filtered = transactions.filter((tx) => {
    if (selectedCycle) {
      const txDate = new Date(tx.created_at);
      const start = new Date(selectedCycle.start_date);
      const end = new Date(selectedCycle.end_date + "T23:59:59Z");
      if (txDate < start || txDate > end) return false;
    }
    if (selectedPos === "Semua") return true;
    const posName = selectedPos.replace(/^[^\s]+\s/, "");
    return tx.pos_name.includes(posName);
  });

  // Group by date
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach((tx) => {
    const label = getDateLabel(tx.created_at);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(tx);
  });

  // Short cycle label for chips (remove year)
  const shortLabel = (label: string) => label.replace(/\s\d{4}$/, "").replace(" – ", "–");

  return (
    <main id="pg-history" className="page active">
      <div className="ph ph-border">
        <h2>📋 Riwayat</h2>
        <p>Semua pengeluaran yang sudah tercatat</p>
      </div>
      <div className="hist-filters">
        <div className="frow">
          {cycles.map((c) => (
            <div
              key={c.id}
              className={`fc cycle-fc ${c.id === selectedCycleId ? "active" : ""}`}
              onClick={() => setSelectedCycleId(c.id)}
            >
              {shortLabel(c.label)}
            </div>
          ))}
        </div>
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
      </div>
      <div className="hist-body">
        {Object.keys(grouped).length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", padding: "30px 0" }}>
            Tidak ada transaksi untuk filter ini.
          </p>
        )}
        {Object.entries(grouped).map(([label, txs]) => (
          <div className="hday" key={label}>
            <div className="hday-label">{label}</div>
            {txs.map((tx) => (
              <div className="hi" key={tx.id}>
                <div className="hi-ic">{tx.pos_icon}</div>
                <div className="hi-info">
                  <div className="hi-desc">{tx.description}</div>
                  <div className="hi-meta">
                    {tx.pos_icon} {tx.pos_name} · {tx.user_role === "suami" ? "👨‍💼" : "👩"} {tx.user_name}
                  </div>
                </div>
                <div className="hi-amt">-Rp {tx.amount.toLocaleString("id-ID")}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
