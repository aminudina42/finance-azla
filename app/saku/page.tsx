"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import SakuTxModal from "@/components/Modals/SakuTxModal";
import AddSakuModal from "@/components/Modals/AddSakuModal";
import EditSakuModal from "@/components/Modals/EditSakuModal";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import type { Child, SakuAssetType, SakuTxType } from "@/lib/types";
import { formatGoldGram, roundGoldGram } from "@/lib/saku-utils";

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
  const [sakuTxAssetType, setSakuTxAssetType] = useState<SakuAssetType>("cash");
  const [txFilter, setTxFilter] = useState<"all" | "cash" | "gold">("all");
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
  const filteredSakuTxs = sakuTxs.filter((t) => {
    if (txFilter === "all") return true;
    const asset = t.asset_type ?? "cash";
    return asset === txFilter;
  });
  const linkedPos = selectedSaku?.linked_pos_id
    ? posList.find((p) => p.id === selectedSaku.linked_pos_id)
    : null;

  // Stats: total in vs out this month (strictly separated between cash and gold)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTxs = sakuTxs.filter((t) => new Date(t.created_at) >= monthStart);

  const cashMonthTxs = monthTxs.filter((t) => (t.asset_type ?? "cash") === "cash");
  const totalIn  = cashMonthTxs.filter((t) => ["in","cycle_surplus","return_to_saku"].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalOut = cashMonthTxs.filter((t) => ["out","cycle_deficit","withdraw_for_pos"].includes(t.type)).reduce((s, t) => s + t.amount, 0);

  const goldMonthTxs = monthTxs.filter((t) => t.asset_type === "gold");
  const totalGoldIn  = roundGoldGram(goldMonthTxs.filter((t) => t.type === "in").reduce((s, t) => s + (t.gold_amount ?? 0), 0));
  const totalGoldOut = roundGoldGram(goldMonthTxs.filter((t) => t.type === "out").reduce((s, t) => s + (t.gold_amount ?? 0), 0));

  const selectedGoldBalance = selectedSaku?.gold_balance ?? 0;
  const hasGoldActivity = selectedGoldBalance > 0 || totalGoldIn > 0 || totalGoldOut > 0;

  const openSakuTx = (type: "in" | "out", assetType: SakuAssetType = "cash") => {
    setSakuTxType(type);
    setSakuTxAssetType(assetType);
    setShowSakuTx(true);
  };

  const handleSakuTxSave = async (
    amount: number,
    desc: string,
    type: "in" | "out",
    assetType: SakuAssetType
  ) => {
    await addChildTransaction(selectedSakuId, type, amount, desc, null, null, assetType);
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
            {(saku.gold_balance ?? 0) > 0 && (
              <span
                title={`Emas: ${formatGoldGram(saku.gold_balance ?? 0)}`}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "9999px",
                  background: "#C88A04",
                  display: "inline-block",
                  marginLeft: "2px",
                  flexShrink: 0,
                }}
              />
            )}
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

          {/* Negative balance warning (Cash only) */}
          {isNegative && (
            <div style={{
              padding: "12px 14px",
              background: "#FDEBEC",
              border: "1px solid rgba(240, 68, 103, 0.25)",
              borderRadius: "14px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 750, color: "#9F2F2D" }}>SALDO UANG NEGATIF</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                  Saldo uang Saku ini defisit (saldo emas tetap terpisah). Kembalikan saldo dari pos atau pemasukan.
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
                }}
              >
                Bayar
              </button>
            </div>
          )}

          {/* Hero card: Multi-Asset Bento (Uang & Emas) */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background: "#ffffff",
              border: "1px solid #EAEAEA",
              borderRadius: "18px",
              boxShadow: "0 4px 16px rgba(16, 45, 85, 0.04)",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 750, color: "var(--text-secondary)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
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
                  border: "1px solid #EAEAEA",
                  background: "#F9F9F8",
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
                background: "#E1F3FE",
                borderRadius: "9999px",
                border: "1px solid #C7E5FB",
                fontSize: "11px",
                color: "#1F6C9F",
                fontWeight: 700,
                width: "fit-content",
              }}>
                Terhubung ke: {linkedPos.icon} {linkedPos.name}
              </div>
            )}

            {/* Dual-Asset Bento Panels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
              {/* Cash Panel */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: isNegative ? "#FDEBEC" : "#F7FBFF",
                  border: isNegative ? "1px solid rgba(240, 68, 103, 0.25)" : "1px solid #DCECF9",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.6px", color: isNegative ? "#9F2F2D" : "#5A7184" }}>
                    Saldo Uang
                  </span>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: isNegative ? "#9F2F2D" : "#1F6C9F" }}>
                    IDR
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "clamp(24px, 5.5vw, 32px)",
                    fontWeight: 850,
                    letterSpacing: "-0.8px",
                    color: isNegative ? "#9F2F2D" : "var(--navy)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatRp(selectedSaku.balance)}
                </div>
              </div>

              {/* Gold Panel */}
              <div
                style={{
                  padding: "13px 16px",
                  borderRadius: "12px",
                  background: "#FBF3DB",
                  border: "1px solid #EBD9A8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#956400" aria-hidden="true">
                      <path d="M5 17L7.5 9H16.5L19 17H5ZM3 19H21V21H3V19ZM8.5 7L10 3H14L15.5 7H8.5Z" />
                    </svg>
                    <span style={{ fontSize: "11px", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.6px", color: "#8A5A00" }}>
                      Simpanan Emas
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(20px, 4.5vw, 25px)",
                      fontWeight: 850,
                      letterSpacing: "-0.5px",
                      color: "#5C3C00",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatGoldGram(selectedGoldBalance)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSakuTx("in", "gold")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "9px",
                    border: "1px solid #DFC680",
                    background: "#FFFFFF",
                    color: "#7A5200",
                    fontSize: "12px",
                    fontWeight: 750,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  + Emas
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", paddingTop: "6px", borderTop: "1px solid #EAEAEA" }}>
              <button
                onClick={() => openSakuTx("out", "cash")}
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(240, 68, 103, 0.2)",
                  background: "#FDEBEC",
                  color: "#9F2F2D",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                Pengeluaran
              </button>
              <button
                onClick={() => openSakuTx("in", "cash")}
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(52, 101, 56, 0.2)",
                  background: "#EDF3EC",
                  color: "#275A3A",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: hasGoldActivity ? "10px" : "16px" }}>
            <div style={{ background: "#FDEBEC", border: "1px solid rgba(240, 68, 103, 0.18)", borderRadius: "12px", padding: "13px" }}>
              <div style={{ fontSize: "10.5px", color: "#9F2F2D", fontWeight: 750, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: "4px" }}>Uang Keluar</div>
              <div style={{ fontSize: "17px", fontWeight: 850, color: "#9F2F2D", fontVariantNumeric: "tabular-nums" }}>{formatRp(totalOut)}</div>
            </div>
            <div style={{ background: "#EDF3EC", border: "1px solid rgba(52, 101, 56, 0.18)", borderRadius: "12px", padding: "13px" }}>
              <div style={{ fontSize: "10.5px", color: "#275A3A", fontWeight: 750, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: "4px" }}>Uang Masuk</div>
              <div style={{ fontSize: "17px", fontWeight: 850, color: "#275A3A", fontVariantNumeric: "tabular-nums" }}>{formatRp(totalIn)}</div>
            </div>
          </div>

          {hasGoldActivity && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "#FDF7F5", border: "1px solid #F0D5CE", borderRadius: "12px", padding: "13px" }}>
                <div style={{ fontSize: "10.5px", color: "#9F2F2D", fontWeight: 750, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: "4px" }}>Emas Keluar</div>
                <div style={{ fontSize: "17px", fontWeight: 850, color: "#9F2F2D", fontVariantNumeric: "tabular-nums" }}>{formatGoldGram(totalGoldOut)}</div>
              </div>
              <div style={{ background: "#FBF3DB", border: "1px solid #EBD9A8", borderRadius: "12px", padding: "13px" }}>
                <div style={{ fontSize: "10.5px", color: "#8A5A00", fontWeight: 750, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: "4px" }}>Emas Masuk</div>
                <div style={{ fontSize: "17px", fontWeight: 850, color: "#5C3C00", fontVariantNumeric: "tabular-nums" }}>{formatGoldGram(totalGoldIn)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Riwayat transaksi */}
      {selectedSaku && (
        <div style={{ padding: "8px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--navy)", margin: 0, letterSpacing: "-0.2px" }}>
              Riwayat Transaksi
            </h3>
            <div
              style={{
                display: "inline-flex",
                background: "#F5F7FA",
                border: "1px solid #EAEAEA",
                borderRadius: "10px",
                padding: "3px",
                gap: "2px",
              }}
            >
              {(["all", "cash", "gold"] as const).map((tab) => {
                const isActive = txFilter === tab;
                const label = tab === "all" ? "Semua" : tab === "cash" ? "Uang" : "Emas";
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTxFilter(tab)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "7px",
                      border: "none",
                      background: isActive ? (tab === "gold" ? "#FBF3DB" : "#FFFFFF") : "transparent",
                      color: isActive ? (tab === "gold" ? "#8A5A00" : "var(--navy)") : "var(--text-secondary)",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredSakuTxs.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 20px", background: "#ffffff", borderRadius: "14px", border: "1px dashed #EAEAEA", color: "var(--text-secondary)", fontSize: "13px" }}>
              {txFilter === "gold"
                ? "Belum ada riwayat transaksi emas pada saku ini."
                : txFilter === "cash"
                  ? "Belum ada riwayat transaksi uang pada saku ini."
                  : "Belum ada riwayat transaksi pada saku ini."}
            </div>
          )}

          {filteredSakuTxs.map((tx) => {
            const isGoldTx = tx.asset_type === "gold";
            const meta = TX_TYPE_LABELS[tx.type] ?? { label: tx.type, color: "var(--text-secondary)", sign: "" };
            const isPositive = ["in", "cycle_surplus", "return_to_saku"].includes(tx.type);
            const dateStr = new Date(tx.created_at).toLocaleDateString("id-ID", {
              day: "numeric", month: "short", year: "numeric",
            });
            const amountColor = isGoldTx
              ? isPositive
                ? "#8A5A00"
                : "#9F2F2D"
              : meta.color;

            return (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  background: "#ffffff",
                  border: isGoldTx ? "1px solid #EFE0B2" : "1px solid #EAEAEA",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: isGoldTx
                        ? isPositive
                          ? "#FBF3DB"
                          : "#FDEBEC"
                        : isPositive
                          ? "rgba(22, 168, 154, 0.1)"
                          : "rgba(240, 68, 103, 0.1)",
                      color: isGoldTx
                        ? isPositive
                          ? "#8A5A00"
                          : "#9F2F2D"
                        : isPositive
                          ? "var(--teal)"
                          : "var(--danger)",
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
                      {tx.description || (isGoldTx ? "Transaksi Emas" : "Transaksi Saku")}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{dateStr}</span>
                      {isGoldTx ? (
                        <span
                          style={{
                            fontSize: "9.5px",
                            padding: "1px 6px",
                            borderRadius: "9999px",
                            background: "#FBF3DB",
                            color: "#8A5A00",
                            fontWeight: 750,
                            letterSpacing: "0.03em",
                          }}
                        >
                          Emas
                        </span>
                      ) : (
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
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ color: amountColor, fontSize: "14.5px", fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {isGoldTx
                    ? `${isPositive ? "+" : "-"}${formatGoldGram(tx.gold_amount ?? 0)}`
                    : `${meta.sign}${formatRp(tx.amount)}`}
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
        initialAssetType={sakuTxAssetType}
        currentGoldBalance={selectedGoldBalance}
        onSave={handleSakuTxSave}
      />
      <AddSakuModal
        isOpen={showAddSaku}
        onClose={() => setShowAddSaku(false)}
        onSave={(name, icon, bal, type, linkedPosId, initialGold) =>
          addSaku(name, icon, bal, type, linkedPosId, initialGold)
        }
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
