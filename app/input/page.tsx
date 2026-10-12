"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import SakuBorrowModal from "@/components/Modals/SakuBorrowModal";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function InputPage() {
  const { posList, addTransaction, addSakuBorrowTransaction, children } = useApp();
  const searchParams = useSearchParams();

  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [user, setUser] = useState<"suami" | "istri">("suami");
  const [nominal, setNominal] = useState("");
  const [posId, setPosId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saku borrow state
  const [showSakuBorrow, setShowSakuBorrow] = useState(false);

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
      await addTransaction(amount, posId, user, keterangan, txType);
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
      await addSakuBorrowTransaction(amount, posId, user, keterangan, sakuId, sakuWithdrawAmount);
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
    <main id="pg-input" className="page active">
      <div className="ph ph-border">
        <h2>{isIncome ? "💰 Input Pemasukan" : "✏️ Input Pengeluaran"}</h2>
        <p>{isIncome ? "Catat pemasukan ke pos keuangan" : "Catat pengeluaran manual ke pos"}</p>
      </div>
      <div className="form-body">
        {/* Type toggle */}
        <div className="fg">
          <div className="fl">Jenis Transaksi</div>
          <div className="type-toggle">
            <div
              className={`type-opt ${txType === "expense" ? "active-out" : ""}`}
              onClick={() => setTxType("expense")}
            >
              📤 Pengeluaran
            </div>
            <div
              className={`type-opt ${txType === "income" ? "active-in" : ""}`}
              onClick={() => setTxType("income")}
            >
              📥 Pemasukan
            </div>
          </div>
        </div>

        {/* User */}
        <div className="fg">
          <div className="fl">Dicatat oleh</div>
          <div className="user-row">
            <div className={`user-chip ${user === "suami" ? "active" : ""}`} onClick={() => setUser("suami")}>
              👨‍💼 Suami
            </div>
            <div className={`user-chip ${user === "istri" ? "active" : ""}`} onClick={() => setUser("istri")}>
              👩 Istri
            </div>
          </div>
        </div>

        {/* Nominal */}
        <div className="fg">
          <div className="fl">Nominal</div>
          <div className="amt-wrap">
            <span className="amt-pre">Rp</span>
            <input
              className="amt-input"
              type="tel"
              placeholder="0"
              value={nominal}
              onChange={handleNominalChange}
            />
          </div>
        </div>

        {/* Pos Keuangan */}
        <div className="fg">
          <div className="fl">Pos Keuangan</div>
          <div className="sw">
            <select
              className="fi"
              value={posId}
              onChange={(e) => setPosId(e.target.value)}
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
            <span className="sa">▼</span>
          </div>
          {/* Saldo Pos info */}
          {selectedPos && (
            <div style={{
              marginTop: "6px",
              fontSize: "12px",
              color: posBalance < 0 ? "var(--red)" : "var(--muted)",
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span>Saldo pos:</span>
              <span style={{ fontWeight: 700, color: posBalance < 0 ? "var(--red)" : posBalance < amount ? "var(--amber)" : "var(--teal)" }}>
                {formatRp(posBalance)}
              </span>
            </div>
          )}
        </div>

        {/* Shortfall warning + Saku borrow banner */}
        {isShorfall && children.length > 0 && (
          <div style={{
            padding: "12px 14px",
            background: "rgba(255,179,64,.08)",
            border: "1px solid rgba(255,179,64,.3)",
            borderRadius: "12px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)", marginBottom: "4px" }}>
              ⚠️ Saldo Pos tidak mencukupi
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px" }}>
              Kurang <strong style={{ color: "var(--text)" }}>{formatRp(amount - posBalance)}</strong> dari saldo pos.
              Anda bisa pinjam dari Saku sebagai alternatif.
            </div>
            <button
              onClick={() => setShowSakuBorrow(true)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, var(--amber), #e09000)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              🏧 Pinjam dari Saku
            </button>
          </div>
        )}

        {/* Keterangan */}
        <div className="fg">
          <div className="fl">Keterangan</div>
          <textarea
            className="fi"
            placeholder={isIncome ? "Contoh: Bonus proyek freelance…" : "Contoh: Beli beras 5kg di pasar…"}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          ></textarea>
        </div>

        {/* Save button (normal) */}
        <button
          className="btn-primary"
          style={{
            background: isIncome
              ? "linear-gradient(135deg, var(--teal), #00a88c)"
              : "linear-gradient(135deg, var(--pink), #d43a7a)",
            opacity: isSubmitting ? 0.6 : 1,
            pointerEvents: isSubmitting ? "none" : "auto",
          }}
          onClick={handleSave}
          disabled={isSubmitting || saved}
        >
          {saved
            ? "✅ Tersimpan!"
            : isSubmitting
              ? "⏳ Menyimpan..."
              : isIncome
                ? "💰 Simpan Pemasukan"
                : "💾 Simpan Pengeluaran"}
        </button>
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
