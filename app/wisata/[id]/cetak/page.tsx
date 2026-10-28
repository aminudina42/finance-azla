"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toPng } from "html-to-image";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import { getTripById, getTripItems } from "@/lib/wisata-service";
import { formatTripDates, formatRp, CATEGORY_META } from "@/lib/wisata-utils";
import type { Trip, TripItem, TripCategory } from "@/lib/types";
import { Download, ArrowLeft, Palmtree, MapPin, Calendar, CheckCircle2 } from "lucide-react";

export default function CetakWisataPage() {
  const params = useParams();
  const tripId = params.id as string;
  const router = useRouter();

  const cardRef = useRef<HTMLDivElement>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const [tData, iData] = await Promise.all([
        getTripById(tripId),
        getTripItems(tripId),
      ]);
      setTrip(tData);
      setItems(iData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistik Realisasi & Breakdown
  const stats = useMemo(() => {
    let totalEstimated = 0;
    let totalActual = 0;
    let completedCount = 0;

    const catMap: Partial<Record<TripCategory, { actual: number; estimated: number }>> = {};

    items.forEach((it) => {
      totalEstimated += Number(it.estimated_cost) || 0;
      if (it.is_completed) {
        completedCount++;
        totalActual += Number(it.actual_cost) || 0;
      }
      const cat = it.category || "other";
      if (!catMap[cat]) catMap[cat] = { actual: 0, estimated: 0 };
      catMap[cat]!.estimated += Number(it.estimated_cost) || 0;
      if (it.is_completed) {
        catMap[cat]!.actual += Number(it.actual_cost) || 0;
      }
    });

    return {
      totalEstimated,
      totalActual,
      completedCount,
      totalCount: items.length,
      catMap,
    };
  }, [items]);

  const handleDownloadPng = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const safeTitle = (trip?.title || "wisata")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");

      const link = document.createElement("a");
      link.download = `struk-wisata-${safeTitle}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error("Gagal mengekspor gambar:", err);
      setExportError("Gagal mengonversi kartu menjadi gambar. Silakan coba kembali.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px" }}>
        <Skeleton height={50} borderRadius={10} />
        <div style={{ marginTop: "16px" }}>
          <Skeleton height={400} borderRadius={16} />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <h3>Data Trip Tidak Ditemukan</h3>
        <Link href="/wisata" style={{ color: "var(--brand-primary, #287ff0)" }}>
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "var(--background, #f8fafc)",
        paddingBottom: "80px",
      }}
    >
      <PageHeader
        title="Kartu Kenangan Wisata"
        subtitle="Unduh atau bagikan ke WhatsApp keluarga"
        backHref={`/wisata/${trip.id}`}
      />

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {exportError && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              backgroundColor: "rgba(240, 68, 103, 0.15)",
              color: "#f04467",
              fontSize: "12px",
            }}
          >
            {exportError}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleDownloadPng}
            disabled={isExporting}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              backgroundColor: isExporting ? "#94a3b8" : "var(--brand-primary, #287ff0)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              border: "none",
              cursor: isExporting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(40, 127, 240, 0.25)",
            }}
          >
            <Download size={18} />
            <span>{isExporting ? "Memproses Gambar..." : "Unduh Gambar PNG"}</span>
          </button>
        </div>

        {/* Travel Receipt Card (DOM to be captured) */}
        <div
          ref={cardRef}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            padding: "24px 20px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
            color: "#1e293b",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Card Header */}
          <div style={{ textAlign: "center", borderBottom: "2px dashed #e2e8f0", paddingBottom: "16px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#2563eb", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
              <Palmtree size={14} />
              <span>Dompet Azla • Catat Keluarga</span>
            </div>
            <h2
              style={{
                margin: "8px 0 4px",
                fontSize: "20px",
                fontFamily: "var(--font-fraunces, serif)",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: "1.25",
              }}
            >
              {trip.title}
            </h2>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "4px 8px", fontSize: "12px", color: "#64748b" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={12} style={{ color: "#2563eb", flexShrink: 0 }} />
                <span>{trip.destination}</span>
              </span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={12} style={{ flexShrink: 0 }} />
                <span>{formatTripDates(trip.start_date, trip.end_date)}</span>
              </span>
            </div>
          </div>

          {/* Financial Summary Highlight */}
          <div
            style={{
              background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
              borderRadius: "14px",
              padding: "16px",
              border: "1px solid #dbeafe",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                Total Pengeluaran Riil:
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  fontFamily: "var(--font-fraunces, serif)",
                  color: "#2563eb",
                }}
              >
                {formatRp(stats.totalActual)}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569" }}>
              <span>Target Pagu Anggaran:</span>
              <strong style={{ fontWeight: 700 }}>
                {trip.total_budget_limit > 0 ? formatRp(trip.total_budget_limit) : "Fleksibel"}
              </strong>
            </div>

            {trip.total_budget_limit > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569" }}>
                <span>Sisa Anggaran:</span>
                <strong style={{ fontWeight: 700, color: stats.totalActual <= trip.total_budget_limit ? "#0d9488" : "#e11d48" }}>
                  {formatRp(Math.max(0, trip.total_budget_limit - stats.totalActual))}
                </strong>
              </div>
            )}
          </div>

          {/* Breakdown Kategori */}
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Rincian Biaya per Kategori
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {Object.entries(stats.catMap).map(([catKey, val]) => {
                const meta = CATEGORY_META[catKey as TripCategory] || CATEGORY_META.other;
                return (
                  <div
                    key={catKey}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px dashed #f1f5f9",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>
                    <strong style={{ fontFamily: "var(--font-fraunces, serif)", fontWeight: 700 }}>
                      {formatRp(val?.actual || 0)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Destinasi Wisata yang Dikunjungi */}
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Jejak Petualangan ({stats.completedCount}/{stats.totalCount} Acara)
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {items.slice(0, 8).map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={13} style={{ color: it.is_completed ? "#0d9488" : "#94a3b8" }} />
                    <span style={{ color: it.is_completed ? "#1e293b" : "#64748b" }}>{it.title}</span>
                  </span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Hari {it.day_number}
                  </span>
                </div>
              ))}
              {items.length > 8 && (
                <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", textAlign: "center", marginTop: "4px" }}>
                  + {items.length - 8} tempat wisata lainnya
                </div>
              )}
            </div>
          </div>

          {/* Footer Card */}
          <div
            style={{
              textAlign: "center",
              paddingTop: "12px",
              borderTop: "2px dashed #e2e8f0",
              fontSize: "11px",
              color: "#94a3b8",
            }}
          >
            Liburan bahagia bersama keluarga tercinta • Dicetak {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}
