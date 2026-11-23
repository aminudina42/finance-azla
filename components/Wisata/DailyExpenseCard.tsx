"use client";

import React from "react";
import type { TripExpense } from "@/lib/types";
import { CATEGORY_META, formatRp } from "@/lib/wisata-utils";
import { Edit2, Trash2, Fuel, FileText } from "lucide-react";

interface DailyExpenseCardProps {
  expense: TripExpense;
  canManage: boolean;
  onEdit: (expense: TripExpense) => void;
  onDelete: (expense: TripExpense) => void;
}

export default function DailyExpenseCard({
  expense,
  canManage,
  onEdit,
  onDelete,
}: DailyExpenseCardProps) {
  const cat = CATEGORY_META[expense.category] || CATEGORY_META.other;
  const isFuel = !!expense.fuel_liters && expense.fuel_liters > 0;

  return (
    <div
      style={{
        backgroundColor: "var(--surface, #ffffff)",
        borderRadius: "14px",
        border: "1px solid var(--border, rgba(0,0,0,0.08))",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        transition: "all 0.15s ease",
      }}
    >
      {/* Kolom Kiri: Ikon Kategori & Detail Judul */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            backgroundColor: cat.bgColor,
            color: cat.color,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          {expense.category === "transport" ? "🚗" :
           expense.category === "food" ? "🍜" :
           expense.category === "ticket" ? "🎟️" :
           expense.category === "lodging" ? "🏨" :
           expense.category === "shopping" ? "🛍️" : "📦"}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text, #1e293b)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {expense.title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "var(--text-muted, #64748b)",
              marginTop: "2px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                padding: "1px 6px",
                borderRadius: "4px",
                backgroundColor: cat.bgColor,
                color: cat.color,
                fontWeight: 600,
                fontSize: "10px",
              }}
            >
              {cat.label}
            </span>

            {isFuel && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(37, 99, 235, 0.1)",
                  color: "#2563eb",
                  fontWeight: 600,
                  fontSize: "10px",
                }}
              >
                <Fuel size={10} />
                <span>
                  {expense.fuel_liters}L
                  {expense.odometer_km ? ` • ${expense.odometer_km.toLocaleString("id-ID")} km` : ""}
                </span>
              </span>
            )}

            {expense.notes && (
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "140px",
                }}
              >
                • {expense.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Nominal Rupiah & Aksi */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "13.5px",
              fontWeight: 700,
              color: "var(--text, #1e293b)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatRp(expense.amount)}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-muted, #94a3b8)" }}>
            Mandiri (Non-POS)
          </div>
        </div>

        {canManage && (
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <button
              onClick={() => onEdit(expense)}
              title="Edit Pengeluaran"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted, #64748b)",
                cursor: "pointer",
                padding: "5px",
                borderRadius: "6px",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => onDelete(expense)}
              title="Hapus Pengeluaran"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-danger, #f04467)",
                cursor: "pointer",
                padding: "5px",
                borderRadius: "6px",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
