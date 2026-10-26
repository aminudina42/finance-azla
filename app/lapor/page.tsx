"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import AlertModal from "@/components/Modals/AlertModal";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { validateImageType, compressAndResizeImage } from "@/lib/image-utils";
import { UserFeedback, FeedbackType, FeedbackPriority } from "@/lib/types";

export default function LaporPage() {
  const { sessionUser, currentMember, currentKeluarga } = useApp();

  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [reportType, setReportType] = useState<FeedbackType>("bug");
  const [priority, setPriority] = useState<FeedbackPriority>("Medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [honeypot, setHoneypot] = useState("");

  // Attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    notionUrl?: string;
  }>({ isOpen: false, title: "", message: "" });

  // Alert Modal state
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  // History state
  const [historyItems, setHistoryItems] = useState<UserFeedback[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Device Diagnostics
  const [deviceInfo, setDeviceInfo] = useState<{
    os: string;
    browser: string;
    screenSize: string;
    userAgent: string;
  }>({ os: "Unknown", browser: "Unknown", screenSize: "", userAgent: "" });

  // 1. Detect Device & Browser on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      let os = "Desktop";
      if (/android/i.test(ua)) os = "Android";
      else if (/iPad|iPhone|iPod/.test(ua)) os = "iOS";
      else if (/Windows/i.test(ua)) os = "Windows";
      else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
      else if (/Linux/i.test(ua)) os = "Linux";

      let browser = "Browser";
      if (/chrome|chromium|crios/i.test(ua)) browser = "Chrome";
      else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
      else if (/safari/i.test(ua)) browser = "Safari";
      else if (/edg/i.test(ua)) browser = "Edge";

      setDeviceInfo({
        os,
        browser,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: ua,
      });

      // Restore form draft from sessionStorage
      try {
        const draft = sessionStorage.getItem("feedback_draft");
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.description) setDescription(parsed.description);
          if (parsed.stepsToReproduce) setStepsToReproduce(parsed.stepsToReproduce);
          if (parsed.reportType) setReportType(parsed.reportType);
          if (parsed.priority) setPriority(parsed.priority);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // 2. Auto-save Draft to SessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && (title || description || stepsToReproduce)) {
      try {
        sessionStorage.setItem(
          "feedback_draft",
          JSON.stringify({
            title,
            description,
            stepsToReproduce,
            reportType,
            priority,
          })
        );
      } catch {
        // ignore
      }
    }
  }, [title, description, stepsToReproduce, reportType, priority]);

  // 3. Load User History
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch("/api/feedback", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.items || []);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history" && sessionUser) {
      loadHistory();
    }
  }, [activeTab, sessionUser]);

  // 4. Handle File Selection & Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageType(file);
    if (!validation.valid) {
      setAlertConfig({
        isOpen: true,
        title: "Format Tidak Didukung",
        message: validation.error || "Harap pilih berkas gambar bertipe JPG, PNG, atau WebP.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAlertConfig({
        isOpen: true,
        title: "Ukuran Gambar Terlalu Besar",
        message: "Maksimal ukuran foto adalah 5MB. Gambar akan otomatis dikompresi sebelum diunggah.",
      });
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 5. Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionUser) {
      setAlertConfig({
        isOpen: true,
        title: "Login Diperlukan",
        message: "Silakan login terlebih dahulu untuk mengirimkan laporan atau saran.",
      });
      return;
    }

    if (title.trim().length < 5) {
      setAlertConfig({
        isOpen: true,
        title: "Judul Terlalu Pendek",
        message: "Harap masukkan judul laporan minimal 5 karakter.",
      });
      return;
    }

    if (description.trim().length < 10) {
      setAlertConfig({
        isOpen: true,
        title: "Deskripsi Terlalu Singkat",
        message: "Harap jelaskan kendala atau saran Anda secara lebih rinci (minimal 10 karakter).",
      });
      return;
    }

    setIsSubmitting(true);

    let uploadedImageUrl = "";

    // Upload screenshot to Supabase Storage if selected
    if (selectedFile) {
      try {
        // Compress image client-side to max 1200px WebP
        const compressed = await compressAndResizeImage(selectedFile, 1200, 0.85);
        const fileName = `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("feedbacks")
          .upload(fileName, compressed.blob, {
            contentType: "image/webp",
            upsert: true,
          });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("feedbacks").getPublicUrl(fileName);
          uploadedImageUrl = publicUrl;
        } else {
          console.warn("Storage upload failed, proceeding without attachment:", uploadError);
        }
      } catch (imgErr) {
        console.warn("Failed compressing image, continuing text submission:", imgErr);
      }
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: reportType,
          priority,
          title: title.trim(),
          description: description.trim(),
          stepsToReproduce: reportType === "bug" ? stepsToReproduce.trim() : undefined,
          currentUrl: typeof window !== "undefined" ? window.location.pathname : "/lapor",
          appVersion: "v1.0.0",
          deviceInfo,
          attachmentUrl: uploadedImageUrl,
          honeypot,
          keluargaId: currentKeluarga?.id,
          userName: currentMember?.display_name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirimkan laporan.");
      }

      // Clear draft & form
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("feedback_draft");
      }
      setTitle("");
      setDescription("");
      setStepsToReproduce("");
      handleRemoveFile();

      // Show success modal
      setSubmitSuccess({
        isOpen: true,
        title: reportType === "bug" ? "Laporan Bug Terkirim! 🚀" : "Saran Fitur Diterima! 💡",
        message: data.message || "Laporan Anda telah berhasil masuk ke papan Kanban Notion developer.",
        notionUrl: data.notionPageUrl,
      });
    } catch (err: any) {
      setAlertConfig({
        isOpen: true,
        title: "Pengiriman Gagal",
        message: err.message || "Terjadi gangguan koneksi saat mengirim laporan. Data Anda tetap tersimpan di form ini, silakan coba lagi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px 16px 100px" }}>
      {/* Header */}
      <PageHeader
        title="Lapor Bug & Saran"
        subtitle="Sampaikan kendala atau ide perbaikan aplikasi langsung ke tim developer"
        backHref="/"
      />

      {/* Auth Guard Banner if not logged in */}
      {!sessionUser && (
        <div
          style={{
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e11d48", fontWeight: 700 }}>
            <span>🔒</span>
            <span>Anda Belum Masuk Akun</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
            Untuk menjaga validitas laporan dan mempermudah follow-up perbaikan, Anda harus masuk ke akun CatatKeluarga terlebih dahulu.
          </p>
          <div>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "var(--primary, #287ff0)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Masuk Sekarang →
            </Link>
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          background: "var(--s2, #f1f5f9)",
          padding: "5px",
          borderRadius: "14px",
          marginBottom: "20px",
          border: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("form")}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "none",
            background: activeTab === "form" ? "#ffffff" : "transparent",
            color: activeTab === "form" ? "var(--navy)" : "var(--muted)",
            fontWeight: 800,
            fontSize: "13px",
            cursor: "pointer",
            boxShadow: activeTab === "form" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span>✍️</span>
          <span>Buat Laporan Baru</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "none",
            background: activeTab === "history" ? "#ffffff" : "transparent",
            color: activeTab === "history" ? "var(--navy)" : "var(--muted)",
            fontWeight: 800,
            fontSize: "13px",
            cursor: "pointer",
            boxShadow: activeTab === "history" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span>📋</span>
          <span>Riwayat Laporan</span>
        </button>
      </div>

      {/* TAB 1: FORM REPORT */}
      {activeTab === "form" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Honeypot anti-bot (Hidden) */}
          <div style={{ display: "none" }} aria-hidden="true">
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Type Selector (Bug vs Saran) */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--navy)", marginBottom: "8px" }}>
              Tipe Masukan <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {/* Option Bug */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setReportType("bug")}
                style={{
                  padding: "14px 12px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  border: reportType === "bug" ? "2px solid #ef4444" : "1.5px solid var(--border)",
                  background: reportType === "bug" ? "linear-gradient(145deg, #fff5f5, #ffe4e6)" : "var(--s1, #ffffff)",
                  boxShadow: reportType === "bug" ? "0 4px 12px rgba(239, 68, 68, 0.12)" : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: reportType === "bug" ? "#ef4444" : "#f1f5f9",
                    color: reportType === "bug" ? "#ffffff" : "#64748b",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "18px",
                  }}
                >
                  🐛
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 800, color: reportType === "bug" ? "#b91c1c" : "var(--navy)" }}>
                    Lapor Bug
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Kendala / error aplikasi</div>
                </div>
              </div>

              {/* Option Saran */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setReportType("saran")}
                style={{
                  padding: "14px 12px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  border: reportType === "saran" ? "2px solid #f59e0b" : "1.5px solid var(--border)",
                  background: reportType === "saran" ? "linear-gradient(145deg, #fffbeb, #fef3c7)" : "var(--s1, #ffffff)",
                  boxShadow: reportType === "saran" ? "0 4px 12px rgba(245, 158, 11, 0.12)" : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: reportType === "saran" ? "#f59e0b" : "#f1f5f9",
                    color: reportType === "saran" ? "#ffffff" : "#64748b",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "18px",
                  }}
                >
                  💡
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 800, color: reportType === "saran" ? "#b45309" : "var(--navy)" }}>
                    Saran Fitur
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Ide / perbaikan baru</div>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Picker */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--navy)", marginBottom: "8px" }}>
              Tingkat Urgensi
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {(
                [
                  { value: "Low", label: "Biasa", emoji: "🟢", color: "#10b981" },
                  { value: "Medium", label: "Sedang", emoji: "🟡", color: "#f59e0b" },
                  { value: "High", label: "Mendesak", emoji: "🔴", color: "#ef4444" },
                ] as const
              ).map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "10px",
                      border: isSelected ? `2px solid ${p.color}` : "1px solid var(--border)",
                      background: isSelected ? "#ffffff" : "var(--s2, #f8fafc)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: "12.5px",
                      color: isSelected ? "var(--navy)" : "var(--muted)",
                      boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
              Judul {reportType === "bug" ? "Masalah" : "Saran"} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                reportType === "bug"
                  ? "Contoh: Tombol simpan kasir tidak merespon saat offline"
                  : "Contoh: Tambahkan ekspor laporan pengeluaran ke Excel/PDF"
              }
              maxLength={150}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--border)",
                background: "var(--s1, #ffffff)",
                fontSize: "14px",
                color: "var(--navy)",
                outline: "none",
              }}
            />
            <div style={{ textAlign: "right", fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
              {title.length}/150 karakter
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
              Deskripsi Lengkap <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={
                reportType === "bug"
                  ? "Jelaskan apa yang terjadi, apa yang Anda harapkan, dan pada kondisi seperti apa kendala tersebut muncul..."
                  : "Ceritakan ide Anda, manfaatnya untuk pengelolaan keluarga, dan bagaimana fitur tersebut sebaiknya bekerja..."
              }
              maxLength={3000}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--border)",
                background: "var(--s1, #ffffff)",
                fontSize: "13.5px",
                color: "var(--navy)",
                outline: "none",
                lineHeight: "1.5",
                resize: "vertical",
              }}
            />
            <div style={{ textAlign: "right", fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
              {description.length}/3000 karakter
            </div>
          </div>

          {/* Steps to Reproduce (Bug Only) */}
          {reportType === "bug" && (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Langkah Kejadian <span style={{ fontWeight: 400, color: "var(--muted)" }}>(Opsional tapi sangat membantu)</span>
              </label>
              <textarea
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                rows={3}
                placeholder="1. Buka menu Dompet&#10;2. Klik Tambah Transaksi&#10;3. Masukkan nominal lalu tekan Simpan&#10;4. Layar menjadi putih dan transaksi tidak tersimpan"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border)",
                  background: "var(--s1, #ffffff)",
                  fontSize: "13px",
                  color: "var(--navy)",
                  outline: "none",
                  lineHeight: "1.5",
                  resize: "vertical",
                }}
              />
            </div>
          )}

          {/* Attachment / Screenshot Upload */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
              Tangkapan Layar (Screenshot) <span style={{ fontWeight: 400, color: "var(--muted)" }}>(Opsional)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {!previewUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "2px dashed var(--border)",
                  background: "var(--s2, #f8fafc)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  color: "var(--muted)",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "24px" }}>📸</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
                  Pilih atau Ambil Foto Screenshot
                </span>
                <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                  JPG, PNG, atau WebP (Otomatis dikompresi)
                </span>
              </button>
            ) : (
              <div
                style={{
                  position: "relative",
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "#000",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Screenshot preview"
                  style={{
                    width: "100%",
                    maxHeight: "260px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(0, 0, 0, 0.75)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>✕</span>
                  <span>Hapus Foto</span>
                </button>
              </div>
            )}

            {/* Privacy Warning */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                marginTop: "8px",
                padding: "8px 12px",
                background: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                fontSize: "11.5px",
                color: "#64748b",
                lineHeight: "1.4",
              }}
            >
              <span>🛡️</span>
              <span>
                <strong>Jaga Privasi:</strong> Pastikan tangkapan layar tidak memperlihatkan nomor rekening pribadi, saldo tabungan, atau data sensitif yang tidak ingin dibagikan.
              </span>
            </div>
          </div>

          {/* Auto-detected Diagnostics Accordion */}
          <details
            style={{
              background: "var(--s2, #f8fafc)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "12px",
              color: "var(--muted)",
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--navy)", userSelect: "none" }}>
              🔍 Informasi Diagnostik Perangkat (Otomatis disertakan)
            </summary>
            <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <div>• OS: <strong>{deviceInfo.os}</strong></div>
              <div>• Browser: <strong>{deviceInfo.browser}</strong></div>
              <div>• Layar: <strong>{deviceInfo.screenSize}</strong></div>
              <div>• Pelapor: <strong>{currentMember?.display_name || sessionUser?.email || "User"}</strong></div>
            </div>
          </details>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !sessionUser}
            style={{
              padding: "14px 20px",
              borderRadius: "14px",
              background:
                reportType === "bug"
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : "linear-gradient(135deg, #287ff0 0%, #1e40af 100%)",
              color: "#ffffff",
              border: "none",
              fontWeight: 800,
              fontSize: "14px",
              cursor: isSubmitting || !sessionUser ? "not-allowed" : "pointer",
              opacity: isSubmitting || !sessionUser ? 0.7 : 1,
              boxShadow: "0 4px 14px rgba(40, 127, 240, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "16px",
                    height: "16px",
                    border: "2px solid #ffffff",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span>Mengirim ke Sistem & Notion...</span>
              </>
            ) : (
              <>
                <span>{reportType === "bug" ? "🚀 Kirim Laporan Bug" : "💡 Kirim Saran Fitur"}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {historyLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "13px" }}>
              Memuat riwayat laporan Anda...
            </div>
          ) : historyItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
                background: "var(--s1, #ffffff)",
                borderRadius: "16px",
                border: "1px dashed var(--border)",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📭</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)" }}>
                Belum Ada Laporan
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "6px 0 16px" }}>
                Semua laporan kendala atau ide saran yang Anda kirimkan akan dicatat di sini.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "var(--primary, #287ff0)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                + Buat Laporan Pertama
              </button>
            </div>
          ) : (
            historyItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "var(--s1, #ffffff)",
                  borderRadius: "14px",
                  padding: "16px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 800,
                        background: item.type === "bug" ? "#fee2e2" : "#fef3c7",
                        color: item.type === "bug" ? "#dc2626" : "#b45309",
                      }}
                    >
                      {item.type === "bug" ? "🐛 Bug" : "💡 Saran"}
                    </span>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background:
                          item.priority === "High"
                            ? "#fee2e2"
                            : item.priority === "Medium"
                            ? "#fef3c7"
                            : "#dcfce7",
                        color:
                          item.priority === "High"
                            ? "#b91c1c"
                            : item.priority === "Medium"
                            ? "#b45309"
                            : "#15803d",
                      }}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <span style={{ fontSize: "11.5px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Title & Desc */}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--navy)", marginBottom: "4px" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {item.description}
                  </div>
                </div>

                {/* Notion status badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "8px",
                    borderTop: "1px solid var(--border)",
                    fontSize: "11.5px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    {item.notion_sync_status === "synced" ? (
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>
                        ✓ Masuk Board Notion
                      </span>
                    ) : item.notion_sync_status === "pending" ? (
                      <span style={{ color: "#ca8a04", fontWeight: 700 }}>
                        ⏳ Menunggu Sinkronisasi
                      </span>
                    ) : (
                      <span style={{ color: "#2563eb", fontWeight: 700 }}>
                        ✓ Tercatat di Sistem
                      </span>
                    )}
                  </div>

                  {item.attachment_url && (
                    <a
                      href={item.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}
                    >
                      Lihat Screenshot ↗
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Success Modal */}
      {submitSuccess.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "44px" }}>🎉</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)" }}>
              {submitSuccess.title}
            </div>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: 0 }}>
              {submitSuccess.message}
            </p>

            {submitSuccess.notionUrl && (
              <a
                href={submitSuccess.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  color: "#1e293b",
                  fontSize: "12px",
                  fontWeight: 700,
                  textDecoration: "none",
                  border: "1px solid #cbd5e1",
                }}
              >
                <span>Lihat Tiket di Board Notion ↗</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setSubmitSuccess({ isOpen: false, title: "", message: "" });
                setActiveTab("history");
              }}
              style={{
                marginTop: "6px",
                padding: "12px",
                borderRadius: "12px",
                background: "var(--primary, #287ff0)",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              Lihat Riwayat Laporan Saya
            </button>
          </div>
        </div>
      )}

      {/* General Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ isOpen: false, title: "", message: "" })}
      />
    </div>
  );
}
