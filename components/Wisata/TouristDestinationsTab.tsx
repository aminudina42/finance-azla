"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Skeleton from "@/components/Skeleton";
import DestinationCard from "@/components/Wisata/DestinationCard";
import AddDestinationModal from "@/components/Wisata/AddDestinationModal";
import {
  getTouristDestinations,
  getTouristCities,
  deleteTouristDestination,
} from "@/lib/wisata-service";
import type { TouristDestination, TouristDestinationCategory } from "@/lib/types";
import { DESTINATION_CATEGORY_META } from "@/lib/wisata-utils";
import { Search, Plus, MapPin, X, RotateCcw, Palmtree, WifiOff, Sparkles } from "lucide-react";

interface TouristDestinationsTabProps {
  currentMemberId?: string | null;
  currentFamilyName?: string | null;
  isSuperAdmin?: boolean;
  onOpenAddModal?: () => void;
  isAddModalOpenExternal?: boolean;
  onCloseAddModalExternal?: () => void;
}

export default function TouristDestinationsTab({
  currentMemberId,
  currentFamilyName,
  isSuperAdmin = false,
  isAddModalOpenExternal,
  onCloseAddModalExternal,
}: TouristDestinationsTabProps) {
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("semua");
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");

  // Modals
  const [isAddModalOpenLocal, setIsAddModalOpenLocal] = useState(false);
  const [destinationToEdit, setDestinationToEdit] = useState<TouristDestination | null>(null);

  const isModalOpen = isAddModalOpenExternal !== undefined ? isAddModalOpenExternal : isAddModalOpenLocal;

  const handleCloseModal = () => {
    setIsAddModalOpenLocal(false);
    setDestinationToEdit(null);
    if (onCloseAddModalExternal) onCloseAddModalExternal();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      const [dList, cList] = await Promise.all([
        getTouristDestinations(),
        getTouristCities(),
      ]);
      setDestinations(dList);
      setCities(cList);
    } catch (err) {
      console.error("Gagal memuat katalog destinasi:", err);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered List
  const filteredDestinations = useMemo(() => {
    return destinations.filter((dest) => {
      // Filter Kota
      if (selectedCity !== "semua" && dest.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      // Filter Kategori
      if (selectedCategory !== "semua" && dest.category !== selectedCategory) {
        return false;
      }
      // Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = dest.name.toLowerCase().includes(q);
        const matchCity = dest.city.toLowerCase().includes(q);
        const matchNotes = dest.notes ? dest.notes.toLowerCase().includes(q) : false;
        if (!matchName && !matchCity && !matchNotes) return false;
      }
      return true;
    });
  }, [destinations, selectedCity, selectedCategory, searchQuery]);

  const handleEdit = (dest: TouristDestination) => {
    setDestinationToEdit(dest);
    setIsAddModalOpenLocal(true);
  };

  const handleDelete = async (dest: TouristDestination) => {
    if (!confirm(`Hapus "${dest.name}" dari katalog bersama?`)) return;
    try {
      const { error } = await deleteTouristDestination(dest.id);
      if (error) throw new Error(error.message);
      setDestinations((prev) => prev.filter((d) => d.id !== dest.id));
    } catch (err: any) {
      alert("Gagal menghapus destinasi: " + err.message);
    }
  };

  const handleSaveSuccess = (saved: TouristDestination) => {
    setDestinations((prev) => {
      const idx = prev.findIndex((d) => d.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });

    // Perbarui daftar kota jika ada kota baru
    if (saved.city && !cities.map((c) => c.toLowerCase()).includes(saved.city.toLowerCase())) {
      setCities((prev) => [...prev, saved.city].sort((a, b) => a.localeCompare(b)));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {/* Search Bar & Tombol Tambah */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--text-muted, #94a3b8)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Cari tempat wisata, kota, atau tips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 36px 10px 36px",
              borderRadius: "12px",
              border: "1px solid var(--border, #cbd5e1)",
              backgroundColor: "var(--surface, #ffffff)",
              fontSize: "13px",
              boxSizing: "border-box",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                background: "none",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setDestinationToEdit(null);
            setIsAddModalOpenLocal(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: "var(--brand-primary, #287ff0)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(40, 127, 240, 0.25)",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={16} />
          <span>Tambah</span>
        </button>
      </div>

      {/* Filter Chips Kota (Horizontal Scroll) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <button
          onClick={() => setSelectedCity("semua")}
          style={{
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: selectedCity === "semua" ? 700 : 500,
            border: selectedCity === "semua" ? "none" : "1px solid var(--border, #e2e8f0)",
            backgroundColor: selectedCity === "semua" ? "var(--brand-primary, #287ff0)" : "var(--surface, #ffffff)",
            color: selectedCity === "semua" ? "#ffffff" : "var(--text-muted, #64748b)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: selectedCity === "semua" ? "0 2px 6px rgba(40, 127, 240, 0.2)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          Semua Kota ({destinations.length})
        </button>

        {cities.map((city) => {
          const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
          const count = destinations.filter((d) => d.city.toLowerCase() === city.toLowerCase()).length;
          return (
            <button
              key={city}
              onClick={() => setSelectedCity(isSelected ? "semua" : city)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: isSelected ? 700 : 500,
                border: isSelected ? "none" : "1px solid var(--border, #e2e8f0)",
                backgroundColor: isSelected ? "var(--brand-primary, #287ff0)" : "var(--surface, #ffffff)",
                color: isSelected ? "#ffffff" : "var(--text-muted, #64748b)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: isSelected ? "0 2px 6px rgba(40, 127, 240, 0.2)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{city}</span>
              <span style={{ opacity: isSelected ? 0.9 : 0.6, fontSize: "11px" }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Sub-filter Kategori Chips */}
      <div
        style={{
          display: "flex",
          gap: "5px",
          overflowX: "auto",
          paddingBottom: "2px",
          scrollbarWidth: "none",
        }}
      >
        <button
          onClick={() => setSelectedCategory("semua")}
          style={{
            padding: "4px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: selectedCategory === "semua" ? 700 : 500,
            border: "none",
            backgroundColor: selectedCategory === "semua" ? "rgba(100, 116, 139, 0.15)" : "transparent",
            color: selectedCategory === "semua" ? "var(--text, #1e293b)" : "var(--text-muted, #64748b)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Semua Kategori
        </button>

        {Object.entries(DESTINATION_CATEGORY_META).map(([key, meta]) => {
          const isSelected = selectedCategory === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(isSelected ? "semua" : key)}
              style={{
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: isSelected ? 700 : 500,
                border: "none",
                backgroundColor: isSelected ? meta.bgColor : "transparent",
                color: isSelected ? meta.color : "var(--text-muted, #64748b)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Konten Daftar Destinasi */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          <Skeleton height={140} borderRadius={16} />
          <Skeleton height={140} borderRadius={16} />
          <Skeleton height={140} borderRadius={16} />
        </div>
      ) : connectionError ? (
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "20px",
            border: "1px dashed rgba(240, 68, 103, 0.3)",
            padding: "40px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(240, 68, 103, 0.1)",
              color: "#f04467",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WifiOff size={28} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
              Koneksi Terganggu
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted, #64748b)" }}>
              Gagal memuat katalog tempat wisata bersama.
            </p>
          </div>
          <button
            onClick={() => loadData()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              backgroundColor: "var(--brand-primary, #287ff0)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={15} />
            <span>Coba Lagi</span>
          </button>
        </div>
      ) : filteredDestinations.length === 0 ? (
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "20px",
            border: "1px dashed var(--border, rgba(0,0,0,0.12))",
            padding: "40px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(40, 127, 240, 0.1)",
              color: "var(--brand-primary, #287ff0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Palmtree size={28} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
              {searchQuery || selectedCity !== "semua" || selectedCategory !== "semua"
                ? "Tempat Wisata Tidak Ditemukan"
                : "Belum Ada Tempat Wisata di Katalog"}
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted, #64748b)", lineHeight: "1.4" }}>
              {searchQuery || selectedCity !== "semua"
                ? "Belum ada rekomendasi tempat wisata yang sesuai dengan filter pencarian ini."
                : "Bagikan rekomendasi tempat liburan seru keluarga agar bisa dipakai dalam rencana perjalanan."}
            </p>
          </div>
          <button
            onClick={() => {
              setDestinationToEdit(null);
              setIsAddModalOpenLocal(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              borderRadius: "12px",
              backgroundColor: "var(--brand-primary, #287ff0)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(40, 127, 240, 0.25)",
            }}
          >
            <Plus size={16} />
            <span>Tambah Tempat Ini Sekarang</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "12px",
          }}
        >
          {filteredDestinations.map((dest) => {
            const canManage =
              isSuperAdmin || (Boolean(currentMemberId) && dest.created_by === currentMemberId);

            return (
              <DestinationCard
                key={dest.id}
                destination={dest}
                canManage={canManage}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Destinasi */}
      <AddDestinationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        destinationToEdit={destinationToEdit}
        onSuccess={handleSaveSuccess}
        currentMemberId={currentMemberId}
        currentFamilyName={currentFamilyName}
      />
    </div>
  );
}
