"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";

interface SakuTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "in" | "out";
  onSave: (amount: number, desc: string, type: "in" | "out") => void;
}

export default function SakuTxModal({
  isOpen,
  onClose,
  type,
  onSave,
}: SakuTxModalProps) {
  const [amountStr, setAmountStr] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmountStr("");
      setDesc("");
    }
  }, [isOpen]);

  const isOut = type === "out";

  const handleSave = () => {
    const rawNum = Number(amountStr.replace(/\D/g, ""));
    if (rawNum > 0) {
      onSave(rawNum, desc, type);
      onClose();
    }
  };

  const handleAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setAmountStr("");
      return;
    }
    setAmountStr(Number(rawValue).toLocaleString("id-ID"));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">
        {isOut ? "➖ Pengeluaran Saku" : "➕ Pemasukan Saku"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div className="fg">
          <div className="fl">Nominal</div>
          <div className="amt-wrap">
            <span className="amt-pre">Rp</span>
            <input
              className="amt-input"
              type="tel"
              placeholder="0"
              value={amountStr}
              onChange={handleAmtChange}
              style={{ fontSize: "26px" }}
            />
          </div>
        </div>
        <div className="fg">
          <div className="fl">Keterangan</div>
          <input
            type="text"
            className="fi"
            placeholder="Contoh: Jajan kantin, Beli buku…"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
      </div>
      <div className="m-actions">
        <button className="m-cancel" onClick={onClose}>
          Batal
        </button>
        <button
          className="m-save"
          onClick={handleSave}
          style={{
            background: isOut
              ? "linear-gradient(135deg,var(--red),#c0344e)"
              : "linear-gradient(135deg,var(--teal),#009b80)",
          }}
        >
          💾 Simpan
        </button>
      </div>
    </Modal>
  );
}
