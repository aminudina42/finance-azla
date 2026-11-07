"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Modal from "@/components/Modal";
import {
  createTripItem,
  updateTripItem,
  getTouristDestinations,
  createTouristDestination,
} from "@/lib/wisata-service";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { CATEGORY_META, DESTINATION_CATEGORY_META, formatCityName } from "@/lib/wisata-utils";
import type { TripCategory, TripItem, TouristDestination } from "@/lib/types";
import { AlertCircle, Plus, Edit2, Sparkles, MapPin, Check, Ticket, X } from "lucide-react";

interface AddTripItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  totalDays: number;
  currentDay: number;
  itemToEdit?: TripItem | null;
  onSuccess: () => void;
}

export default function AddTripItemModal({
  isOpen,
  onClose,
  tripId,
  totalDays,
  currentDay,
  itemToEdit,
  onSuccess,
}: AddTripItemModalProps) {
  const { currentKeluarga, currentMember } = useApp();

  const [dayNumber, setDayNumber] = useState(currentDay || 1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState<TripCategory>("ticket");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [estimatedCostStr, setEstimatedCostStr] = useState("");
  const [notes, setNotes] = useState("");

  // Integrasi Katalog Destinasi
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<TouristDestination | null>(null);
  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);
  const [saveNewToCatalog, setSaveNewToCatalog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Ambil data katalog publik
      getTouristDestinations()
        .then((data) => setDestinations(data))
        .catch((err) => console.error("Error loading destinations for itinerary modal:", err));

      if (itemToEdit) {
        setDayNumber(itemToEdit.day_number);
        setStartTime(itemToEdit.start_time ? itemToEdit.start_time.slice(0, 5) : "09:00");
        setEndTime(itemToEdit.end_time ? itemToEdit.end_time.slice(0, 5) : "");
        setCategory(itemToEdit.category);
        setTitle(itemToEdit.title);
        setLocation(itemToEdit.location || "");
        setBookingCode(itemToEdit.booking_code || "");
        setEstimatedCostStr(
          itemToEdit.estimated_cost > 0 ? itemToEdit.estimated_cost.toLocaleString("id-ID") : ""
        );
        setNotes(itemToEdit.notes || "");
      } else {
        setDayNumber(currentDay || 1);
        setStartTime("09:00");
        setEndTime("");
        setCategory("ticket");
        setTitle("");
        setLocation("");
        setBookingCode("");
        setEstimatedCostStr("");
        setNotes("");
        setSelectedDestination(null);
        setSaveNewToCatalog(false);
      }
      setShowCatalogSuggestions(false);
      setErrorMsg(null);
    }
  }, [isOpen, itemToEdit, currentDay]);

  // Filter destinasi untuk live autocomplete
  const suggestedDestinations = useMemo(() => {
    if (!title.trim()) return destinations.slice(0, 6);
    const q = title.toLowerCase().trim();
    return destinations
      .filter((d) => d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q))
      .slice(0, 6);
  }, [destinations, title]);

  const handleSelectDestination = (dest: TouristDestination) => {
    setSelectedDestination(dest);
    setTitle(dest.name);
    setLocation(dest.maps_url || dest.city);

    // Kategori mapping
    if (dest.category === "kuliner") setCategory("food");
    else if (dest.category === "penginapan") setCategory("lodging");
    else if (dest.category === "belanja") setCategory("shopping");
    else setCategory("ticket");

    // Otomatis estimasi biaya tiket
    if (dest.estimated_ticket_price > 0) {
      setEstimatedCostStr(dest.estimated_ticket_price.toLocaleString("id-ID"));
    }
    if (dest.notes && !notes) {
      setNotes(dest.notes);
    }
    setShowCatalogSuggestions(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Nama acara wajib diisi");
      return;
    }
    setLoading(true);
    try {
      let effectiveKeluargaId = currentKeluarga?.id || currentMember?.keluarga_id || itemToEdit?.keluarga_id;

      if (!effectiveKeluargaId) {
        const { data: t } = await supabase.from("trips").select("keluarga_id").eq("id", tripId).maybeSingle();
        if (t?.keluarga_id) effectiveKeluargaId = t.keluarga_id;
      }

      if (!effectiveKeluargaId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: m } = await supabase.from("members").select("keluarga_id").eq("id", session.user.id).maybeSingle();
          if (m?.keluarga_id) effectiveKeluargaId = m.keluarga_id;
        }
      }

      if (!effectiveKeluargaId) {
        setErrorMsg("Data keluarga tidak ditemukan");
        setLoading(false);
        return;
      }

      const estimatedCost = Number(estimatedCostStr.replace(/\D/g, "")) || 0;

      if (itemToEdit) {
        const { error } = await updateTripItem(itemToEdit.id, {
          day_number: dayNumber,
          start_time: startTime || null,
          end_time: endTime || null,
          category,
          title: title.trim(),
          location: location.trim() || null,
          booking_code: bookingCode.trim() || null,
          estimated_cost: estimatedCost,
          notes: notes.trim() || null,
          destination_id: selectedDestination?.id || itemToEdit.destination_id || null,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await createTripItem(
          {
            trip_id: tripId,
            day_number: dayNumber,
            start_time: startTime || null,
            end_time: endTime || null,
            category,
            title: title.trim(),
            location: location.trim() || null,
            booking_code: bookingCode.trim() || null,
            estimated_cost: estimatedCost,
            notes: notes.trim() || null,
            destination_id: selectedDestination?.id || null,
          },
          effectiveKeluargaId
        );
        if (error) throw new Error(error.message);

        // Jika user mencentang untuk berkontribusi menambahkan tempat baru ke katalog bersama
        if (!selectedDestination && saveNewToCatalog && title.trim()) {
          try {
            await createTouristDestination(
              {
                name: title.trim(),
                city: location.trim().startsWith("http") ? "Wisata" : location.trim() || "Wisata",
                maps_url: location.trim().startsWith("http") ? location.trim() : null,
                category: category === "food" ? "kuliner" : category === "lodging" ? "penginapan" : category === "shopping" ? "belanja" : "rekreasi",
                estimated_ticket_price: estimatedCost,
                notes: notes.trim() || null,
              },
              currentMember?.id || undefined,
              currentKeluarga?.nama_keluarga || undefined
            );
          } catch (cErr) {
            console.warn("Gagal auto-share ke katalog publik:", cErr);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menyimpan acara");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose}>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h3 style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
            {itemToEdit ? "Edit Acara" : "Tambah Acara Baru"}
          </h3>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
            Atur destinasi, jam kunjungan, dan proyeksi anggaran
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
          {/* Hari & Waktu Kunjungan (Mobile-Friendly 2-Baris) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                Pilih Hari Jadwal
              </label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border, #cbd5e1)",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  backgroundColor: "var(--input-bg, #ffffff)",
                }}
              >
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Hari ke-{d}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border, #cbd5e1)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    backgroundColor: "var(--input-bg, #ffffff)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                  Selesai (Opsional)
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border, #cbd5e1)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    backgroundColor: "var(--input-bg, #ffffff)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Kategori Kegiatan
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TripCategory)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            >
              {Object.entries(CATEGORY_META).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.icon} {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Judul Acara dengan Autocomplete Rekomendasi Spot Wisata */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)" }}>
                Nama Acara / Tujuan <span style={{ color: "red" }}>*</span>
              </label>
              {destinations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCatalogSuggestions((prev) => !prev)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--brand-primary, #287ff0)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: 0,
                  }}
                >
                  <Sparkles size={11} />
                  <span>{showCatalogSuggestions ? "Tutup Rekomendasi" : "Pilih dari Katalog"}</span>
                </button>
              )}
            </div>

            <input
              type="text"
              required
              placeholder="Contoh: Kawah Putih, Candi Prambanan..."
              value={title}
              onFocus={() => setShowCatalogSuggestions(true)}
              onChange={(e) => {
                setTitle(e.target.value);
                if (selectedDestination && e.target.value !== selectedDestination.name) {
                  setSelectedDestination(null);
                }
                setShowCatalogSuggestions(true);
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: selectedDestination
                  ? "1.5px solid var(--brand-primary, #287ff0)"
                  : "1px solid var(--border, #cbd5e1)",
                fontSize: "13px",
                boxSizing: "border-box",
                backgroundColor: "var(--input-bg, #ffffff)",
              }}
            />

            {/* Terhubung ke Destinasi Katalog Badge */}
            {selectedDestination && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "5px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(22, 168, 154, 0.1)",
                  color: "#0d9488",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <Check size={11} />
                <span>Terhubung ke Katalog: {selectedDestination.name} ({selectedDestination.city})</span>
                <button
                  type="button"
                  onClick={() => setSelectedDestination(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#0d9488",
                    display: "inline-flex",
                    padding: "0 2px",
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Dropdown Popover Rekomendasi Tempat Wisata */}
            {showCatalogSuggestions && suggestedDestinations.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  marginTop: "4px",
                  backgroundColor: "var(--surface, #ffffff)",
                  borderRadius: "12px",
                  border: "1px solid var(--border, #cbd5e1)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  maxHeight: "220px",
                  overflowY: "auto",
                  padding: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 8px",
                    borderBottom: "1px solid var(--border, #f1f5f9)",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-muted, #94a3b8)", textTransform: "uppercase" }}>
                    Rekomendasi Spot Wisata Bersama
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCatalogSuggestions(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted, #94a3b8)",
                      cursor: "pointer",
                      fontSize: "11px",
                      padding: "2px",
                    }}
                  >
                    Tutup
                  </button>
                </div>

                {suggestedDestinations.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelectDestination(d)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(40, 127, 240, 0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text, #1e293b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                        <MapPin size={10} style={{ color: "var(--brand-primary, #287ff0)" }} />
                        <span>{d.city}</span>
                        {d.estimated_ticket_price > 0 && (
                          <>
                            <span>•</span>
                            <span style={{ fontWeight: 600, color: "var(--text, #1e293b)" }}>
                              Rp {d.estimated_ticket_price.toLocaleString("id-ID")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--brand-primary, #287ff0)",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: "rgba(40, 127, 240, 0.1)",
                        flexShrink: 0,
                      }}
                    >
                      Pilih
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Opsi Kontribusi Balik jika tempat manual belum ada di katalog */}
          {!itemToEdit && !selectedDestination && title.trim().length >= 3 && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "8px",
                backgroundColor: "rgba(40, 127, 240, 0.04)",
                border: "1px dashed rgba(40, 127, 240, 0.25)",
              }}
            >
              <input
                type="checkbox"
                id="saveNewToCatalog"
                checked={saveNewToCatalog}
                onChange={(e) => setSaveNewToCatalog(e.target.checked)}
                style={{ marginTop: "2px", cursor: "pointer" }}
              />
              <label
                htmlFor="saveNewToCatalog"
                style={{ fontSize: "11.5px", color: "var(--text, #1e293b)", cursor: "pointer", lineHeight: "1.4" }}
              >
                <strong>Bagikan tempat ini ke Katalog Wisata Bersama</strong>
                <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-muted, #64748b)" }}>
                  Agar keluarga lain juga dapat langsung memilih lokasi ini di itinerary mereka.
                </span>
              </label>
            </div>
          )}

          {/* Lokasi / Alamat atau Link Google Maps */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Lokasi, Alamat, atau Link Google Maps (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Pantai Kuta atau paste link maps.app.goo.gl/..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
              💡 Masukkan link Google Maps jika ingin memunculkan tombol &quot;Buka Maps&quot; di jadwal. Teks alamat biasa tetap tersimpan sebagai informasi lokasi.
            </span>
          </div>

          {/* Estimasi Biaya & Kode Booking */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                Estimasi Biaya (Rp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 150.000"
                value={estimatedCostStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setEstimatedCostStr(raw ? Number(raw).toLocaleString("id-ID") : "");
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

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                Kode Booking (Opsional)
              </label>
              <input
                type="text"
                placeholder="#LPZ-882"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value)}
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
          </div>

          {/* Catatan */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Catatan / Tips
            </label>
            <input
              type="text"
              placeholder="Bawa payung, pakai sepatu kets, dll."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {itemToEdit ? <Edit2 size={15} /> : <Plus size={15} />}
              <span>{loading ? "Menyimpan..." : itemToEdit ? "Perbarui Acara" : "Simpan Acara"}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
