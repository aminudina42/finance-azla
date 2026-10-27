"use client";

import React, { useState, useRef } from "react";
import { AVAILABLE_MENUS, MenuItem, MenuIcon } from "@/lib/menu-config";
import { MenuIconOverrides } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { validateImageType, compressAndResizeImage, extractStoragePath } from "@/lib/image-utils";

interface MenuIconEditorPanelProps {
  overrides: MenuIconOverrides;
  onUpdate: (menuId: string, iconUrl: string) => Promise<void>;
  onShowAlert?: (title: string, message: string) => void;
}

export default function MenuIconEditorPanel({
  overrides,
  onUpdate,
  onShowAlert,
}: MenuIconEditorPanelProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectMenuToChange = (menuId: string) => {
    setActiveMenuId(menuId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMenuId) return;

    const validation = validateImageType(file);
    if (!validation.valid) {
      onShowAlert?.(
        "Format Tidak Didukung",
        validation.error || "Harap unggah gambar JPG, PNG, atau WebP."
      );
      return;
    }

    setIsUploading(true);
    try {
      // Downscale to 256x256 for optimal sharp icon performance
      const processed = await compressAndResizeImage(file, 256, 0.9);
      const fileName = `menu-icons/icon-${activeMenuId}-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, processed.blob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("logos").getPublicUrl(fileName);

      // Clean old custom icon if exists
      const oldUrl = overrides[activeMenuId];
      const oldPath = extractStoragePath(oldUrl, "logos");
      if (oldPath && oldPath !== fileName) {
        try {
          await supabase.storage.from("logos").remove([oldPath]);
        } catch {
          // ignore
        }
      }

      await onUpdate(activeMenuId, publicUrl);
      onShowAlert?.(
        "Icon Berhasil Diubah",
        `Icon untuk menu "${activeMenuId}" berhasil diperbarui untuk semua pengguna!`
      );
    } catch (err: unknown) {
      console.error("Gagal unggah icon menu:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah icon menu.";
      onShowAlert?.("Gagal Mengubah Icon", msg);
    } finally {
      setIsUploading(false);
      setActiveMenuId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleResetToDefault = async (menuItem: MenuItem) => {
    try {
      const oldUrl = overrides[menuItem.id];
      const oldPath = extractStoragePath(oldUrl, "logos");
      if (oldPath) {
        try {
          await supabase.storage.from("logos").remove([oldPath]);
        } catch {
          // ignore
        }
      }

      await onUpdate(menuItem.id, "");
      onShowAlert?.(
        "Icon Direset",
        `Icon menu "${menuItem.name}" dikembalikan ke icon bawaan.`
      );
    } catch (err: unknown) {
      console.error("Gagal reset icon:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat reset.";
      onShowAlert?.("Gagal Reset", msg);
    }
  };

  return (
    <div
      style={{
        background: "var(--card, #ffffff)",
        borderRadius: "16px",
        padding: "18px 16px",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "0 2px 10px rgba(16, 45, 85, 0.04)",
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Header Panel */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
            color: "#6d28d9",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            border: "1px solid #c4b5fd",
            boxShadow: "0 2px 6px rgba(109, 40, 217, 0.08)",
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
          </svg>
        </div>
        <div>
          <h4
            style={{
              fontSize: "15px",
              fontWeight: 800,
              color: "var(--navy)",
              margin: 0,
              letterSpacing: "-0.2px",
            }}
          >
            Kustomisasi Icon Menu
          </h4>
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              margin: "2px 0 0",
              lineHeight: 1.4,
            }}
          >
            Ubah icon menu aplikasi secara global untuk seluruh pengguna
          </p>
        </div>
      </div>

      {/* Grid of Menus */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {AVAILABLE_MENUS.map((item) => {
          const customUrl = overrides[item.id];
          const hasCustom = customUrl && customUrl.trim() !== "";
          const effectiveSrc = hasCustom ? customUrl : item.iconSrc;
          const isThisUploading = isUploading && activeMenuId === item.id;

          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                minHeight: "60px",
                borderRadius: "14px",
                background: hasCustom
                  ? "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)"
                  : "var(--s2, #f8fafc)",
                border: hasCustom
                  ? "1.5px solid #d8b4fe"
                  : "1px solid var(--border)",
                gap: "10px",
                transition: "all 0.15s ease",
              }}
            >
              {/* Left: Icon and Name */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: item.iconBg,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <MenuIcon
                    src={effectiveSrc}
                    alt={item.name}
                    size={32}
                    fallbackSvg={item.iconQuick}
                  />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 800,
                        color: "var(--navy)",
                        letterSpacing: "-0.1px",
                      }}
                    >
                      {item.name}
                    </span>
                    {hasCustom && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: "#f3e8ff",
                          color: "#7e22ce",
                          border: "1px solid #e9d5ff",
                        }}
                      >
                        Kustom
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      marginTop: "2px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => handleSelectMenuToChange(item.id)}
                  style={{
                    minHeight: "36px",
                    padding: "7px 12px",
                    borderRadius: "9px",
                    background: "var(--primary, #287ff0)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 750,
                    cursor: isUploading ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    boxShadow: "0 2px 6px rgba(40, 127, 240, 0.20)",
                    touchAction: "manipulation",
                    transition: "transform 0.12s ease, opacity 0.12s ease",
                  }}
                >
                  {isThisUploading ? (
                    "Unggah..."
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ width: "13px", height: "13px" }}
                        aria-hidden="true"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Ganti
                    </>
                  )}
                </button>

                {hasCustom && (
                  <button
                    type="button"
                    onClick={() => handleResetToDefault(item)}
                    title="Kembalikan ke icon bawaan"
                    style={{
                      minHeight: "36px",
                      padding: "7px 10px",
                      borderRadius: "9px",
                      background: "var(--s2, #f1f5f9)",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                      fontSize: "12px",
                      fontWeight: 750,
                      cursor: "pointer",
                      touchAction: "manipulation",
                      transition: "background 0.12s ease",
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
