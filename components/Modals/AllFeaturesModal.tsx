"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import AlertModal from "@/components/Modals/AlertModal";
import { useApp } from "@/lib/store";
import { AVAILABLE_MENUS, getMenuItem, MenuIcon, DEFAULT_QUICK_MENU } from "@/lib/menu-config";
import { dismissModalWithoutHistoryTrap } from "@/lib/hooks/useModalBackHandler";

interface AllFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AllFeaturesModal({
  isOpen,
  onClose,
}: AllFeaturesModalProps) {
  const router = useRouter();
  const {
    sessionUser,
    currentMember,
    currentKeluarga,
    logout,
    quickMenuItems,
    updateQuickMenuItems,
    menuIconOverrides,
    setIsNavigating,
  } = useApp();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Quick Menu Customization State
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(quickMenuItems);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [isSaving, setIsSaving] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Sync selectedIds whenever modal opens
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const valid = (quickMenuItems && quickMenuItems.length > 0 ? quickMenuItems : DEFAULT_QUICK_MENU)
        .filter((id) => AVAILABLE_MENUS.some((m) => m.id === id));
      setSelectedIds(valid.length > 0 ? valid : DEFAULT_QUICK_MENU);
      setIsCustomizing(false);
    }
  }

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => {
      setToastNotice(null);
    }, 2500);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Gagal logout:", err);
      setIsLoggingOut(false);
    }
  };

  const handleItemClick = (path: string) => {
    dismissModalWithoutHistoryTrap();
    onClose();
    setIsNavigating(true);
    router.push(path);
  };

  const handleMove = (index: number, newIndex: number) => {
    if (newIndex < 0 || newIndex >= selectedIds.length) return;
    const updated = [...selectedIds];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setSelectedIds(updated);
  };

  const handleAdd = (id: string) => {
    if (selectedIds.includes(id)) return;
    if (selectedIds.length >= 5) {
      showToast("Maksimal 5 menu! Hapus salah satu menu terlebih dahulu.");
      return;
    }
    setSelectedIds([...selectedIds, id]);
  };

  const handleRemove = (id: string) => {
    setSelectedIds(selectedIds.filter((item) => item !== id));
  };

  const handleSaveQuickMenu = async () => {
    if (selectedIds.length === 0) {
      showToast("Pilih minimal 1 menu untuk diletakkan di Menu Cepat!");
      return;
    }
    setIsSaving(true);
    try {
      await updateQuickMenuItems(selectedIds);
      setIsCustomizing(false);
      onClose();
    } catch (err) {
      console.error("Gagal menyimpan Menu Cepat:", err);
      showToast("Gagal menyimpan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", margin: "-6px -4px 0", paddingBottom: "10px" }}>
        {/* Toast feedback notification */}
        {toastNotice && (
          <div
            role="status"
            style={{
              position: "absolute",
              top: "14px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              background: "var(--navy, #0f172a)",
              color: "#ffffff",
              padding: "7px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {toastNotice}
          </div>
        )}

        {isCustomizing ? (
          /* ── MODE 2: UBAH MENU CEPAT ── */
          <div>
            {/* Header: Ubah Menu Cepat */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
                paddingRight: "36px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedIds(quickMenuItems);
                  setIsCustomizing(false);
                }}
                style={{
                  background: "var(--s2, #f1f5f9)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--navy)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ← Kembali
              </button>

              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: 850,
                  color: "var(--navy)",
                  margin: 0,
                  letterSpacing: "-0.3px",
                }}
              >
                Ubah Menu Cepat
              </h2>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: "12px",
                  background: selectedIds.length === 5 ? "#dcfce7" : "#e0f2fe",
                  color: selectedIds.length === 5 ? "#15803d" : "#0284c7",
                }}
              >
                {selectedIds.length}/5
              </span>
            </div>

            {/* Petunjuk Singkat */}
            <div
              style={{
                background: "#f0f7ff",
                border: "1px solid #bae6fd",
                borderRadius: "10px",
                padding: "8px 12px",
                marginBottom: "14px",
                fontSize: "11.5px",
                color: "#0369a1",
                lineHeight: 1.35,
              }}
            >
              <strong>💡 Petunjuk:</strong> Pilih maksimal <strong>5 menu</strong> untuk Beranda. Gunakan tanda panah <strong>◀ ▶</strong> untuk mengatur urutan posisinya.
            </div>

            {/* Section 1: Preview Urutan di Menu Cepat (5 Slots) */}
            <div
              style={{
                background: "var(--s2, #f8fafc)",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                padding: "12px 8px 10px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  paddingLeft: "2px",
                  paddingRight: "2px",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)" }}>
                  Urutan di Menu Cepat (Maks. 5):
                </span>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "11px",
                      color: "#ef4444",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gap: "4px",
                }}
              >
                {[0, 1, 2, 3, 4].map((idx) => {
                  const id = selectedIds[idx];
                  const item = id ? getMenuItem(id) : null;

                  if (item) {
                    return (
                      <div
                        key={item.id}
                        style={{
                          position: "relative",
                          background: "var(--surface, #ffffff)",
                          border: "1.5px solid var(--primary, #287ff0)",
                          borderRadius: "12px",
                          padding: "10px 4px 6px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          boxShadow: "0 2px 6px rgba(40, 127, 240, 0.10)",
                        }}
                      >
                        {/* Slot Badge */}
                        <span
                          style={{
                            position: "absolute",
                            top: "-6px",
                            left: "-4px",
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "var(--primary, #287ff0)",
                            color: "#ffffff",
                            fontSize: "10px",
                            fontWeight: 800,
                            display: "grid",
                            placeItems: "center",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        >
                          {idx + 1}
                        </span>

                        {/* Remove Button */}
                        <button
                          type="button"
                          title={`Hapus ${item.name} dari Menu Cepat`}
                          onClick={() => handleRemove(item.id)}
                          style={{
                            position: "absolute",
                            top: "-6px",
                            right: "-4px",
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "#fee2e2",
                            color: "#ef4444",
                            border: "1px solid #fecaca",
                            fontSize: "11px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>

                        {/* Icon */}
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            background: item.iconBg,
                            display: "grid",
                            placeItems: "center",
                            marginBottom: "4px",
                          }}
                        >
                          <div style={{ transform: "scale(0.7)" }}>
                            {menuIconOverrides?.[item.id] ? (
                              <MenuIcon
                                src={menuIconOverrides[item.id]}
                                alt={item.name}
                                size={44}
                                fallbackSvg={item.iconModal}
                              />
                            ) : (
                              item.iconModal
                            )}
                          </div>
                        </div>

                        {/* Name */}
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 750,
                            color: "var(--navy)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "58px",
                          }}
                        >
                          {item.name}
                        </span>

                        {/* Move Controls */}
                        <div style={{ display: "flex", gap: "3px", marginTop: "5px" }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, idx - 1)}
                            title="Geser posisi ke kiri"
                            style={{
                              width: "20px",
                              height: "18px",
                              borderRadius: "4px",
                              background: idx === 0 ? "var(--s2, #f1f5f9)" : "#e0f2fe",
                              color: idx === 0 ? "var(--muted)" : "#0284c7",
                              border: "none",
                              cursor: idx === 0 ? "not-allowed" : "pointer",
                              fontSize: "9px",
                              fontWeight: 800,
                              display: "grid",
                              placeItems: "center",
                              padding: 0,
                            }}
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            disabled={idx === selectedIds.length - 1}
                            onClick={() => handleMove(idx, idx + 1)}
                            title="Geser posisi ke kanan"
                            style={{
                              width: "20px",
                              height: "18px",
                              borderRadius: "4px",
                              background: idx === selectedIds.length - 1 ? "var(--s2, #f1f5f9)" : "#e0f2fe",
                              color: idx === selectedIds.length - 1 ? "var(--muted)" : "#0284c7",
                              border: "none",
                              cursor: idx === selectedIds.length - 1 ? "not-allowed" : "pointer",
                              fontSize: "9px",
                              fontWeight: 800,
                              display: "grid",
                              placeItems: "center",
                              padding: 0,
                            }}
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-${idx}`}
                      style={{
                        border: "1.5px dashed var(--border, #cbd5e1)",
                        borderRadius: "12px",
                        minHeight: "88px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px 2px",
                        background: "rgba(255,255,255,0.4)",
                        color: "var(--muted, #94a3b8)",
                      }}
                    >
                      <span style={{ fontSize: "10px", fontWeight: 700, marginBottom: "2px" }}>
                        Slot {idx + 1}
                      </span>
                      <span style={{ fontSize: "10px" }}>+ Kosong</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Daftar Pilihan Menu Tersedia */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
                Pilih Menu untuk Ditambahkan:
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  paddingRight: "2px",
                }}
              >
                {AVAILABLE_MENUS.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  const slotIndex = selectedIds.indexOf(m.id);

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        background: isSelected ? "rgba(40, 127, 240, 0.05)" : "var(--surface, #ffffff)",
                        border: isSelected ? "1.5px solid var(--primary, #287ff0)" : "1px solid var(--border)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            background: m.iconBg,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ transform: "scale(0.7)" }}>
                            {menuIconOverrides?.[m.id] ? (
                              <MenuIcon
                                src={menuIconOverrides[m.id]}
                                alt={m.name}
                                size={44}
                                fallbackSvg={m.iconModal}
                              />
                            ) : (
                              m.iconModal
                            )}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 750, color: "var(--navy)" }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {m.desc}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <button
                          type="button"
                          onClick={() => handleRemove(m.id)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "8px",
                            background: "#e0f2fe",
                            color: "#0284c7",
                            border: "none",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <span>✓ Slot #{slotIndex + 1}</span>
                          <span style={{ color: "#ef4444", fontWeight: 800 }}>✕</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAdd(m.id)}
                          disabled={selectedIds.length >= 4}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            background: selectedIds.length >= 5 ? "var(--s2, #f1f5f9)" : "var(--primary, #287ff0)",
                            color: selectedIds.length >= 5 ? "var(--muted, #94a3b8)" : "#ffffff",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: selectedIds.length >= 5 ? "not-allowed" : "pointer",
                            boxShadow: selectedIds.length >= 5 ? "none" : "0 2px 6px rgba(40, 127, 240, 0.22)",
                          }}
                        >
                          {selectedIds.length >= 5 ? "Penuh" : "+ Pilih"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Simpan Menu Cepat Footer Action */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "6px",
                paddingTop: "12px",
                borderTop: "1px dashed var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedIds(DEFAULT_QUICK_MENU)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "var(--s2, #f1f5f9)",
                  border: "1px solid var(--border)",
                  color: "var(--navy)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Reset Default
              </button>

              <button
                type="button"
                disabled={selectedIds.length === 0 || isSaving}
                onClick={handleSaveQuickMenu}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: selectedIds.length === 0 ? "var(--muted)" : "var(--primary, #287ff0)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: selectedIds.length === 0 || isSaving ? "not-allowed" : "pointer",
                  boxShadow: "0 3px 10px rgba(40, 127, 240, 0.28)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "15px", height: "15px" }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{isSaving ? "Menyimpan..." : "Simpan Menu Cepat"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── MODE 1: DAFTAR SEMUA MENU ── */
          <div>
            {/* Header - Matches Bank Raya "Semua Menu" + Hypertext "Ubah Menu Cepat" */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                paddingRight: "36px",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 850,
                  color: "var(--navy)",
                  margin: 0,
                  letterSpacing: "-0.4px",
                }}
              >
                Semua Menu
              </h2>

              {/* Step 2: Hypertext "Ubah Menu Cepat" */}
              <button
                type="button"
                onClick={() => {
                  const valid = (quickMenuItems && quickMenuItems.length > 0 ? quickMenuItems : DEFAULT_QUICK_MENU)
                    .filter((id) => AVAILABLE_MENUS.some((m) => m.id === id));
                  setSelectedIds(valid.length > 0 ? valid : DEFAULT_QUICK_MENU);
                  setIsCustomizing(true);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px 8px",
                  fontSize: "13px",
                  fontWeight: 750,
                  color: "var(--primary, #287ff0)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px" }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Ubah Menu Cepat</span>
              </button>
            </div>

            {/* Section Title */}
            <div style={{ marginBottom: "14px" }}>
              <h3
                style={{
                  fontSize: "14.5px",
                  fontWeight: 750,
                  color: "var(--navy)",
                  margin: 0,
                }}
              >
                Fitur Utama
              </h3>
            </div>

            {/* 4-Column Grid for Fitur Utama */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                columnGap: "8px",
                rowGap: "16px",
                alignItems: "start",
              }}
            >
              {AVAILABLE_MENUS.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleItemClick(item.path)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleItemClick(item.path);
                    }
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    textAlign: "center",
                    userSelect: "none",
                  }}
                >
                  {/* Rounded Square Icon Card */}
                  <div
                    style={{
                      position: "relative",
                      width: "58px",
                      height: "58px",
                      borderRadius: "18px",
                      background: item.iconBg || "var(--s2)",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: "8px",
                      transition: "transform 0.16s ease, box-shadow 0.16s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.06)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 45, 85, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {menuIconOverrides?.[item.id] ? (
                      <MenuIcon
                        src={menuIconOverrides[item.id]}
                        alt={item.name}
                        size={44}
                        fallbackSvg={item.iconModal}
                      />
                    ) : (
                      item.iconModal
                    )}
                  </div>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 650,
                      color: "var(--navy)",
                      lineHeight: 1.25,
                      textAlign: "center",
                      maxWidth: "68px",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Account Strip & Quick Logout */}
            <div
              style={{
                marginTop: "22px",
                paddingTop: "14px",
                borderTop: "1px dashed var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                {sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sessionUser.user_metadata.avatar_url || sessionUser.user_metadata.picture}
                    alt="Avatar"
                    crossOrigin="anonymous"
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      border: "1.5px solid #ffffff",
                      boxShadow: "0 2px 6px rgba(16,45,85,0.12)",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      background: "var(--primary, #287ff0)",
                      display: "grid",
                      placeItems: "center",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 800,
                      flexShrink: 0,
                      border: "1.5px solid #ffffff",
                      boxShadow: "0 2px 6px rgba(40, 127, 240, 0.20)",
                    }}
                  >
                    {(currentMember?.display_name || sessionUser?.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 750,
                      color: "var(--navy)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentMember?.display_name || sessionUser?.user_metadata?.full_name || "Pengguna"}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentKeluarga?.nama_keluarga || "Keluarga Kami"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#be123c",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <AlertModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Akhiri Sesi Catat Keluarga?"
        message={`Apakah Anda yakin ingin keluar dari akun ${sessionUser?.email || "ini"}? Anda dapat masuk kembali dengan akun Google Anda kapan saja.`}
        confirmText={isLoggingOut ? "Mengakhiri Sesi..." : "Ya, Keluar Akun"}
        cancelText="Batal"
        confirmColor="#f04467"
        onConfirm={handleLogout}
      />
    </Modal>
  );
}
