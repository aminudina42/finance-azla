"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/store";
import type { Child } from "@/lib/types";

const SAKU_EMOJIS = [
  "💰", "🏦", "🚗", "⚡", "💊", "✈️", "🎓", "🏠", "🎮", "👦", "👧", "🧒",
  "🛒", "📱", "🎁", "💳", "🔧", "🌴", "🐾", "💄",
];

interface EditSakuModalProps {
  isOpen: boolean;
  onClose: () => void;
  saku: Child | null;
  onSave: (id: string, name: string, icon: string, type: "standalone" | "linked", linkedPosId: string | null) => void;
  onDelete: (id: string) => void;
}

export default function EditSakuModal({ isOpen, onClose, saku, onSave, onDelete }: EditSakuModalProps) {
  const { posList } = useApp();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💰");
  const [sakuType, setSakuType] = useState<"standalone" | "linked">("standalone");
  const [linkedPosId, setLinkedPosId] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen && saku) {
      setName(saku.name);
      setIcon(saku.icon);
      setSakuType(saku.type ?? "standalone");
      setLinkedPosId(saku.linked_pos_id ?? "");
      setConfirmDelete(false);
    }
  }, [isOpen, saku]);

  const handleSave = () => {
    if (!name.trim() || !saku) return;
    const finalLinkedPos = sakuType === "linked" && linkedPosId ? linkedPosId : null;
    onSave(saku.id, name.trim(), icon, sakuType, finalLinkedPos);
    onClose();
  };

  const handleDelete = () => {
    if (!saku) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(saku.id);
    onClose();
  };

  const linkablePos = posList.filter((p) => !p.is_goal && p.name !== "Tabungan");

  if (!saku) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">✏️ Edit Saku</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* Name */}
        <div className="fg">
          <div className="fl">Nama Saku</div>
          <input
            type="text"
            className="fi"
            placeholder="Nama saku…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Icon */}
        <div className="fg">
          <div className="fl">Icon</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
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
            <div style={{ marginTop: "8px", padding: "10px 12px", background: "var(--s2)", borderRadius: "10px", fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" }}>
              💡 Sisa saldo Pos ini akan otomatis masuk ke Saku saat siklus berganti.
            </div>
          </div>
        )}
      </div>

      <div className="m-actions" style={{ flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
          <button className="m-cancel" onClick={onClose} style={{ flex: 1 }}>Batal</button>
          <button className="m-save" onClick={handleSave} style={{ flex: 2 }}>Simpan</button>
        </div>
        <button
          onClick={handleDelete}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            border: "none",
            background: confirmDelete ? "var(--red)" : "rgba(255,79,109,.12)",
            color: "var(--red)",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all .2s",
          }}
        >
          {confirmDelete ? "Yakin? Tap lagi untuk hapus" : "Hapus Saku"}
        </button>
      </div>
    </Modal>
  );
}
