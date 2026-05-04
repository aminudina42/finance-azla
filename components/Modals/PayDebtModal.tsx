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
  posList: { id: string; name: string; icon: string; current_balance: number; is_goal: boolean }[];
  onPay: (posId: string, amount: number) => void;
}

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function PayDebtModal({
  isOpen,
  onClose,
  debtName,
  debtIcon,
  monthlyPayment,
  paidMonths,
  tenorMonths,
  posList,
  onPay,
}: PayDebtModalProps) {
  const [posId, setPosId] = useState("");
  const [amountStr, setAmountStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmountStr(monthlyPayment ? monthlyPayment.toLocaleString("id-ID") : "");
      setPosId("");
    }
  }, [isOpen, monthlyPayment]);

  const handleAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) { setAmountStr(""); return; }
    setAmountStr(Number(rawValue).toLocaleString("id-ID"));
  };

  const handleConfirm = () => {
    const amount = Number(amountStr.replace(/\D/g, ""));
    if (!amount || !posId) return;
    onPay(posId, amount);
    onClose();
  };

  const nextCicilan = paidMonths + 1;
  const availablePos = posList.filter((p) => !p.is_goal);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "36px", marginBottom: "8px" }}>{debtIcon}</div>
        <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text)" }}>{debtName}</div>
        <div style={{ fontSize: "13px", color: "var(--purple)", fontWeight: 700, marginTop: "4px" }}>
          💸 Bayar Cicilan Ke-{nextCicilan}
          {tenorMonths > 0 && <span style={{ color: "var(--muted)", fontWeight: 400 }}> dari {tenorMonths} bulan</span>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div className="fg">
          <div className="fl">Bayar dari Pos</div>
          <div className="sw">
            <select className="fi" value={posId} onChange={(e) => setPosId(e.target.value)} style={{ fontSize: "13px" }}>
              <option value="">— Pilih Pos —</option>
              {availablePos.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name} ({formatRp(p.current_balance)})</option>
              ))}
            </select>
            <span className="sa">▼</span>
          </div>
        </div>
        <div className="fg">
          <div className="fl">Nominal Bayar</div>
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
      </div>

      <div className="m-actions">
        <button className="m-cancel" onClick={onClose}>Batal</button>
        <button className="m-save" onClick={handleConfirm}>✅ Konfirmasi Bayar</button>
      </div>
    </Modal>
  );
}
