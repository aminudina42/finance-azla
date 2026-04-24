"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";

const CHILD_EMOJIS = ["👦", "👧", "🧒", "👶", "🐣", "🌟"];

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string, initialBalance: number) => void;
}

export default function AddChildModal({
  isOpen,
  onClose,
  onSave,
}: AddChildModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("👦");
  const [balanceStr, setBalanceStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setIcon("👦");
      setBalanceStr("");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (name.trim()) {
      const rawNum = Number(balanceStr.replace(/\D/g, ""));
      onSave(name.trim(), icon, rawNum);
      onClose();
    }
  };

  const handleBalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setBalanceStr("");
      return;
    }
    setBalanceStr(Number(rawValue).toLocaleString("id-ID"));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">🧒 Tambah Saku Anak</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div className="fg">
          <div className="fl">Nama Anak</div>
          <input
            type="text"
            className="fi"
            placeholder="Contoh: Raka, Nisa, Budi…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="fg">
          <div className="fl">Icon</div>
          <div className="epick">
            {CHILD_EMOJIS.map((em) => (
              <div
                key={em}
                className={`eo ${em === icon ? "sel" : ""}`}
                onClick={() => setIcon(em)}
              >
                {em}
              </div>
            ))}
          </div>
        </div>
        <div className="fg">
          <div className="fl">Saldo Awal (opsional)</div>
          <div className="amt-wrap">
            <span className="amt-pre">Rp</span>
            <input
              type="tel"
              className="fi"
              style={{
                paddingLeft: "42px",
                fontFamily: "'Fraunces', serif",
                fontSize: "22px",
                fontWeight: 900,
              }}
              placeholder="0"
              value={balanceStr}
              onChange={handleBalChange}
            />
          </div>
        </div>
      </div>
      <div className="m-actions">
        <button className="m-cancel" onClick={onClose}>
          Batal
        </button>
        <button className="m-save" onClick={handleSave}>
          ✅ Tambah
        </button>
      </div>
    </Modal>
  );
}
