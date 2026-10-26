"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getTripChecklists,
  createTripChecklist,
  toggleTripChecklist,
  deleteTripChecklist,
} from "@/lib/wisata-service";
import { useApp } from "@/lib/store";
import type { TripChecklist, TripChecklistAssignee } from "@/lib/types";
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface ChecklistSectionProps {
  tripId: string;
  canEdit: boolean;
}

export default function ChecklistSection({ tripId, canEdit }: ChecklistSectionProps) {
  const { currentKeluarga, currentMember } = useApp();

  const [checklists, setChecklists] = useState<TripChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<TripChecklistAssignee | "all">("all");

  // Input tambah barang baru
  const [newItemName, setNewItemName] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState<TripChecklistAssignee>("semua");
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getTripChecklists(tripId);
    setChecklists(data);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistik centang
  const stats = useMemo(() => {
    const total = checklists.length;
    const checked = checklists.filter((c) => c.is_checked).length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { total, checked, percent };
  }, [checklists]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (filterRole === "all") return checklists;
    return checklists.filter((c) => c.assigned_to === filterRole || c.assigned_to === "semua");
  }, [checklists, filterRole]);

  const handleToggle = async (item: TripChecklist) => {
    const newChecked = !item.is_checked;

    // Optimistic UI update
    setChecklists((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, is_checked: newChecked } : c))
    );

    try {
      await toggleTripChecklist(item.id, newChecked, currentMember?.id);
    } catch (err) {
      console.error(err);
      // Revert if error
      setChecklists((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_checked: !newChecked } : c))
      );
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !currentKeluarga?.id) return;

    setIsAdding(true);
    setErrorMsg(null);
    try {
      const { data, error } = await createTripChecklist(
        {
          trip_id: tripId,
          item_name: newItemName.trim(),
          assigned_to: newAssignedTo,
        },
        currentKeluarga.id
      );

      if (error || !data) throw new Error(error?.message || "Gagal menambah barang");

      setChecklists((prev) => [...prev, data]);
      setNewItemName("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menambah barang");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteTripChecklist(id);
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  const roleMeta: Record<TripChecklistAssignee, { label: string; color: string; bg: string }> = {
    semua: { label: "Semua", color: "#2563eb", bg: "#eff6ff" },
    suami: { label: "Ayah", color: "#0d9488", bg: "#f0fdfa" },
    istri: { label: "Ibu", color: "#db2777", bg: "#fdf2f8" },
    anak: { label: "Anak", color: "#ea580c", bg: "#fff7ed" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Progress Box */}
      <div
        style={{
          backgroundColor: "var(--surface, #ffffff)",
          borderRadius: "16px",
          border: "1px solid var(--border, rgba(0,0,0,0.08))",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
          <span style={{ fontWeight: 600, color: "var(--text, #1e293b)" }}>
            Kesiapan Barang Bawaan
          </span>
          <span style={{ fontWeight: 700, color: stats.percent === 100 ? "#0d9488" : "var(--brand-primary, #287ff0)" }}>
            {stats.checked} / {stats.total} Selesai ({stats.percent}%)
          </span>
        </div>

        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "rgba(100, 116, 139, 0.12)",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${stats.percent}%`,
              backgroundColor: stats.percent === 100 ? "#0d9488" : "var(--brand-primary, #287ff0)",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Role Filter Pills */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
        {[
          { id: "all", label: "Semua Bawaan" },
          { id: "semua", label: "Barang Bersama" },
          { id: "suami", label: "Tugas Ayah" },
          { id: "istri", label: "Tugas Ibu" },
          { id: "anak", label: "Tugas Anak" },
        ].map((tab) => {
          const isActive = filterRole === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterRole(tab.id as any)}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: isActive ? 700 : 500,
                border: `1px solid ${isActive ? "var(--brand-primary, #287ff0)" : "var(--border, rgba(0,0,0,0.08))"}`,
                backgroundColor: isActive ? "var(--brand-primary, #287ff0)" : "var(--surface, #ffffff)",
                color: isActive ? "#ffffff" : "var(--text-muted, #64748b)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Form Tambah Item */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          placeholder="Tambah barang bawaan..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            border: "1px solid var(--border, #cbd5e1)",
            backgroundColor: "var(--input-bg, #ffffff)",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <select
          value={newAssignedTo}
          onChange={(e) => setNewAssignedTo(e.target.value as TripChecklistAssignee)}
          style={{
            width: "90px",
            padding: "10px 8px",
            borderRadius: "12px",
            border: "1px solid var(--border, #cbd5e1)",
            backgroundColor: "var(--input-bg, #ffffff)",
            fontSize: "12px",
            outline: "none",
          }}
        >
          <option value="semua">Semua</option>
          <option value="suami">Ayah</option>
          <option value="istri">Ibu</option>
          <option value="anak">Anak</option>
        </select>

        <button
          type="submit"
          disabled={isAdding || !newItemName.trim()}
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: !newItemName.trim() ? "var(--text-muted, #cbd5e1)" : "var(--brand-primary, #287ff0)",
            color: "#ffffff",
            cursor: !newItemName.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={18} />
        </button>
      </form>

      {errorMsg && (
        <div style={{ fontSize: "11px", color: "var(--color-danger, #f04467)", display: "flex", alignItems: "center", gap: "4px" }}>
          <AlertCircle size={12} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* List Checklist */}
      <div
        style={{
          backgroundColor: "var(--surface, #ffffff)",
          borderRadius: "16px",
          border: "1px solid var(--border, rgba(0,0,0,0.08))",
          overflow: "hidden",
        }}
      >
        {filteredItems.length === 0 ? (
          <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: "13px" }}>
            Tidak ada barang bawaan pada kategori ini.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const meta = roleMeta[item.assigned_to] || roleMeta.semua;
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderBottom: idx < filteredItems.length - 1 ? "1px solid var(--border, rgba(0,0,0,0.05))" : "none",
                  backgroundColor: item.is_checked ? "rgba(22, 168, 154, 0.03)" : "transparent",
                }}
              >
                <div
                  onClick={() => handleToggle(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flex: 1,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {item.is_checked ? (
                    <CheckCircle2 size={18} style={{ color: "#0d9488", flexShrink: 0 }} />
                  ) : (
                    <Circle size={18} style={{ color: "var(--text-muted, #94a3b8)", flexShrink: 0 }} />
                  )}

                  <span
                    style={{
                      fontSize: "13px",
                      color: item.is_checked ? "var(--text-muted, #94a3b8)" : "var(--text, #1e293b)",
                      textDecoration: item.is_checked ? "line-through" : "none",
                    }}
                  >
                    {item.item_name}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      backgroundColor: meta.bg,
                      color: meta.color,
                    }}
                  >
                    {meta.label}
                  </span>

                  {canEdit && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Hapus"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted, #cbd5e1)",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
