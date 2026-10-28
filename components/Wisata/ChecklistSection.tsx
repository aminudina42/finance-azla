"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  getTripChecklists,
  createTripChecklist,
  toggleTripChecklist,
  deleteTripChecklist,
} from "@/lib/wisata-service";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { TripChecklist, TripChecklistAssignee } from "@/lib/types";
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, Loader2, Sparkles } from "lucide-react";

interface ChecklistSectionProps {
  tripId: string;
  canEdit: boolean;
}

const PRESET_SUGGESTIONS: Array<{ label: string; name: string; assigned: TripChecklistAssignee }> = [
  { label: "👕 Baju Ganti", name: "Pakaian Ganti", assigned: "semua" },
  { label: "💊 Obat / P3K", name: "Obat-obatan & P3K", assigned: "semua" },
  { label: "🔌 Charger & Powerbank", name: "Charger & Powerbank", assigned: "semua" },
  { label: "🍿 Camilan & Minuman", name: "Camilan & Air Minum", assigned: "semua" },
  { label: "🪪 Dompet & Tiket", name: "Dompet, KTP & Tiket", assigned: "suami" },
  { label: "🧴 Alat Mandi", name: "Perlengkapan Mandi", assigned: "istri" },
  { label: "🧥 Jaket Hangat", name: "Jaket / Pakaian Hangat", assigned: "anak" },
  { label: "🌧️ Payung", name: "Payung / Jas Hujan", assigned: "semua" },
];

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
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!newItemName.trim()) {
      setErrorMsg("Silakan ketik nama barang bawaan terlebih dahulu.");
      inputRef.current?.focus();
      return;
    }

    let effectiveKeluargaId = currentKeluarga?.id || currentMember?.keluarga_id;
    if (!effectiveKeluargaId) {
      const { data: t } = await supabase.from("trips").select("keluarga_id").eq("id", tripId).maybeSingle();
      if (t?.keluarga_id) effectiveKeluargaId = t.keluarga_id;
    }

    if (!effectiveKeluargaId) {
      setErrorMsg("Data keluarga tidak ditemukan");
      return;
    }

    setIsAdding(true);
    setErrorMsg(null);
    try {
      const { data, error } = await createTripChecklist(
        {
          trip_id: tripId,
          item_name: newItemName.trim(),
          assigned_to: newAssignedTo,
        },
        effectiveKeluargaId
      );

      if (error || !data) throw new Error(error?.message || "Gagal menambah barang");

      setChecklists((prev) => [...prev, data]);
      setNewItemName("");
      inputRef.current?.focus();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menambah barang");
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickAdd = async (preset: { name: string; assigned: TripChecklistAssignee }) => {
    const exists = checklists.some(
      (c) => c.item_name.trim().toLowerCase() === preset.name.trim().toLowerCase()
    );
    if (exists) {
      setErrorMsg(`"${preset.name}" sudah ada di daftar bawaan.`);
      return;
    }

    let effectiveKeluargaId = currentKeluarga?.id || currentMember?.keluarga_id;
    if (!effectiveKeluargaId) {
      const { data: t } = await supabase.from("trips").select("keluarga_id").eq("id", tripId).maybeSingle();
      if (t?.keluarga_id) effectiveKeluargaId = t.keluarga_id;
    }

    if (!effectiveKeluargaId) {
      setErrorMsg("Data keluarga tidak ditemukan.");
      return;
    }

    setIsAdding(true);
    setErrorMsg(null);
    try {
      const { data, error } = await createTripChecklist(
        {
          trip_id: tripId,
          item_name: preset.name,
          assigned_to: preset.assigned,
        },
        effectiveKeluargaId
      );

      if (error || !data) throw new Error(error?.message || "Gagal menambah barang");

      setChecklists((prev) => [...prev, data]);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
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
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "13px" }}>
          <span style={{ fontWeight: 600, color: "var(--text, #1e293b)" }}>
            Kesiapan Barang Bawaan
          </span>
          <span style={{ fontWeight: 700, color: stats.percent === 100 ? "#0d9488" : "var(--brand-primary, #287ff0)", whiteSpace: "nowrap" }}>
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
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "4px",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
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
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Form Tambah Item */}
      {canEdit && (
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "16px",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
              Tambah Barang Bawaan
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
              Ketik atau tap rekomendasi cepat
            </span>
          </div>

          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Contoh: Baju hangat, Charger, Obat..."
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                border: errorMsg ? "1px solid var(--color-danger, #f04467)" : "1px solid var(--border, #cbd5e1)",
                backgroundColor: "var(--input-bg, #ffffff)",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border 0.2s ease",
              }}
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={newAssignedTo}
                onChange={(e) => setNewAssignedTo(e.target.value as TripChecklistAssignee)}
                title="Tugas Untuk"
                style={{
                  flex: 1,
                  padding: "10px 10px",
                  borderRadius: "12px",
                  border: "1px solid var(--border, #cbd5e1)",
                  backgroundColor: "var(--input-bg, #ffffff)",
                  fontSize: "12px",
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                  minWidth: 0,
                }}
              >
                <option value="semua">👥 Semua Anggota</option>
                <option value="suami">👨 Tugas Ayah</option>
                <option value="istri">👩 Tugas Ibu</option>
                <option value="anak">🧒 Tugas Anak</option>
              </select>

              <button
                type="submit"
                disabled={isAdding}
                style={{
                  padding: "10px 18px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: isAdding ? "var(--text-muted, #94a3b8)" : "var(--brand-primary, #287ff0)",
                  color: "#ffffff",
                  cursor: isAdding ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontWeight: 600,
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(40, 127, 240, 0.25)",
                  transition: "all 0.15s ease",
                }}
              >
                {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                <span>Tambah</span>
              </button>
            </div>
          </form>

          {errorMsg && (
            <div style={{ fontSize: "11px", color: "var(--color-danger, #f04467)", display: "flex", alignItems: "center", gap: "5px" }}>
              <AlertCircle size={13} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rekomendasi Cepat (1-Klik Tambah) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px", width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)" }}>
              <Sparkles size={12} style={{ color: "#eab308" }} />
              <span>Rekomendasi Cepat (1-Klik Tambah):</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "4px",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
              }}
            >
              {PRESET_SUGGESTIONS.map((preset) => {
                const isAlreadyAdded = checklists.some(
                  (c) => c.item_name.trim().toLowerCase() === preset.name.trim().toLowerCase()
                );
                return (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={isAdding || isAlreadyAdded}
                    onClick={() => handleQuickAdd(preset)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 500,
                      border: "1px dashed var(--border, #cbd5e1)",
                      backgroundColor: isAlreadyAdded ? "rgba(0,0,0,0.03)" : "rgba(40, 127, 240, 0.05)",
                      color: isAlreadyAdded ? "var(--text-muted, #94a3b8)" : "var(--brand-primary, #287ff0)",
                      cursor: isAlreadyAdded ? "default" : "pointer",
                      whiteSpace: "nowrap",
                      textDecoration: isAlreadyAdded ? "line-through" : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      flexShrink: 0,
                    }}
                  >
                    <span>{preset.label}</span>
                    {isAlreadyAdded && <CheckCircle2 size={10} style={{ color: "#0d9488" }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List Checklist */}
      <div
        style={{
          backgroundColor: "var(--surface, #ffffff)",
          borderRadius: "16px",
          border: "1px solid var(--border, rgba(0,0,0,0.08))",
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
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
                  gap: "10px",
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
                    minWidth: 0,
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
                      wordBreak: "break-word",
                      lineHeight: "1.4",
                    }}
                  >
                    {item.item_name}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      backgroundColor: meta.bg,
                      color: meta.color,
                      whiteSpace: "nowrap",
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
                        display: "flex",
                        alignItems: "center",
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
