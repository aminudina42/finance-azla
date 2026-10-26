"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserFeedback } from "@/lib/types";

interface FeedbackManagerPanelProps {
  onShowAlert?: (title: string, message: string) => void;
}

export default function FeedbackManagerPanel({ onShowAlert }: FeedbackManagerPanelProps) {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "bug" | "saran" | "failed">("all");

  // Notion test state
  const [isTestingNotion, setIsTestingNotion] = useState(false);
  const [notionStatus, setNotionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    title?: string;
    error?: string;
  }>({ tested: false, connected: false });

  // Retry sync state
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // 1. Load feedbacks for superadmin
  const loadFeedbacks = async () => {
    setIsLoading(true);
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
        setFeedbacks(data.items || []);
      } else {
        const err = await res.json().catch(() => ({}));
        onShowAlert?.("Gagal Memuat Laporan", err.error || "Terjadi kesalahan saat memuat data.");
      }
    } catch (err: any) {
      onShowAlert?.("Koneksi Bermasalah", err.message || "Gagal menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  // 2. Test Notion Connection
  const handleTestNotion = async () => {
    setIsTestingNotion(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/feedback/sync", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setNotionStatus({
        tested: true,
        connected: Boolean(data.connected),
        title: data.databaseTitle,
        error: data.error,
      });

      if (data.connected) {
        onShowAlert?.(
          "Notion Terhubung! ✅",
          `Koneksi ke Notion Database "${data.databaseTitle}" berhasil diverifikasi.`
        );
      } else {
        onShowAlert?.("Koneksi Notion Gagal ⚠️", data.error || "Gagal terhubung ke Notion.");
      }
    } catch (err: any) {
      setNotionStatus({
        tested: true,
        connected: false,
        error: err.message || "Gagal menghubungi endpoint sinkronisasi.",
      });
      onShowAlert?.("Gagal Test Koneksi", err.message || "Terjadi error.");
    } finally {
      setIsTestingNotion(false);
    }
  };

  // 3. Retry Syncing a Failed Feedback
  const handleRetrySync = async (feedbackId: string) => {
    setSyncingId(feedbackId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/feedback/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feedbackId }),
      });

      const data = await res.json();

      if (data.success) {
        onShowAlert?.("Berhasil Disinkronkan! 🚀", "Tiket berhasil dibuat di papan Kanban Notion.");
        loadFeedbacks();
      } else {
        onShowAlert?.("Sinkronisasi Gagal ⚠️", data.error || "Gagal mengirim ke Notion.");
        loadFeedbacks();
      }
    } catch (err: any) {
      onShowAlert?.("Gagal Sinkronisasi", err.message || "Terjadi gangguan jaringan.");
    } finally {
      setSyncingId(null);
    }
  };

  // Filter items
  const filteredFeedbacks = feedbacks.filter((item) => {
    if (activeFilter === "bug") return item.type === "bug";
    if (activeFilter === "saran") return item.type === "saran";
    if (activeFilter === "failed") return item.notion_sync_status === "failed";
    return true;
  });

  const totalBugs = feedbacks.filter((f) => f.type === "bug").length;
  const totalSaran = feedbacks.filter((f) => f.type === "saran").length;
  const totalFailed = feedbacks.filter((f) => f.notion_sync_status === "failed").length;

  return (
    <div
      style={{
        background: "var(--s1, #ffffff)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📬</span>
            <span>Laporan Pengguna & Integrasi Notion</span>
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            Kelola tiket bug dan saran yang masuk serta sinkronisasi ke papan Kanban Notion
          </p>
        </div>

        <button
          type="button"
          onClick={loadFeedbacks}
          disabled={isLoading}
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            background: "var(--s2, #f1f5f9)",
            border: "1px solid var(--border)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>🔄</span>
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Notion Status & Diagnostic Bar */}
      <div
        style={{
          background: "linear-gradient(145deg, #f8fafc, #f1f5f9)",
          borderRadius: "14px",
          padding: "14px",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              display: "grid",
              placeItems: "center",
              fontSize: "20px",
            }}
          >
            📋
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Notion Kanban Board</span>
              {notionStatus.tested && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "6px",
                    background: notionStatus.connected ? "#dcfce7" : "#fee2e2",
                    color: notionStatus.connected ? "#15803d" : "#b91c1c",
                  }}
                >
                  {notionStatus.connected ? "✓ Terhubung" : "✕ Error"}
                </span>
              )}
            </div>
            <div style={{ fontSize: "11.5px", color: "#64748b" }}>
              Board: <strong>Catat Keluarga Board</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestNotion}
          disabled={isTestingNotion}
          style={{
            padding: "8px 14px",
            borderRadius: "10px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "var(--navy)",
            fontWeight: 700,
            fontSize: "12px",
            cursor: isTestingNotion ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {isTestingNotion ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  border: "2px solid #287ff0",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span>Menguji...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Test Koneksi Notion</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Counter Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" }}>
        <div style={{ background: "var(--s2, #f8fafc)", padding: "12px", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Total Laporan</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--navy)", marginTop: "2px" }}>
            {feedbacks.length}
          </div>
        </div>
        <div style={{ background: "#fff5f5", padding: "12px", borderRadius: "12px", border: "1px solid #fecdd3" }}>
          <div style={{ fontSize: "11px", color: "#e11d48", fontWeight: 700 }}>🐛 Laporan Bug</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#be123c", marginTop: "2px" }}>
            {totalBugs}
          </div>
        </div>
        <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "12px", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: "11px", color: "#d97706", fontWeight: 700 }}>💡 Saran Fitur</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#b45309", marginTop: "2px" }}>
            {totalSaran}
          </div>
        </div>
        <div style={{ background: totalFailed > 0 ? "#fef2f2" : "#f0fdf4", padding: "12px", borderRadius: "12px", border: totalFailed > 0 ? "1px solid #fca5a5" : "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "11px", color: totalFailed > 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
            {totalFailed > 0 ? "⚠️ Gagal Sync" : "✓ Sync Lancar"}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: totalFailed > 0 ? "#991b1b" : "#15803d", marginTop: "2px" }}>
            {totalFailed}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {(
          [
            { key: "all", label: `Semua (${feedbacks.length})` },
            { key: "bug", label: `Bug (${totalBugs})` },
            { key: "saran", label: `Saran (${totalSaran})` },
            { key: "failed", label: `Gagal Sync (${totalFailed})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: activeFilter === tab.key ? "1.5px solid var(--primary)" : "1px solid var(--border)",
              background: activeFilter === tab.key ? "rgba(40, 127, 240, 0.08)" : "var(--s2, #f8fafc)",
              color: activeFilter === tab.key ? "var(--primary)" : "var(--muted)",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feedbacks List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted)", fontSize: "13px" }}>
            Memuat daftar laporan...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted)", fontSize: "13px" }}>
            Tidak ada laporan pada filter ini.
          </div>
        ) : (
          filteredFeedbacks.map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: "12px",
                border: "1px solid var(--border)",
                padding: "14px",
                background: "var(--s2, #f8fafc)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "2px 7px",
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
                      padding: "2px 7px",
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

                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                  {new Date(item.created_at).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* Title & Desc */}
              <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--navy)" }}>{item.title}</div>
              <div style={{ fontSize: "12.5px", color: "#334155", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                {item.description}
              </div>

              {item.steps_to_reproduce && (
                <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                  <strong>Langkah Kejadian:</strong>
                  <div style={{ whiteSpace: "pre-wrap", marginTop: "3px" }}>{item.steps_to_reproduce}</div>
                </div>
              )}

              {/* Reporter & Device Info */}
              <div style={{ fontSize: "11.5px", color: "#64748b", display: "flex", gap: "10px", flexWrap: "wrap", paddingTop: "4px" }}>
                <span>👤 {item.user_name} ({item.user_email || "no-email"})</span>
                {item.device_info?.os && <span>📱 {item.device_info.os} / {item.device_info.browser}</span>}
                {item.attachment_url && (
                  <a
                    href={item.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}
                  >
                    🖼️ Buka Screenshot ↗
                  </a>
                )}
              </div>

              {/* Sync Status Action Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "4px",
                  paddingTop: "8px",
                  borderTop: "1px solid #e2e8f0",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  {item.notion_sync_status === "synced" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#16a34a" }}>
                        ✓ Terkirim ke Notion
                      </span>
                      {item.notion_page_url && (
                        <a
                          href={item.notion_page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: "var(--primary)",
                            textDecoration: "none",
                          }}
                        >
                          Buka Tiket ↗
                        </a>
                      )}
                    </div>
                  ) : item.notion_sync_status === "failed" ? (
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#dc2626" }}>
                      ⚠️ Gagal Sync: {item.notion_sync_error || "Error tidak diketahui"}
                    </span>
                  ) : (
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#ca8a04" }}>
                      ⏳ Menunggu Sinkronisasi
                    </span>
                  )}
                </div>

                {item.notion_sync_status !== "synced" && (
                  <button
                    type="button"
                    onClick={() => handleRetrySync(item.id)}
                    disabled={syncingId === item.id}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "var(--primary, #287ff0)",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: syncingId === item.id ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {syncingId === item.id ? "Menyinkronkan..." : "🔄 Coba Sync Ulang"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
