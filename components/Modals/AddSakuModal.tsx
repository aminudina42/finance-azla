"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/store";

const SAKU_EMOJIS = [
  "💰", "🏦", "🚗", "⚡", "💊", "✈️", "🎓", "🏠", "🎮", "👦", "👧", "🧒",
  "🛒", "📱", "🎁", "💳", "🔧", "🌴", "🐾", "💄",
];

interface AddSakuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string, initialBalance: number, type: "standalone" | "linked", linkedPosId: string | null) => void;
}

export default function AddSakuModal({ isOpen, onClose, onSave }: AddSakuModalProps) {
  const { posList } = useApp();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💰");
  const [balanceStr, setBalanceStr] = useState("");
  const [sakuType, setSakuType] = useState<"standalone" | "linked">("standalone");
  const [linkedPosId, setLinkedPosId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setIcon("💰");
      setBalanceStr("");
      setSakuType("standalone");
      setLinkedPosId("");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    const rawNum = Number(balanceStr.replace(/\D/g, ""));
    const finalLinkedPos = sakuType === "linked" && linkedPosId ? linkedPosId : null;
    onSave(name.trim(), icon, rawNum, sakuType, finalLinkedPos);
    onClose();
  };

  const handleBalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) { setBalanceStr(""); return; }
    setBalanceStr(Number(rawValue).toLocaleString("id-ID"));
  };

  const linkablePos = posList.filter((p) => !p.is_goal && p.name !== "Tabungan");

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">💰 Tambah Saku Baru</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* Name */}
        <div className="fg">
          <div className="fl">Nama Saku</div>
          <input
            type="text"
            className="fi"
            placeholder="Contoh: Service Kendaraan, Raka, Darurat…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Icon */}
        <div className="fg">
          <div className="fl">Icon</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "8px",
          }}>
            {SAKU_EMOJIS.map((em) => (
              <div
                key={em}
                className={`eo ${em === icon ? "sel" : ""}`}
                onClick={() => setIcon(em)}
                style={{ fontSize: "20px", textAlign: "center" }}
              >
                {em}
              </div>
            ))}
          </div>
        </div>

        {/* Saldo awal */}
        <div className="fg">
          <div className="fl">Saldo Awal (opsional)</div>
          <div className="amt-wrap">
            <span className="amt-pre">Rp</span>
            <input
              type="tel"
              className="fi"
              style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 900 }}
              placeholder="0"
              value={balanceStr}
              onChange={handleBalChange}
            />
          </div>
        </div>

        {/* Tipe Saku */}
        <div className="fg">
          <div className="fl">Tipe Saku</div>
          <div className="type-toggle">
            <div
              className={`type-opt ${sakuType === "standalone" ? "active-in" : ""}`}
              onClick={() => setSakuType("standalone")}
            >
              Mandiri
            </div>
            <div
              className={`type-opt ${sakuType === "linked" ? "active-out" : ""}`}
              onClick={() => setSakuType("linked")}
            >
              Terhubung ke Pos
            </div>
          </div>
          {sakuType === "linked" && (
            <div style={{
              marginTop: "8px",
              padding: "10px 12px",
              background: "var(--s2)",
              borderRadius: "10px",
              fontSize: "12px",
              color: "var(--muted)",
              lineHeight: "1.5",
            }}>
              💡 Sisa budget Pos akan masuk ke Saku ini setiap akhir siklus.
            </div>
          )}
        </div>

        {/* Link Pos selector */}
        {sakuType === "linked" && (
          <div className="fg">
            <div className="fl">Hubungkan ke Pos</div>
            <div className="sw">
              <select
                className="fi"
                value={linkedPosId}
                onChange={(e) => setLinkedPosId(e.target.value)}
              >
                <option value="">— Pilih Pos —</option>
                {linkablePos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
              <span className="sa">▼</span>
            </div>
          </div>
        )}
      </div>

      <div className="m-actions">
        <button className="m-cancel" onClick={onClose}>Batal</button>
        <button
          className="m-save"
          onClick={handleSave}
          style={{ opacity: !name.trim() ? 0.5 : 1 }}
        >
          Tambah Saku
        </button>
      </div>
    </Modal>
  );
}
