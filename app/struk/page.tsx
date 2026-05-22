"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Receipt } from "@/lib/types";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StrukListPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<(Receipt & { store_name?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<"month" | "week" | "day">("month");
  const [offset, setOffset] = useState(0);

  const handleFilterTypeChange = (type: "month" | "week" | "day") => {
    setFilterType(type);
    setOffset(0);
  };

  const loadReceipts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("*, stores(name)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped = data.map((r: any) => ({
          ...r,
          store_name: r.stores?.name ?? "—",
        }));
        setReceipts(mapped);
      }
    } catch {
      console.log("Failed to load receipts");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus struk ini?")) return;
    await supabase.from("receipt_items").delete().eq("receipt_id", id);
    await supabase.from("receipts").delete().eq("id", id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const rDate = new Date(r.created_at);
      if (filterType === "day") {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + offset);
        return (
          rDate.getDate() === targetDate.getDate() &&
          rDate.getMonth() === targetDate.getMonth() &&
          rDate.getFullYear() === targetDate.getFullYear()
        );
      }
      if (filterType === "week") {
        const startOfWeek = new Date();
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return rDate >= startOfWeek && rDate <= endOfWeek;
      }
      if (filterType === "month") {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + offset);
        return (
          rDate.getMonth() === targetDate.getMonth() &&
          rDate.getFullYear() === targetDate.getFullYear()
        );
      }
      return true;
    });
  }, [receipts, filterType, offset]);

  const periodLabel = useMemo(() => {
    const targetDate = new Date();
    if (filterType === "day") {
      targetDate.setDate(targetDate.getDate() + offset);
      if (offset === 0) return "Hari Ini";
      if (offset === -1) return "Kemarin";
      return targetDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    }
    if (filterType === "week") {
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      if (offset === 0) return "Minggu Ini";
      if (offset === -1) return "Minggu Lalu";
      return `${startOfWeek.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${endOfWeek.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (filterType === "month") {
      targetDate.setMonth(targetDate.getMonth() + offset);
      if (offset === 0) return "Bulan Ini";
      if (offset === -1) return "Bulan Lalu";
      return targetDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
    return "";
  }, [filterType, offset]);

  const totalNominal = filteredReceipts.reduce((s, r) => s + (r.total || 0), 0);

  return (
    <main id="pg-struk" className="page active">
      {/* ── Header ── */}
      <div className="ph ph-border">
        <h2>🧾 Struk Dinamis</h2>
        <p>Buat dan kelola struk transaksi digital</p>
      </div>

      <div className="struk-body">

        {/* ── New Button ── */}
        <button className="struk-new-btn" onClick={() => router.push("/struk/new")}>
          <span className="struk-new-icon">＋</span>
          <div>
            <div className="struk-new-title">Buat Struk Baru</div>
            <div className="struk-new-sub">Input item, cetak & bagikan ke WA</div>
          </div>
        </button>

        {/* ── Stats (only shown when there's data) ── */}
        {!isLoading && receipts.length > 0 && (
          <>
            {/* Filter Selector */}
            <div style={{
              display: "flex",
              gap: "8px",
              background: "var(--s1)",
              border: "1px solid var(--border)",
              padding: "4px",
              borderRadius: "var(--r)",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "4px"
            }}>
              {(["month", "week", "day"] as const).map((t) => {
                const isActive = filterType === t;
                const labels = { month: "📅 Bulanan", week: "🗓️ Mingguan", day: "☀️ Harian" };
                return (
                  <button
                    key={t}
                    onClick={() => handleFilterTypeChange(t)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "var(--r-sm)",
                      border: "none",
                      background: isActive ? "linear-gradient(135deg, var(--teal), #00a88c)" : "transparent",
                      color: isActive ? "#fff" : "var(--muted)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textAlign: "center"
                    }}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            {/* Period Navigation */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--s2)",
              border: "1px solid var(--border)",
              padding: "8px 12px",
              borderRadius: "var(--r)",
              marginTop: "8px"
            }}>
              <button
                onClick={() => setOffset(prev => prev - 1)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  padding: "4px 10px",
                  borderRadius: "var(--r-sm)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                ←
              </button>

              <div style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "var(--text)",
                textAlign: "center",
                flex: 1
              }}>
                {periodLabel}
              </div>

              <button
                onClick={() => setOffset(prev => prev + 1)}
                disabled={offset >= 0}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)",
                  color: offset >= 0 ? "var(--muted)" : "var(--text)",
                  padding: "4px 10px",
                  borderRadius: "var(--r-sm)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: offset >= 0 ? "not-allowed" : "pointer",
                  opacity: offset >= 0 ? 0.3 : 1
                }}
              >
                →
              </button>
            </div>

            <div className="struk-stats">
              <div className="struk-stat-card">
                <span className="struk-stat-label">Struk Terfilter</span>
                <span className="struk-stat-value purple">{filteredReceipts.length}</span>
              </div>
              <div className="struk-stat-card">
                <span className="struk-stat-label">Nilai Transaksi</span>
                <span className="struk-stat-value teal" style={{ fontSize: "15px" }}>
                  {formatRp(totalNominal)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Section Header ── */}
        {!isLoading && receipts.length > 0 && (
          <div className="struk-section-hdr">
            <span className="sec-label">Riwayat Struk</span>
            <span className="struk-count-badge">{filteredReceipts.length} struk</span>
          </div>
        )}

        {/* ── List / Empty / Loading ── */}
        {isLoading ? (
          <div className="struk-empty">
            <span className="struk-empty-icon">⏳</span>
            <div className="struk-empty-title">Memuat Data...</div>
            <p>Sedang mengambil riwayat struk Anda</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="struk-empty">
            <span className="struk-empty-icon">🧾</span>
            <div className="struk-empty-title">Belum Ada Struk</div>
            <p>Mulai buat struk pertamamu dan bagikan ke pelanggan via WhatsApp!</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="struk-empty">
            <span className="struk-empty-icon">🔎</span>
            <div className="struk-empty-title">Tidak Ada Struk</div>
            <p>Tidak ditemukan riwayat struk pada filter periode ini.</p>
          </div>
        ) : (
          <div className="struk-list">
            {filteredReceipts.map((r) => (
              <div key={r.id} className="struk-card">
                <Link href={`/struk/${r.id}`} className="struk-card-link">
                  <div className="struk-card-left">
                    <div className="struk-card-num">{r.receipt_number}</div>
                    <div className="struk-card-store">🏪 {r.store_name}</div>
                    <div className="struk-card-date">{formatDate(r.created_at)}</div>
                  </div>
                  <div className="struk-card-right">
                    <div className="struk-card-total">{formatRp(r.total)}</div>
                    <span className="struk-card-arrow">→</span>
                  </div>
                </Link>
                <button
                  className="struk-card-del"
                  onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                  title="Hapus struk"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
