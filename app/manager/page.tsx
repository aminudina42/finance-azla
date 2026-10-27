"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Member, StatusKeluarga } from "@/lib/types";
import { validateImageType, compressAndResizeImage, extractStoragePath } from "@/lib/image-utils";
import NewCycleModal from "@/components/Modals/NewCycleModal";
import AlertModal from "@/components/Modals/AlertModal";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import EditMemberModal from "@/components/Modals/EditMemberModal";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import SuperadminBadge from "@/components/Superadmin/SuperadminBadge";
import TraktirEditorPanel from "@/components/Superadmin/TraktirEditorPanel";
import MenuIconEditorPanel from "@/components/Superadmin/MenuIconEditorPanel";
import FeedbackManagerPanel from "@/components/Superadmin/FeedbackManagerPanel";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function ManagerPage() {
  const {
    gajianDate,
    startNewCycle,
    cycles,
    isWaitingForPayday,
    logoSettings,
    updateLogoSettings,
    currentKeluarga,
    currentMember,
    sessionUser,
    logout,
    updateMember,
    removeMember,
    leaveFamily,
    isLoading,
    isSuperadmin,
    developerSettings,
    menuIconOverrides,
    updateDeveloperSettings,
    updateMenuIconOverride,
  } = useApp();

  const isAdmin = currentMember?.role === "admin";
  const [superadminActiveTab, setSuperadminActiveTab] = useState<"traktir" | "icons" | "feedback">("traktir");

  // State untuk Pengaturan Logo & Branding
  const [emojiInput, setEmojiInput] = useState(logoSettings.emoji);
  const [bgInput, setBgInput] = useState(logoSettings.bg);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [managerLogoImgError, setManagerLogoImgError] = useState(false);

  const emojiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bgTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEmojiInput(logoSettings.emoji);
  }, [logoSettings.emoji]);

  useEffect(() => {
    setBgInput(logoSettings.bg);
  }, [logoSettings.bg]);

  useEffect(() => {
    setManagerLogoImgError(false);
  }, [logoSettings.image]);

  const handleUpdateType = async (type: "emoji" | "image") => {
    if (!isAdmin) {
      setAlertConfig({
        isOpen: true,
        title: "Akses Dibatasi",
        message: "Hanya Admin keluarga yang dapat mengubah pengaturan logo & branding.",
      });
      return;
    }
    await updateLogoSettings({ ...logoSettings, type });
  };

  const handleEmojiChange = (emoji: string) => {
    setEmojiInput(emoji);
    if (!isAdmin) return;
    if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
    emojiTimerRef.current = setTimeout(async () => {
      await updateLogoSettings({ ...logoSettings, emoji });
    }, 400);
  };

  const handleBgChange = (bg: string) => {
    setBgInput(bg);
    if (!isAdmin) return;
    if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
    bgTimerRef.current = setTimeout(async () => {
      await updateLogoSettings({ ...logoSettings, bg });
    }, 400);
  };

  const handleSelectPresetBg = async (presetBg: string) => {
    if (!isAdmin) {
      setAlertConfig({
        isOpen: true,
        title: "Akses Dibatasi",
        message: "Hanya Admin keluarga yang dapat mengubah pengaturan logo & branding.",
      });
      return;
    }
    setBgInput(presetBg);
    if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
    await updateLogoSettings({ ...logoSettings, bg: presetBg });
  };

  const handleImageFile = async (file: File) => {
    if (!isAdmin) {
      setAlertConfig({
        isOpen: true,
        title: "Akses Dibatasi",
        message: "Hanya Admin keluarga yang dapat mengunggah atau mengganti logo.",
      });
      return;
    }

    const validation = validateImageType(file);
    if (!validation.valid) {
      setAlertConfig({
        isOpen: true,
        title: "Format Tidak Didukung",
        message: validation.error || "Harap unggah gambar JPG, PNG, atau WebP.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAlertConfig({
        isOpen: true,
        title: "Ukuran Terlalu Besar",
        message: "Ukuran file terlalu besar! Maksimal 5 MB sebelum kompresi.",
      });
      return;
    }

    setIsUploadingLogo(true);
    setUploadStatus("Mengompresi gambar...");

    try {
      // 1. Kompresi & downscale otomatis sisi klien ke maks 512x512
      const processed = await compressAndResizeImage(file, 512, 0.88);
      setUploadStatus("Mengunggah ke penyimpanan...");

      const keluargaId = currentKeluarga?.id || currentMember?.keluarga_id || "default";
      const fileName = `${keluargaId}/logo-${Date.now()}.webp`;

      // 2. Upload compressed webp file directly ke Supabase storage bucket 'logos'
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, processed.blob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Ambil URL publik
      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      // 4. Bersihkan file logo lama jika ada di bucket 'logos'
      const oldPath = extractStoragePath(logoSettings.image, "logos");
      if (oldPath && oldPath !== fileName) {
        try {
          await supabase.storage.from("logos").remove([oldPath]);
        } catch (cleanupErr) {
          console.warn("Gagal membersihkan logo lama:", cleanupErr);
        }
      }

      // 5. Simpan public URL ke logoSettings
      await updateLogoSettings({
        ...logoSettings,
        type: "image",
        image: publicUrl,
      });

      setAlertConfig({
        isOpen: true,
        title: "Logo Berhasil Diperbarui",
        message: `Logo berhasil diunggah dan dioptimalkan (${Math.round(processed.sizeBytes / 1024)} KB)!`,
      });
    } catch (err: any) {
      console.error("Gagal mengupload logo:", err);
      setAlertConfig({
        isOpen: true,
        title: "Gagal Mengunggah",
        message: "Gagal mengunggah logo ke Supabase Storage: " + (err.message || "Kesalahan jaringan."),
      });
    } finally {
      setIsUploadingLogo(false);
      setUploadStatus("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    e.target.value = "";
  };

  const handleDeleteLogo = async () => {
    setIsDeletingLogo(true);
    try {
      const oldPath = extractStoragePath(logoSettings.image, "logos");
      if (oldPath) {
        try {
          await supabase.storage.from("logos").remove([oldPath]);
        } catch (delErr) {
          console.warn("Gagal menghapus file dari storage:", delErr);
        }
      }

      await updateLogoSettings({
        ...logoSettings,
        type: "emoji",
        image: "",
      });

      setAlertConfig({
        isOpen: true,
        title: "Logo Direset",
        message: "Logo kustom berhasil dihapus dan dikembalikan ke mode Emoji default.",
      });
    } catch (err: any) {
      setAlertConfig({
        isOpen: true,
        title: "Gagal Mereset",
        message: "Terjadi kesalahan saat mereset logo: " + (err.message || "Kesalahan jaringan."),
      });
    } finally {
      setIsDeletingLogo(false);
      setShowDeleteLogoConfirm(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingLogo) setIsDraggingLogo(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [showEarlyPaydayConfirm, setShowEarlyPaydayConfirm] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title: string, message: string}>({ isOpen: false, title: "", message: "" });
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
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
      } else if (data) {
        setMembersList([]);
      }
    } catch (err) {
      console.error("Gagal memuat anggota keluarga:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadMembers();

    // Subscribe ke realtime changes pada tabel members keluarga ini
    if (!currentKeluarga?.id) return;
    const channelName = `family-members-mgr-${currentKeluarga.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
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

  const handleSaveMember = async (
    memberId: string,
    displayName: string,
    role: "admin" | "member",
    statusKeluarga: StatusKeluarga,
    gender?: "male" | "female"
  ) => {
    const res = await updateMember(memberId, displayName, role, statusKeluarga, gender);
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

  const inviteCode = currentKeluarga?.invite_code || "-";

  const handleCopyInviteCode = () => {
    if (!currentKeluarga?.invite_code) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentKeluarga.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayMembers: Member[] = membersList.length > 0
    ? membersList
    : currentMember
      ? [currentMember]
      : [];

  return (
    <main
      id="pg-manager"
      className="page active"
      style={{
        paddingBottom: "180px",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <PageHeader
        title="Pengaturan & Keluarga"
        subtitle="Kelola profil rumah tangga, siklus, dan preferensi aplikasi"
        backHref="/"
      />
      <div className="mgr-body">
        {/* 1. Mulai Siklus Baru */}
        <div className="gajian-card">
          <div className="gc-left">
            <div className="gc-subtitle" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span>Gajian tiap tgl</span>
              {isLoading ? (
                <Skeleton width="22px" height="15px" borderRadius="4px" as="span" style={{ display: "inline-block" }} />
              ) : (
                <strong style={{ color: "var(--text)" }}>{gajianDate}</strong>
              )}
            </div>
            <h3>{isWaitingForPayday ? "🎉 Gaji sudah masuk?" : "🎉 Mulai siklus baru?"}</h3>
          </div>
          <button className="gc-btn" onClick={() => {
            const isFirstCycle = cycles.length <= 1 || isWaitingForPayday;
            const today = new Date().getDate();
            // If first cycle or waiting for payday, or if today is payday: start immediately
            if (isFirstCycle || today === gajianDate) {
              setShowNewCycleModal(true);
              return;
            }
            // If today is not gajianDate, ask user via confirmation instead of strictly blocking
            setShowEarlyPaydayConfirm(true);
          }}>
            {showConfirm ? "Siklus Dimulai!" : "Gajian Tiba!"}
          </button>
        </div>

        {/* Banner info untuk user yang menunggu gajian */}
        {isWaitingForPayday && (
          <div
            style={{
              margin: "0 0 16px 0",
              padding: "14px 16px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              border: "1px solid #bae6fd",
              fontSize: "12.5px",
              color: "#0c4a6e",
              lineHeight: 1.5,
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "18px" }}>💡</span>
            <div>
              <strong>Siklus Pertama:</strong> Tekan &ldquo;💰 Gajian Tiba!&rdquo; kapan saja saat gaji sudah masuk.
              Semua pos akan langsung terisi sesuai target budget bulanan yang sudah Anda atur.
            </div>
          </div>
        )}

        {/* 2. Informasi Keluarga & Kode Undangan */}
        <div className="gajian-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="gc-left">
              <div className="gc-subtitle" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🏠 Informasi Keluarga</span>
                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(40,127,240,0.12)", color: "var(--navy)", fontWeight: 700 }}>
                  MULTI-TENANT
                </span>
              </div>
              <h3 style={{ fontSize: "18px", marginTop: "4px", minHeight: "22px" }}>
                {isLoading || !currentKeluarga ? (
                  <Skeleton width="180px" height="22px" borderRadius="6px" as="span" style={{ display: "inline-block" }} />
                ) : (
                  currentKeluarga?.nama_keluarga || "Keluarga Kami"
                )}
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
              {isLoading || !currentKeluarga ? (
                <>
                  <div
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      background: "var(--card, #ffffff)",
                      borderRadius: "8px",
                      border: "1.5px dashed var(--border)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Skeleton width="140px" height="20px" borderRadius="4px" />
                  </div>
                  <Skeleton width="105px" height="42px" borderRadius="10px" />
                </>
              ) : (
                <>
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
                      borderRadius: "10px",
                      background: copied ? "var(--success, #16a89a)" : "var(--primary, #287ff0)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: copied
                        ? "0 2px 8px rgba(22, 168, 154, 0.25)"
                        : "0 2px 8px rgba(40, 127, 240, 0.25)",
                      transition: "all 0.18s ease",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {copied ? (
                      <>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Salin Kode</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. Daftar Anggota Keluarga (Art-Directed Household Roll) */}
        <div className="gajian-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="gc-left">
              <div className="gc-subtitle" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>👨‍👩‍👧‍👦 Hak Akses &amp; Anggota</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 750,
                    padding: "2px 7px",
                    borderRadius: "6px",
                    background: "rgba(40,127,240,0.12)",
                    color: "var(--navy)",
                    minWidth: "60px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {loadingMembers ? (
                    <Skeleton width="48px" height="12px" borderRadius="3px" as="span" style={{ display: "inline-block" }} />
                  ) : (
                    `${displayMembers.length} PENGGUNA`
                  )}
                </span>
              </div>
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
            {loadingMembers ? (
              [1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "var(--s3)",
                    border: "1px solid var(--border)",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "11px", flex: 1 }}>
                    <Skeleton width="38px" height="38px" borderRadius="50%" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                      <Skeleton width="120px" height="14px" borderRadius="4px" />
                      <Skeleton width="80px" height="11px" borderRadius="4px" />
                    </div>
                  </div>
                  <Skeleton width="64px" height="26px" borderRadius="6px" />
                </div>
              ))
            ) : displayMembers.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                Belum ada anggota terdaftar
              </div>
            ) : (
              displayMembers.map((m, idx) => {
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
                        background: isTargetAdmin ? "var(--primary, #287ff0)" : "var(--teal, #16a89a)",
                        display: "grid",
                        placeItems: "center",
                        color: "#ffffff",
                        fontSize: m.status_keluarga ? "18px" : "15px",
                        fontWeight: 800,
                        flexShrink: 0,
                        border: "2px solid #ffffff",
                        boxShadow: isTargetAdmin
                          ? "0 2px 8px rgba(40, 127, 240, 0.20)"
                          : "0 2px 8px rgba(22, 168, 154, 0.20)"
                      }}
                    >
                      {m.status_keluarga === "suami"
                        ? "👨‍💼"
                        : m.status_keluarga === "istri"
                        ? "👩"
                        : m.status_keluarga === "anak"
                        ? (m.gender === "female" ? "👧" : "👦")
                        : m.display_name.charAt(0).toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
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
                        {m.status_keluarga && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 750,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: m.status_keluarga === "suami"
                                ? "rgba(40,127,240,0.12)"
                                : m.status_keluarga === "istri"
                                ? "rgba(22,168,154,0.12)"
                                : "rgba(244,163,59,0.14)",
                              color: m.status_keluarga === "suami"
                                ? "#287ff0"
                                : m.status_keluarga === "istri"
                                ? "#16a89a"
                                : "#d97706"
                            }}
                          >
                            {m.status_keluarga === "suami"
                              ? "👨‍💼 Suami"
                              : m.status_keluarga === "istri"
                              ? "👩 Istri"
                              : m.gender === "female"
                              ? "👧 Anak (Kakak)"
                              : "👦 Anak (Abang)"}
                          </span>
                        )}
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>{currentMember?.role === "admin" ? "Kelola" : "Edit Nama"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }))}
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
              <h3>🖼️ Logo &amp; Ikon Homescreen</h3>
            </div>
            {isAdmin ? (
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "8px", background: "rgba(40, 127, 240, 0.12)", color: "var(--primary)" }}>
                👑 Admin
              </span>
            ) : (
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "8px", background: "var(--s3)", color: "var(--muted)" }}>
                Lihat Saja
              </span>
            )}
          </div>
          
          {/* Logo preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px", background: "var(--s3)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "14px",
              background: logoSettings.bg && logoSettings.bg !== "transparent" ? logoSettings.bg : "var(--primary, #287ff0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              overflow: "hidden",
              border: "1.5px solid var(--border)",
              boxShadow: "0 2px 8px rgba(16, 45, 85, 0.06)",
              flexShrink: 0
            }}>
              {logoSettings.type === "image" && logoSettings.image && !managerLogoImgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSettings.image}
                  alt="Logo Preview"
                  crossOrigin="anonymous"
                  onError={() => setManagerLogoImgError(true)}
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }}
                />
              ) : (
                logoSettings.emoji || "💳"
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text)" }}>Tampilan Logo Aktif</div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", lineHeight: "1.4" }}>
                Digunakan sebagai favicon browser, ikon homescreen, dan logo header aplikasi.
              </div>
            </div>
          </div>

          {/* Selector Type: Emoji vs Image */}
          <div className="type-toggle" style={{ marginTop: "4px" }}>
            <div
              className={`type-opt ${logoSettings.type === "emoji" ? "active-in" : ""}`}
              onClick={() => handleUpdateType("emoji")}
              style={{ padding: "8px", fontSize: "11px", cursor: isAdmin ? "pointer" : "default" }}
            >
              Emoji + Background
            </div>
            <div
              className={`type-opt ${logoSettings.type === "image" ? "active-out" : ""}`}
              onClick={() => handleUpdateType("image")}
              style={{ padding: "8px", fontSize: "11px", cursor: isAdmin ? "pointer" : "default" }}
            >
              Upload Gambar
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
                  value={emojiInput}
                  disabled={!isAdmin}
                  onChange={(e) => handleEmojiChange(e.target.value)}
                  placeholder="Ketik emoji, misal: 💳, 🏦, 💰"
                  maxLength={5}
                  style={{ padding: "8px 12px", fontSize: "13px" }}
                />
              </div>
            ) : (
              <div className="fg">
                <div className="fl" style={{ fontSize: "9px" }}>Upload File Logo (PNG/JPG/WebP)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={!isAdmin || isUploadingLogo}
                    onChange={handleFileInputChange}
                    style={{ display: "none" }}
                    id="logo-image-file-input"
                  />
                  
                  {/* Dropzone & Label */}
                  <div
                    onDragOver={isAdmin && !isUploadingLogo ? handleDragOver : undefined}
                    onDragLeave={isAdmin && !isUploadingLogo ? handleDragLeave : undefined}
                    onDrop={isAdmin && !isUploadingLogo ? handleDrop : undefined}
                    onClick={() => {
                      if (isAdmin && !isUploadingLogo) {
                        fileInputRef.current?.click();
                      }
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "16px",
                      borderRadius: "12px",
                      border: isDraggingLogo
                        ? "2px dashed var(--primary, #287ff0)"
                        : "2px dashed var(--border)",
                      background: isDraggingLogo
                        ? "rgba(40, 127, 240, 0.08)"
                        : "var(--s2)",
                      cursor: isAdmin && !isUploadingLogo ? "pointer" : "not-allowed",
                      transition: "all 0.2s ease",
                      gap: "6px",
                    }}
                  >
                    {isUploadingLogo ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>⏳ {uploadStatus || "Memproses logo..."}</span>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: "22px" }}>📁</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)" }}>
                          {isAdmin ? "Klik untuk Pilih Gambar atau Drag & Drop" : "Hanya Admin yang dapat mengunggah"}
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                          JPG, PNG, atau WebP (Otomatis dikompresi ke 512x512)
                        </span>
                      </>
                    )}
                  </div>

                  {/* Actions when custom image is present */}
                  {logoSettings.image && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                        Logo kustom aktif
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowDeleteLogoConfirm(true)}
                          disabled={isDeletingLogo}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--red, #f04467)",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          🗑️ Hapus Logo Kustom
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: "10px", color: "var(--muted)", textAlign: "center", lineHeight: "1.4" }}>
                    Format kotak (square) min. 512x512 piksel direkomendasikan. Gunakan file PNG transparan jika ingin memadukannya dengan preset background warna di bawah.
                  </div>
                </div>
              </div>
            )}

            {/* Background settings - available for BOTH emoji and transparent images */}
            <div className="fg">
              <div className="fl" style={{ fontSize: "9px" }}>Pilih Preset Background (Berlaku untuk Emoji &amp; Gambar Transparan)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "2px" }}>
                {[
                  "#287ff0", // Catat Keluarga Primary Blue
                  "#102d55", // Deep Navy
                  "#16a89a", // Teal
                  "#f4a33b", // Amber
                  "#eaf5fc", // Soft Blue
                  "#ffffff", // White Surface
                  "#17375f", // Slate Text
                  "transparent",
                ].map((presetBg) => (
                  <div
                    key={presetBg}
                    onClick={() => handleSelectPresetBg(presetBg)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: presetBg === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : presetBg,
                      backgroundSize: presetBg === "transparent" ? "8px 8px" : "auto",
                      backgroundPosition: presetBg === "transparent" ? "0 0, 0 4px, 4px -4px, -4px 0px" : "auto",
                      border: bgInput === presetBg ? "2.5px solid #fff" : "1px solid var(--border)",
                      cursor: isAdmin ? "pointer" : "default",
                      boxShadow: bgInput === presetBg ? "0 0 6px rgba(255,255,255,0.4)" : "none",
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
                  value={bgInput}
                  disabled={!isAdmin}
                  onChange={(e) => handleBgChange(e.target.value)}
                  placeholder="Contoh: #8b72ff atau linear-gradient(135deg, ...)"
                />
              </div>
            </div>
          </div>
        </div>


        {/* Shortcut Navigasi ke Menu Dompet / Setting Pos */}
        <div className="gajian-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div className="gc-left" style={{ minWidth: 0, flex: 1 }}>
              <p>Pengaturan Pos Anggaran</p>
              <h3 style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo/icon-menu-dompet.png"
                  alt="Menu Dompet"
                  style={{ width: "28px", height: "28px", objectFit: "contain" }}
                />
                <span>Kelola Amplop &amp; Pos</span>
              </h3>
            </div>
            <Link
              href="/dompet"
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "var(--teal, #16a89a)",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(22, 168, 154, 0.25)",
                flexShrink: 0,
                whiteSpace: "nowrap",
                touchAction: "manipulation",
              }}
            >
              Buka Dompet →
            </Link>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.4" }}>
            Pengaturan rincian pos keuangan, jatah bulanan, dan target tabungan sekarang dapat diakses langsung melalui menu <strong>Dompet</strong>.
          </div>
        </div>

        {/* Shortcut Bantuan & Lapor Bug */}
        <div className="gajian-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div className="gc-left" style={{ minWidth: 0, flex: 1 }}>
              <p>Bantuan &amp; Masukan</p>
              <h3 style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "20px" }}>💡</span>
                <span>Lapor Bug &amp; Saran Fitur</span>
              </h3>
            </div>
            <Link
              href="/lapor"
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "var(--primary, #287ff0)",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(40, 127, 240, 0.25)",
                flexShrink: 0,
                whiteSpace: "nowrap",
                touchAction: "manipulation",
              }}
            >
              Buka Form →
            </Link>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.4" }}>
            Menemukan kendala atau memiliki ide perbaikan untuk CatatKeluarga? Sampaikan langsung ke tim pengembang.
          </div>
        </div>

        {/* ── SUPERADMIN ONLY SECTION ── */}
        {isSuperadmin && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginTop: "4px",
              marginBottom: "6px",
            }}
          >
            <SuperadminBadge />

            {/* Sub-tabs: Traktir Dev vs Icon Menu vs Feedback */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "4px",
                background: "var(--s2, #f1f5f9)",
                padding: "3px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={() => setSuperadminActiveTab("traktir")}
                style={{
                  minHeight: "40px",
                  padding: "8px 4px",
                  borderRadius: "9px",
                  border: "none",
                  background:
                    superadminActiveTab === "traktir" ? "#ffffff" : "transparent",
                  color:
                    superadminActiveTab === "traktir"
                      ? "var(--navy)"
                      : "var(--muted)",
                  fontWeight: 800,
                  fontSize: "11.5px",
                  cursor: "pointer",
                  boxShadow:
                    superadminActiveTab === "traktir"
                      ? "0 2px 6px rgba(0,0,0,0.06)"
                      : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  minWidth: 0,
                  touchAction: "manipulation",
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Traktir</span>
              </button>

              <button
                type="button"
                onClick={() => setSuperadminActiveTab("icons")}
                style={{
                  minHeight: "40px",
                  padding: "8px 4px",
                  borderRadius: "9px",
                  border: "none",
                  background:
                    superadminActiveTab === "icons" ? "#ffffff" : "transparent",
                  color:
                    superadminActiveTab === "icons"
                      ? "var(--navy)"
                      : "var(--muted)",
                  fontWeight: 800,
                  fontSize: "11.5px",
                  cursor: "pointer",
                  boxShadow:
                    superadminActiveTab === "icons"
                      ? "0 2px 6px rgba(0,0,0,0.06)"
                      : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  minWidth: 0,
                  touchAction: "manipulation",
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Icon Menu</span>
              </button>

              <button
                type="button"
                onClick={() => setSuperadminActiveTab("feedback")}
                style={{
                  minHeight: "40px",
                  padding: "8px 4px",
                  borderRadius: "9px",
                  border: "none",
                  background:
                    superadminActiveTab === "feedback" ? "#ffffff" : "transparent",
                  color:
                    superadminActiveTab === "feedback"
                      ? "var(--navy)"
                      : "var(--muted)",
                  fontWeight: 800,
                  fontSize: "11.5px",
                  cursor: "pointer",
                  boxShadow:
                    superadminActiveTab === "feedback"
                      ? "0 2px 6px rgba(0,0,0,0.06)"
                      : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  minWidth: 0,
                  touchAction: "manipulation",
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="M14 9h4" />
                  <path d="M14 15h4" />
                </svg>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Laporan</span>
              </button>
            </div>

            {/* Tab content */}
            {superadminActiveTab === "traktir" ? (
              <TraktirEditorPanel
                settings={developerSettings}
                onUpdate={updateDeveloperSettings}
                onShowAlert={(title, message) =>
                  setAlertConfig({ isOpen: true, title, message })
                }
              />
            ) : superadminActiveTab === "icons" ? (
              <MenuIconEditorPanel
                overrides={menuIconOverrides}
                onUpdate={updateMenuIconOverride}
                onShowAlert={(title, message) =>
                  setAlertConfig({ isOpen: true, title, message })
                }
              />
            ) : (
              <FeedbackManagerPanel
                onShowAlert={(title, message) =>
                  setAlertConfig({ isOpen: true, title, message })
                }
              />
            )}
          </div>
        )}

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
              <div className="gc-subtitle" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
              </div>
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
                    background: "var(--primary, #287ff0)",
                    display: "grid",
                    placeItems: "center",
                    color: "#ffffff",
                    fontSize: "17px",
                    fontWeight: 800,
                    flexShrink: 0,
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 8px rgba(40, 127, 240, 0.20)"
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
                  {currentMember?.display_name || sessionUser?.user_metadata?.full_name || sessionUser?.email?.split("@")[0] || "Anggota Catat Keluarga"}
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
                {currentKeluarga?.nama_keluarga || "Keluarga Kami"}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
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
        onConfirm={async (posConfigs, deletedPosIds) => {
          await startNewCycle(posConfigs, deletedPosIds);
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
      <ConfirmModal
        isOpen={showEarlyPaydayConfirm}
        title="Gaji Sudah Masuk?"
        message={`Tanggal gajian Anda diatur pada tanggal ${gajianDate}, sedangkan hari ini tanggal ${new Date().getDate()}. Apakah gaji bulan ini sudah masuk lebih awal dan Anda ingin memulai siklus baru sekarang?`}
        confirmText="Ya, Mulai Siklus"
        cancelText="Belum, Batal"
        isDanger={false}
        onConfirm={() => setShowNewCycleModal(true)}
        onCancel={() => setShowEarlyPaydayConfirm(false)}
      />
      <ConfirmModal
        isOpen={showDeleteLogoConfirm}
        title="Hapus Logo Kustom?"
        message="Logo gambar kustom akan dihapus dari penyimpanan Supabase dan tampilan aplikasi akan dikembalikan ke mode Emoji default. Lanjutkan?"
        confirmText={isDeletingLogo ? "Menghapus..." : "Ya, Hapus Logo"}
        cancelText="Batal"
        isDanger={true}
        onConfirm={handleDeleteLogo}
        onCancel={() => setShowDeleteLogoConfirm(false)}
      />
      <AlertModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Akhiri Sesi Catat Keluarga?"
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
