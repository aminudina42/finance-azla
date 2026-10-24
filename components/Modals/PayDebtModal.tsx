"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";

interface PayDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtName: string;
  debtIcon: string;
  monthlyPayment: number;
  paidMonths: number;
  tenorMonths: number;
  remainingAmount?: number;
  creditorName?: string;
  accountNumber?: string;
  posList: { id: string; name: string; icon: string; current_balance: number; is_goal: boolean }[];
  onPay: (posId: string, amount: number, notes?: string, paymentDate?: string) => void;
}

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PayDebtModal({
  isOpen,
  onClose,
  debtName,
  debtIcon,
  monthlyPayment,
  paidMonths,
  tenorMonths,
  remainingAmount = 0,
  creditorName = "",
  accountNumber = "",
  posList,
  onPay,
}: PayDebtModalProps) {
  const [posId, setPosId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayString());
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountStr(monthlyPayment ? monthlyPayment.toLocaleString("id-ID") : "");
      setPosId("");
      setPaymentDate(getTodayString());
      setNotes("");
      setCopied(false);
      setSubmitting(false);
    }
  }, [isOpen, monthlyPayment]);

  const handleAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setAmountStr("");
      return;
    }
    setAmountStr(Number(rawValue).toLocaleString("id-ID"));
  };

  const handleCopyAccount = () => {
    if (!accountNumber) return;
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    const amount = Number(amountStr.replace(/\D/g, ""));
    if (!amount || !posId || submitting) return;
    setSubmitting(true);
    try {
      await onPay(posId, amount, notes.trim(), paymentDate);
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const nextCicilan = paidMonths + 1;
  const availablePos = posList.filter((p) => !p.is_goal);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isLocked={submitting}>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "36px", marginBottom: "6px" }}>{debtIcon}</div>
        <div style={{ fontSize: "16.5px", fontWeight: 800, color: "var(--navy)" }}>{debtName}</div>
        {creditorName && (
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, marginTop: "2px" }}>
            Lembaga: <strong style={{ color: "var(--navy)" }}>{creditorName}</strong>
          </div>
        )}
        <div style={{ fontSize: "13px", color: "var(--primary)", fontWeight: 750, marginTop: "4px" }}>
          💸 Bayar Cicilan Ke-{nextCicilan}
          {tenorMonths > 0 && <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}> dari {tenorMonths} bulan</span>}
        </div>
      </div>

      {accountNumber && (
        <div
          style={{
            background: "#f0f7ff",
            border: "1px dashed #b9dcff",
            borderRadius: "12px",
            padding: "10px 14px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "10.5px", fontWeight: 750, color: "var(--text-secondary)", textTransform: "uppercase" }}>
              No. Rekening / VA Tujuan
            </div>
            <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--navy)", fontVariantNumeric: "tabular-nums", marginTop: "1px", wordBreak: "break-all" }}>
              {accountNumber}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyAccount}
            style={{
              padding: "5px 10px",
              borderRadius: "8px",
              background: copied ? "var(--teal)" : "#ffffff",
              color: copied ? "#ffffff" : "var(--primary)",
              border: copied ? "none" : "1px solid var(--border)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            {copied ? "✓ Disalin" : "📋 Salin"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="fg">
          <div className="fl">Bayar dari Pos</div>
          <div className="sw">
            <select
              className="fi"
              value={posId}
              onChange={(e) => setPosId(e.target.value)}
              style={{ fontSize: "13px" }}
            >
              <option value="">— Pilih Pos Sumber Dana —</option>
              {availablePos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name} ({formatRp(p.current_balance)})
                </option>
              ))}
            </select>
            <span className="sa">▼</span>
          </div>
        </div>

        <div className="fg">
          <div className="fl" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Nominal Bayar</span>
            {remainingAmount > 0 && (
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                Sisa Hutang: {formatRp(remainingAmount)}
              </span>
            )}
          </div>
          <div className="amt-wrap">
            <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
            <input
              type="tel"
              className="fi"
              value={amountStr}
              onChange={handleAmtChange}
              style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "10px" }}>
          <div className="fg">
            <div className="fl">Tanggal Bayar</div>
            <input
              type="date"
              className="fi"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              style={{ fontSize: "12px", padding: "8px 10px" }}
            />
          </div>
          <div className="fg">
            <div className="fl">Catatan (Opsional)</div>
            <input
              type="text"
              className="fi"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: M-Banking BCA"
              style={{ fontSize: "12px", padding: "8px 10px" }}
            />
          </div>
        </div>
      </div>

      <div className="m-actions" style={{ marginTop: "18px" }}>
        <button className="m-cancel" onClick={onClose} disabled={submitting}>Batal</button>
        <button className="m-save" onClick={handleConfirm} disabled={!posId || !amountStr || submitting}>
          {submitting ? "Memproses..." : "Konfirmasi Bayar"}
        </button>
      </div>
    </Modal>
  );
}
