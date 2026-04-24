"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";

const EMOJI_OPTIONS = [
  "🍚", "🏦", "👨‍💼", "👩", "⚡", "🛒", "🧴", "📱",
  "🏥", "🚗", "🎓", "🍔", "✈️", "🎮", "💊", "👗",
  "🏠", "🐕", "💪", "🎁", "⛽", "🎨", "📚", "🧸",
];

interface EditPosModalProps {
  isOpen: boolean;
  onClose: () => void;
  posName: string;
  posEmoji: string;
  posSub: string;
  posAmount: number;
  onSave: (name: string, emoji: string, sub: string, amount: number) => void;
  title?: string;
}

export default function EditPosModal({
  isOpen,
  onClose,
  posName,
  posEmoji,
  posSub,
  posAmount,
  onSave,
  title = "✏️ Edit Pos Keuangan",
}: EditPosModalProps) {
  const [name, setName] = useState(posName);
  const [emoji, setEmoji] = useState(posEmoji);
  const [sub, setSub] = useState(posSub);
  const [amountStr, setAmountStr] = useState(posAmount ? posAmount.toLocaleString("id-ID") : "");

  useEffect(() => {
    setName(posName);
    setEmoji(posEmoji);
    setSub(posSub);
    setAmountStr(posAmount ? posAmount.toLocaleString("id-ID") : "");
  }, [posName, posEmoji, posSub, posAmount, isOpen]);

  const handleSave = () => {
    const rawNum = Number(amountStr.replace(/\D/g, ""));
    onSave(name, emoji, sub, rawNum);
    onClose();
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
      <div className="mt">{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div className="fg">
          <div className="fl">Nama Pos</div>
          <input
            type="text"
            className="fi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama pos…"
          />
        </div>
        <div className="fg">
          <div className="fl">Sub-title (Deskripsi Singkat)</div>
          <input
            type="text"
            className="fi"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="Misal: Kebutuhan harian, E-commerce, dll"
          />
        </div>
        <div className="fg">
          <div className="fl">Icon / Emoji</div>
          <div className="epick">
            {EMOJI_OPTIONS.map((em) => (
              <div
                key={em}
                className={`eo ${em === emoji ? "sel" : ""}`}
                onClick={() => setEmoji(em)}
              >
                {em}
              </div>
            ))}
          </div>
        </div>
        <div className="fg">
          <div className="fl">Jatah per Bulan</div>
          <div className="amt-wrap">
            <span className="amt-pre" style={{ fontSize: "14px" }}>
              Rp
            </span>
            <input
              type="tel"
              className="fi"
              value={amountStr}
              onChange={handleAmtChange}
              style={{
                paddingLeft: "42px",
                fontFamily: "'Fraunces', serif",
                fontSize: "22px",
                fontWeight: 900,
              }}
              placeholder="0"
            />
          </div>
        </div>
      </div>
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
