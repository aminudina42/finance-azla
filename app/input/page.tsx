"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import type { StatusKeluarga, Vehicle, VehicleFuelLog } from "@/lib/types";
import { getVehicles, getLastFuelLog, recordVehicleFuelTx } from "@/lib/vehicle-service";
import { PERTALITE_PRICE_PER_LITER, formatRp } from "@/lib/vehicle-utils";
import SakuBorrowModal from "@/components/Modals/SakuBorrowModal";
import PageHeader from "@/components/PageHeader";

type FuelCategory = "Pertalite" | "Pertamax" | "Pertamax Turbo" | "BP 92" | "Lainnya";

export default function InputPage() {
  const { posList, addTransaction, addSakuBorrowTransaction, children, currentMember, recalculateBalances, setIsMutating } = useApp();
  const searchParams = useSearchParams();

  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [nominal, setNominal] = useState("");
  const [posId, setPosId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saku borrow state
  const [showSakuBorrow, setShowSakuBorrow] = useState(false);

  // Status dan nama pencatat otomatis sesuai profil keluarga
  const userRole: StatusKeluarga = currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri");
  const userName = currentMember?.display_name || (userRole === "suami" ? "Suami" : userRole === "istri" ? "Istri" : "Anak");

  // State Terkait Kendaraan & Log BBM
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [lastFuelLog, setLastFuelLog] = useState<VehicleFuelLog | null>(null);
  const [isFuelMode, setIsFuelMode] = useState(true);

  // Form Fields BBM
  const [odometerKm, setOdometerKm] = useState("");
  const [fuelCategory, setFuelCategory] = useState<FuelCategory>("Pertalite");
  const [customFuelName, setCustomFuelName] = useState("");
  const [costPerLiterStr, setCostPerLiterStr] = useState("10.000");
  const [litersStr, setLitersStr] = useState("");
  const [fuelErrorMsg, setFuelErrorMsg] = useState("");

  // Load armada kendaraan saat halaman dibuka
  useEffect(() => {
    let isMounted = true;
    getVehicles().then((data) => {
      if (isMounted) setVehicles(data);
    });
    return () => { isMounted = false; };
  }, []);

  // Auto-select pos from URL query param
  useEffect(() => {
    const posParam = searchParams.get("pos");
    if (posParam && posList.some((p) => p.id === posParam)) {
      setPosId(posParam);
    }
  }, [searchParams, posList]);

  // Cek apakah pos yang dipilih terhubung ke satu atau beberapa kendaraan
  const connectedVehicles = useMemo(() => {
    if (!posId) return [];
    return vehicles.filter((v) => v.finance_pos_id === posId);
  }, [vehicles, posId]);

  // Daftar kendaraan yang dapat dipilih (utamakan yang terhubung ke pos, fallback ke seluruh armada)
  const availableVehicles = useMemo(() => {
    if (connectedVehicles.length > 0) return connectedVehicles;
    return vehicles;
  }, [connectedVehicles, vehicles]);

  // Otomatis aktifkan mode BBM jika pos terintegrasi dengan kendaraan
  useEffect(() => {
    if (connectedVehicles.length > 0) {
      if (!connectedVehicles.some((v) => v.id === selectedVehicleId)) {
        setSelectedVehicleId(connectedVehicles[0].id);
      }
      setIsFuelMode(true);
    } else {
      // Jika pos tidak terhubung langsung ke kendaraan, siapkan kendaraan pertama namun mode BBM default off
      if (!vehicles.some((v) => v.id === selectedVehicleId)) {
        setSelectedVehicleId(vehicles[0]?.id || "");
      }
      setIsFuelMode(false);
    }
  }, [connectedVehicles, selectedVehicleId, vehicles]);

  // Ambil data pengisian bensin terakhir khusus kendaraan terpilih
  useEffect(() => {
    let isMounted = true;
    if (selectedVehicleId) {
      getLastFuelLog(selectedVehicleId).then((log) => {
        if (isMounted) setLastFuelLog(log);
      });
    } else {
      setLastFuelLog(null);
    }
    return () => { isMounted = false; };
  }, [selectedVehicleId]);

  // Efek perubahan jenis bahan bakar -> update harga per liter & hitung ulang liter jika nominal ada
  useEffect(() => {
    if (fuelCategory === "Pertalite") {
      setCostPerLiterStr(PERTALITE_PRICE_PER_LITER.toLocaleString("id-ID"));
      const rawNominal = parseInt(nominal.replace(/\D/g, ""), 10) || 0;
      if (rawNominal > 0) {
        setLitersStr((rawNominal / PERTALITE_PRICE_PER_LITER).toFixed(2));
      }
    } else if (fuelCategory === "Pertamax") {
      setCostPerLiterStr("12.950");
    } else if (fuelCategory === "Pertamax Turbo") {
      setCostPerLiterStr("14.400");
    } else if (fuelCategory === "BP 92") {
      setCostPerLiterStr("13.500");
    } else {
      setCostPerLiterStr("");
    }
  }, [fuelCategory]);

  const selectedPos = posList.find((p) => p.id === posId);
  const amount = Number(nominal.replace(/\D/g, ""));
  const posBalance = selectedPos?.current_balance ?? 0;
  const isShorfall = txType === "expense" && posId && amount > 0 && amount > posBalance;

  // Handler: Ubah Nominal Rupiah -> Otomatis sinkronkan liter bensin jika mode BBM aktif
  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setNominal("");
      if (isFuelMode) setLitersStr("");
      return;
    }
    const numVal = parseInt(rawValue, 10);
    setNominal(numVal.toLocaleString("id-ID"));

    if (isFuelMode) {
      const rawCostPerLiter = parseInt(costPerLiterStr.replace(/\D/g, ""), 10) || 0;
      if (rawCostPerLiter > 0) {
        setLitersStr((numVal / rawCostPerLiter).toFixed(2));
      }
    }
  };

  // Handler: Ubah Volume Liter -> Otomatis sinkronkan nominal rupiah
  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    setLitersStr(val);

    const numLiters = parseFloat(val);
    const rawCostPerLiter = parseInt(costPerLiterStr.replace(/\D/g, ""), 10) || 0;
    if (!isNaN(numLiters) && numLiters > 0 && rawCostPerLiter > 0) {
      const computedNominal = Math.round(numLiters * rawCostPerLiter);
      setNominal(computedNominal.toLocaleString("id-ID"));
    }
  };

  // Handler: Ubah Harga per Liter
  const handleCostPerLiterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      setCostPerLiterStr("");
      return;
    }
    const numVal = parseInt(rawVal, 10);
    setCostPerLiterStr(numVal.toLocaleString("id-ID"));

    const rawNominal = parseInt(nominal.replace(/\D/g, ""), 10) || 0;
    if (rawNominal > 0 && numVal > 0) {
      setLitersStr((rawNominal / numVal).toFixed(2));
    }
  };

  // Live calculations
  const parsedOdo = parseInt(odometerKm.replace(/\D/g, ""), 10) || 0;
  const parsedNominal = parseInt(nominal.replace(/\D/g, ""), 10) || 0;
  const parsedLiters = parseFloat(litersStr) || 0;

  const deltaKm = useMemo(() => {
    if (!lastFuelLog || parsedOdo <= 0) return null;
    return parsedOdo - lastFuelLog.odometer_km;
  }, [lastFuelLog, parsedOdo]);

  const estimatedEfficiency = useMemo(() => {
    if (deltaKm === null || deltaKm <= 0 || parsedLiters <= 0) return null;
    return Math.round((deltaKm / parsedLiters) * 10) / 10;
  }, [deltaKm, parsedLiters]);

  const isOdoInvalid = lastFuelLog && parsedOdo > 0 && parsedOdo <= lastFuelLog.odometer_km;

  const handleSave = async () => {
    setFuelErrorMsg("");
    if (!amount || !posId || isSubmitting) return;

    // A. JIKA MODE BBM AKTIF PADA KENDARAAN TERPILIH
    if (txType === "expense" && isFuelMode && selectedVehicleId) {
      const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (!selectedVehicle) {
        setFuelErrorMsg("Pilih kendaraan yang akan diisi bensin");
        return;
      }
      if (!parsedOdo || parsedOdo <= 0) {
        setFuelErrorMsg("Kilometer odometer saat pengisian bensin wajib diisi");
        return;
      }
      if (lastFuelLog && parsedOdo <= lastFuelLog.odometer_km) {
        setFuelErrorMsg(
          `Kilometer saat ini (${parsedOdo.toLocaleString("id-ID")} km) harus lebih besar dari pengisian sebelumnya (${lastFuelLog.odometer_km.toLocaleString("id-ID")} km)`
        );
        return;
      }
      if (!parsedNominal || parsedNominal <= 0) {
        setFuelErrorMsg("Nominal pembelian bensin wajib diisi");
        return;
      }
      if (!parsedLiters || parsedLiters <= 0) {
        setFuelErrorMsg("Volume liter bahan bakar wajib diisi");
        return;
      }

      const finalFuelType = fuelCategory === "Lainnya" ? (customFuelName.trim() || "BBM Khusus") : fuelCategory;
      const finalCostPerLiter = parseInt(costPerLiterStr.replace(/\D/g, ""), 10) || Math.round(parsedNominal / parsedLiters);

      setIsSubmitting(true);
      setIsMutating(true);

      try {
        const { error } = await recordVehicleFuelTx({
          vehicle_id: selectedVehicle.id,
          log_date: new Date().toISOString().split("T")[0],
          odometer_km: parsedOdo,
          fuel_type: finalFuelType,
          cost_per_liter: finalCostPerLiter,
          fuel_liters: parsedLiters,
          total_cost: parsedNominal,
          finance_pos_id: posId,
          user_id: currentMember?.id || "00000000-0000-0000-0000-000000000000",
          user_name: userName,
          user_role: userRole,
          notes: keterangan.trim() || undefined,
        });

        if (error) {
          setFuelErrorMsg(error.message || "Gagal mencatat pengisian bensin.");
          return;
        }

        await recalculateBalances();
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setNominal("");
          setPosId("");
          setKeterangan("");
          setOdometerKm("");
          setLitersStr("");
          setFuelErrorMsg("");
        }, 2000);
      } catch (err: any) {
        setFuelErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data.");
      } finally {
        setIsSubmitting(false);
        setIsMutating(false);
      }
      return;
    }

    // B. TRANSAKSI STANDAR NON-BBM
    setIsSubmitting(true);
    try {
      await addTransaction(amount, posId, userRole, keterangan, txType, userName);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setNominal("");
        setPosId("");
        setKeterangan("");
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWithSakuBorrow = async (sakuId: string, sakuWithdrawAmount: number) => {
    if (!amount || !posId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addSakuBorrowTransaction(amount, posId, userRole, keterangan, sakuId, sakuWithdrawAmount, userName);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setNominal("");
        setPosId("");
        setKeterangan("");
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIncome = txType === "income";

  return (
    <main id="pg-input" className="page active" style={{ paddingBottom: "110px" }}>
      <PageHeader
        title={isIncome ? "Input Pemasukan" : "Input Pengeluaran"}
        subtitle={isIncome ? "Catat pemasukan ke pos keuangan" : "Catat pengeluaran manual ke pos"}
        backHref="/"
      />

      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "18px",
            border: "1px solid var(--border)",
            padding: "20px",
            boxShadow: "0 4px 16px rgba(16, 45, 85, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Type toggle */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
              Jenis Transaksi
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f1f8fd", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setTxType("expense")}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  background: txType === "expense" ? "var(--surface)" : "transparent",
                  color: txType === "expense" ? "var(--danger)" : "var(--text-secondary)",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  boxShadow: txType === "expense" ? "0 2px 8px rgba(240, 68, 103, 0.15)" : "none",
                  transition: "all 0.16s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                📤 Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setTxType("income")}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  background: txType === "income" ? "var(--surface)" : "transparent",
                  color: txType === "income" ? "var(--teal)" : "var(--text-secondary)",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  boxShadow: txType === "income" ? "0 2px 8px rgba(22, 168, 154, 0.15)" : "none",
                  transition: "all 0.16s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                📥 Pemasukan
              </button>
            </div>
          </div>

          {/* Info Pencatat Otomatis Sesuai Profil Keluarga */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "14px",
              background: "#f8fbff",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  boxShadow: "0 2px 6px rgba(16, 45, 85, 0.04)",
                  flexShrink: 0,
                }}
              >
                {userRole === "suami" ? "👨‍💼" : userRole === "istri" ? "👩" : "🧒"}
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 650 }}>
                  Dicatat otomatis sebagai
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--navy)" }}>
                  {userName}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 750,
                padding: "3.5px 10px",
                borderRadius: "8px",
                background: "var(--primary-soft)",
                color: "var(--primary)",
                textTransform: "capitalize",
                letterSpacing: "0.2px",
              }}
            >
              {userRole}
            </span>
          </div>

          {/* Nominal */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
              Nominal
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#ffffff",
                border: "1.5px solid var(--border)",
                borderRadius: "14px",
                padding: "10px 14px",
                boxShadow: "0 2px 6px rgba(16, 45, 85, 0.03)",
                transition: "border-color 0.15s ease",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-secondary)", marginRight: "8px" }}>Rp</span>
              <input
                type="tel"
                placeholder="0"
                value={nominal}
                onChange={handleNominalChange}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  fontSize: "24px",
                  fontWeight: 850,
                  color: "var(--navy)",
                  background: "transparent",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.5px",
                }}
              />
            </div>
          </div>

          {/* Pos Keuangan */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
              Pos Keuangan
            </div>
            <div style={{ position: "relative" }}>
              <select
                value={posId}
                onChange={(e) => setPosId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--navy)",
                  fontSize: "14px",
                  fontWeight: 650,
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">— Pilih Pos —</option>
                {posList
                  .filter((p) => isIncome ? true : p.name !== "Tabungan")
                  .map((p) => {
                    const linkedVehs = vehicles.filter((v) => v.finance_pos_id === p.id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name} {linkedVehs.length > 0 ? `· 🚗 ${linkedVehs.map((v) => `${v.brand} ${v.model}`).join(", ")}` : ""}
                      </option>
                    );
                  })}
              </select>
              <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)", fontSize: "11px" }}>▼</span>
            </div>
            {/* Saldo Pos info */}
            {selectedPos && (
              <div style={{
                marginTop: "8px",
                padding: "8px 12px",
                background: "#f8fbff",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                fontSize: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ color: "var(--text-secondary)" }}>Sisa saldo amplop:</span>
                <span style={{ fontWeight: 800, color: posBalance < 0 ? "var(--danger)" : posBalance < amount ? "var(--warning)" : "var(--teal)", fontVariantNumeric: "tabular-nums" }}>
                  {formatRp(posBalance)}
                </span>
              </div>
            )}
          </div>

          {/* Section: Formulir Pengisian BBM Terintegrasi Kendaraan */}
          {txType === "expense" && posId && availableVehicles.length > 0 && (
            <div
              style={{
                borderRadius: "18px",
                padding: "2.5px",
                background: "linear-gradient(180deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.06) 100%)",
                boxShadow: "0 4px 16px rgba(245, 158, 11, 0.08)",
              }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1.5px solid #fde68a",
                  padding: "16px 18px",
                }}
              >
                {/* Header Section dengan Switch Toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isFuelMode ? "14px" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "10px",
                        background: "#f59e0b",
                        color: "#ffffff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "17px",
                        flexShrink: 0,
                      }}
                    >
                      ⛽
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#92400e" }}>
                        Pencatatan Bensin (BBM)
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        {connectedVehicles.length > 0 ? "Pos ini terhubung ke kendaraan keluarga" : "Catat pengeluaran pos ini untuk bensin armada"}
                      </div>
                    </div>
                  </div>

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 750,
                      color: "#b45309",
                      background: "#fffbeb",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      border: "1px solid #fde68a",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isFuelMode}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsFuelMode(checked);
                        if (checked && !selectedVehicleId && availableVehicles.length > 0) {
                          setSelectedVehicleId(availableVehicles[0].id);
                        }
                      }}
                      style={{ accentColor: "#f59e0b", width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <span>Mode BBM</span>
                  </label>
                </div>

                {isFuelMode && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* Error message alert jika validasi gagal */}
                    {fuelErrorMsg && (
                      <div
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          color: "#dc2626",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 650,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>⚠️</span>
                        <span>{fuelErrorMsg}</span>
                      </div>
                    )}

                    {/* Selector Kendaraan jika ada beberapa pilihan armada */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 750, color: "var(--navy)", marginBottom: "6px" }}>
                        Kendaraan yang Diisi BBM
                      </label>
                      {availableVehicles.length > 1 ? (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {availableVehicles.map((v) => {
                            const isSelected = v.id === selectedVehicleId;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setSelectedVehicleId(v.id)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: "10px",
                                  border: isSelected ? "2px solid #f59e0b" : "1px solid var(--border)",
                                  background: isSelected ? "#fffbeb" : "var(--s1)",
                                  color: isSelected ? "#b45309" : "var(--navy)",
                                  fontWeight: 750,
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <span>{v.vehicle_type === "Mobil" ? "🚗" : "🛵"}</span>
                                <span>{v.brand} {v.model} ({v.plate_number})</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: "10px",
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            fontSize: "12.5px",
                            fontWeight: 750,
                            color: "#92400e",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>{availableVehicles[0]?.vehicle_type === "Mobil" ? "🚗" : "🛵"}</span>
                          <span>{availableVehicles[0]?.brand} {availableVehicles[0]?.model} ({availableVehicles[0]?.plate_number})</span>
                        </div>
                      )}
                    </div>

                    {/* Helper status pengisian bensin sebelumnya */}
                    <div
                      style={{
                        background: lastFuelLog ? "#fef3c7" : "#f1f8fd",
                        border: lastFuelLog ? "1px solid #fde68a" : "1px solid var(--border)",
                        borderRadius: "10px",
                        padding: "8px 12px",
                        fontSize: "11.5px",
                        color: lastFuelLog ? "#92400e" : "var(--navy)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>ℹ️</span>
                      <span>
                        {lastFuelLog ? (
                          <>
                            KM Bensin Terakhir: <strong>{lastFuelLog.odometer_km.toLocaleString("id-ID")} km</strong> ({lastFuelLog.fuel_type})
                          </>
                        ) : (
                          "Pengisian Pertama — Konsumsi km/l dihitung mulai pengisian ke-2"
                        )}
                      </span>
                    </div>

                    {/* Input Odometer KM Saat Pengisian */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 750, color: "var(--navy)", marginBottom: "4px" }}>
                        Kilometer Odometer Saat Pengisian <span style={{ color: "var(--danger)" }}>*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder={lastFuelLog ? `Contoh: ${(lastFuelLog.odometer_km + 200).toLocaleString("id-ID")}` : "Contoh: 15.000"}
                          value={odometerKm}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            setOdometerKm(raw ? Number(raw).toLocaleString("id-ID") : "");
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 45px 10px 12px",
                            borderRadius: "10px",
                            border: isOdoInvalid ? "2px solid #ef4444" : "1.5px solid var(--border)",
                            background: isOdoInvalid ? "#fff5f5" : "var(--s1)",
                            fontSize: "14px",
                            fontWeight: 750,
                            color: "var(--navy)",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: "var(--muted)",
                          }}
                        >
                          KM
                        </span>
                      </div>
                      {isOdoInvalid && (
                        <div style={{ color: "#ef4444", fontSize: "11px", fontWeight: 650, marginTop: "4px" }}>
                          ⚠️ KM saat ini harus lebih besar dari pengisian sebelumnya ({lastFuelLog?.odometer_km.toLocaleString("id-ID")} km)
                        </div>
                      )}
                    </div>

                    {/* Selector Jenis Bahan Bakar */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 750, color: "var(--navy)", marginBottom: "6px" }}>
                        Jenis Bahan Bakar
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                        {(["Pertalite", "Pertamax", "Pertamax Turbo", "BP 92", "Lainnya"] as FuelCategory[]).map((cat) => {
                          const isSelected = fuelCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setFuelCategory(cat)}
                              style={{
                                padding: "8px 6px",
                                borderRadius: "10px",
                                border: isSelected ? "2px solid #f59e0b" : "1px solid var(--border)",
                                background: isSelected ? "#fffbeb" : "var(--s1)",
                                color: isSelected ? "#b45309" : "var(--navy)",
                                fontWeight: 750,
                                fontSize: "11.5px",
                                cursor: "pointer",
                                textAlign: "center",
                              }}
                            >
                              {cat === "Pertalite" ? "🟢 Pertalite" : cat === "Pertamax" ? "🔵 Pertamax" : cat === "Pertamax Turbo" ? "🔴 Turbo" : cat === "BP 92" ? "🟡 BP 92" : "✏️ Lainnya"}
                            </button>
                          );
                        })}
                      </div>

                      {fuelCategory === "Lainnya" && (
                        <input
                          type="text"
                          placeholder="Nama bensin (misal: Shell Super, Dexlite)"
                          value={customFuelName}
                          onChange={(e) => setCustomFuelName(e.target.value)}
                          style={{
                            width: "100%",
                            marginTop: "8px",
                            padding: "9px 12px",
                            borderRadius: "10px",
                            border: "1.5px solid var(--border)",
                            background: "var(--s1)",
                            fontSize: "13px",
                            fontWeight: 650,
                            color: "var(--navy)",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    </div>

                    {/* Harga / Liter & Volume Liter */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <label style={{ fontSize: "11px", fontWeight: 750, color: "var(--navy)" }}>
                            Harga / Liter
                          </label>
                          {fuelCategory === "Pertalite" && (
                            <span style={{ fontSize: "9px", fontWeight: 750, color: "#059669" }}>
                              Subsidi
                            </span>
                          )}
                        </div>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "11.5px", fontWeight: 700, color: "var(--muted)" }}>Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={fuelCategory === "Pertalite"}
                            value={costPerLiterStr}
                            onChange={handleCostPerLiterChange}
                            style={{
                              width: "100%",
                              padding: "9px 10px 9px 30px",
                              borderRadius: "10px",
                              border: "1.5px solid var(--border)",
                              background: fuelCategory === "Pertalite" ? "#f1f5f9" : "var(--s1)",
                              color: fuelCategory === "Pertalite" ? "#64748b" : "var(--navy)",
                              fontSize: "13px",
                              fontWeight: 750,
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 750, color: "var(--navy)", marginBottom: "4px" }}>
                          Volume Liter <span style={{ color: "var(--danger)" }}>*</span>
                        </label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="5.00"
                            value={litersStr}
                            onChange={handleLitersChange}
                            style={{
                              width: "100%",
                              padding: "9px 26px 9px 10px",
                              borderRadius: "10px",
                              border: "1.5px solid var(--border)",
                              background: "var(--s1)",
                              color: "var(--navy)",
                              fontSize: "13px",
                              fontWeight: 750,
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                          <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", fontWeight: 700, color: "var(--muted)" }}>L</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Preview Estimasi Delta KM & Efisiensi */}
                    {deltaKm !== null && deltaKm > 0 && (
                      <div
                        style={{
                          background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
                          border: "1px solid #a7f3d0",
                          borderRadius: "10px",
                          padding: "10px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: "11.5px", color: "#065f46", fontWeight: 650 }}>
                          ✨ Estimasi Sesi Ini:
                        </span>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#065f46" }}>
                            +{deltaKm.toLocaleString("id-ID")} km
                          </span>
                          <span style={{ color: "#a7f3d0" }}>·</span>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>
                            {estimatedEfficiency ? `${estimatedEfficiency} km/l` : "—"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shortfall warning + Saku borrow banner */}
          {isShorfall && children.length > 0 && (
            <div style={{
              padding: "14px",
              background: "rgba(244, 163, 59, 0.08)",
              border: "1.5px solid rgba(244, 163, 59, 0.28)",
              borderRadius: "14px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--warning)", marginBottom: "4px" }}>
                ⚠️ Saldo Pos tidak mencukupi
              </div>
              <div style={{ fontSize: "12px", color: "var(--text)", marginBottom: "10px", lineHeight: "1.4" }}>
                Kurang <strong style={{ color: "var(--danger)" }}>{formatRp(amount - posBalance)}</strong> dari saldo pos.
                Anda bisa pinjam dari Saku sebagai alternatif.
              </div>
              <button
                type="button"
                onClick={() => setShowSakuBorrow(true)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, var(--warning), #e59328)",
                  color: "#fff",
                  fontWeight: 750,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(244, 163, 59, 0.3)",
                }}
              >
                🏧 Pinjam dari Saku
              </button>
            </div>
          )}

          {/* Keterangan */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 750, color: "var(--navy)", marginBottom: "8px" }}>
              Keterangan
            </div>
            <textarea
              placeholder={isIncome ? "Contoh: Bonus proyek freelance…" : "Contoh: Beli beras 5kg di pasar…"}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--border)",
                background: "var(--surface)",
                color: "var(--navy)",
                fontSize: "13.5px",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            ></textarea>
          </div>

          {/* Save button */}
          <button
            type="button"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              background: isIncome
                ? "linear-gradient(135deg, var(--teal), #108e82)"
                : isFuelMode && connectedVehicles.length > 0
                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                  : "linear-gradient(135deg, #287ff0, #1769d2)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "15px",
              letterSpacing: "-0.2px",
              cursor: isSubmitting || saved || Boolean(isFuelMode && connectedVehicles.length > 0 && isOdoInvalid) ? "default" : "pointer",
              boxShadow: isIncome
                ? "0 4px 16px rgba(22, 168, 154, 0.3)"
                : isFuelMode && connectedVehicles.length > 0
                  ? "0 4px 16px rgba(245, 158, 11, 0.35)"
                  : "0 4px 16px rgba(40, 127, 240, 0.35)",
              opacity: isSubmitting || (isFuelMode && connectedVehicles.length > 0 && isOdoInvalid) ? 0.6 : 1,
              transition: "transform 0.15s ease, opacity 0.15s ease",
            }}
            onClick={handleSave}
            disabled={isSubmitting || saved || Boolean(isFuelMode && connectedVehicles.length > 0 && isOdoInvalid)}
          >
            {saved
              ? "✅ Berhasil Disimpan!"
              : isSubmitting
                ? "⏳ Menyimpan..."
                : isIncome
                  ? "💰 Simpan Pemasukan"
                  : isFuelMode && connectedVehicles.length > 0
                    ? "⛽ Simpan Transaksi & Log BBM"
                    : "💾 Simpan Pengeluaran"}
          </button>
        </div>
      </div>

      {/* Saku Borrow Modal */}
      <SakuBorrowModal
        isOpen={showSakuBorrow}
        onClose={() => setShowSakuBorrow(false)}
        totalExpense={amount}
        posBalance={posBalance}
        sakuList={children}
        onConfirm={async (sakuId, sakuWithdrawAmount) => {
          setShowSakuBorrow(false);
          await handleSaveWithSakuBorrow(sakuId, sakuWithdrawAmount);
        }}
      />
    </main>
  );
}
