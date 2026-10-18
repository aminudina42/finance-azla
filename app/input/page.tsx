"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import type { StatusKeluarga } from "@/lib/types";
import SakuBorrowModal from "@/components/Modals/SakuBorrowModal";
import PageHeader from "@/components/PageHeader";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function InputPage() {
  const { posList, addTransaction, addSakuBorrowTransaction, children, currentMember } = useApp();
  const searchParams = useSearchParams();

  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [nominal, setNominal] = useState("");
  const [posId, setPosId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saku borrow state
  const [showSakuBorrow, setShowSakuBorrow] = useState(false);

  // Status dan nama pencatat otomatis sesuai profil keluarga
  const userRole: StatusKeluarga = currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri");
  const userName = currentMember?.display_name || (userRole === "suami" ? "Suami" : userRole === "istri" ? "Istri" : "Anak");

  // Auto-select pos from URL query param
  useEffect(() => {
    const posParam = searchParams.get("pos");
    if (posParam && posList.some((p) => p.id === posParam)) {
      setPosId(posParam);
    }
  }, [searchParams, posList]);

  const selectedPos = posList.find((p) => p.id === posId);
  const amount = Number(nominal.replace(/\D/g, ""));
  const posBalance = selectedPos?.current_balance ?? 0;
  const isShorfall = txType === "expense" && posId && amount > 0 && amount > posBalance;

  const handleSave = async () => {
    if (!amount || !posId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addTransaction(amount, posId, userRole, keterangan, txType, userName);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setNominal("");
        setPosId("");
        setKeterangan("");
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWithSakuBorrow = async (sakuId: string, sakuWithdrawAmount: number) => {
    if (!amount || !posId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addSakuBorrowTransaction(amount, posId, userRole, keterangan, sakuId, sakuWithdrawAmount, userName);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setNominal("");
        setPosId("");
        setKeterangan("");
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) { setNominal(""); return; }
    setNominal(Number(rawValue).toLocaleString("id-ID"));
  };

  const isIncome = txType === "income";

  return (
    <main id="pg-input" className="page active" style={{ paddingBottom: "110px" }}>
      <PageHeader
        title={isIncome ? "Input Pemasukan" : "Input Pengeluaran"}
        subtitle={isIncome ? "Catat pemasukan ke pos keuangan" : "Catat pengeluaran manual ke pos"}
        backHref="/"
      />

      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "18px",
            border: "1px solid var(--border)",
            padding: "20px",
            boxShadow: "0 4px 16px rgba(16, 45, 85, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Type toggle */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
              Jenis Transaksi
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f1f8fd", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setTxType("expense")}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  background: txType === "expense" ? "var(--surface)" : "transparent",
                  color: txType === "expense" ? "var(--danger)" : "var(--text-secondary)",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  boxShadow: txType === "expense" ? "0 2px 8px rgba(240, 68, 103, 0.15)" : "none",
                  transition: "all 0.16s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                📤 Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setTxType("income")}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  background: txType === "income" ? "var(--surface)" : "transparent",
                  color: txType === "income" ? "var(--teal)" : "var(--text-secondary)",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  boxShadow: txType === "income" ? "0 2px 8px rgba(22, 168, 154, 0.15)" : "none",
                  transition: "all 0.16s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                📥 Pemasukan
              </button>
            </div>
          </div>

          {/* Info Pencatat Otomatis Sesuai Profil Keluarga */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "14px",
              background: "#f8fbff",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  boxShadow: "0 2px 6px rgba(16, 45, 85, 0.04)",
                  flexShrink: 0,
                }}
              >
                {userRole === "suami" ? "👨‍💼" : userRole === "istri" ? "👩" : "🧒"}
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 650 }}>
                  Dicatat otomatis sebagai
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--navy)" }}>
                  {userName}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 750,
                padding: "3.5px 10px",
                borderRadius: "8px",
                background: "var(--primary-soft)",
                color: "var(--primary)",
                textTransform: "capitalize",
                letterSpacing: "0.2px",
              }}
            >
              {userRole}
            </span>
          </div>

          {/* Nominal */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
              Nominal
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#ffffff",
                border: "1.5px solid var(--border)",
                borderRadius: "14px",
                padding: "10px 14px",
                boxShadow: "0 2px 6px rgba(16, 45, 85, 0.03)",
                transition: "border-color 0.15s ease",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-secondary)", marginRight: "8px" }}>Rp</span>
              <input
                type="tel"
                placeholder="0"
                value={nominal}
                onChange={handleNominalChange}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  fontSize: "24px",
                  fontWeight: 850,
                  color: "var(--navy)",
                  background: "transparent",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.5px",
                }}
              />
            </div>
          </div>

          {/* Pos Keuangan */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
              Pos Keuangan
            </div>
            <div style={{ position: "relative" }}>
              <select
                value={posId}
                onChange={(e) => setPosId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--navy)",
                  fontSize: "14px",
                  fontWeight: 650,
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">— Pilih Pos —</option>
                {posList
                  .filter((p) => isIncome ? true : p.name !== "Tabungan")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
              </select>
              <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)", fontSize: "11px" }}>▼</span>
            </div>
            {/* Saldo Pos info */}
            {selectedPos && (
              <div style={{
                marginTop: "8px",
                padding: "8px 12px",
                background: "#f8fbff",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                fontSize: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ color: "var(--text-secondary)" }}>Sisa saldo amplop:</span>
                <span style={{ fontWeight: 800, color: posBalance < 0 ? "var(--danger)" : posBalance < amount ? "var(--warning)" : "var(--teal)", fontVariantNumeric: "tabular-nums" }}>
                  {formatRp(posBalance)}
                </span>
              </div>
            )}
          </div>

          {/* Shortfall warning + Saku borrow banner */}
          {isShorfall && children.length > 0 && (
            <div style={{
              padding: "14px",
              background: "rgba(244, 163, 59, 0.08)",
              border: "1.5px solid rgba(244, 163, 59, 0.28)",
              borderRadius: "14px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--warning)", marginBottom: "4px" }}>
                ⚠️ Saldo Pos tidak mencukupi
              </div>
              <div style={{ fontSize: "12px", color: "var(--text)", marginBottom: "10px", lineHeight: "1.4" }}>
                Kurang <strong style={{ color: "var(--danger)" }}>{formatRp(amount - posBalance)}</strong> dari saldo pos.
                Anda bisa pinjam dari Saku sebagai alternatif.
              </div>
              <button
                type="button"
                onClick={() => setShowSakuBorrow(true)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, var(--warning), #e59328)",
                  color: "#fff",
                  fontWeight: 750,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(244, 163, 59, 0.3)",
                }}
              >
                🏧 Pinjam dari Saku
              </button>
            </div>
          )}

          {/* Keterangan */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
              Keterangan
            </div>
            <textarea
              placeholder={isIncome ? "Contoh: Bonus proyek freelance…" : "Contoh: Beli beras 5kg di pasar…"}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--border)",
                background: "var(--surface)",
                color: "var(--navy)",
                fontSize: "13.5px",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            ></textarea>
          </div>

          {/* Save button */}
          <button
            type="button"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              background: isIncome
                ? "linear-gradient(135deg, var(--teal), #108e82)"
                : "linear-gradient(135deg, #287ff0, #1769d2)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "15px",
              letterSpacing: "-0.2px",
              cursor: isSubmitting || saved ? "default" : "pointer",
              boxShadow: isIncome
                ? "0 4px 16px rgba(22, 168, 154, 0.3)"
                : "0 4px 16px rgba(40, 127, 240, 0.35)",
              opacity: isSubmitting ? 0.6 : 1,
              transition: "transform 0.15s ease, opacity 0.15s ease",
            }}
            onClick={handleSave}
            disabled={isSubmitting || saved}
          >
            {saved
              ? "✅ Berhasil Disimpan!"
              : isSubmitting
                ? "⏳ Menyimpan..."
                : isIncome
                  ? "💰 Simpan Pemasukan"
                  : "💾 Simpan Pengeluaran"}
          </button>
        </div>
      </div>

      {/* Saku Borrow Modal */}
      <SakuBorrowModal
        isOpen={showSakuBorrow}
        onClose={() => setShowSakuBorrow(false)}
        totalExpense={amount}
        posBalance={posBalance}
        sakuList={children}
        onConfirm={async (sakuId, sakuWithdrawAmount) => {
          setShowSakuBorrow(false);
          await handleSaveWithSakuBorrow(sakuId, sakuWithdrawAmount);
        }}
      />
    </main>
  );
}
