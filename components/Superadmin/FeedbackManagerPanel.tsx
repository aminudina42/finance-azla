"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { UserFeedback } from "@/lib/types";

interface FeedbackManagerPanelProps {
  onShowAlert?: (title: string, message: string) => void;
}

const NOTION_DATABASE_URL = "https://notion.so/405a2b6446198003ba1fc2e585da8b88";

export default function FeedbackManagerPanel({ onShowAlert }: FeedbackManagerPanelProps) {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "bug" | "saran" | "todo" | "in_progress" | "done" | "failed"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Notion test state
  const [isTestingNotion, setIsTestingNotion] = useState(false);
  const [notionStatus, setNotionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    title?: string;
    error?: string;
  }>({ tested: false, connected: false });

  // Status updating / syncing states
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Detail toggle state (collapsed/hidden by default)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllDetails = () => {
    if (expandedIds.size > 0) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(feedbacks.map((f) => f.id)));
    }
  };

  // 1. Load feedbacks for superadmin (fetches from Notion API + local DB)
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
        const items: UserFeedback[] = data.items || [];
        setFeedbacks(items);

        if (data.notionConnected !== undefined) {
          setNotionStatus({
            tested: true,
            connected: Boolean(data.notionConnected),
            title: data.databaseTitle || "Catat Keluarga Board",
            error: data.notionError,
          });
        }
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

  // 2. Test Notion Connection and refresh board
  const handleTestNotion = async () => {
    setIsTestingNotion(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        onShowAlert?.(
          "Sesi Login Diperlukan",
          "Sesi login Anda tidak ditemukan di browser. Silakan muat ulang (refresh) halaman lalu coba lagi."
        );
        return;
      }

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
        title: data.databaseTitle || "Catat Keluarga Board",
        error: data.error,
      });

      if (data.connected) {
        onShowAlert?.(
          "Notion Terhubung! ✅",
          `Koneksi ke Notion Database "${data.databaseTitle || "Catat Keluarga Board"}" berhasil diverifikasi.`
        );
        // Refresh cards
        await loadFeedbacks();
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

  // 4. Update status in Notion directly
  const handleUpdateStatus = async (pageId: string, newStatus: string) => {
    setUpdatingStatusId(pageId);

    // Optimistic UI update
    setFeedbacks((prev) =>
      prev.map((item) => {
        if (item.id === pageId || item.notion_page_id === pageId) {
          const lower = newStatus.toLowerCase();
          const internalStatus =
            lower === "done"
              ? "selesai"
              : lower === "in progress"
              ? "proses"
              : lower === "to do"
              ? "ditinjau"
              : "baru";

          return {
            ...item,
            notion_status_name: newStatus,
            status: internalStatus,
          };
        }
        return item;
      })
    );

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch("/api/feedback/sync", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pageId, status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onShowAlert?.("Gagal Memperbarui Status", err.error || "Gagal menyimpan ke Notion.");
        await loadFeedbacks(); // rollback
      }
    } catch (err: any) {
      onShowAlert?.("Gagal Memperbarui Status", err.message || "Koneksi terganggu.");
      await loadFeedbacks();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Helper to accurately classify feedback into Kanban columns based on Notion Status name
  const getCardCategory = (item: UserFeedback): "Bug" | "Rekomendasi Feat" | "To Do" | "In progress" | "Done" => {
    const raw = (item.notion_status_name || "").trim().toLowerCase();
    if (raw === "bug") return "Bug";
    if (raw === "rekomendasi feat" || raw === "rekomendasi" || raw === "feat") return "Rekomendasi Feat";
    if (raw === "to do" || raw === "todo") return "To Do";
    if (raw === "in progress" || raw === "in-progress" || raw === "inprogress") return "In progress";
    if (raw === "done" || raw === "selesai") return "Done";

    // Fallbacks based on local fields if notion_status_name is missing
    if (item.status === "selesai") return "Done";
    if (item.status === "proses") return "In progress";
    if (item.type === "bug") return "Bug";
    if (item.type === "saran") return "Rekomendasi Feat";
    return "To Do";
  };

  // Accurate Notion Status counts
  const totalBugs = useMemo(
    () => feedbacks.filter((f) => getCardCategory(f) === "Bug").length,
    [feedbacks]
  );
  const totalSaran = useMemo(
    () => feedbacks.filter((f) => getCardCategory(f) === "Rekomendasi Feat").length,
    [feedbacks]
  );
  const totalTodo = useMemo(
    () => feedbacks.filter((f) => getCardCategory(f) === "To Do").length,
    [feedbacks]
  );
  const totalInProgress = useMemo(
    () => feedbacks.filter((f) => getCardCategory(f) === "In progress").length,
    [feedbacks]
  );
  const totalDone = useMemo(
    () => feedbacks.filter((f) => getCardCategory(f) === "Done").length,
    [feedbacks]
  );
  const totalFailed = useMemo(
    () => feedbacks.filter((f) => f.notion_sync_status === "failed").length,
    [feedbacks]
  );

  // Filtered list for List View
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesUser = item.user_name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesUser) return false;
      }

      // 2. Active Tab Filter
      if (activeFilter === "bug") return getCardCategory(item) === "Bug";
      if (activeFilter === "saran") return getCardCategory(item) === "Rekomendasi Feat";
      if (activeFilter === "todo") return getCardCategory(item) === "To Do";
      if (activeFilter === "in_progress") return getCardCategory(item) === "In progress";
      if (activeFilter === "done") return getCardCategory(item) === "Done";
      if (activeFilter === "failed") return item.notion_sync_status === "failed";
      return true;
    });
  }, [feedbacks, activeFilter, searchQuery]);

  // Kanban Columns
  const kanbanColumns = useMemo(
    () => [
      {
        id: "Bug",
        title: "Bug & Masalah",
        icon: "🐛",
        color: "#be123c",
        bg: "#fff1f2",
        border: "#fecdd3",
        items: feedbacks.filter((f) => getCardCategory(f) === "Bug"),
      },
      {
        id: "Rekomendasi Feat",
        title: "Rekomendasi Feat",
        icon: "💡",
        color: "#b45309",
        bg: "#fffbeb",
        border: "#fde68a",
        items: feedbacks.filter((f) => getCardCategory(f) === "Rekomendasi Feat"),
      },
      {
        id: "To Do",
        title: "To Do (Antrean)",
        icon: "📋",
        color: "#475569",
        bg: "#f8fafc",
        border: "#e2e8f0",
        items: feedbacks.filter((f) => getCardCategory(f) === "To Do"),
      },
      {
        id: "In progress",
        title: "Dalam Pengerjaan",
        icon: "⚙️",
        color: "#1d4ed8",
        bg: "#eff6ff",
        border: "#bfdbfe",
        items: feedbacks.filter((f) => getCardCategory(f) === "In progress"),
      },
      {
        id: "Done",
        title: "Selesai (Done)",
        icon: "✅",
        color: "#15803d",
        bg: "#f0fdf4",
        border: "#bbf7d0",
        items: feedbacks.filter((f) => getCardCategory(f) === "Done"),
      },
    ],
    [feedbacks]
  );

  // Filter visible columns in Board View based on activeFilter
  const visibleColumns = useMemo(() => {
    return kanbanColumns.filter((col) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "bug") return col.id === "Bug";
      if (activeFilter === "saran") return col.id === "Rekomendasi Feat";
      if (activeFilter === "todo") return col.id === "To Do";
      if (activeFilter === "in_progress") return col.id === "In progress";
      if (activeFilter === "done") return col.id === "Done";
      return true;
    });
  }, [kanbanColumns, activeFilter]);

  // Collapsed columns state: Set of column IDs that are expanded. Default is empty (ALL HIDE by default!)
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(new Set());

  const toggleColumn = (colId: string) => {
    setExpandedColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) {
        next.delete(colId);
      } else {
        next.add(colId);
      }
      return next;
    });
  };

  const toggleAllColumns = () => {
    if (expandedColumnIds.size > 0) {
      setExpandedColumnIds(new Set()); // Hide all
    } else {
      setExpandedColumnIds(new Set(visibleColumns.map((c) => c.id))); // Show all visible
    }
  };

  const handleSelectFilter = (
    filterKey: "all" | "bug" | "saran" | "todo" | "in_progress" | "done" | "failed"
  ) => {
    setActiveFilter(filterKey);
    // When a specific status filter is selected, automatically expand that column
    if (filterKey === "bug") setExpandedColumnIds(new Set(["Bug"]));
    else if (filterKey === "saran") setExpandedColumnIds(new Set(["Rekomendasi Feat"]));
    else if (filterKey === "todo") setExpandedColumnIds(new Set(["To Do"]));
    else if (filterKey === "in_progress") setExpandedColumnIds(new Set(["In progress"]));
    else if (filterKey === "done") setExpandedColumnIds(new Set(["Done"]));
    else if (filterKey === "all") setExpandedColumnIds(new Set()); // Default all hidden
  };

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 800,
              color: "var(--navy)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
                color: "#6d28d9",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="M14 9h4" />
                <path d="M14 15h4" />
              </svg>
            </span>
            <span>Notion Kanban & Laporan Pengguna</span>
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            Kelola tiket bug, rekomendasi fitur, dan roadmap langsung terhubung dengan Notion Board
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* View Mode Switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--s2, #f1f5f9)",
              padding: "3px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("board")}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: "none",
                background: viewMode === "board" ? "#ffffff" : "transparent",
                color: viewMode === "board" ? "var(--navy)" : "var(--muted)",
                fontSize: "11.5px",
                fontWeight: 750,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: viewMode === "board" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              <span>Papan Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: "none",
                background: viewMode === "list" ? "#ffffff" : "transparent",
                color: viewMode === "list" ? "var(--navy)" : "var(--muted)",
                fontSize: "11.5px",
                fontWeight: 750,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Daftar List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadFeedbacks}
            disabled={isLoading}
            style={{
              minHeight: "34px",
              padding: "6px 14px",
              borderRadius: "10px",
              background: "var(--s2, #f1f5f9)",
              border: "1px solid var(--border)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--navy)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              touchAction: "manipulation",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: isLoading ? "spin 0.8s linear infinite" : "none" }}
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{isLoading ? "Memuat..." : "Refresh"}</span>
          </button>
        </div>
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              display: "grid",
              placeItems: "center",
              color: "#0f172a",
              flexShrink: 0,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M14 9h4" />
              <path d="M14 15h4" />
              <path d="M5 9h2" />
              <path d="M5 15h2" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <span>Notion Kanban</span>
              {notionStatus.tested && (
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: "6px",
                    background: notionStatus.connected ? "#dcfce7" : "#fee2e2",
                    color: notionStatus.connected ? "#15803d" : "#b91c1c",
                    border: notionStatus.connected ? "1px solid #bbf7d0" : "1px solid #fecaca",
                  }}
                  title={notionStatus.error || undefined}
                >
                  {notionStatus.connected
                    ? `✓ Terhubung (${feedbacks.length} Tiket)`
                    : `✕ Error${notionStatus.error ? `: ${notionStatus.error}` : ""}`}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Board: <strong>{notionStatus.title || "Catat Keluarga Board"}</strong></span>
              <span>•</span>
              <a
                href={NOTION_DATABASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--primary, #287ff0)",
                  textDecoration: "none",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <span>Buka di Notion</span>
                <span style={{ fontSize: "11px" }}>↗</span>
              </a>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestNotion}
          disabled={isTestingNotion}
          style={{
            minHeight: "38px",
            padding: "8px 16px",
            borderRadius: "10px",
            background: "#ffffff",
            border: "1.5px solid #cbd5e1",
            color: "var(--navy)",
            fontWeight: 750,
            fontSize: "12px",
            cursor: isTestingNotion ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            flexShrink: 0,
            touchAction: "manipulation",
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
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Test Koneksi Notion</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Counter Cards (Mobile-first responsive 2-column grid) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Total Cards */}
        <div
          onClick={() => handleSelectFilter("all")}
          style={{
            background: "var(--s2, #f8fafc)",
            padding: "12px 14px",
            borderRadius: "14px",
            border: activeFilter === "all" ? "1.5px solid var(--primary)" : "1px solid var(--border)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Total Tiket</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--navy)", marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>
            {feedbacks.length}
          </div>
        </div>

        {/* Bug */}
        <div
          onClick={() => handleSelectFilter("bug")}
          style={{
            background: "#fff1f2",
            padding: "12px 14px",
            borderRadius: "14px",
            border: activeFilter === "bug" ? "1.5px solid #e11d48" : "1px solid #fecdd3",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "11px", color: "#e11d48", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect width="8" height="14" x="8" y="6" rx="4" />
              <path d="m19 7-3 2" /><path d="m5 7 3 2" />
              <path d="m10 4 1 2" /><path d="m14 4-1 2" />
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Laporan Bug</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#be123c", marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>
            {totalBugs}
          </div>
        </div>

        {/* Saran / Feat */}
        <div
          onClick={() => handleSelectFilter("saran")}
          style={{
            background: "#fffbeb",
            padding: "12px 14px",
            borderRadius: "14px",
            border: activeFilter === "saran" ? "1.5px solid #d97706" : "1px solid #fde68a",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "11px", color: "#d97706", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Rekomendasi</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#b45309", marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>
            {totalSaran}
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => handleSelectFilter("in_progress")}
          style={{
            background: "#eff6ff",
            padding: "12px 14px",
            borderRadius: "14px",
            border: activeFilter === "in_progress" ? "1.5px solid #2563eb" : "1px solid #bfdbfe",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "11px", color: "#1d4ed8", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>In Progress</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#1e40af", marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>
            {totalInProgress}
          </div>
        </div>

        {/* Done */}
        <div
          onClick={() => handleSelectFilter("done")}
          style={{
            background: "#f0fdf4",
            padding: "12px 14px",
            borderRadius: "14px",
            border: activeFilter === "done" ? "1.5px solid #16a34a" : "1px solid #bbf7d0",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "11px", color: "#15803d", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Selesai (Done)</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#15803d", marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>
            {totalDone}
          </div>
        </div>

        {/* Failed (if any) */}
        {totalFailed > 0 && (
          <div
            onClick={() => handleSelectFilter("failed")}
            style={{
              background: "#fef2f2",
              padding: "12px 14px",
              borderRadius: "14px",
              border: activeFilter === "failed" ? "1.5px solid #dc2626" : "1px solid #fecaca",
              cursor: "pointer",
              transition: "all 0.15s ease",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Gagal Sync</span>
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#991b1b", marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>
              {totalFailed}
            </div>
          </div>
        )}
      </div>

      {/* Search Bar & Filter Chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tiket (judul, status, nomor)..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 14px 10px 36px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--s2, #f8fafc)",
              fontSize: "13px",
              color: "var(--navy)",
              outline: "none",
            }}
          />
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", left: "12px", top: "12px", color: "var(--muted)" }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: "14px",
                padding: "4px",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "4px",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {[
            { key: "all", label: `Semua (${feedbacks.length})` },
            { key: "bug", label: `🐛 Bug (${totalBugs})` },
            { key: "saran", label: `💡 Rekomendasi (${totalSaran})` },
            { key: "todo", label: `📋 To Do (${totalTodo})` },
            { key: "in_progress", label: `⚙️ In Progress (${totalInProgress})` },
            { key: "done", label: `✅ Done (${totalDone})` },
            ...(totalFailed > 0 ? [{ key: "failed" as const, label: `⚠️ Gagal Sync (${totalFailed})` }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleSelectFilter(tab.key as any)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: activeFilter === tab.key ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                background: activeFilter === tab.key ? "rgba(40, 127, 240, 0.08)" : "var(--s2, #f8fafc)",
                color: activeFilter === tab.key ? "var(--primary)" : "var(--muted)",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA: Kanban Board OR List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "var(--muted)", fontSize: "13px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              border: "3px solid var(--primary, #287ff0)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 10px",
            }}
          />
          <div>Memuat tiket dari Notion Kanban Board...</div>
        </div>
      ) : viewMode === "board" ? (
        /* KANBAN BOARD VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Global Column Toggle & Board Status */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2px 2px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <span>
                Menampilkan {visibleColumns.length} Kolom Kanban
                {activeFilter !== "all" && (
                  <span style={{ color: "var(--primary, #287ff0)", fontWeight: 800, marginLeft: "4px" }}>
                    • Filter: {visibleColumns[0]?.title || activeFilter}
                  </span>
                )}
              </span>
              <span>•</span>
              <span style={{ color: expandedColumnIds.size > 0 ? "var(--navy)" : "var(--muted)" }}>
                {expandedColumnIds.size === 0
                  ? "Semua kolom disembunyikan (default)"
                  : `${expandedColumnIds.size} dari ${visibleColumns.length} kolom terbuka`}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {activeFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => handleSelectFilter("all")}
                  style={{
                    background: "transparent",
                    border: "1px dashed var(--border)",
                    borderRadius: "7px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  Tampilkan Semua Kolom
                </button>
              )}
              <button
                type="button"
                onClick={toggleAllColumns}
                style={{
                  background: expandedColumnIds.size > 0 ? "var(--s2, #f1f5f9)" : "rgba(40, 127, 240, 0.08)",
                  border: expandedColumnIds.size > 0 ? "1px solid var(--border)" : "1px solid rgba(40, 127, 240, 0.2)",
                  color: expandedColumnIds.size > 0 ? "var(--navy)" : "var(--primary, #287ff0)",
                  fontSize: "12px",
                  fontWeight: 750,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{expandedColumnIds.size > 0 ? "Tutup Semua Kolom" : "Buka Semua Kolom"}</span>
                <span style={{ fontSize: "10px" }}>{expandedColumnIds.size > 0 ? "▲" : "▼"}</span>
              </button>
            </div>
          </div>

          {/* Kanban Columns Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: visibleColumns.length === 1 ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
              alignItems: "start",
              overflowX: "auto",
              paddingBottom: "8px",
            }}
          >
            {visibleColumns.map((col) => {
              const colItems = col.items.filter((item) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  item.title?.toLowerCase().includes(q) ||
                  item.description?.toLowerCase().includes(q) ||
                  item.user_name?.toLowerCase().includes(q) ||
                  item.notion_status_name?.toLowerCase().includes(q)
                );
              });

              // Hidden by default; expanded if user toggled it OR if search query is active and matched
              const isColExpanded =
                expandedColumnIds.has(col.id) ||
                (searchQuery.trim().length > 0 && colItems.length > 0);

              return (
                <div
                  key={col.id}
                  style={{
                    background: "var(--s2, #f8fafc)",
                    borderRadius: "14px",
                    border: `1.5px solid ${col.border}`,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: "240px",
                    transition: "box-shadow 0.2s ease",
                  }}
                >
                  {/* Clickable Column Header (Accordion Toggle) */}
                  <div
                    onClick={() => toggleColumn(col.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleColumn(col.id);
                      }
                    }}
                    title={isColExpanded ? "Klik untuk menyembunyikan kolom" : "Klik untuk membuka isi kolom"}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      background: col.bg,
                      borderBottom: isColExpanded ? `1.5px solid ${col.border}` : "none",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span style={{ fontSize: "16px", lineHeight: 1 }}>{col.icon}</span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: col.color,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {col.title}
                      </span>
                      <span
                        style={{
                          background: "#ffffff",
                          color: col.color,
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 7px",
                          borderRadius: "10px",
                          border: `1px solid ${col.border}`,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      >
                        {colItems.length}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: isColExpanded ? "rgba(0,0,0,0.06)" : "#ffffff",
                        border: `1px solid ${col.border}`,
                        fontSize: "11px",
                        fontWeight: 750,
                        color: col.color,
                        flexShrink: 0,
                      }}
                    >
                      <span>{isColExpanded ? "Tutup" : "Buka"}</span>
                      <span style={{ fontSize: "9px" }}>{isColExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Collapsible Column Cards (Hidden by default) */}
                  {isColExpanded && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        padding: "12px",
                      }}
                    >
                      {colItems.length === 0 ? (
                        <div
                          style={{
                            padding: "24px 10px",
                            textAlign: "center",
                            fontSize: "12px",
                            color: "var(--muted)",
                            background: "#ffffff",
                            borderRadius: "10px",
                            border: "1px dashed var(--border)",
                          }}
                        >
                          Tidak ada tiket
                        </div>
                      ) : (
                        colItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              border: "1px solid var(--border)",
                              padding: "12px",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {/* Priority & Date */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: 800,
                                  padding: "2px 6px",
                                  borderRadius: "5px",
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
                                {item.priority || "Normal"}
                              </span>
                              <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                                {new Date(item.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>

                            {/* Title */}
                            <div
                              onClick={() => toggleExpand(item.id)}
                              style={{
                                fontSize: "13px",
                                fontWeight: 750,
                                color: "var(--navy)",
                                lineHeight: "1.4",
                                cursor: "pointer",
                              }}
                            >
                              {item.title}
                            </div>

                            {/* Collapsed/Expanded Detail in Board View (hidden by default) */}
                            {expandedIds.has(item.id) && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#475569",
                                  background: "#f8fafc",
                                  padding: "8px 10px",
                                  borderRadius: "8px",
                                  border: "1px solid #e2e8f0",
                                  lineHeight: "1.4",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <div>{item.description}</div>
                                {item.steps_to_reproduce && (
                                  <div style={{ marginTop: "4px", paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                                    <strong>Langkah:</strong> {item.steps_to_reproduce}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Status Mover, Notion Link & Toggle */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: "4px",
                                paddingTop: "6px",
                                borderTop: "1px solid #f1f5f9",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              {/* Move Status Select */}
                              <select
                                value={item.notion_status_name || col.id}
                                disabled={updatingStatusId === item.id}
                                onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "3px 6px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  background: "#f8fafc",
                                  color: "#334155",
                                  cursor: "pointer",
                                  maxWidth: "115px",
                                }}
                              >
                                <option value="Bug">🐛 Bug</option>
                                <option value="Rekomendasi Feat">💡 Rekomendasi</option>
                                <option value="To Do">📋 To Do</option>
                                <option value="In progress">⚙️ In Progress</option>
                                <option value="Done">✅ Done</option>
                              </select>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(item.id)}
                                  style={{
                                    fontSize: "10.5px",
                                    fontWeight: 700,
                                    color: expandedIds.has(item.id) ? "var(--primary, #287ff0)" : "#64748b",
                                    background: expandedIds.has(item.id) ? "rgba(40,127,240,0.08)" : "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    padding: "2px 6px",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                  }}
                                >
                                  {expandedIds.has(item.id) ? "Tutup ▲" : "Detail ▼"}
                                </button>

                                {item.notion_page_url ? (
                                  <a
                                    href={item.notion_page_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      color: "var(--primary, #287ff0)",
                                      textDecoration: "none",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "2px",
                                    }}
                                  >
                                    <span>Notion</span>
                                    <span>↗</span>
                                  </a>
                                ) : (
                                  item.notion_sync_status === "failed" && (
                                    <button
                                      type="button"
                                      onClick={() => handleRetrySync(item.id)}
                                      disabled={syncingId === item.id}
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: 750,
                                        color: "#dc2626",
                                        border: "none",
                                        background: "#fee2e2",
                                        padding: "3px 7px",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {syncingId === item.id ? "Syncing..." : "Sync Ulang"}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredFeedbacks.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "2px 4px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>
                Menampilkan {filteredFeedbacks.length} tiket ({expandedIds.size} detail dibuka)
              </div>
              <button
                type="button"
                onClick={toggleAllDetails}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary, #287ff0)",
                  fontSize: "12px",
                  fontWeight: 750,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 6px",
                  borderRadius: "6px",
                }}
              >
                <span>{expandedIds.size > 0 ? "Sembunyikan Semua Detail" : "Buka Semua Detail"}</span>
                <span style={{ fontSize: "10px" }}>{expandedIds.size > 0 ? "▲" : "▼"}</span>
              </button>
            </div>
          )}

          {filteredFeedbacks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 10px",
                color: "var(--muted)",
                fontSize: "13px",
                background: "var(--s2, #f8fafc)",
                borderRadius: "12px",
                border: "1px dashed var(--border)",
              }}
            >
              Tidak ada laporan pada filter atau pencarian ini.
            </div>
          ) : (
            filteredFeedbacks.map((item) => {
              const isExpanded = expandedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    padding: "12px 14px",
                    background: "var(--s2, #f8fafc)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Top Bar: Status, Priority, Date, and Toggle Button */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      {/* Status Badge */}
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 800,
                          background:
                            item.notion_status_name === "Bug"
                              ? "#fee2e2"
                              : item.notion_status_name === "In progress"
                              ? "#dbeafe"
                              : item.notion_status_name === "Done"
                              ? "#dcfce7"
                              : "#fef3c7",
                          color:
                            item.notion_status_name === "Bug"
                              ? "#dc2626"
                              : item.notion_status_name === "In progress"
                              ? "#1d4ed8"
                              : item.notion_status_name === "Done"
                              ? "#15803d"
                              : "#b45309",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {item.notion_status_name || item.type}
                      </span>

                      {/* Priority Badge */}
                      <span
                        style={{
                          padding: "2px 8px",
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
                        Prioritas: {item.priority || "Normal"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>

                      {/* Detail Toggle Button (Hide / Show) */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: isExpanded ? "rgba(40, 127, 240, 0.08)" : "#ffffff",
                          color: isExpanded ? "var(--primary, #287ff0)" : "#475569",
                          fontSize: "11px",
                          fontWeight: 750,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{isExpanded ? "Tutup Detail" : "Lihat Detail"}</span>
                        <svg
                          viewBox="0 0 24 24"
                          width="11"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s ease",
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Title (Always visible, click to toggle) */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 800,
                      color: "var(--navy)",
                      letterSpacing: "-0.1px",
                      lineHeight: "1.4",
                      cursor: "pointer",
                    }}
                  >
                    {item.title}
                  </div>

                  {/* Collapsible Detail Section (HIDDEN BY DEFAULT) */}
                  {isExpanded && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        paddingTop: "6px",
                        borderTop: "1px dashed #e2e8f0",
                        marginTop: "2px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#334155",
                          lineHeight: "1.5",
                          whiteSpace: "pre-wrap",
                          background: "#ffffff",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {item.description}
                      </div>

                      {item.steps_to_reproduce && (
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: "12px",
                            color: "#475569",
                          }}
                        >
                          <strong style={{ color: "var(--navy)" }}>Langkah Kejadian:</strong>
                          <div style={{ whiteSpace: "pre-wrap", marginTop: "3px" }}>
                            {item.steps_to_reproduce}
                          </div>
                        </div>
                      )}

                      {/* Reporter & Device Info */}
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <svg
                            viewBox="0 0 24 24"
                            width="12"
                            height="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>{item.user_name} ({item.user_email || "Notion"})</span>
                        </span>
                        {item.device_info?.os && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                              <path d="M12 18h.01" />
                            </svg>
                            <span>{item.device_info.os} / {item.device_info.browser}</span>
                          </span>
                        )}
                        {item.attachment_url && (
                          <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--primary)",
                              fontWeight: 700,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                            <span>Buka Screenshot ↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sync Status Action Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "2px",
                      paddingTop: "6px",
                      borderTop: "1px solid #e2e8f0",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {item.notion_sync_status === "synced" || item.notion_page_url ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#16a34a",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Tersinkron di Notion</span>
                          </span>
                          {item.notion_page_url && (
                            <a
                              href={item.notion_page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "var(--primary, #287ff0)",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              <span>Buka Tiket</span>
                              <span>↗</span>
                            </a>
                          )}
                        </div>
                      ) : item.notion_sync_status === "failed" ? (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#dc2626",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="12"
                            height="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <span>Gagal Sync: {item.notion_sync_error || "Error tidak diketahui"}</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#ca8a04",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="12"
                            height="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Menunggu Sinkronisasi</span>
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* Status Changer in List */}
                      <select
                        value={item.notion_status_name || "To Do"}
                        disabled={updatingStatusId === item.id}
                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 6px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "var(--navy)",
                          cursor: "pointer",
                        }}
                      >
                        <option value="Bug">🐛 Bug</option>
                        <option value="Rekomendasi Feat">💡 Rekomendasi Feat</option>
                        <option value="To Do">📋 To Do</option>
                        <option value="In progress">⚙️ In Progress</option>
                        <option value="Done">✅ Done</option>
                      </select>

                      {item.notion_sync_status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handleRetrySync(item.id)}
                          disabled={syncingId === item.id}
                          style={{
                            minHeight: "30px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: "var(--primary, #287ff0)",
                            color: "#ffffff",
                            border: "none",
                            fontSize: "11.5px",
                            fontWeight: 750,
                            cursor: syncingId === item.id ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            touchAction: "manipulation",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="11"
                            height="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                          <span>{syncingId === item.id ? "Syncing..." : "Sync Ulang"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
