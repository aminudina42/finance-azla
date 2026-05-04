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
  posIsGoal?: boolean;
  posGoalTarget?: number;
  onSave: (name: string, emoji: string, sub: string, amount: number, isGoal: boolean, goalTarget: number) => void;
  title?: string;
}

export default function EditPosModal({
  isOpen,
  onClose,
  posName,
  posEmoji,
  posSub,
  posAmount,
  posIsGoal = false,
  posGoalTarget = 0,
  onSave,
  title = "✏️ Edit Pos Keuangan",
}: EditPosModalProps) {
  const [name, setName] = useState(posName);
  const [emoji, setEmoji] = useState(posEmoji);
  const [sub, setSub] = useState(posSub);
  const [amountStr, setAmountStr] = useState(posAmount ? posAmount.toLocaleString("id-ID") : "");
  const [isGoal, setIsGoal] = useState(posIsGoal);
  const [goalTargetStr, setGoalTargetStr] = useState(posGoalTarget ? posGoalTarget.toLocaleString("id-ID") : "");

  useEffect(() => {
    setName(posName);
    setEmoji(posEmoji);
    setSub(posSub);
    setAmountStr(posAmount ? posAmount.toLocaleString("id-ID") : "");
    setIsGoal(posIsGoal);
    setGoalTargetStr(posGoalTarget ? posGoalTarget.toLocaleString("id-ID") : "");
  }, [posName, posEmoji, posSub, posAmount, posIsGoal, posGoalTarget, isOpen]);

  const handleSave = () => {
    const rawNum = Number(amountStr.replace(/\D/g, ""));
    const rawGoal = Number(goalTargetStr.replace(/\D/g, ""));
    onSave(name, emoji, sub, rawNum, isGoal, isGoal ? rawGoal : 0);
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

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setGoalTargetStr("");
      return;
    }
    setGoalTargetStr(Number(rawValue).toLocaleString("id-ID"));
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

        {/* Goal toggle */}
        <div className="fg">
          <div className="fl">🎯 Savings Goal</div>
          <div
            className="goal-toggle"
            onClick={() => setIsGoal(!isGoal)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "var(--r-sm)",
              background: isGoal ? "rgba(0,201,167,.1)" : "var(--s2)",
              border: `1px solid ${isGoal ? "rgba(0,201,167,.3)" : "var(--border)"}`,
              cursor: "pointer",
              transition: "all .2s",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "22px",
                borderRadius: "11px",
                background: isGoal ? "var(--teal)" : "var(--border)",
                position: "relative",
                transition: "background .2s",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: "2px",
                  left: isGoal ? "20px" : "2px",
                  transition: "left .2s",
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: isGoal ? "var(--teal)" : "var(--muted)" }}>
                {isGoal ? "Goal Aktif" : "Bukan Goal"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                Pos Goal tidak direset saat siklus baru
              </div>
            </div>
          </div>
        </div>

        {/* Goal target — only visible when isGoal is true */}
        {isGoal && (
          <div className="fg">
            <div className="fl">🎯 Target Akhir Goal</div>
            <div className="amt-wrap">
              <span className="amt-pre" style={{ fontSize: "14px" }}>
                Rp
              </span>
              <input
                type="tel"
                className="fi"
                value={goalTargetStr}
                onChange={handleGoalChange}
                style={{
                  paddingLeft: "42px",
                  fontFamily: "'Fraunces', serif",
                  fontSize: "22px",
                  fontWeight: 900,
                  borderColor: "rgba(0,201,167,.3)",
                }}
                placeholder="50.000.000"
              />
            </div>
          </div>
        )}
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
