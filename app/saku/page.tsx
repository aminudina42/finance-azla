"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import SakuTxModal from "@/components/Modals/SakuTxModal";
import AddSakuModal from "@/components/Modals/AddSakuModal";
import EditSakuModal from "@/components/Modals/EditSakuModal";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import type { Child, SakuTxType } from "@/lib/types";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const TX_TYPE_LABELS: Record<SakuTxType, { label: string; color: string; sign: string }> = {
  in:              { label: "Manual",    color: "var(--teal)",   sign: "+" },
  out:             { label: "Manual",    color: "var(--red)",    sign: "-" },
  cycle_surplus:   { label: "Otomatis",  color: "var(--teal)",   sign: "+" },
  cycle_deficit:   { label: "Otomatis",  color: "var(--red)",    sign: "-" },
  withdraw_for_pos:{ label: "Pinjam Pos",color: "var(--red)",    sign: "-" },
  return_to_saku:  { label: "Bayar Balik", color: "var(--teal)", sign: "+" },
};

export default function SakuPage() {
  const {
    children, childTransactions, posList, isLoading,
    addChildTransaction, addSaku, updateSaku, deleteSaku, addSakuReturnTransaction,
  } = useApp();

  const [selectedSakuId, setSelectedSakuId] = useState("");
  const [showSakuTx, setShowSakuTx] = useState(false);
  const [sakuTxType, setSakuTxType] = useState<"in" | "out">("out");
  const [showAddSaku, setShowAddSaku] = useState(false);
  const [editSaku, setEditSaku] = useState<Child | null>(null);

  // Auto-select first saku
  useEffect(() => {
    if (children.length > 0 && !children.find((c) => c.id === selectedSakuId)) {
      setSelectedSakuId(children[0].id);
    }
  }, [children, selectedSakuId]);

  const selectedSaku = children.find((c) => c.id === selectedSakuId);
  const sakuTxs = childTransactions.filter((t) => t.child_id === selectedSakuId);
  const linkedPos = selectedSaku?.linked_pos_id
    ? posList.find((p) => p.id === selectedSaku.linked_pos_id)
    : null;

  // Stats: total in vs out this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTxs = sakuTxs.filter((t) => new Date(t.created_at) >= monthStart);
  const totalIn  = monthTxs.filter((t) => ["in","cycle_surplus","return_to_saku"].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalOut = monthTxs.filter((t) => ["out","cycle_deficit","withdraw_for_pos"].includes(t.type)).reduce((s, t) => s + t.amount, 0);

  const openSakuTx = (type: "in" | "out") => { setSakuTxType(type); setShowSakuTx(true); };

  const handleSakuTxSave = (amount: number, desc: string, type: "in" | "out") => {
    addChildTransaction(selectedSakuId, type, amount, desc);
  };

  const handleReturnToSaku = () => {
    const amountStr = prompt("Jumlah yang dikembalikan ke Saku (Rp):");
    if (!amountStr) return;
    const amount = Number(amountStr.replace(/\D/g, ""));
    if (amount > 0 && selectedSakuId) {
      addSakuReturnTransaction(selectedSakuId, amount, "Bayar balik ke Saku");
    }
  };

  const isNegative = (selectedSaku?.balance ?? 0) < 0;

  if (isLoading) {
    return (
      <main id="pg-saku" className="page active" style={{ paddingBottom: "110px" }}>
        <PageHeader
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <img
                src="/logo/icon-menu-saku.png"
                alt="Menu Saku"
                style={{ width: "30px", height: "30px", objectFit: "contain" }}
              />
              <span>Saku</span>
            </span>
          }
          subtitle="Tabungan & kantong keuangan pribadi"
          backHref="/"
        />
        {/* Saku Chips Skeleton */}
        <div style={{ display: "flex", gap: "8px", padding: "14px 20px 6px" }}>
          <Skeleton width="100px" height="38px" borderRadius="12px" />
          <Skeleton width="110px" height="38px" borderRadius="12px" />
          <Skeleton width="80px" height="38px" borderRadius="12px" />
        </div>
        {/* Saku Hero Card Skeleton */}
        <div style={{ padding: "10px 20px 0" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid var(--border)",
              borderRadius: "20px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <Skeleton width="46px" height="46px" borderRadius="14px" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <Skeleton width="100px" height="11px" borderRadius="4px" />
                <Skeleton width="140px" height="18px" borderRadius="4px" />
              </div>
            </div>
            <Skeleton width="180px" height="34px" borderRadius="8px" style={{ marginBottom: "16px" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <Skeleton width="50%" height="42px" borderRadius="12px" />
              <Skeleton width="50%" height="42px" borderRadius="12px" />
            </div>
          </div>
          {/* Stats & Tx Skeleton */}
          <Skeleton height="76px" borderRadius="14px" style={{ marginBottom: "16px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Skeleton height="56px" borderRadius="12px" />
            <Skeleton height="56px" borderRadius="12px" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="pg-saku" className="page active" style={{ paddingBottom: "110px" }}>
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/icon-menu-saku.png"
              alt="Menu Saku"
              style={{ width: "30px", height: "30px", objectFit: "contain" }}
            />
            <span>Saku</span>
          </span>
        }
        subtitle="Tabungan & kantong keuangan pribadi"
        backHref="/"
        action={
          <button
            type="button"
            onClick={() => setShowAddSaku(true)}
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              background: "var(--primary)",
              color: "#ffffff",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 3px 10px rgba(40, 127, 240, 0.25)",
            }}
          >
            <span>＋</span> Saku Baru
          </button>
        }
      />

      {/* Saku chips selector */}
      <div className="child-selector" style={{ padding: "14px 20px 6px" }}>
        {children.map((saku) => (
          <div
            key={saku.id}
            className={`child-chip ${saku.id === selectedSakuId ? "active" : ""}`}
            onClick={() => setSelectedSakuId(saku.id)}
            style={{
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.16s ease",
            }}
          >
            <span className="child-chip-icon">{saku.icon}</span>
            <span className="child-chip-name">{saku.name}</span>
            {saku.type === "linked" && (
              <span style={{ fontSize: "10px", color: "var(--primary)", marginLeft: "2px" }}>🔗</span>
            )}
          </div>
        ))}
        <div
          className="child-chip"
          style={{ borderStyle: "dashed", borderRadius: "12px", cursor: "pointer" }}
          onClick={() => setShowAddSaku(true)}
        >
          <span className="child-chip-icon">＋</span>
          <span className="child-chip-name">Tambah</span>
        </div>
      </div>

      {/* Empty state */}
      {children.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: "44px", marginBottom: "12px" }}>💰</div>
          <div style={{ fontSize: "16px", fontWeight: 750, color: "var(--navy)", marginBottom: "6px" }}>Belum Ada Saku</div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Tap <strong>＋ Saku Baru</strong> untuk membuat kantong simpanan atau tabungan pribadi.
          </div>
        </div>
      )}

      {selectedSaku && (
        <div style={{ padding: "10px 20px 0" }}>

          {/* Negative balance warning */}
          {isNegative && (
            <div style={{
              padding: "12px 14px",
              background: "rgba(240, 68, 103, 0.08)",
              border: "1.5px solid rgba(240, 68, 103, 0.25)",
              borderRadius: "14px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--danger)" }}>SALDO NEGATIF</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                  Saldo Saku ini defisit. Kembalikan saldo dari pos atau pemasukan.
                </div>
              </div>
              <button
                onClick={handleReturnToSaku}
                style={{
                  marginLeft: "auto",
                  padding: "7px 12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "var(--danger)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(240, 68, 103, 0.3)",
                }}
              >
                Bayar
              </button>
            </div>
          )}

          {/* Hero card matching BudgetSummaryCard */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background: "linear-gradient(115deg, #ffffff 0%, #f7fbff 72%, #eaf6ff 100%)",
              border: "1.5px solid #c7e5fb",
              borderRadius: "20px",
              boxShadow: "0 10px 24px rgba(38, 111, 183, 0.08)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 750, color: "var(--text-secondary)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                  Saldo Saku Aktif
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "22px" }}>{selectedSaku.icon}</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)" }}>{selectedSaku.name}</span>
                </div>
              </div>
              <button
                onClick={() => setEditSaku(selectedSaku)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-secondary)",
                  fontSize: "11.5px",
                  fontWeight: 650,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit</span>
              </button>
            </div>

            {/* Linked Pos badge */}
            {linkedPos && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                background: "rgba(40, 127, 240, 0.1)",
                borderRadius: "20px",
                border: "1px solid rgba(40, 127, 240, 0.2)",
                fontSize: "11.5px",
                color: "var(--primary)",
                fontWeight: 650,
                width: "fit-content",
                position: "relative",
                zIndex: 1,
              }}>
                🔗 Terhubung ke: {linkedPos.icon} {linkedPos.name}
              </div>
            )}

            <div
              style={{
                fontSize: "clamp(26px, 6vw, 36px)",
                fontWeight: 850,
                letterSpacing: "-1px",
                color: isNegative ? "var(--danger)" : "var(--navy)",
                position: "relative",
                zIndex: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatRp(selectedSaku.balance)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", paddingTop: "8px", borderTop: "1px solid #d8eaf8", position: "relative", zIndex: 1 }}>
              <button
                onClick={() => openSakuTx("out")}
                style={{
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid rgba(240, 68, 103, 0.2)",
                  background: "rgba(240, 68, 103, 0.08)",
                  color: "var(--danger)",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "background 0.15s ease",
                }}
              >
                Pengeluaran
              </button>
              <button
                onClick={() => openSakuTx("in")}
                style={{
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid rgba(22, 168, 154, 0.2)",
                  background: "rgba(22, 168, 154, 0.08)",
                  color: "var(--teal)",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "background 0.15s ease",
                }}
              >
                Pemasukan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan bulan ini */}
      {selectedSaku && (
        <div style={{ padding: "20px 20px 0" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--navy)", marginBottom: "12px", letterSpacing: "-0.2px" }}>
            Ringkasan Bulan Ini
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <div style={{ background: "rgba(240, 68, 103, 0.06)", border: "1px solid rgba(240, 68, 103, 0.2)", borderRadius: "14px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--danger)", fontWeight: 750, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "4px" }}>Keluar</div>
              <div style={{ fontSize: "18px", fontWeight: 850, color: "var(--danger)", fontVariantNumeric: "tabular-nums" }}>{formatRp(totalOut)}</div>
            </div>
            <div style={{ background: "rgba(22, 168, 154, 0.06)", border: "1px solid rgba(22, 168, 154, 0.2)", borderRadius: "14px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--teal)", fontWeight: 750, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "4px" }}>Masuk</div>
              <div style={{ fontSize: "18px", fontWeight: 850, color: "var(--teal)", fontVariantNumeric: "tabular-nums" }}>{formatRp(totalIn)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat transaksi */}
      {selectedSaku && (
        <div style={{ padding: "8px 20px 0" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--navy)", marginBottom: "12px", letterSpacing: "-0.2px" }}>
            Riwayat Transaksi
          </h3>
          {sakuTxs.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 20px", background: "#ffffff", borderRadius: "14px", border: "1px dashed var(--border)", color: "var(--text-secondary)", fontSize: "13px" }}>
              Belum ada riwayat transaksi pada saku ini.
            </div>
          )}
          {sakuTxs.map((tx) => {
            const meta = TX_TYPE_LABELS[tx.type] ?? { label: tx.type, color: "var(--text-secondary)", sign: "" };
            const isPositive = ["in","cycle_surplus","return_to_saku"].includes(tx.type);
            const dateStr = new Date(tx.created_at).toLocaleDateString("id-ID", {
              day: "numeric", month: "short", year: "numeric",
            });
            return (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  background: "#ffffff",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  boxShadow: "0 2px 6px rgba(16, 45, 85, 0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: isPositive ? "rgba(22, 168, 154, 0.1)" : "rgba(240, 68, 103, 0.1)",
                      color: isPositive ? "var(--teal)" : "var(--danger)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "14px",
                      fontWeight: 750,
                      flexShrink: 0,
                    }}
                  >
                    {isPositive ? "↓" : "↑"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tx.description || "Transaksi Saku"}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{dateStr}</span>
                      <span style={{
                        fontSize: "9.5px",
                        padding: "1px 6px",
                        borderRadius: "5px",
                        background: `${meta.color}18`,
                        color: meta.color,
                        fontWeight: 750,
                      }}>
                        {meta.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ color: meta.color, fontSize: "14.5px", fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {meta.sign}{formatRp(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <SakuTxModal
        isOpen={showSakuTx}
        onClose={() => setShowSakuTx(false)}
        type={sakuTxType}
        onSave={handleSakuTxSave}
      />
      <AddSakuModal
        isOpen={showAddSaku}
        onClose={() => setShowAddSaku(false)}
        onSave={(name, icon, bal, type, linkedPosId) => addSaku(name, icon, bal, type, linkedPosId)}
      />
      <EditSakuModal
        isOpen={!!editSaku}
        onClose={() => setEditSaku(null)}
        saku={editSaku}
        onSave={(id, name, icon, type, linkedPosId) => updateSaku(id, name, icon, type, linkedPosId)}
        onDelete={(id) => { deleteSaku(id); setSelectedSakuId(""); }}
      />
    </main>
  );
}
