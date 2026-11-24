"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  createTouristDestination,
  updateTouristDestination,
} from "@/lib/wisata-service";
import { DESTINATION_CATEGORY_META, formatCityName } from "@/lib/wisata-utils";
import type {
  TouristDestination,
  TouristDestinationCategory,
} from "@/lib/types";
import {
  MapPin,
  AlertCircle,
  Plus,
  Edit2,
  Ticket,
  Link2,
  StickyNote,
  Globe,
  Compass,
} from "lucide-react";

interface DestinationFormProps {
  mode: "create" | "edit";
  initialDestination?: TouristDestination | null;
  backHref?: string;
}

const POPULAR_CITIES = [
  "Bandung",
  "Bogor",
  "Yogyakarta",
  "Malang",
  "Bali",
  "Jakarta",
  "Surabaya",
  "Semarang",
  "Lombok",
];

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--surface, #ffffff)",
  borderRadius: "18px",
  border: "1px solid var(--border, #d8eaf8)",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text-secondary, #58779d)",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "10px",
  border: "1px solid var(--border, #d8eaf8)",
  backgroundColor: "var(--surface-soft, #f1f8fd)",
  color: "var(--text, #17375f)",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

export default function DestinationForm({
  mode,
  initialDestination,
  backHref = "/wisata?tab=katalog",
}: DestinationFormProps) {
  const router = useRouter();
  const { currentMember, currentKeluarga } = useApp();

  const [name, setName] = useState(initialDestination?.name || "");
  const [city, setCity] = useState(initialDestination?.city || "");
  const [category, setCategory] = useState<TouristDestinationCategory>(
    initialDestination?.category || "rekreasi"
  );
  const [mapsUrl, setMapsUrl] = useState(initialDestination?.maps_url || "");
  const [socialUrl, setSocialUrl] = useState(
    initialDestination?.social_url || ""
  );
  const [estimatedTicketPriceStr, setEstimatedTicketPriceStr] = useState(
    initialDestination && initialDestination.estimated_ticket_price > 0
      ? initialDestination.estimated_ticket_price.toLocaleString("id-ID")
      : ""
  );
  const [notes, setNotes] = useState(initialDestination?.notes || "");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialDestination) {
      setName(initialDestination.name || "");
      setCity(initialDestination.city || "");
      setCategory(initialDestination.category || "rekreasi");
      setMapsUrl(initialDestination.maps_url || "");
      setSocialUrl(initialDestination.social_url || "");
      setEstimatedTicketPriceStr(
        initialDestination.estimated_ticket_price > 0
          ? initialDestination.estimated_ticket_price.toLocaleString("id-ID")
          : ""
      );
      setNotes(initialDestination.notes || "");
    }
  }, [initialDestination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Harap masukkan nama tempat wisata");
      return;
    }
    if (!city.trim()) {
      setErrorMsg("Harap tentukan kota atau wilayah tempat wisata");
      return;
    }

    setLoading(true);
    try {
      const ticketPrice =
        Number(estimatedTicketPriceStr.replace(/\D/g, "")) || 0;

      if (mode === "edit" && initialDestination) {
        const { error } = await updateTouristDestination(
          initialDestination.id,
          {
            name: name.trim(),
            city: formatCityName(city),
            category,
            maps_url: mapsUrl.trim() || null,
            social_url: socialUrl.trim() || null,
            estimated_ticket_price: ticketPrice,
            notes: notes.trim() || null,
          }
        );

        if (error) throw new Error(error.message);

        router.push("/wisata?tab=katalog&saved=updated");
      } else {
        const { error } = await createTouristDestination(
          {
            name: name.trim(),
            city: formatCityName(city),
            category,
            maps_url: mapsUrl.trim() || null,
            social_url: socialUrl.trim() || null,
            estimated_ticket_price: ticketPrice,
            notes: notes.trim() || null,
          },
          currentMember?.id || undefined,
          currentKeluarga?.nama_keluarga || undefined
        );

        if (error) throw new Error(error.message);

        router.push("/wisata?tab=katalog&saved=created");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menyimpan tempat wisata");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            borderRadius: "12px",
            backgroundColor: "rgba(240, 68, 103, 0.12)",
            color: "var(--danger, #f04467)",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Card 1: Informasi Utama Spot */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Compass size={16} style={{ color: "var(--primary, #287ff0)" }} />
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              margin: 0,
              color: "var(--navy, #102d55)",
            }}
          >
            Informasi Utama Spot
          </h2>
        </div>

        {/* Nama Tempat */}
        <div>
          <label htmlFor="spot-name" style={labelStyle}>
            Nama Tempat Wisata{" "}
            <span style={{ color: "var(--danger, #f04467)" }}>*</span>
          </label>
          <input
            id="spot-name"
            type="text"
            required
            placeholder="Contoh: Orchid Forest Cikole"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Kota / Wilayah */}
        <div>
          <label htmlFor="spot-city" style={labelStyle}>
            Kota / Wilayah{" "}
            <span style={{ color: "var(--danger, #f04467)" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="spot-city"
              type="text"
              required
              placeholder="Contoh: Bandung, Bogor, Yogyakarta"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "38px" }}
            />
            <MapPin
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--primary, #287ff0)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Rekomendasi Kota Populer Chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "8px",
            }}
          >
            {POPULAR_CITIES.map((c) => {
              const isSelected = city.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: isSelected
                      ? "1px solid var(--primary, #287ff0)"
                      : "1px solid var(--border, #d8eaf8)",
                    backgroundColor: isSelected
                      ? "var(--primary-soft, #e2f0ff)"
                      : "transparent",
                    color: isSelected
                      ? "var(--primary, #287ff0)"
                      : "var(--text-secondary, #58779d)",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Kategori */}
        <div>
          <span style={labelStyle}>Kategori Wisata</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {Object.entries(DESTINATION_CATEGORY_META).map(([key, meta]) => {
              const isSelected = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setCategory(key as TouristDestinationCategory)
                  }
                  style={{
                    padding: "7px 12px",
                    borderRadius: "10px",
                    border: isSelected
                      ? `1.5px solid ${meta.color}`
                      : "1px solid var(--border, #d8eaf8)",
                    backgroundColor: isSelected ? meta.bgColor : "transparent",
                    color: isSelected
                      ? meta.color
                      : "var(--text-secondary, #58779d)",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Estimasi Tiket Masuk */}
        <div>
          <label htmlFor="spot-ticket" style={labelStyle}>
            Estimasi Tiket Masuk / Orang (Rp)
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="spot-ticket"
              type="text"
              inputMode="numeric"
              placeholder="0 (Gratis / Parkir saja)"
              value={estimatedTicketPriceStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setEstimatedTicketPriceStr(
                  raw ? Number(raw).toLocaleString("id-ID") : ""
                );
              }}
              style={{ ...inputStyle, paddingLeft: "38px", fontWeight: 600 }}
            />
            <Ticket
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--primary, #287ff0)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Card 2: Tautan Lokasi & Referensi */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link2 size={16} style={{ color: "var(--primary, #287ff0)" }} />
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              margin: 0,
              color: "var(--navy, #102d55)",
            }}
          >
            Tautan Lokasi & Review
          </h2>
          <span
            style={{
              fontSize: "11px",
              color: "var(--muted, #8196af)",
              fontWeight: 500,
            }}
          >
            (Opsional)
          </span>
        </div>

        {/* Link Google Maps */}
        <div>
          <label htmlFor="spot-maps" style={labelStyle}>
            Link Google Maps
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="spot-maps"
              type="text"
              placeholder="https://maps.app.goo.gl/... atau paste tautan lokasi"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "38px" }}
            />
            <MapPin
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted, #8196af)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Link Media Sosial / Review */}
        <div>
          <label htmlFor="spot-social" style={labelStyle}>
            Link Sosmed / Video Review
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="spot-social"
              type="text"
              placeholder="@orchidforest atau https://instagram.com/..."
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "38px" }}
            />
            <Globe
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted, #8196af)",
                pointerEvents: "none",
              }}
            />
          </div>
          <span
            style={{
              display: "block",
              marginTop: "5px",
              fontSize: "11px",
              color: "var(--muted, #8196af)",
              lineHeight: 1.4,
            }}
          >
            Masukkan handle Instagram diawali @ (contoh: @taman_safari) atau
            tautan video review tempat ini.
          </span>
        </div>
      </div>

      {/* Card 3: Catatan / Tips Ramah Keluarga */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StickyNote size={16} style={{ color: "var(--primary, #287ff0)" }} />
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              margin: 0,
              color: "var(--navy, #102d55)",
            }}
          >
            Catatan & Tips Liburan
          </h2>
          <span
            style={{
              fontSize: "11px",
              color: "var(--muted, #8196af)",
              fontWeight: 500,
            }}
          >
            (Opsional)
          </span>
        </div>

        <textarea
          id="spot-notes"
          rows={3}
          placeholder="Contoh: Ramah stroller, disarankan datang pagi sebelum jam 10 agar tidak antre tiket."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: "84px",
            fontFamily: "inherit",
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Info Singkat */}
      <p
        style={{
          margin: 0,
          fontSize: "12px",
          color: "var(--text-secondary, #58779d)",
          textAlign: "center",
          lineHeight: 1.45,
        }}
      >
        Spot yang ditambahkan bisa dibuka dan dipakai oleh seluruh keluarga
        untuk menyusun itinerary liburan.
      </p>

      {/* Tombol Aksi */}
      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
        <Link
          href={backHref}
          aria-disabled={loading}
          onClick={(e) => {
            if (loading) e.preventDefault();
          }}
          style={{
            flex: 1,
            padding: "13px 14px",
            borderRadius: "14px",
            border: "1px solid var(--border, #d8eaf8)",
            backgroundColor: "var(--surface, #ffffff)",
            color: "var(--text-secondary, #58779d)",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
            textAlign: "center",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Batal
        </Link>

        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 2,
            padding: "13px 16px",
            borderRadius: "14px",
            border: "none",
            backgroundColor: loading
              ? "var(--muted, #8196af)"
              : "var(--primary, #287ff0)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(40, 127, 240, 0.28)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          {mode === "edit" ? <Edit2 size={16} /> : <Plus size={16} />}
          <span>
            {loading
              ? "Menyimpan..."
              : mode === "edit"
              ? "Perbarui Tempat"
              : "Simpan ke Katalog"}
          </span>
        </button>
      </div>
    </form>
  );
}
