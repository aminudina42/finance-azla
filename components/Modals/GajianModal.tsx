"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

interface GajianModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: number;
  onSave: (date: number) => void;
}

export default function GajianModal({
  isOpen,
  onClose,
  currentDate,
  onSave,
}: GajianModalProps) {
  const [date, setDate] = useState(currentDate);

  const handleSave = () => {
    const clamped = Math.max(1, Math.min(28, date));
    onSave(clamped);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">⚙️ Atur Tanggal Gajian</div>
      <p
        style={{
          fontSize: "13px",
          color: "var(--muted)",
          marginBottom: "16px",
          lineHeight: 1.6,
        }}
      >
        Siklus baru akan otomatis dimulai setiap bulan pada tanggal ini. Sisa
        saldo akan disapu ke Tabungan.
      </p>
      <div className="fg">
        <div className="fl">Tanggal Gajian (1 – 28)</div>
        <input
          type="number"
          className="fi"
          value={date}
          min={1}
          max={28}
          onChange={(e) => setDate(Number(e.target.value))}
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "28px",
            fontWeight: 900,
            textAlign: "center",
          }}
        />
      </div>
      <p
        style={{
          fontSize: "11px",
          color: "var(--muted)",
          marginTop: "8px",
        }}
      >
        * Maks tgl 28 untuk menghindari masalah di bulan Februari.
      </p>
      <div className="m-actions">
        <button className="m-cancel" onClick={onClose}>
          Batal
        </button>
        <button className="m-save" onClick={handleSave}>
          💾 Simpan
        </button>
      </div>
    </Modal>
  );
}
