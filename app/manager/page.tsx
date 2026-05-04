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
  const [editIsGoal, setEditIsGoal] = useState(false);
  const [editGoalTarget, setEditGoalTarget] = useState(0);
  const [isAddMode, setIsAddMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const openEdit = (p: { id: string; name: string; icon: string; sub: string; monthly_target: number; is_goal: boolean; goal_target: number }) => {
    setEditingId(p.id); setEditName(p.name); setEditSub(p.sub); setEditIcon(p.icon); setEditAmount(p.monthly_target);
    setEditIsGoal(p.is_goal); setEditGoalTarget(p.goal_target);
    setIsAddMode(false); setShowEditModal(true);
  };
  const openAdd = () => {
    setEditingId(null); setEditName(""); setEditSub(""); setEditIcon("🍚"); setEditAmount(0);
    setEditIsGoal(false); setEditGoalTarget(0);
    setIsAddMode(true); setShowEditModal(true);
  };
  const handleSave = (name: string, emoji: string, sub: string, amount: number, isGoal: boolean, goalTarget: number) => {
    if (isAddMode) addPos(name, emoji, sub, amount, isGoal, goalTarget);
    else if (editingId) updatePos(editingId, name, emoji, sub, amount, isGoal, goalTarget);
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
            <div>
              <div className="pos-name">
                {pos.name}
                {pos.is_goal && (
                  <span style={{ fontSize: "9px", marginLeft: "6px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0,201,167,.12)", color: "var(--teal)", fontWeight: 700, letterSpacing: ".5px" }}>
                    🎯 GOAL
                  </span>
                )}
              </div>
              <div className="pos-sub">{pos.sub}</div>
            </div>
            <div className="pos-amt">{formatRp(pos.monthly_target)}</div>
            <div className="row-acts">
              <div className="ib e" onClick={() => openEdit(pos)}>✏️</div>
              <div className="ib d" onClick={() => deletePos(pos.id)}>🗑</div>
            </div>
          </div>
        ))}
        <button className="add-btn" onClick={openAdd}>＋ Tambah Pos Baru</button>
      </div>
      <EditPosModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        posName={editName}
        posSub={editSub}
        posEmoji={editIcon}
        posAmount={editAmount}
        posIsGoal={editIsGoal}
        posGoalTarget={editGoalTarget}
        onSave={handleSave}
        title={isAddMode ? "＋ Tambah Pos Baru" : "✏️ Edit Pos Keuangan"}
      />
    </main>
  );
}
