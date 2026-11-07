"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { createTouristDestination, updateTouristDestination } from "@/lib/wisata-service";
import { DESTINATION_CATEGORY_META, formatCityName } from "@/lib/wisata-utils";
import type { TouristDestination, TouristDestinationCategory } from "@/lib/types";
import { MapPin, AlertCircle, Plus, Edit2, Sparkles, Ticket } from "lucide-react";

interface AddDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationToEdit?: TouristDestination | null;
  onSuccess: (savedDestination: TouristDestination) => void;
  currentMemberId?: string | null;
  currentFamilyName?: string | null;
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

export default function AddDestinationModal({
  isOpen,
  onClose,
  destinationToEdit,
  onSuccess,
  currentMemberId,
  currentFamilyName,
}: AddDestinationModalProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<TouristDestinationCategory>("rekreasi");
  const [mapsUrl, setMapsUrl] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [estimatedTicketPriceStr, setEstimatedTicketPriceStr] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (destinationToEdit) {
        setName(destinationToEdit.name);
        setCity(destinationToEdit.city);
        setCategory(destinationToEdit.category || "rekreasi");
        setMapsUrl(destinationToEdit.maps_url || "");
        setSocialUrl(destinationToEdit.social_url || "");
        setEstimatedTicketPriceStr(
          destinationToEdit.estimated_ticket_price > 0
            ? destinationToEdit.estimated_ticket_price.toLocaleString("id-ID")
            : ""
        );
        setNotes(destinationToEdit.notes || "");
      } else {
        setName("");
        setCity("");
        setCategory("rekreasi");
        setMapsUrl("");
        setSocialUrl("");
        setEstimatedTicketPriceStr("");
        setNotes("");
      }
      setErrorMsg(null);
    }
  }, [isOpen, destinationToEdit]);

  if (!isOpen) return null;

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
      const ticketPrice = Number(estimatedTicketPriceStr.replace(/\D/g, "")) || 0;

      if (destinationToEdit) {
        const { error } = await updateTouristDestination(destinationToEdit.id, {
          name: name.trim(),
          city: formatCityName(city),
          category,
          maps_url: mapsUrl.trim() || null,
          social_url: socialUrl.trim() || null,
          estimated_ticket_price: ticketPrice,
          notes: notes.trim() || null,
        });

        if (error) throw new Error(error.message);

        onSuccess({
          ...destinationToEdit,
          name: name.trim(),
          city: formatCityName(city),
          category,
          maps_url: mapsUrl.trim() || null,
          social_url: socialUrl.trim() || null,
          estimated_ticket_price: ticketPrice,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        });
      } else {
        const { data, error } = await createTouristDestination(
          {
            name: name.trim(),
            city: formatCityName(city),
            category,
            maps_url: mapsUrl.trim() || null,
            social_url: socialUrl.trim() || null,
            estimated_ticket_price: ticketPrice,
            notes: notes.trim() || null,
          },
          currentMemberId || undefined,
          currentFamilyName || undefined
        );

        if (error) throw new Error(error.message);
        if (data) onSuccess(data);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menyimpan tempat wisata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose}>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={18} style={{ color: "var(--brand-primary, #287ff0)" }} />
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
              {destinationToEdit ? "Edit Rekomendasi Wisata" : "Tambah Spot Wisata Bersama"}
            </h3>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
            Bisa dibuka dan digunakan oleh seluruh keluarga untuk menyusun itinerary.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: "rgba(240, 68, 103, 0.12)",
              color: "var(--color-danger, #f04467)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Nama Tempat */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Nama Tempat Wisata <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Orchid Forest Cikole"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Kota / Wilayah */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Kota / Wilayah <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Bandung, Bogor, Yogyakarta"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />

            {/* Rekomendasi Kota Populer Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
              {POPULAR_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: city.toLowerCase() === c.toLowerCase()
                      ? "1px solid var(--brand-primary, #287ff0)"
                      : "1px solid var(--border, #e2e8f0)",
                    backgroundColor: city.toLowerCase() === c.toLowerCase()
                      ? "rgba(40, 127, 240, 0.1)"
                      : "transparent",
                    color: city.toLowerCase() === c.toLowerCase()
                      ? "var(--brand-primary, #287ff0)"
                      : "var(--text-muted, #64748b)",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Kategori & Estimasi Tiket Masuk */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TouristDestinationCategory)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border, #cbd5e1)",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              >
                {Object.entries(DESTINATION_CATEGORY_META).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.icon} {val.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                Tiket Masuk / Org (Rp)
              </label>
              <input
                type="text"
                placeholder="0 (Gratis)"
                value={estimatedTicketPriceStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setEstimatedTicketPriceStr(raw ? Number(raw).toLocaleString("id-ID") : "");
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border, #cbd5e1)",
                  fontSize: "13px",
                  fontWeight: 600,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Link Google Maps */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Link Google Maps (Opsional)
            </label>
            <input
              type="text"
              placeholder="https://maps.app.goo.gl/... atau paste tautan lokasi"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Link Media Sosial / Review */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Link Sosmed / Review (Opsional)
            </label>
            <input
              type="text"
              placeholder="@orchidforest atau https://instagram.com/..."
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <span style={{ display: "block", marginTop: "3px", fontSize: "10px", color: "var(--text-muted, #64748b)" }}>
              💡 Masukkan handle Instagram diawali @ (contoh: @taman_safari) atau link video TikTok review tempat ini.
            </span>
          </div>

          {/* Catatan / Tips Ramah Keluarga */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Catatan / Tips Liburan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Ramah stroller, disarankan datang pagi sebelum jam 10 agar tidak antre tiket."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                fontSize: "13px",
                boxSizing: "border-box",
                resize: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Tombol Aksi */}
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid var(--border, #cbd5e1)",
                backgroundColor: "transparent",
                color: "var(--text-muted, #64748b)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: loading ? "var(--text-muted, #94a3b8)" : "var(--brand-primary, #287ff0)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(40, 127, 240, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {destinationToEdit ? <Edit2 size={15} /> : <Plus size={15} />}
              <span>{loading ? "Menyimpan..." : destinationToEdit ? "Perbarui Tempat" : "Simpan ke Katalog"}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
