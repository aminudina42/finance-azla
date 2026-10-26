"use client";

import React from "react";
import type { TripItem } from "@/lib/types";
import { CATEGORY_META, formatRp, getGoogleMapsUrl } from "@/lib/wisata-utils";
import { Clock, MapPin, ExternalLink, Ticket, CheckCircle2, RotateCcw, Trash2, Edit2 } from "lucide-react";

interface TimelineItemCardProps {
  item: TripItem;
  canExecuteExpense: boolean;
  onCatatAktual: (item: TripItem) => void;
  onRollback: (item: TripItem) => void;
  onDelete: (item: TripItem) => void;
  onEdit?: (item: TripItem) => void;
}

export default function TimelineItemCard({
  item,
  canExecuteExpense,
  onCatatAktual,
  onRollback,
  onDelete,
  onEdit,
}: TimelineItemCardProps) {
  const cat = CATEGORY_META[item.category] || CATEGORY_META.other;
  const mapsUrl = getGoogleMapsUrl(item.title, item.location);

  // Perhitungan delta penghematan / pembengkakan
  const delta = item.is_completed && typeof item.actual_cost === "number"
    ? item.estimated_cost - item.actual_cost
    : null;

  return (
    <div
      style={{
        backgroundColor: "var(--surface, #ffffff)",
        borderRadius: "16px",
        border: `1px solid ${item.is_completed ? "rgba(22, 168, 154, 0.3)" : "var(--border, rgba(0,0,0,0.08))"}`,
        padding: "14px 16px",
        boxShadow: item.is_completed ? "0 2px 8px rgba(22, 168, 154, 0.06)" : "0 2px 8px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        position: "relative",
      }}
    >
      {/* Baris Atas: Kategori, Jam & Aksi Hapus */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor: cat.bgColor,
              color: cat.color,
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </span>

          {item.start_time && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "11px",
                color: "var(--text-muted, #64748b)",
                fontWeight: 500,
              }}
            >
              <Clock size={11} />
              <span>{item.start_time.slice(0, 5)}</span>
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {onEdit && !item.is_completed && canExecuteExpense && (
            <button
              onClick={() => onEdit(item)}
              title="Edit Acara"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted, #64748b)",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
              }}
            >
              <Edit2 size={13} />
            </button>
          )}

          {canExecuteExpense && (
            <button
              onClick={() => onDelete(item)}
              title="Hapus Acara"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Judul & Alamat */}
      <div>
        <h4 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
          {item.title}
        </h4>

        {item.location && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              color: "var(--text-muted, #64748b)",
              marginTop: "2px",
            }}
          >
            <MapPin size={12} style={{ flexShrink: 0, color: "var(--brand-primary, #287ff0)" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.location}
            </span>
          </div>
        )}
      </div>

      {/* Badge Kode Booking & Link Google Maps */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
        {item.booking_code && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(124, 58, 237, 0.08)",
              color: "#7c3aed",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            <Ticket size={11} />
            <span>#{item.booking_code}</span>
          </div>
        )}

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            padding: "2px 8px",
            borderRadius: "6px",
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            color: "#2563eb",
            fontSize: "11px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <span>Buka Maps</span>
          <ExternalLink size={10} />
        </a>
      </div>

      {/* Catatan Tambahan jika ada */}
      {item.notes && (
        <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted, #64748b)", fontStyle: "italic", lineHeight: "1.4" }}>
          {item.notes}
        </p>
      )}

      {/* Baris Biaya & Aksi Catat Aktual */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "8px",
          borderTop: "1px dashed var(--border, rgba(0,0,0,0.06))",
          marginTop: "2px",
        }}
      >
        <div>
          {item.is_completed ? (
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>Realisasi Aktual:</div>
              <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-fraunces, serif)", color: "#0d9488" }}>
                {formatRp(item.actual_cost || 0)}
              </div>
              {delta !== null && (
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: delta >= 0 ? "#0d9488" : "#ea580c",
                  }}
                >
                  {delta > 0 && `(Hemat ${formatRp(delta)})`}
                  {delta < 0 && `(+${formatRp(Math.abs(delta))} dari estimasi)`}
                  {delta === 0 && `(Sesuai estimasi)`}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>Estimasi Biaya:</div>
              <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-fraunces, serif)", color: "var(--text, #1e293b)" }}>
                {formatRp(item.estimated_cost)}
              </div>
            </div>
          )}
        </div>

        {/* Tombol Eksekusi Status */}
        <div>
          {item.is_completed ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(22, 168, 154, 0.15)",
                  color: "#0d9488",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={12} />
                <span>Selesai</span>
              </span>

              {canExecuteExpense && (
                <button
                  onClick={() => onRollback(item)}
                  title="Batalkan Transaksi & Pulihkan Saldo"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px",
                    padding: "4px 6px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #cbd5e1)",
                    background: "var(--surface, #ffffff)",
                    color: "var(--text-muted, #64748b)",
                    fontSize: "10px",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={10} />
                  <span>Batal</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onCatatAktual(item)}
              disabled={!canExecuteExpense}
              title={canExecuteExpense ? "Catat biaya aktual ke kas pos" : "Hanya Suami/Istri yang dapat mencatat pengeluaran"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "10px",
                backgroundColor: canExecuteExpense ? "var(--brand-primary, #287ff0)" : "var(--text-muted, #cbd5e1)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                cursor: canExecuteExpense ? "pointer" : "not-allowed",
                boxShadow: canExecuteExpense ? "0 2px 6px rgba(40, 127, 240, 0.25)" : "none",
              }}
            >
              <span>💸</span>
              <span>Catat Aktual</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
