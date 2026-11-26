"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/store";
import VectorIconPicker from "@/components/ui/vector-icon-picker";
import { parseGoldInput, sanitizeGoldInputString } from "@/lib/saku-utils";

interface AddSakuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    icon: string,
    initialBalance: number,
    type: "standalone" | "linked",
    linkedPosId: string | null,
    initialGoldBalance: number
  ) => void;
}

export default function AddSakuModal({ isOpen, onClose, onSave }: AddSakuModalProps) {
  const { posList } = useApp();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("wallet");
  const [balanceStr, setBalanceStr] = useState("");
  const [goldBalanceStr, setGoldBalanceStr] = useState("");
  const [sakuType, setSakuType] = useState<"standalone" | "linked">("standalone");
  const [linkedPosId, setLinkedPosId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setIcon("wallet");
      setBalanceStr("");
      setGoldBalanceStr("");
      setSakuType("standalone");
      setLinkedPosId("");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    const rawNum = Number(balanceStr.replace(/\D/g, ""));
    const rawGold = parseGoldInput(goldBalanceStr);
    const finalLinkedPos = sakuType === "linked" && linkedPosId ? linkedPosId : null;
    onSave(name.trim(), icon, rawNum, sakuType, finalLinkedPos, rawGold);
    onClose();
  };

  const handleBalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) { setBalanceStr(""); return; }
    setBalanceStr(Number(rawValue).toLocaleString("id-ID"));
  };

  const handleGoldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGoldBalanceStr(sanitizeGoldInputString(e.target.value));
  };

  const linkablePos = posList.filter((p) => !p.is_goal && p.name !== "Tabungan");

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">Tambah Saku Baru</div>
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
          <VectorIconPicker
            value={icon}
            onChange={(slug) => setIcon(slug)}
            label="Ikon Saku"
          />
        </div>

        {/* Saldo awal Uang */}
        <div className="fg">
          <div className="fl">Saldo Awal Uang (opsional)</div>
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

        {/* Saldo awal Emas */}
        <div className="fg">
          <div className="fl" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Saldo Awal Emas (opsional)</span>
            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#8A5A00" }}>Satuan gram</span>
          </div>
          <div className="amt-wrap" style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="decimal"
              className="fi"
              style={{
                paddingRight: "44px",
                fontFamily: "'Fraunces', serif",
                fontSize: "20px",
                fontWeight: 800,
                background: "#FBF3DB55",
                borderColor: "#EBD9A8",
                color: "#5C3C00",
              }}
              placeholder="0"
              value={goldBalanceStr}
              onChange={handleGoldChange}
            />
            <span
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "13px",
                fontWeight: 750,
                color: "#8A5A00",
                pointerEvents: "none",
              }}
            >
              gr
            </span>
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
