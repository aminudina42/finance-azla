"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import EditPosModal from "@/components/Modals/EditPosModal";
import AlertModal from "@/components/Modals/AlertModal";
import type { Pos } from "@/lib/types";

function formatRp(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(n).toLocaleString("id-ID");
}

export default function DompetPage() {
  const { posList, addPos, updatePos, deletePos } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editIcon, setEditIcon] = useState("🍚");
  const [editAmount, setEditAmount] = useState(0);
  const [editIsGoal, setEditIsGoal] = useState(false);
  const [editGoalTarget, setEditGoalTarget] = useState(0);
  const [isAddMode, setIsAddMode] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const totalMonthlyBudget = posList
    .filter((p) => !p.is_goal)
    .reduce((sum, p) => sum + p.monthly_target, 0);

  const totalBalance = posList
    .filter((p) => !p.is_goal)
    .reduce((sum, p) => sum + p.current_balance, 0);

  const openEdit = (p: Pos) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditSub(p.sub || "");
    setEditIcon(p.icon);
    setEditAmount(p.monthly_target);
    setEditIsGoal(p.is_goal ?? false);
    setEditGoalTarget(p.goal_target ?? 0);
    setIsAddMode(false);
    setShowEditModal(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setEditName("");
    setEditSub("");
    setEditIcon("🍚");
    setEditAmount(0);
    setEditIsGoal(false);
    setEditGoalTarget(0);
    setIsAddMode(true);
    setShowEditModal(true);
  };

  const handleSave = (
    name: string,
    emoji: string,
    sub: string,
    amount: number,
    isGoal: boolean,
    goalTarget: number
  ) => {
    if (isAddMode) {
      addPos(name, emoji, sub, amount, isGoal, goalTarget);
    } else if (editingId) {
      updatePos(editingId, name, emoji, sub, amount, isGoal, goalTarget);
    }
  };

  const handleDeletePos = (pos: Pos) => {
    setAlertConfig({
      isOpen: true,
      title: "Hapus Pos?",
      message: `Apakah Anda yakin ingin menghapus pos "${pos.name}"? Pos ini tidak akan muncul lagi di siklus berikutnya.`,
      showCancel: true,
      onConfirm: () => {
        deletePos(pos.id);
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <main id="pg-dompet" className="page active" style={{ paddingBottom: "110px", position: "relative" }}>
      {/* Sky SVG backdrop selaras dengan Beranda */}
      <div className="sky" aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "260px", overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <svg viewBox="0 0 1000 300" preserveAspectRatio="xMidYMin slice" style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="skyDompetG" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#bfe5ff" stopOpacity=".9" />
              <stop offset="1" stopColor="#f7fbff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 170C80 150 85 108 165 124 220 70 290 98 323 140 390 102 438 117 478 155 548 99 625 119 665 155 725 86 808 100 840 144 900 91 960 113 1000 151V300H0Z"
            fill="url(#skyDompetG)"
          />
          <g fill="#fff" opacity=".58">
            <ellipse cx="755" cy="142" rx="82" ry="35" />
            <ellipse cx="809" cy="125" rx="61" ry="48" />
            <ellipse cx="867" cy="153" rx="83" ry="33" />
            <ellipse cx="922" cy="111" rx="55" ry="44" />
          </g>
          <path d="M610 222Q725 174 810 215T1000 205V300H610Z" fill="#dcefff" opacity=".65" />
        </svg>
      </div>

      {/* Header Halaman */}
      <div className="ph ph-border" style={{ position: "relative", zIndex: 1, background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/"
            style={{
              display: "grid",
              placeItems: "center",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#ffffff",
              border: "1px solid var(--border)",
              color: "var(--navy)",
              boxShadow: "0 2px 8px rgba(38, 111, 183, 0.06)",
              transition: "transform 0.15s ease",
            }}
            aria-label="Kembali ke Beranda"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "18px", height: "18px" }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h2 style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)", fontSize: "22px" }}>
              👛 Dompet &amp; Pos
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "2px" }}>
              Atur jatah dan amplop keuangan keluarga
            </p>
          </div>
        </div>
      </div>

      <div className="mgr-body" style={{ padding: "16px 20px", position: "relative", zIndex: 1 }}>
        {/* Ringkasan Anggaran Hero Card (Selaras dengan BudgetSummaryCard) */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(115deg, #ffffff 0%, #f7fbff 72%, #eaf6ff 100%)",
            border: "1px solid #c7e5fb",
            borderRadius: "20px",
            boxShadow: "0 10px 24px rgba(38, 111, 183, 0.08)",
            padding: "20px",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Watermark ilustrasi dompet */}
          <svg
            viewBox="0 0 220 190"
            fill="none"
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "-20px",
              bottom: "-25px",
              width: "160px",
              height: "140px",
              opacity: 0.18,
              pointerEvents: "none",
            }}
          >
            <path d="m45 75 85-30 48 19-87 32Z" fill="#4a9cf2" />
            <path d="M26 88 145 50l43 18-117 41Z" fill="#8ac8ff" />
            <path d="M35 91h134a12 12 0 0 1 12 12v58H35a12 12 0 0 1-12-12v-46a12 12 0 0 1 12-12Z" fill="#3290ed" />
            <path d="M139 113h42v27h-42a13.5 13.5 0 0 1 0-27Z" fill="#a4d8ff" />
            <circle cx="148" cy="126" r="4" fill="#fff" />
          </svg>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                Total Target Anggaran Bulanan
              </div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--navy)", marginTop: "4px", fontFamily: "var(--font-fraunces), serif" }}>
                {formatRp(totalMonthlyBudget)}
              </div>
            </div>
            <div
              style={{
                background: "#eaf5fc",
                color: "#287ff0",
                border: "1px solid #d8eaf8",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {posList.length} Pos Aktif
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "12px",
              borderTop: "1px solid #d8eaf8",
              fontSize: "13px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Sisa Saldo Amplop:</span>{" "}
              <strong style={{ color: totalBalance < 0 ? "var(--red)" : "var(--navy)", fontWeight: 750 }}>
                {formatRp(totalBalance)}
              </strong>
            </div>
            <Link
              href="/manager"
              style={{
                color: "var(--primary)",
                textDecoration: "none",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                background: "rgba(40, 127, 240, 0.08)",
                padding: "5px 12px",
                borderRadius: "8px",
                transition: "background 0.15s ease",
              }}
            >
              Setting Siklus →
            </Link>
          </div>
        </div>

        {/* Daftar Pos Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 750, color: "var(--navy)" }}>
            Daftar Pos Anggaran ({posList.length})
          </h3>
          <button
            type="button"
            onClick={openAdd}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
              color: "#ffffff",
              border: "none",
              fontSize: "12px",
              fontWeight: 750,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 4px 14px rgba(40, 127, 240, 0.25)",
              transition: "transform 0.15s ease",
            }}
          >
            ＋ Tambah Pos
          </button>
        </div>

        {/* Header Tabel Pos */}
        <div className="pos-hdr" style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          <span>Icon</span>
          <span>Nama Pos</span>
          <span style={{ textAlign: "right" }}>Jatah / Bln</span>
          <span style={{ textAlign: "center" }}>Aksi</span>
        </div>

        {/* Daftar Baris Pos */}
        {posList.map((pos) => (
          <div
            className="pos-row"
            key={pos.id}
            style={{
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              boxShadow: "0 2px 8px rgba(38, 111, 183, 0.04)",
              marginBottom: "8px",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <div className="pos-em" style={{ background: "var(--s1)", borderRadius: "10px" }}>{pos.icon}</div>
            <div>
              <div className="pos-name" style={{ color: "var(--navy)", fontWeight: 700 }}>
                {pos.name}
                {pos.is_goal && (
                  <span
                    style={{
                      fontSize: "9px",
                      marginLeft: "6px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(22, 168, 154, 0.12)",
                      color: "var(--teal)",
                      fontWeight: 700,
                      letterSpacing: ".5px",
                    }}
                  >
                    🎯 GOAL
                  </span>
                )}
              </div>
              <div className="pos-sub" style={{ color: "var(--muted)" }}>{pos.sub || "Amplop Keuangan"}</div>
            </div>
            <div className="pos-amt" style={{ color: "var(--navy)", fontWeight: 700 }}>{formatRp(pos.monthly_target)}</div>
            <div className="row-acts">
              <div
                className="ib e"
                onClick={() => openEdit(pos)}
                title="Edit Pos"
                role="button"
                tabIndex={0}
                style={{
                  background: "var(--s1)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                ✏️
              </div>
              <div
                className="ib d"
                onClick={() => handleDeletePos(pos)}
                title="Hapus Pos"
                role="button"
                tabIndex={0}
                style={{
                  background: "rgba(240, 68, 103, 0.08)",
                  border: "1px solid rgba(240, 68, 103, 0.2)",
                  borderRadius: "8px",
                }}
              >
                🗑
              </div>
            </div>
          </div>
        ))}

        {posList.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "#ffffff",
              borderRadius: "16px",
              border: "1.5px dashed var(--border)",
              color: "var(--muted)",
              marginTop: "10px",
            }}
          >
            Belum ada pos anggaran. Klik &quot;＋ Tambah Pos Baru&quot; untuk membuat amplop pertama Anda.
          </div>
        )}

        <button
          className="add-btn"
          onClick={openAdd}
          style={{
            marginTop: "16px",
            background: "#ffffff",
            border: "1.5px dashed var(--border)",
            color: "var(--primary)",
            fontWeight: 700,
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(38, 111, 183, 0.04)",
          }}
        >
          ＋ Tambah Pos Baru
        </button>
      </div>

      {/* Modal Edit / Tambah Pos */}
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

      {/* Alert / Konfirmasi Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
      />
    </main>
  );
}
