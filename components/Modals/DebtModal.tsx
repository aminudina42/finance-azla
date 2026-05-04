"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";

const DEBT_ICONS = [
  "💳", "🏦", "🏠", "🚗", "📱", "💊", "🎓", "🛒",
  "🏥", "✈️", "👗", "🔧", "📺", "💻", "🪑", "🧊",
];

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  debtName?: string;
  debtIcon?: string;
  debtTotal?: number;
  debtRemaining?: number;
  debtMonthly?: number;
  debtDueDate?: number;
  onSave: (name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number) => void;
}

export default function DebtModal({
  isOpen,
  onClose,
  mode,
  debtName = "",
  debtIcon = "💳",
  debtTotal = 0,
  debtRemaining = 0,
  debtMonthly = 0,
  debtDueDate = 1,
  onSave,
}: DebtModalProps) {
  const [name, setName] = useState(debtName);
  const [icon, setIcon] = useState(debtIcon);
  const [totalStr, setTotalStr] = useState(debtTotal ? debtTotal.toLocaleString("id-ID") : "");
  const [remainingStr, setRemainingStr] = useState(debtRemaining ? debtRemaining.toLocaleString("id-ID") : "");
  const [monthlyStr, setMonthlyStr] = useState(debtMonthly ? debtMonthly.toLocaleString("id-ID") : "");
  const [dueDate, setDueDate] = useState(debtDueDate);

  useEffect(() => {
    setName(debtName);
    setIcon(debtIcon);
    setTotalStr(debtTotal ? debtTotal.toLocaleString("id-ID") : "");
    setRemainingStr(debtRemaining ? debtRemaining.toLocaleString("id-ID") : "");
    setMonthlyStr(debtMonthly ? debtMonthly.toLocaleString("id-ID") : "");
    setDueDate(debtDueDate);
  }, [debtName, debtIcon, debtTotal, debtRemaining, debtMonthly, debtDueDate, isOpen]);

  const handleSave = () => {
    const total = Number(totalStr.replace(/\D/g, ""));
    const remaining = mode === "edit" ? Number(remainingStr.replace(/\D/g, "")) : total;
    const monthly = Number(monthlyStr.replace(/\D/g, ""));
    if (!name || !total) return;
    onSave(name, icon, total, remaining, monthly, dueDate);
    onClose();
  };

  const handleAmtChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) { setter(""); return; }
    setter(Number(rawValue).toLocaleString("id-ID"));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">{mode === "add" ? "💳 Tambah Hutang Baru" : "✏️ Edit Hutang"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div className="fg">
          <div className="fl">Nama Hutang / Cicilan</div>
          <input type="text" className="fi" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Cicilan Motor, KPR…" />
        </div>
        <div className="fg">
          <div className="fl">Icon</div>
          <div className="epick">
            {DEBT_ICONS.map((em) => (
              <div key={em} className={`eo ${em === icon ? "sel" : ""}`} onClick={() => setIcon(em)}>{em}</div>
            ))}
          </div>
        </div>
        <div className="fg">
          <div className="fl">Total Hutang</div>
          <div className="amt-wrap">
            <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
            <input type="tel" className="fi" value={totalStr} onChange={handleAmtChange(setTotalStr)} style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }} placeholder="0" />
          </div>
        </div>
        {mode === "edit" && (
          <div className="fg">
            <div className="fl">Sisa Hutang</div>
            <div className="amt-wrap">
              <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
              <input type="tel" className="fi" value={remainingStr} onChange={handleAmtChange(setRemainingStr)} style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }} placeholder="0" />
            </div>
          </div>
        )}
        <div className="fg">
          <div className="fl">Cicilan per Bulan</div>
          <div className="amt-wrap">
            <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
            <input type="tel" className="fi" value={monthlyStr} onChange={handleAmtChange(setMonthlyStr)} style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }} placeholder="0" />
          </div>
        </div>
        <div className="fg">
          <div className="fl">Tanggal Jatuh Tempo (1–31)</div>
          <input type="number" className="fi" value={dueDate} onChange={(e) => setDueDate(Math.min(31, Math.max(1, Number(e.target.value))))} min={1} max={31} style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }} />
        </div>
      </div>
      <div className="m-actions">
        <button className="m-cancel" onClick={onClose}>Batal</button>
        <button className="m-save" onClick={handleSave}>💾 Simpan</button>
      </div>
    </Modal>
  );
}
