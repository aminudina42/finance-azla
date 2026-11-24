"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import DestinationForm from "@/components/Wisata/DestinationForm";
import { getTouristDestinationById } from "@/lib/wisata-service";
import type { TouristDestination } from "@/lib/types";
import { Edit2, MapPinOff, ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditSpotWisataPage({ params }: PageProps) {
  const { id } = use(params);
  const [destination, setDestination] = useState<TouristDestination | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getTouristDestinationById(id);
        if (active) {
          setDestination(data);
        }
      } catch (err: any) {
        console.error("Gagal memuat data spot wisata:", err);
        if (active) {
          setErrorMsg(err?.message || "Gagal memuat detail spot wisata");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main
      className="page active"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
        backgroundColor: "var(--bg, #f7fbff)",
        paddingBottom: "128px",
        boxSizing: "border-box",
      }}
    >
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Edit2 size={18} style={{ color: "var(--primary, #287ff0)" }} />
            <span>Edit Spot Wisata</span>
          </span>
        }
        subtitle="Perbarui detail rekomendasi wisata bersama"
        backHref="/wisata?tab=katalog"
      />

      {loading ? (
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <Skeleton height={240} borderRadius={18} />
          <Skeleton height={160} borderRadius={18} />
          <Skeleton height={120} borderRadius={18} />
        </div>
      ) : !destination || errorMsg ? (
        <div style={{ padding: "24px 20px" }}>
          <div
            style={{
              backgroundColor: "var(--surface, #ffffff)",
              borderRadius: "20px",
              border: "1px dashed var(--border, #d8eaf8)",
              padding: "36px 20px",
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
                color: "var(--danger, #f04467)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPinOff size={26} />
            </div>
            <div>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--navy, #102d55)",
                }}
              >
                {errorMsg ? "Gagal Memuat Spot" : "Spot Wisata Tidak Ditemukan"}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--text-secondary, #58779d)",
                }}
              >
                {errorMsg || "Data tempat wisata ini mungkin sudah dihapus."}
              </p>
            </div>
            <Link
              href="/wisata?tab=katalog"
              style={{
                marginTop: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "12px",
                backgroundColor: "var(--primary, #287ff0)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={15} />
              <span>Kembali ke Katalog Spot</span>
            </Link>
          </div>
        </div>
      ) : (
        <DestinationForm
          mode="edit"
          initialDestination={destination}
          backHref="/wisata?tab=katalog"
        />
      )}
    </main>
  );
}
