"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import EditPosModal from "@/components/Modals/EditPosModal";
import NewCycleModal from "@/components/Modals/NewCycleModal";
import AlertModal from "@/components/Modals/AlertModal";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function ManagerPage() {
  const { posList, addPos, updatePos, deletePos, gajianDate, startNewCycle, logoSettings, updateLogoSettings } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleUpdateType = async (type: "emoji" | "image") => {
    await updateLogoSettings({ ...logoSettings, type });
  };
  const handleUpdateEmoji = async (emoji: string) => {
    await updateLogoSettings({ ...logoSettings, emoji });
  };
  const handleUpdateBg = async (bg: string) => {
    await updateLogoSettings({ ...logoSettings, bg });
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExtension = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExtension}`;

      // Upload file directly to Supabase storage bucket 'logos'
      const { data, error } = await supabase.storage
        .from("logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      // Save public URL to logoSettings
      await updateLogoSettings({
        ...logoSettings,
        type: "image",
        image: publicUrl,
      });

      alert("Logo berhasil diunggah ke Supabase Storage!");
    } catch (err: any) {
      console.error("Gagal mengupload logo:", err);
      alert("Gagal mengupload logo ke Supabase Storage: " + err.message);
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editIcon, setEditIcon] = useState("🍚");
  const [editAmount, setEditAmount] = useState(0);
  const [editIsGoal, setEditIsGoal] = useState(false);
  const [editGoalTarget, setEditGoalTarget] = useState(0);
  const [isAddMode, setIsAddMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string}>({ isOpen: false, title: "", message: "" });

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
          <button className="gc-btn" onClick={() => {
            const today = new Date().getDate();
            if (today !== gajianDate) {
              setAlertConfig({
                isOpen: true,
                title: "Belum Waktunya!",
                message: `Belum waktunya gajian! Gajian Anda diatur pada tanggal ${gajianDate}.`
              });
              return;
            }
            setShowNewCycleModal(true);
          }}>
            {showConfirm ? "✅ Siklus Dimulai!" : "💰 Gajian Tiba!"}
          </button>
        </div>

        {/* Logo settings card */}
        <div className="gajian-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="gc-left">
              <p>Pengaturan Website</p>
              <h3>🖼️ Logo & Ikon Homescreen</h3>
            </div>
          </div>
          
          {/* Logo preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px", background: "var(--s3)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "14px",
              background: logoSettings.bg || "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              overflow: "hidden",
              border: "1px solid var(--border)",
              flexShrink: 0
            }}>
              {logoSettings.type === "image" && logoSettings.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSettings.image} alt="Logo Preview" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} />
              ) : (
                logoSettings.emoji
              )}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text)" }}>Tampilan Logo Aktif</div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", lineHeight: "1.4" }}>
                Digunakan sebagai favicon, ikon homescreen (PWA), dan logo header website.
              </div>
            </div>
          </div>

          {/* Selector Type: Emoji vs Image */}
          <div className="type-toggle" style={{ marginTop: "4px" }}>
            <div
              className={`type-opt ${logoSettings.type === "emoji" ? "active-in" : ""}`}
              onClick={() => handleUpdateType("emoji")}
              style={{ padding: "8px", fontSize: "11px" }}
            >
              🎨 Emoji + Background
            </div>
            <div
              className={`type-opt ${logoSettings.type === "image" ? "active-out" : ""}`}
              onClick={() => handleUpdateType("image")}
              style={{ padding: "8px", fontSize: "11px" }}
            >
              📷 Upload Gambar
            </div>
          </div>

          {/* Conditional inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
            {logoSettings.type === "emoji" ? (
              <div className="fg">
                <div className="fl" style={{ fontSize: "9px" }}>Pilih Emoji</div>
                <input
                  type="text"
                  className="fi"
                  value={logoSettings.emoji}
                  onChange={(e) => handleUpdateEmoji(e.target.value)}
                  placeholder="Ketik emoji, misal: 💳, 🏦, 💰"
                  maxLength={5}
                  style={{ padding: "8px 12px", fontSize: "13px" }}
                />
              </div>
            ) : (
              <div className="fg">
                <div className="fl" style={{ fontSize: "9px" }}>Upload File Logo (PNG/JPG)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                    id="logo-image-file-input"
                  />
                  <label
                    htmlFor="logo-image-file-input"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "2px dashed var(--border)",
                      cursor: "pointer",
                      background: "var(--s2)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "var(--purple)",
                      textAlign: "center",
                      transition: "border-color 0.2s"
                    }}
                  >
                    📁 Pilih Gambar dari Perangkat
                  </label>
                  <div style={{ fontSize: "10px", color: "var(--muted)", textAlign: "center", lineHeight: "1.4" }}>
                    Format kotak (square) min. 512x512 piksel direkomendasikan. Gunakan file PNG transparan jika ingin memadukannya dengan preset background warna di bawah.
                  </div>
                </div>
              </div>
            )}

            {/* Background settings - available for BOTH emoji and transparent images */}
            <div className="fg">
              <div className="fl" style={{ fontSize: "9px" }}>Pilih Preset Background (Berlaku untuk Emoji & Gambar Transparan)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "2px" }}>
                {[
                  "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
                  "linear-gradient(135deg, #00c9a7 0%, #8b72ff 100%)",
                  "linear-gradient(135deg, #ffb340 0%, #ff4f6d 100%)",
                  "linear-gradient(135deg, #13131a 0%, #2e2e3e 100%)",
                  "#8b72ff",
                  "#ff72b8",
                  "#00c9a7",
                  "#ffb340",
                  "transparent",
                ].map((presetBg) => (
                  <div
                    key={presetBg}
                    onClick={() => handleUpdateBg(presetBg)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: presetBg === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : presetBg,
                      backgroundSize: presetBg === "transparent" ? "8px 8px" : "auto",
                      backgroundPosition: presetBg === "transparent" ? "0 0, 0 4px, 4px -4px, -4px 0px" : "auto",
                      border: logoSettings.bg === presetBg ? "2.5px solid #fff" : "1px solid var(--border)",
                      cursor: "pointer",
                      boxShadow: logoSettings.bg === presetBg ? "0 0 6px rgba(255,255,255,0.4)" : "none",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      color: "#333",
                      fontWeight: "bold"
                    }}
                  >
                    {presetBg === "transparent" && "❌"}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
                <span className="fl" style={{ fontSize: "9px" }}>Custom Warna/Gradient CSS</span>
                <input
                  type="text"
                  className="fi"
                  style={{ padding: "8px 12px", fontSize: "12px" }}
                  value={logoSettings.bg}
                  onChange={(e) => handleUpdateBg(e.target.value)}
                  placeholder="Contoh: #8b72ff atau linear-gradient(135deg, ...)"
                />
              </div>
            </div>
          </div>
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
      <NewCycleModal
        isOpen={showNewCycleModal}
        onClose={() => setShowNewCycleModal(false)}
        onConfirm={(newBudgets) => {
          startNewCycle(newBudgets);
          setShowNewCycleModal(false);
          setShowConfirm(true);
          setTimeout(() => setShowConfirm(false), 3000);
        }}
      />
      <AlertModal 
        isOpen={alertConfig.isOpen} 
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} 
        title={alertConfig.title} 
        message={alertConfig.message} 
      />
    </main>
  );
}
