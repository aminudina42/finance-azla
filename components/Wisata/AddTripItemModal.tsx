"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { createTripItem, updateTripItem } from "@/lib/wisata-service";
import { useApp } from "@/lib/store";
import { CATEGORY_META } from "@/lib/wisata-utils";
import type { TripCategory, TripItem } from "@/lib/types";
import { AlertCircle, Plus, Edit2 } from "lucide-react";

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
  const { currentKeluarga } = useApp();

  const [dayNumber, setDayNumber] = useState(currentDay || 1);
  const [startTime, setStartTime] = useState("09:00");
  const [category, setCategory] = useState<TripCategory>("ticket");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [estimatedCostStr, setEstimatedCostStr] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setDayNumber(itemToEdit.day_number);
        setStartTime(itemToEdit.start_time ? itemToEdit.start_time.slice(0, 5) : "09:00");
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
        setCategory("ticket");
        setTitle("");
        setLocation("");
        setBookingCode("");
        setEstimatedCostStr("");
        setNotes("");
      }
      setErrorMsg(null);
    }
  }, [isOpen, itemToEdit, currentDay]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Nama acara wajib diisi");
      return;
    }
    if (!currentKeluarga?.id) {
      setErrorMsg("Data keluarga tidak ditemukan");
      return;
    }

    setLoading(true);
    try {
      const estimatedCost = Number(estimatedCostStr.replace(/\D/g, "")) || 0;

      if (itemToEdit) {
        const { error } = await updateTripItem(itemToEdit.id, {
          day_number: dayNumber,
          start_time: startTime || null,
          category,
          title: title.trim(),
          location: location.trim() || null,
          booking_code: bookingCode.trim() || null,
          estimated_cost: estimatedCost,
          notes: notes.trim() || null,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await createTripItem(
          {
            trip_id: tripId,
            day_number: dayNumber,
            start_time: startTime || null,
            category,
            title: title.trim(),
            location: location.trim() || null,
            booking_code: bookingCode.trim() || null,
            estimated_cost: estimatedCost,
            notes: notes.trim() || null,
          },
          currentKeluarga.id
        );
        if (error) throw new Error(error.message);
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
          {/* Hari & Jam */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
                Pilih Hari
              </label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border, #cbd5e1)",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              >
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Hari ke-{d}
                  </option>
                ))}
              </select>
            </div>

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
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border, #cbd5e1)",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
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

          {/* Judul Acara */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Nama Acara / Tujuan <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Tiket Masuk Candi Prambanan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          {/* Lokasi / Alamat */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>
              Lokasi / Alamat
            </label>
            <input
              type="text"
              placeholder="Contoh: Jl. Raya Solo - Yogyakarta No.16"
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
