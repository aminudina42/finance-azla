"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Member } from "@/lib/types";
import NewCycleModal from "@/components/Modals/NewCycleModal";
import AlertModal from "@/components/Modals/AlertModal";
import EditMemberModal from "@/components/Modals/EditMemberModal";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function ManagerPage() {
  const {
    gajianDate,
    startNewCycle,
    logoSettings,
    updateLogoSettings,
    currentKeluarga,
    currentMember,
    sessionUser,
    logout,
    updateMember,
    removeMember,
    leaveFamily,
  } = useApp();

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string}>({ isOpen: false, title: "", message: "" });
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // State untuk Kelola Anggota
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editMemberModalOpen, setEditMemberModalOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Gagal logout:", err);
      setIsLoggingOut(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setMembersList(data as Member[]);
      }
    } catch (err) {
      console.error("Gagal memuat anggota keluarga:", err);
    }
  };

  useEffect(() => {
    loadMembers();

    // Subscribe ke realtime changes pada tabel members keluarga ini
    if (!currentKeluarga?.id) return;
    const channel = supabase
      .channel(`family-members-mgr-${currentKeluarga.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members",
          filter: `keluarga_id=eq.${currentKeluarga.id}`,
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentKeluarga?.id]);

  const handleSaveMember = async (memberId: string, displayName: string, role: "admin" | "member") => {
    const res = await updateMember(memberId, displayName, role);
    if (!res.success) {
      throw new Error(res.error || "Gagal memperbarui profil anggota.");
    }
    await loadMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    const res = await removeMember(memberId);
    if (!res.success) {
      throw new Error(res.error || "Gagal mengeluarkan anggota.");
    }
    await loadMembers();
  };

  const handleLeaveFamily = async () => {
    const res = await leaveFamily();
    if (!res.success) {
      throw new Error(res.error || "Gagal keluar dari keluarga.");
    }
  };

  const inviteCode = currentKeluarga?.invite_code || "AZLA-DEFAULT";

  const handleCopyInviteCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayMembers: Member[] = membersList.length > 0 ? membersList : [
    {
      id: "admin-1",
      keluarga_id: currentKeluarga?.id || "",
      display_name: currentMember?.display_name || "Anda (Suami)",
      role: "admin",
      created_at: "",
      updated_at: "",
    },
    {
      id: "member-2",
      keluarga_id: currentKeluarga?.id || "",
      display_name: "Istri",
      role: "member",
      created_at: "",
      updated_at: "",
    },
  ];

  return (
    <main id="pg-manager" className="page active" style={{ paddingBottom: "110px" }}>
      <div className="ph ph-border">
        <h2>⚙️ Pengaturan &amp; Keluarga</h2>
        <p>Kelola profil rumah tangga, siklus, dan preferensi aplikasi</p>
      </div>
      <div className="mgr-body">
        {/* 1. Mulai Siklus Baru */}
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

        {/* 2. Informasi Keluarga & Kode Undangan */}
        <div className="gajian-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="gc-left">
              <p style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🏠 Informasi Keluarga</span>
                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(40,127,240,0.12)", color: "var(--navy)", fontWeight: 700 }}>
                  MULTI-TENANT
                </span>
              </p>
              <h3 style={{ fontSize: "18px", marginTop: "2px" }}>
                {currentKeluarga?.nama_keluarga || "Keluarga Azla"}
              </h3>
            </div>
          </div>

          {/* Box Kode Undangan */}
          <div style={{
            background: "var(--s3)",
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Kode Undangan Keluarga
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Gunakan kode ini agar pasangan atau anggota baru bisa bergabung
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                flex: 1,
                padding: "10px 14px",
                background: "var(--card, #ffffff)",
                borderRadius: "8px",
                border: "1.5px dashed var(--border)",
                fontFamily: "monospace",
                fontSize: "16px",
                fontWeight: 750,
                letterSpacing: "1.5px",
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span>{inviteCode}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyInviteCode}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: copied ? "var(--teal)" : "linear-gradient(135deg, var(--navy), #2563eb)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                {copied ? "Tersalin! ✅" : "Salin 📋"}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Daftar Anggota Keluarga (Art-Directed Household Roll) */}
        <div className="gajian-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="gc-left">
              <p style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>👨‍👩‍👧‍👦 Hak Akses &amp; Anggota</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 750,
                    padding: "2px 7px",
                    borderRadius: "6px",
                    background: "rgba(40,127,240,0.12)",
                    color: "var(--navy)"
                  }}
                >
                  {displayMembers.length} PENGGUNA
                </span>
              </p>
              <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "19px", color: "var(--navy)", fontWeight: 750, marginTop: "2px" }}>
                Anggota Keluarga Terhubung
              </h3>
            </div>
            {currentMember?.role === "admin" && (
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 750,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(37,99,235,0.1)",
                  color: "#2563eb",
                  border: "1px solid rgba(37,99,235,0.2)"
                }}
              >
                👑 Mode Admin
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {displayMembers.map((m, idx) => {
              const isSelf = m.id === sessionUser?.id;
              const isTargetAdmin = m.role === "admin";
              const adminCount = displayMembers.filter((item) => item.role === "admin").length;
              const isSoleAdmin = isTargetAdmin && adminCount <= 1;
              const canEdit = (currentMember?.role === "admin") || isSelf;

              return (
                <div
                  key={m.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: isSelf ? "linear-gradient(135deg, #ffffff 0%, #f4f9ff 100%)" : "var(--s3)",
                    border: isSelf ? "1.5px solid #c7e0f8" : "1px solid var(--border)",
                    boxShadow: isSelf ? "0 2px 8px rgba(40, 127, 240, 0.06)" : "none",
                    gap: "10px"
                  }}
                >
                  {/* Left: Avatar & Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: "11px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        background: isTargetAdmin
                          ? "linear-gradient(135deg, #102d55, #2563eb)"
                          : "linear-gradient(135deg, #059669, #10b981)",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        fontSize: "15px",
                        fontWeight: 800,
                        flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(16,45,85,0.12)"
                      }}
                    >
                      {m.display_name.charAt(0).toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "13.5px",
                            fontWeight: 750,
                            color: "var(--navy)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {m.display_name}
                        </span>
                        {isSelf && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 800,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "rgba(40,127,240,0.14)",
                              color: "var(--primary)",
                              letterSpacing: "0.2px"
                            }}
                          >
                            Anda
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "1px" }}>
                        {isTargetAdmin
                          ? isSoleAdmin
                            ? "👑 Admin Utama (Tunggal)"
                            : "👑 Pengelola Keluarga"
                          : "👤 Anggota Keluarga"}
                      </div>
                    </div>
                  </div>

                  {/* Right: Badge & Action */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 750,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: isTargetAdmin ? "rgba(37,99,235,0.12)" : "rgba(16,185,129,0.12)",
                        color: isTargetAdmin ? "#2563eb" : "#059669",
                        border: isTargetAdmin ? "1px solid rgba(37,99,235,0.2)" : "1px solid rgba(16,185,129,0.2)"
                      }}
                    >
                      {isTargetAdmin ? "Admin" : "Member"}
                    </span>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(m);
                          setEditMemberModalOpen(true);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#ffffff",
                          border: "1.2px solid var(--border)",
                          color: "var(--navy)",
                          fontSize: "11.5px",
                          fontWeight: 750,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          boxShadow: "0 1px 4px rgba(16, 45, 85, 0.05)",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--primary)";
                          e.currentTarget.style.color = "var(--primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.color = "var(--navy)";
                        }}
                      >
                        <span>✏️</span>
                        <span>{currentMember?.role === "admin" ? "Kelola" : "Edit Nama"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.4", marginTop: "2px" }}>
            💡 {currentMember?.role === "admin"
              ? "Sebagai Admin, Anda dapat mengatur peran, memperbarui nama panggilan, atau mengeluarkan anggota bila diperlukan."
              : "Setiap anggota memiliki akses bersama untuk mencatat transaksi dan memantau keuangan keluarga."}
          </div>
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


        {/* Shortcut Navigasi ke Menu Dompet / Setting Pos */}
        <div className="gajian-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="gc-left">
              <p>Pengaturan Pos Anggaran</p>
              <h3>👛 Kelola Amplop &amp; Pos</h3>
            </div>
            <Link
              href="/dompet"
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, var(--teal), #00a88c)",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(0,201,167,0.2)"
              }}
            >
              Buka Dompet →
            </Link>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.4" }}>
            Pengaturan rincian pos keuangan, jatah bulanan, dan target tabungan sekarang dapat diakses langsung melalui menu <strong>Dompet</strong>.
          </div>
        </div>

        {/* 5. Sesi & Akun Pengguna (Art-directed Passport Card) */}
        <div
          className="gajian-card"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "14px",
            background: "linear-gradient(160deg, #ffffff 0%, #fbfdff 65%, #fff5f6 100%)",
            border: "1px solid #ffd4db",
            boxShadow: "0 10px 28px rgba(16, 45, 85, 0.04), 0 1px 3px rgba(240, 68, 103, 0.06)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Subtle watermark stamp in background */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "-12px",
              bottom: "-14px",
              fontSize: "88px",
              opacity: 0.05,
              pointerEvents: "none",
              userSelect: "none"
            }}
          >
            🛡️
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="gc-left">
              <p style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.18)"
                  }}
                />
                <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                  Sesi &amp; Keamanan Akun
                </span>
              </p>
              <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "19px", color: "var(--navy)", fontWeight: 750, marginTop: "2px" }}>
                Identitas Pengguna
              </h3>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 750,
                letterSpacing: "0.5px",
                padding: "3px 8px",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#059669",
                border: "1px solid rgba(16, 185, 129, 0.2)"
              }}
            >
              ONLINE • CLOUD
            </span>
          </div>

          {/* User Identity Panel */}
          <div
            style={{
              background: "#ffffff",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(16, 45, 85, 0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              {sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sessionUser.user_metadata.avatar_url || sessionUser.user_metadata.picture}
                  alt="Avatar"
                  crossOrigin="anonymous"
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 8px rgba(16,45,85,0.14)",
                    objectFit: "cover",
                    flexShrink: 0
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--navy), #2563eb)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: 800,
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(16,45,85,0.14)"
                  }}
                >
                  {(currentMember?.display_name || sessionUser?.email || "U").charAt(0).toUpperCase()}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 750,
                    color: "var(--navy)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {currentMember?.display_name || sessionUser?.user_metadata?.full_name || sessionUser?.email?.split("@")[0] || "Pengguna Dompet"}
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: "2px"
                  }}
                >
                  {sessionUser?.email || "Tersambung via Google Auth"}
                </div>
              </div>
            </div>

            {/* Role & Family Pill */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 750,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: currentMember?.role === "admin" ? "rgba(37,99,235,0.12)" : "rgba(16,185,129,0.12)",
                  color: currentMember?.role === "admin" ? "#2563eb" : "#059669"
                }}
              >
                {currentMember?.role === "admin" ? "👑 Admin" : "👤 Anggota"}
              </span>
              <span style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: 600 }}>
                {currentKeluarga?.nama_keluarga || "Keluarga Azla"}
              </span>
            </div>
          </div>

          {/* Logout Action */}
          <div style={{ marginTop: "2px" }}>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: "12px",
                background: "linear-gradient(180deg, #ffffff 0%, #fff1f2 100%)",
                border: "1.5px solid #fecdd3",
                color: "#be123c",
                fontWeight: 750,
                fontSize: "13.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 6px rgba(190, 18, 60, 0.05)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ffe4e6";
                e.currentTarget.style.borderColor = "#fda4af";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(180deg, #ffffff 0%, #fff1f2 100%)";
                e.currentTarget.style.borderColor = "#fecdd3";
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🚪</span>
                <span>Keluar dari Akun</span>
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#e11d48", letterSpacing: "0.2px" }}>
                Logout →
              </span>
            </button>
            <div style={{ fontSize: "11px", color: "var(--muted)", textAlign: "center", marginTop: "8px", lineHeight: "1.4" }}>
              Sesi login pada perangkat ini akan diakhiri. Catatan keuangan keluarga Anda tetap tersimpan aman di cloud.
            </div>
          </div>
        </div>
      </div>
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
      <AlertModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Akhiri Sesi Dompet Azla?"
        message={`Apakah Anda yakin ingin keluar dari akun ${sessionUser?.email || "ini"}? Anda dapat masuk kembali dengan akun Google Anda kapan saja.`}
        confirmText={isLoggingOut ? "Mengakhiri Sesi..." : "Ya, Keluar Akun"}
        cancelText="Tetap Masuk"
        confirmColor="#f04467"
        onConfirm={handleLogout}
      />
      <EditMemberModal
        isOpen={editMemberModalOpen}
        onClose={() => {
          setEditMemberModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        isAdmin={currentMember?.role === "admin"}
        isSelf={selectedMember?.id === sessionUser?.id}
        isSoleAdmin={
          selectedMember?.role === "admin" &&
          displayMembers.filter((m) => m.role === "admin").length <= 1
        }
        onSave={handleSaveMember}
        onRemove={handleRemoveMember}
        onLeaveFamily={handleLeaveFamily}
      />
    </main>
  );
}
