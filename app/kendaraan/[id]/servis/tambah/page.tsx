"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Vehicle } from "@/lib/types";
import { getVehicleById, recordVehicleService } from "@/lib/vehicle-service";
import { formatRp, formatDateIndo } from "@/lib/vehicle-utils";
import VehicleHeaderCard from "@/components/Kendaraan/VehicleHeaderCard";
import VehicleTypeIcon from "@/components/Kendaraan/VehicleTypeIcon";
import DateInput from "@/components/Kendaraan/DateInput";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/store";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ItemRow {
  id: string;
  item_name: string;
  item_category: "Jasa" | "Part";
  unit_price: number;
}

export default function TambahServisWizardPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { posList, setIsMutating, currentMember, sessionUser } = useApp();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 4 = success
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedServiceId, setSavedServiceId] = useState<string | null>(null);

  // ── Step 1 Form State ──
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [serviceType, setServiceType] = useState<"Servis Ringan" | "Servis Besar">("Servis Ringan");
  const [odometerStr, setOdometerStr] = useState("");
  const [workshopName, setWorkshopName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");

  // ── Step 2 Form State ──
  const [costMode, setCostMode] = useState<"total" | "itemized">("total");
  const [totalCostStr, setTotalCostStr] = useState("");
  const [replacedPartsText, setReplacedPartsText] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { id: "1", item_name: "Jasa ganti oli", item_category: "Jasa", unit_price: 20000 },
    { id: "2", item_name: "Oli mesin", item_category: "Part", unit_price: 65000 },
  ]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCat, setNewItemCat] = useState<"Jasa" | "Part">("Jasa");
  const [newItemPrice, setNewItemPrice] = useState("");

  // ── Step 3 Form State ──
  const [selectedPosId, setSelectedPosId] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const v = await getVehicleById(id);
    if (!v) {
      router.replace("/kendaraan");
      return;
    }
    setVehicle(v);
    if (v.last_odometer > 0) {
      setOdometerStr(String(v.last_odometer));
    }

    if (posList.length > 0) {
      const transportPos = posList.find((p) =>
        p.name.toLowerCase().includes("kendaraan") ||
        p.name.toLowerCase().includes("transport") ||
        p.name.toLowerCase().includes("tagihan")
      );
      setSelectedPosId(transportPos ? transportPos.id : posList[0].id);
    }

    setLoading(false);
  }, [id, router, posList]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived calculations
  const totalItemizedCost = items.reduce((sum, item) => sum + (Number(item.unit_price) || 0), 0);
  const finalTotalCost = costMode === "total"
    ? parseInt(totalCostStr.replace(/\D/g, ""), 10) || 0
    : totalItemizedCost;

  const derivedPartsList = costMode === "itemized"
    ? items.filter((i) => i.item_category === "Part").map((i) => i.item_name).join(", ")
    : replacedPartsText;

  // Validation handlers
  const handleNextFromStep1 = () => {
    setErrorMsg("");
    if (!serviceDate) {
      setErrorMsg("Tanggal servis wajib dipilih");
      return;
    }
    const odo = parseInt(odometerStr.replace(/\D/g, ""), 10);
    if (isNaN(odo) || odo < 0) {
      setErrorMsg("Kilometer saat servis harus berupa angka valid");
      return;
    }
    if (vehicle && vehicle.last_odometer > 0 && odo < vehicle.last_odometer) {
      setErrorMsg(`Kilometer saat servis (${odo.toLocaleString("id-ID")} km) tidak boleh lebih kecil dari odometer tercatat (${vehicle.last_odometer.toLocaleString("id-ID")} km).`);
      return;
    }
    if (!serviceDescription.trim()) {
      setErrorMsg("Keterangan pekerjaan yang diservis wajib diisi");
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setErrorMsg("");
    if (costMode === "total") {
      const total = parseInt(totalCostStr.replace(/\D/g, ""), 10);
      if (!total || total <= 0) {
        setErrorMsg("Nominal harga total servis harus lebih dari 0");
        return;
      }
      if (!replacedPartsText.trim()) {
        setErrorMsg("Part yang diganti wajib diisi (ketik 'Tidak ada part' jika tidak ada suku cadang diganti)");
        return;
      }
    } else {
      if (items.length === 0) {
        setErrorMsg("Tambahkan minimal 1 item rincian biaya");
        return;
      }
      if (totalItemizedCost <= 0) {
        setErrorMsg("Total biaya rincian harus lebih dari 0");
        return;
      }
    }
    setStep(3);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const price = parseInt(newItemPrice.replace(/\D/g, ""), 10) || 0;
    if (price <= 0) return;

    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        item_name: newItemName.trim(),
        item_category: newItemCat,
        unit_price: price,
      },
    ]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleFinalSave = async () => {
    if (!selectedPosId) {
      setErrorMsg("Pilih Pos Keuangan untuk mencatat pengeluaran");
      return;
    }
    setSaving(true);
    setIsMutating(true);
    setErrorMsg("");

    try {
      const res = await recordVehicleService({
        vehicle_id: id,
        service_date: serviceDate,
        service_type: serviceType,
        cost_mode: costMode,
        total_cost: finalTotalCost,
        service_description: serviceDescription.trim(),
        odometer_km: parseInt(odometerStr.replace(/\D/g, ""), 10) || 0,
        workshop_name: workshopName.trim() || undefined,
        finance_pos_id: selectedPosId,
        user_id: sessionUser?.id || "00000000-0000-0000-0000-000000000000",
        user_name: currentMember?.display_name || "Suami",
        user_role: currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri"),
        notes: notes.trim() || undefined,
        items: costMode === "itemized"
          ? items.map((i) => ({
              item_name: i.item_name,
              item_category: i.item_category,
              quantity: 1,
              unit_price: i.unit_price,
              subtotal: i.unit_price,
            }))
          : undefined,
      });

      if (!res.success) {
        throw new Error((res.error as any)?.message || "Gagal menyimpan riwayat servis.");
      }

      setSavedServiceId(res.serviceId || null);
      setStep(4); // Success step
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setSaving(false);
      setIsMutating(false);
    }
  };

  if (loading || !vehicle) {
    return (
      <main className="page active" style={{ paddingBottom: "90px" }}>
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
          Memuat formulir servis...
        </div>
      </main>
    );
  }

  const selectedPos = posList.find((p) => p.id === selectedPosId);

  return (
    <main className="page active" style={{ paddingBottom: "110px" }}>
      {/* Header (Steps 1, 2, 3) */}
      {step < 4 && (
        <PageHeader
          title="Tambah Riwayat Servis"
          subtitle={`Langkah ${step} dari 3: ${step === 1 ? "Identitas & Jadwal" : step === 2 ? "Biaya Servis" : "Ringkasan"}`}
          onBack={() => {
            if (step === 1) router.back();
            else setStep((s) => (s - 1) as any);
          }}
        />
      )}

      <div style={{ padding: "0 20px" }}>
        {/* Compact Vehicle Card (Steps 1, 2, 3) */}
        {step < 4 && <VehicleHeaderCard vehicle={vehicle} />}

        {/* Stepper Indicator (Steps 1, 2, 3) */}
        {step < 4 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
              position: "relative",
            }}
          >
            {[
              { num: 1, label: "Identitas & Jadwal" },
              { num: 2, label: "Biaya Servis" },
              { num: 3, label: "Ringkasan" },
            ].map((st) => {
              const isActive = step === st.num;
              const isPassed = step > st.num;
              return (
                <div key={st.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, width: "33%" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: isActive ? "var(--primary)" : isPassed ? "#16a89a" : "var(--s3)",
                      color: isActive || isPassed ? "#ffffff" : "var(--muted)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "12px",
                      fontWeight: 750,
                      marginBottom: "4px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isPassed ? "✓" : st.num}
                  </div>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "var(--primary)" : "var(--muted)",
                      textAlign: "center",
                    }}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "12.5px",
              marginBottom: "14px",
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* ═══════════════ STEP 1: IDENTITAS & JADWAL ═══════════════ */}
        {step === 1 && (
          <div>
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                padding: "18px",
                marginBottom: "20px",
                boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
              }}
            >
              <h2 style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)", margin: "0 0 14px" }}>
                Identitas & Jadwal
              </h2>

              {/* Tanggal Servis */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                  Tanggal Servis <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <DateInput
                  value={serviceDate}
                  onChange={setServiceDate}
                  placeholder="DD/MM/YYYY (contoh: 22/10/2026)"
                />
              </div>

              {/* Jenis Servis Toggle */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                  Jenis Servis <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {(["Servis Ringan", "Servis Besar"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setServiceType(t)}
                      style={{
                        height: "42px",
                        borderRadius: "10px",
                        border: serviceType === t ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: serviceType === t ? "var(--primary-soft)" : "var(--bg)",
                        color: serviceType === t ? "var(--primary)" : "var(--text-secondary)",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kilometer Saat Servis */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                  Kilometer Saat Servis <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder="Contoh: 12500"
                    value={odometerStr}
                    onChange={(e) => setOdometerStr(e.target.value)}
                    style={{
                      width: "100%",
                      height: "44px",
                      padding: "0 46px 0 14px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      fontSize: "14px",
                      fontWeight: 650,
                      color: "var(--text)",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: "var(--muted)",
                    }}
                  >
                    km
                  </span>
                </div>
              </div>

              {/* Nama Bengkel */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                  Nama Bengkel <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>(opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: AHASS, Honda Daya Motor"
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    fontSize: "13.5px",
                    color: "var(--text)",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              {/* Apa saja yang diservis */}
              <div style={{ marginBottom: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--navy)" }}>
                    Apa saja yang diservis <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {serviceDescription.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Contoh: Ganti oli mesin, pembersihan throttle body, pengecekan rem"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    fontSize: "13px",
                    color: "var(--text)",
                    boxSizing: "border-box",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  flex: 1,
                  height: "46px",
                  borderRadius: "12px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "13.5px",
                  fontWeight: 650,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleNextFromStep1}
                style={{
                  flex: 2,
                  height: "46px",
                  borderRadius: "12px",
                  background: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 750,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(40, 127, 240, 0.3)",
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 2: METODE BIAYA & RINCIAN ═══════════════ */}
        {step === 2 && (
          <div>
            {/* Pilihan Metode Pencatatan */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)", marginBottom: "10px" }}>
                Metode Pencatatan Biaya
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* Method 1: Total */}
                <div
                  onClick={() => setCostMode("total")}
                  style={{
                    borderRadius: "14px",
                    border: costMode === "total" ? "2px solid var(--primary)" : "1px solid var(--border)",
                    background: costMode === "total" ? "var(--primary-soft)" : "var(--surface)",
                    padding: "14px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="radio"
                      name="cost_mode"
                      checked={costMode === "total"}
                      onChange={() => setCostMode("total")}
                    />
                    <span style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)" }}>
                      Harga Total
                    </span>
                  </div>
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.3 }}>
                    Masukkan total biaya servis (semua jasa dan part).
                  </span>
                </div>

                {/* Method 2: Itemized */}
                <div
                  onClick={() => setCostMode("itemized")}
                  style={{
                    borderRadius: "14px",
                    border: costMode === "itemized" ? "2px solid var(--primary)" : "1px solid var(--border)",
                    background: costMode === "itemized" ? "var(--primary-soft)" : "var(--surface)",
                    padding: "14px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="radio"
                      name="cost_mode"
                      checked={costMode === "itemized"}
                      onChange={() => setCostMode("itemized")}
                    />
                    <span style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)" }}>
                      Rincian Biaya
                    </span>
                  </div>
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.3 }}>
                    Masukkan detail jasa dan part secara terpisah.
                  </span>
                </div>
              </div>
            </div>

            {/* If Mode == TOTAL */}
            {costMode === "total" && (
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  padding: "18px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                    Total Biaya Servis <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--navy)",
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      placeholder="0"
                      value={totalCostStr}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setTotalCostStr(raw ? parseInt(raw, 10).toLocaleString("id-ID") : "");
                      }}
                      style={{
                        width: "100%",
                        height: "44px",
                        padding: "0 14px 0 42px",
                        borderRadius: "10px",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        fontSize: "15px",
                        fontWeight: 750,
                        color: "var(--navy)",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "6px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                    Part yang Diganti <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Oli mesin Repsol, Kampas rem belakang"
                    value={replacedPartsText}
                    onChange={(e) => setReplacedPartsText(e.target.value)}
                    style={{
                      width: "100%",
                      height: "44px",
                      padding: "0 14px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      fontSize: "13.5px",
                      color: "var(--text)",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                    Wajib diisi pada metode Harga Total (ketik &quot;Tidak ada part&quot; jika hanya jasa).
                  </div>
                </div>
              </div>
            )}

            {/* If Mode == ITEMIZED */}
            {costMode === "itemized" && (
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  padding: "16px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)", marginBottom: "12px" }}>
                  Rincian Biaya Servis
                </div>

                {/* Table of items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "var(--s1)",
                        fontSize: "12.5px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 650, color: "var(--navy)" }}>{item.item_name}</div>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: item.item_category === "Part" ? "#e0f2fe" : "#f1f5f9",
                            color: item.item_category === "Part" ? "#0284c7" : "#475569",
                            fontWeight: 600,
                          }}
                        >
                          {item.item_category}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontWeight: 700, color: "var(--navy)" }}>
                          {formatRp(item.unit_price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form Add Row */}
                <div
                  style={{
                    background: "var(--bg)",
                    borderRadius: "12px",
                    padding: "12px",
                    border: "1px dashed var(--border)",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "8px" }}>
                    + Tambah Item
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      placeholder="Nama item (contoh: Oli Repsol)"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      style={{
                        flex: 2,
                        height: "38px",
                        padding: "0 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        fontSize: "12.5px",
                      }}
                    />
                    <select
                      value={newItemCat}
                      onChange={(e) => setNewItemCat(e.target.value as any)}
                      style={{
                        flex: 1,
                        height: "38px",
                        padding: "0 8px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        fontSize: "12.5px",
                      }}
                    >
                      <option value="Jasa">Jasa</option>
                      <option value="Part">Part</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="Harga (Rp)"
                      value={newItemPrice}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setNewItemPrice(raw ? parseInt(raw, 10).toLocaleString("id-ID") : "");
                      }}
                      style={{
                        flex: 2,
                        height: "38px",
                        padding: "0 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        fontSize: "12.5px",
                        fontWeight: 650,
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      style={{
                        flex: 1,
                        height: "38px",
                        borderRadius: "8px",
                        background: "var(--primary)",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                {/* Subtotal Card */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "var(--primary-soft)",
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--primary)" }}>
                    Total Biaya
                  </span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--primary)" }}>
                    {formatRp(totalItemizedCost)}
                  </span>
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.3 }}>
                  💡 Part yang diganti akan otomatis diambil dari item berkategori Part.
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  height: "46px",
                  borderRadius: "12px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "13.5px",
                  fontWeight: 650,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleNextFromStep2}
                style={{
                  flex: 2,
                  height: "46px",
                  borderRadius: "12px",
                  background: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 750,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(40, 127, 240, 0.3)",
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 3: RINGKASAN & POS KEUANGAN ═══════════════ */}
        {step === 3 && (
          <div>
            {/* Card 1: Identitas Kendaraan */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                padding: "14px 16px",
                marginBottom: "12px",
                fontSize: "12.5px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
                Identitas Kendaraan
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--muted)" }}>Plat Nomor</span>
                <span style={{ fontWeight: 700, color: "var(--navy)" }}>{vehicle.plate_number}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--muted)" }}>Jenis Kendaraan</span>
                <span style={{ fontWeight: 650, color: "var(--navy)" }}>{vehicle.vehicle_type}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Merek & Tipe</span>
                <span style={{ fontWeight: 650, color: "var(--navy)" }}>{vehicle.brand} {vehicle.model}</span>
              </div>
            </div>

            {/* Card 2: Detail Servis */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                padding: "14px 16px",
                marginBottom: "12px",
                fontSize: "12.5px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
                Detail Servis
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--muted)" }}>Tanggal Servis</span>
                <span style={{ fontWeight: 650, color: "var(--navy)" }}>{formatDateIndo(serviceDate)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--muted)" }}>Jenis Servis</span>
                <span style={{ fontWeight: 700, color: "var(--primary)" }}>{serviceType}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--muted)" }}>Kilometer Saat Servis</span>
                <span style={{ fontWeight: 650, color: "var(--navy)" }}>{parseInt(odometerStr, 10).toLocaleString("id-ID")} km</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--muted)" }}>Nama Bengkel</span>
                <span style={{ fontWeight: 650, color: "var(--navy)" }}>{workshopName || "—"}</span>
              </div>
              <div style={{ marginTop: "6px" }}>
                <div style={{ color: "var(--muted)", marginBottom: "2px" }}>Pekerjaan yang dilakukan:</div>
                <div style={{ fontWeight: 600, color: "var(--navy)", fontStyle: "italic" }}>&ldquo;{serviceDescription}&rdquo;</div>
              </div>
              {derivedPartsList && (
                <div style={{ marginTop: "6px" }}>
                  <div style={{ color: "var(--muted)", marginBottom: "2px" }}>Part yang diganti:</div>
                  <div style={{ fontWeight: 600, color: "var(--navy)" }}>{derivedPartsList}</div>
                </div>
              )}
            </div>

            {/* Card 3: Biaya */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                padding: "14px 16px",
                marginBottom: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600 }}>Total Biaya</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--navy)" }}>
                  {formatRp(finalTotalCost)}
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 650 }}>
                Metode: {costMode === "total" ? "Harga Total" : "Rincian Biaya"}
              </div>
            </div>

            {/* Card 4: Pos Keuangan */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                padding: "14px 16px",
                marginBottom: "20px",
              }}
            >
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--navy)", marginBottom: "6px" }}>
                Pos Keuangan Pengeluaran <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={selectedPosId}
                onChange={(e) => setSelectedPosId(e.target.value)}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  fontSize: "13.5px",
                  color: "var(--text)",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              >
                <option value="" disabled>Pilih pos keuangan...</option>
                {posList.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.icon} {pos.name} (Saldo: Rp {pos.current_balance.toLocaleString("id-ID")})
                  </option>
                ))}
              </select>
              {selectedPos && (
                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "6px" }}>
                  Pengeluaran <span style={{ fontWeight: 700, color: "#ef4444" }}>{formatRp(finalTotalCost)}</span> akan dipotong dari pos <strong>{selectedPos.name}</strong>.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={saving}
                style={{
                  flex: 1,
                  height: "46px",
                  borderRadius: "12px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "13.5px",
                  fontWeight: 650,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleFinalSave}
                disabled={saving}
                style={{
                  flex: 2,
                  height: "46px",
                  borderRadius: "12px",
                  background: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 750,
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(40, 127, 240, 0.3)",
                }}
              >
                {saving ? "Menyimpan..." : "Simpan Riwayat Servis"}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 4: SUCCESS STATE ═══════════════ */}
        {step === 4 && (
          <div style={{ textAlign: "center", padding: "30px 0 10px" }}>
            {/* Celebration Icon */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#e6f8f5",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                color: "#16a89a",
              }}
            >
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--navy)", margin: "0 0 6px" }}>
              Berhasil Disimpan!
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "280px", margin: "0 auto 20px", lineHeight: 1.4 }}>
              Riwayat servis kendaraan berhasil dicatat dan transaksi keuangan telah dibuat pada Pos Keuangan yang dipilih.
            </p>

            {/* Receipt Summary Card */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                padding: "16px 18px",
                marginBottom: "24px",
                textAlign: "left",
                boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: "1px solid var(--border)", marginBottom: "12px" }}>
                <VehicleTypeIcon type={vehicle.vehicle_type} size={30} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)" }}>{vehicle.brand} {vehicle.model}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>{vehicle.plate_number}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Tanggal Servis</span>
                  <span style={{ fontWeight: 650, color: "var(--navy)" }}>{formatDateIndo(serviceDate)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Jenis Servis</span>
                  <span style={{ fontWeight: 700, color: "var(--primary)" }}>{serviceType}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Total Biaya</span>
                  <span style={{ fontWeight: 800, color: "var(--navy)" }}>{formatRp(finalTotalCost)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Pos Keuangan</span>
                  <span style={{ fontWeight: 650, color: "var(--navy)" }}>{selectedPos?.name || "—"}</span>
                </div>
              </div>
            </div>

            {/* Navigation Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {savedServiceId && (
                <Link
                  href={`/kendaraan/${id}/servis/${savedServiceId}`}
                  style={{
                    width: "100%",
                    height: "46px",
                    borderRadius: "12px",
                    background: "var(--primary)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 750,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(40, 127, 240, 0.3)",
                  }}
                >
                  Lihat Detail Servis
                </Link>
              )}

              <Link
                href={`/kendaraan/${id}/servis`}
                style={{
                  width: "100%",
                  height: "44px",
                  borderRadius: "12px",
                  background: "transparent",
                  color: "var(--navy)",
                  fontSize: "13.5px",
                  fontWeight: 650,
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                }}
              >
                Kembali ke Daftar
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
