"use client";

import React from "react";
import PageHeader from "@/components/PageHeader";
import DestinationForm from "@/components/Wisata/DestinationForm";
import { Sparkles } from "lucide-react";

export default function TambahSpotWisataPage() {
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
            <Sparkles size={20} style={{ color: "var(--primary, #287ff0)" }} />
            <span>Tambah Spot Wisata</span>
          </span>
        }
        subtitle="Tambahkan rekomendasi spot ke katalog bersama"
        backHref="/wisata?tab=katalog"
      />

      <DestinationForm mode="create" backHref="/wisata?tab=katalog" />
    </main>
  );
}
