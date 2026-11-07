"use client";

import React from "react";
import type { TouristDestination } from "@/lib/types";
import { DESTINATION_CATEGORY_META, formatRp } from "@/lib/wisata-utils";
import { MapPin, ExternalLink, Ticket, Edit2, Trash2, Plus } from "lucide-react";

const InstagramIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

interface DestinationCardProps {
  destination: TouristDestination;
  canManage: boolean;
  onEdit?: (dest: TouristDestination) => void;
  onDelete?: (dest: TouristDestination) => void;
  onSelectForTrip?: (dest: TouristDestination) => void;
}

export default function DestinationCard({
  destination,
  canManage,
  onEdit,
  onDelete,
  onSelectForTrip,
}: DestinationCardProps) {
  const cat = DESTINATION_CATEGORY_META[destination.category] || DESTINATION_CATEGORY_META.rekreasi;

  const isInstagram = destination.social_url?.includes("instagram.com");
  const isTikTok = destination.social_url?.includes("tiktok.com");

  return (
    <div
      style={{
        backgroundColor: "var(--surface, #ffffff)",
        borderRadius: "16px",
        border: "1px solid var(--border, rgba(0,0,0,0.08))",
        padding: "16px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "12px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
        position: "relative",
      }}
    >
      {/* Baris Atas: Kategori, Kota & Aksi Edit/Delete */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", minWidth: 0 }}>
          {/* Badge Kategori */}
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
              whiteSpace: "nowrap",
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </span>

          {/* Badge Kota */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              padding: "3px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              backgroundColor: "rgba(40, 127, 240, 0.08)",
              color: "var(--brand-primary, #287ff0)",
              whiteSpace: "nowrap",
            }}
          >
            <MapPin size={11} />
            <span>{destination.city}</span>
          </span>
        </div>

        {/* Tombol Manajemen (Hanya untuk Creator / Superadmin) */}
        {canManage && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            {onEdit && (
              <button
                onClick={() => onEdit(destination)}
                title="Edit Destinasi"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted, #64748b)",
                  cursor: "pointer",
                  padding: "5px",
                  borderRadius: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Edit2 size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(destination)}
                title="Hapus Destinasi"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted, #94a3b8)",
                  cursor: "pointer",
                  padding: "5px",
                  borderRadius: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Konten Utama: Nama Tempat & Tips */}
      <div style={{ minWidth: 0 }}>
        <h4
          style={{
            margin: "0 0 4px",
            fontSize: "15.5px",
            fontWeight: 700,
            color: "var(--text, #1e293b)",
            lineHeight: "1.35",
            wordBreak: "break-word",
          }}
        >
          {destination.name}
        </h4>

        {destination.notes && (
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--text-muted, #64748b)",
              lineHeight: "1.45",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {destination.notes}
          </p>
        )}
      </div>

      {/* Info Estimasi Tiket & External Links */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
          paddingTop: "6px",
          borderTop: "1px dashed var(--border, rgba(0,0,0,0.06))",
        }}
      >
        {/* Estimasi Tiket Masuk */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Ticket size={13} style={{ color: "var(--brand-primary, #287ff0)" }} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
            {destination.estimated_ticket_price > 0
              ? `${formatRp(destination.estimated_ticket_price)} / org`
              : "Tiket Gratis / Parkir"}
          </span>
        </div>

        {/* Tautan Maps & Sosmed */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {destination.maps_url && (
            <a
              href={destination.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka Lokasi di Google Maps"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "4px 8px",
                borderRadius: "6px",
                backgroundColor: "rgba(40, 127, 240, 0.08)",
                color: "var(--brand-primary, #287ff0)",
                fontSize: "11px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "background-color 0.15s ease",
              }}
            >
              <MapPin size={11} />
              <span>Maps</span>
              <ExternalLink size={10} />
            </a>
          )}

          {destination.social_url && (
            <a
              href={destination.social_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Lihat Review di Media Sosial"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "4px 8px",
                borderRadius: "6px",
                backgroundColor: isInstagram
                  ? "rgba(225, 48, 108, 0.08)"
                  : "rgba(100, 116, 139, 0.08)",
                color: isInstagram ? "#e1306c" : "var(--text, #1e293b)",
                fontSize: "11px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "background-color 0.15s ease",
              }}
            >
              {isInstagram ? <InstagramIcon /> : <ExternalLink size={11} />}
              <span>{isInstagram ? "Instagram" : isTikTok ? "TikTok" : "Review"}</span>
            </a>
          )}
        </div>
      </div>

      {/* Aksi Cepat: Gunakan di Rencana Liburan */}
      {onSelectForTrip && (
        <button
          type="button"
          onClick={() => onSelectForTrip(destination)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid rgba(40, 127, 240, 0.2)",
            backgroundColor: "rgba(40, 127, 240, 0.05)",
            color: "var(--brand-primary, #287ff0)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--brand-primary, #287ff0)";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(40, 127, 240, 0.05)";
            e.currentTarget.style.color = "var(--brand-primary, #287ff0)";
          }}
        >
          <Plus size={13} />
          <span>Gunakan di Rencana Liburan</span>
        </button>
      )}

      {/* Footer Kartu: Atribusi Pembuat */}
      {destination.created_by_family_name && (
        <div
          style={{
            fontSize: "10.5px",
            color: "var(--text-muted, #94a3b8)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>✨ Disarankan oleh</span>
          <strong style={{ color: "var(--text-muted, #64748b)", fontWeight: 600 }}>
            {destination.created_by_family_name}
          </strong>
        </div>
      )}
    </div>
  );
}
