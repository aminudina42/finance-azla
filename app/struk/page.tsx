"use client";

import { useState, useEffect, useCallback } from "react";
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

  const totalNominal = receipts.reduce((s, r) => s + (r.total || 0), 0);

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
          <div className="struk-stats">
            <div className="struk-stat-card">
              <span className="struk-stat-label">Total Struk</span>
              <span className="struk-stat-value purple">{receipts.length}</span>
            </div>
            <div className="struk-stat-card">
              <span className="struk-stat-label">Nilai Transaksi</span>
              <span className="struk-stat-value teal" style={{ fontSize: "15px" }}>
                {formatRp(totalNominal)}
              </span>
            </div>
          </div>
        )}

        {/* ── Section Header ── */}
        {!isLoading && receipts.length > 0 && (
          <div className="struk-section-hdr">
            <span className="sec-label">Riwayat Struk</span>
            <span className="struk-count-badge">{receipts.length} struk</span>
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
        ) : (
          <div className="struk-list">
            {receipts.map((r) => (
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
