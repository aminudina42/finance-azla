"use client";

import React, { useState, useRef } from "react";
import { DeveloperSettings, DeveloperBank } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { validateImageType, compressAndResizeImage, extractStoragePath } from "@/lib/image-utils";

interface TraktirEditorPanelProps {
  settings: DeveloperSettings;
  onUpdate: (partial: Partial<DeveloperSettings>) => Promise<void>;
  onShowAlert?: (title: string, message: string) => void;
}

const COMMON_BANKS = [
  "BCA",
  "Mandiri",
  "BNI",
  "BRI",
  "BSI",
  "CIMB Niaga",
  "SeaBank",
  "Bank Jago",
  "GoPay / OVO",
  "DANA",
  "ShopeePay",
];

export default function TraktirEditorPanel({
  settings,
  onUpdate,
  onShowAlert,
}: TraktirEditorPanelProps) {
  const [prevSettings, setPrevSettings] = useState(settings);
  const [showQris, setShowQris] = useState(settings.show_qris);
  const [qrisUrl, setQrisUrl] = useState(settings.qris_url);
  const [qrisName, setQrisName] = useState(settings.qris_name);
  const [message, setMessage] = useState(settings.message);
  const [banks, setBanks] = useState<DeveloperBank[]>(settings.banks);

  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setShowQris(settings.show_qris);
    setQrisUrl(settings.qris_url);
    setQrisName(settings.qris_name);
    setMessage(settings.message);
    setBanks(settings.banks);
  }

  const [isUploadingQris, setIsUploadingQris] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBankChange = (
    index: number,
    field: keyof DeveloperBank,
    value: string | boolean
  ) => {
    const updated = [...banks];
    updated[index] = { ...updated[index], [field]: value };
    setBanks(updated);
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageType(file);
    if (!validation.valid) {
      onShowAlert?.(
        "Format Tidak Didukung",
        validation.error || "Harap unggah gambar JPG, PNG, atau WebP."
      );
      return;
    }

    setIsUploadingQris(true);
    try {
      const processed = await compressAndResizeImage(file, 768, 0.9);
      const fileName = `developer/qris-${Date.now()}.webp`;

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

      // Clean up old qris image if exists
      const oldPath = extractStoragePath(qrisUrl, "logos");
      if (oldPath && oldPath !== fileName) {
        try {
          await supabase.storage.from("logos").remove([oldPath]);
        } catch {
          // ignore cleanup error
        }
      }

      setQrisUrl(publicUrl);
      setShowQris(true);
      onShowAlert?.(
        "Gambar QRIS Terunggah",
        "Gambar QRIS berhasil diunggah dan dioptimalkan!"
      );
    } catch (err: unknown) {
      console.error("Gagal unggah QRIS:", err);
      const msg = err instanceof Error ? err.message : "Gagal mengunggah QRIS ke penyimpanan.";
      onShowAlert?.("Gagal Mengunggah", msg);
    } finally {
      setIsUploadingQris(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveQris = async () => {
    try {
      const oldPath = extractStoragePath(qrisUrl, "logos");
      if (oldPath) {
        await supabase.storage.from("logos").remove([oldPath]);
      }
    } catch {
      // ignore
    }
    setQrisUrl("");
    setShowQris(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        show_qris: showQris,
        qris_url: qrisUrl,
        qris_name: qrisName,
        message,
        banks: banks as [DeveloperBank, DeveloperBank, DeveloperBank],
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onShowAlert?.(
        "Tersimpan!",
        "Konten menu Traktir Developer berhasil diperbarui untuk semua pengguna."
      );
    } catch (err: unknown) {
      console.error("Gagal simpan developer settings:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan pengaturan.";
      onShowAlert?.("Gagal Menyimpan", msg);
    } finally {
      setIsSaving(false);
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
        gap: "18px",
        boxShadow: "0 2px 10px rgba(16, 45, 85, 0.04)",
      }}
    >
      {/* Header Panel */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "#fef3c7",
            color: "#d97706",
            display: "grid",
            placeItems: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          ☕
        </div>
        <div>
          <h4
            style={{
              fontSize: "15px",
              fontWeight: 800,
              color: "var(--navy)",
              margin: 0,
            }}
          >
            Konten Traktir Dev
          </h4>
          <p
            style={{
              fontSize: "11.5px",
              color: "var(--muted)",
              margin: "2px 0 0",
            }}
          >
            Kelola QRIS, rekening bank, &amp; pesan ucapan terima kasih
          </p>
        </div>
      </div>

      {/* ── Section 1: Pesan Developer ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label
          style={{
            fontSize: "12px",
            fontWeight: 750,
            color: "var(--navy)",
          }}
        >
          💌 Pesan dari Pengembang
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Tulis pesan apresiasi untuk pengguna..."
          style={{
            width: "100%",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            padding: "10px 12px",
            fontSize: "12.5px",
            color: "var(--text)",
            background: "var(--s2, #f8fafc)",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* ── Section 2: QRIS Developer ── */}
      <div
        style={{
          background: "var(--s2, #f8fafc)",
          borderRadius: "12px",
          padding: "14px",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>📱</span>
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 750,
                  color: "var(--navy)",
                }}
              >
                QRIS Pembayaran
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                Tampilkan kode QRIS di halaman donasi
              </div>
            </div>
          </div>

          <label
            style={{
              position: "relative",
              display: "inline-block",
              width: "44px",
              height: "24px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showQris}
              onChange={(e) => setShowQris(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: showQris ? "var(--primary, #287ff0)" : "#cbd5e1",
                borderRadius: "24px",
                transition: "0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  height: "18px",
                  width: "18px",
                  left: showQris ? "22px" : "3px",
                  bottom: "3px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  transition: "0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </span>
          </label>
        </div>

        {/* QRIS Upload / Preview */}
        {showQris && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              paddingTop: "6px",
            }}
          >
            {qrisUrl ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "#ffffff",
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrisUrl}
                  alt="QRIS Preview"
                  style={{
                    width: "60px",
                    height: "60px",
                    objectFit: "contain",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--navy)",
                    }}
                  >
                    Gambar QRIS Aktif
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#16a89a",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Terpasang
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveQris}
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    fontSize: "11.5px",
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                >
                  Hapus
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "1.5px dashed var(--border, #cbd5e1)",
                  borderRadius: "10px",
                  padding: "18px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#ffffff",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "4px" }}>📷</div>
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "var(--primary, #287ff0)",
                  }}
                >
                  {isUploadingQris ? "Mengunggah..." : "Klik untuk Unggah Gambar QRIS"}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                  Mendukung JPG, PNG, atau WebP (maks. 5MB)
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleQrisUpload}
              style={{ display: "none" }}
            />

            <div>
              <label
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "var(--navy)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Nama Penerima QRIS (a/n)
              </label>
              <input
                type="text"
                value={qrisName}
                onChange={(e) => setQrisName(e.target.value)}
                placeholder="Contoh: Dompet Keluarga / Nama Developer"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "8px 10px",
                  fontSize: "12px",
                  color: "var(--text)",
                  background: "#ffffff",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3: Rekening Bank / E-Wallet ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🏦</span>
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 750,
                color: "var(--navy)",
              }}
            >
              Rekening Bank &amp; E-Wallet (Maks. 3)
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              Aktifkan rekening yang ingin ditampilkan untuk transfer langsung
            </div>
          </div>
        </div>

        {banks.map((bank, index) => (
          <div
            key={index}
            style={{
              background: bank.enabled ? "var(--s2, #f8fafc)" : "#fafafa",
              borderRadius: "12px",
              padding: "12px",
              border: bank.enabled
                ? "1.5px solid var(--primary, #287ff0)"
                : "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            {/* Top row: Checkbox and Bank selector */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: 750,
                  color: "var(--navy)",
                }}
              >
                <input
                  type="checkbox"
                  checked={bank.enabled}
                  onChange={(e) =>
                    handleBankChange(index, "enabled", e.target.checked)
                  }
                  style={{ accentColor: "var(--primary, #287ff0)" }}
                />
                Rekening #{index + 1}
              </label>

              {/* Bank Name Dropdown / Input */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <select
                  value={
                    COMMON_BANKS.includes(bank.name) ? bank.name : "Lainnya"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "Lainnya") {
                      handleBankChange(index, "name", val);
                    }
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "var(--navy)",
                    background: "#ffffff",
                  }}
                >
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="Lainnya">Kustom...</option>
                </select>

                {!COMMON_BANKS.includes(bank.name) && (
                  <input
                    type="text"
                    value={bank.name}
                    onChange={(e) =>
                      handleBankChange(index, "name", e.target.value)
                    }
                    placeholder="Nama bank"
                    style={{
                      width: "90px",
                      padding: "4px 6px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      fontSize: "11px",
                      background: "#ffffff",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Input Account Number & Holder */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              <div>
                <input
                  type="text"
                  value={bank.account}
                  onChange={(e) =>
                    handleBankChange(index, "account", e.target.value)
                  }
                  placeholder="Nomor Rekening / No HP"
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    background: "#ffffff",
                  }}
                />
              </div>
              <div>
                <input
                  type="text"
                  value={bank.holder}
                  onChange={(e) =>
                    handleBankChange(index, "holder", e.target.value)
                  }
                  placeholder="Atas Nama (a/n)"
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                    background: "#ffffff",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Save Action ── */}
      <button
        type="button"
        disabled={isSaving}
        onClick={handleSave}
        style={{
          padding: "12px 18px",
          borderRadius: "10px",
          background: saveSuccess
            ? "var(--success, #16a89a)"
            : "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "#ffffff",
          border: "none",
          fontSize: "13.5px",
          fontWeight: 800,
          cursor: isSaving ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          boxShadow: "0 3px 12px rgba(49, 46, 129, 0.25)",
          transition: "all 0.2s ease",
          marginTop: "4px",
        }}
      >
        {isSaving ? (
          <span>Menyimpan ke Pengaturan Global...</span>
        ) : saveSuccess ? (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "16px", height: "16px" }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Tersimpan!</span>
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "16px", height: "16px" }}
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Simpan Konten Traktir Dev</span>
          </>
        )}
      </button>
    </div>
  );
}
