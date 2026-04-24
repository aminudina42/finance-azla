"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import EditPosModal from "@/components/Modals/EditPosModal";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function ManagerPage() {
  const { posList, addPos, updatePos, deletePos, gajianDate, startNewCycle } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editIcon, setEditIcon] = useState("🍚");
  const [editAmount, setEditAmount] = useState(0);
  const [isAddMode, setIsAddMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const openEdit = (p: { id: string; name: string; icon: string; sub: string; monthly_target: number }) => {
    setEditingId(p.id); setEditName(p.name); setEditSub(p.sub); setEditIcon(p.icon); setEditAmount(p.monthly_target);
    setIsAddMode(false); setShowEditModal(true);
  };
  const openAdd = () => {
    setEditingId(null); setEditName(""); setEditSub(""); setEditIcon("🍚"); setEditAmount(0);
    setIsAddMode(true); setShowEditModal(true);
  };
  const handleSave = (name: string, emoji: string, sub: string, amount: number) => {
    if (isAddMode) addPos(name, emoji, sub, amount);
    else if (editingId) updatePos(editingId, name, emoji, sub, amount);
  };

  return (
    <main id="pg-manager" className="page active">
      <div className="ph ph-border"><h2>⚙️ Manager Pos</h2><p>Kelola amplop keuangan keluarga</p></div>
      <div className="mgr-body">
        <div className="gajian-card">
          <div className="gc-left">
            <p>Gajian tiap tgl <strong style={{ color: "var(--text)" }}>{gajianDate}</strong></p>
            <h3>🎉 Mulai siklus baru?</h3>
          </div>
          <button className="gc-btn" onClick={() => { startNewCycle(); setShowConfirm(true); setTimeout(() => setShowConfirm(false), 3000); }}>
            {showConfirm ? "✅ Siklus Dimulai!" : "💰 Gajian Tiba!"}
          </button>
        </div>
        <div className="pos-hdr"><span>Icon</span><span>Nama</span><span style={{ textAlign: "right" }}>Jatah</span><span>Aksi</span></div>
        {posList.map((pos) => (
          <div className="pos-row" key={pos.id}>
            <div className="pos-em">{pos.icon}</div>
            <div><div className="pos-name">{pos.name}</div><div className="pos-sub">{pos.sub}</div></div>
            <div className="pos-amt">{formatRp(pos.monthly_target)}</div>
            <div className="row-acts">
              <div className="ib e" onClick={() => openEdit(pos)}>✏️</div>
              <div className="ib d" onClick={() => deletePos(pos.id)}>🗑</div>
            </div>
          </div>
        ))}
        <button className="add-btn" onClick={openAdd}>＋ Tambah Pos Baru</button>
      </div>
      <EditPosModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} posName={editName} posSub={editSub} posEmoji={editIcon} posAmount={editAmount} onSave={handleSave} title={isAddMode ? "＋ Tambah Pos Baru" : "✏️ Edit Pos Keuangan"} />
    </main>
  );
}
