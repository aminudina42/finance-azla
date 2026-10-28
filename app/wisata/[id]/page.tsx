"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import BudgetProgressBar from "@/components/Wisata/BudgetProgressBar";
import TripStatusBadge from "@/components/Wisata/TripStatusBadge";
import TimelineItemCard from "@/components/Wisata/TimelineItemCard";
import OneTapExpenseModal from "@/components/Wisata/OneTapExpenseModal";
import AddTripItemModal from "@/components/Wisata/AddTripItemModal";
import ChecklistSection from "@/components/Wisata/ChecklistSection";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/store";
import {
  getTripById,
  getTripItems,
  deleteTripItem,
  rollbackTripExpense,
  updateTrip,
} from "@/lib/wisata-service";
import { getVehicles } from "@/lib/vehicle-service";
import {
  calculateTripDays,
  formatTripDates,
  formatRp,
  CATEGORY_META,
} from "@/lib/wisata-utils";
import type { Trip, TripItem, Vehicle, TripStatus, TripCategory } from "@/lib/types";
import {
  Calendar,
  MapPin,
  Car,
  Plus,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  ChevronRight,
} from "lucide-react";

export default function DetailWisataPage() {
  const params = useParams();
  const tripId = params.id as string;
  const router = useRouter();

  const { currentMember, posList, children: sakuList, refreshData } = useApp();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<TripItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs Workspace: "jadwal" | "biaya" | "bawaan"
  const [workspaceTab, setWorkspaceTab] = useState<"jadwal" | "biaya" | "bawaan">("jadwal");
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Modals State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<TripItem | null>(null);

  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [itemForExpense, setItemForExpense] = useState<TripItem | null>(null);

  // Vehicle Switch Modal State
  const [isChangeVehicleOpen, setIsChangeVehicleOpen] = useState(false);
  const [selectedVehicleForTrip, setSelectedVehicleForTrip] = useState<string>("");
  const [savingVehicle, setSavingVehicle] = useState(false);

  const [noticeMsg, setNoticeMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const [tripData, itemsData, vehiclesData] = await Promise.all([
        getTripById(tripId),
        getTripItems(tripId),
        getVehicles(),
      ]);

      setTrip(tripData);
      setItems(itemsData);
      setVehicles(vehiclesData);
    } catch (err) {
      console.error("Gagal memuat detail trip:", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setNoticeMsg({ text, type });
    setTimeout(() => {
      setNoticeMsg(null);
    }, 3000);
  };

  // Cek apakah peran user diizinkan mencatat keuangan
  const userRole = currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri");
  const isAnak = currentMember?.status_keluarga === "anak";
  const canExecuteExpense = !isAnak;

  // Hitung durasi dan tanggal
  const totalDays = useMemo(() => {
    if (!trip) return 1;
    return calculateTripDays(trip.start_date, trip.end_date);
  }, [trip]);

  // Hitung total estimasi dan total aktual
  const summaryCost = useMemo(() => {
    let estimated = 0;
    let actual = 0;
    items.forEach((it) => {
      estimated += Number(it.estimated_cost) || 0;
      if (it.is_completed && typeof it.actual_cost === "number") {
        actual += Number(it.actual_cost) || 0;
      }
    });
    return { estimated, actual };
  }, [items]);

  // Breakdown Biaya per Kategori
  const categoryBreakdown = useMemo(() => {
    const map: Record<TripCategory, { estimated: number; actual: number; count: number }> = {
      transport: { estimated: 0, actual: 0, count: 0 },
      ticket: { estimated: 0, actual: 0, count: 0 },
      food: { estimated: 0, actual: 0, count: 0 },
      lodging: { estimated: 0, actual: 0, count: 0 },
      shopping: { estimated: 0, actual: 0, count: 0 },
      other: { estimated: 0, actual: 0, count: 0 },
    };

    items.forEach((it) => {
      const cat = it.category || "other";
      if (!map[cat]) map[cat] = { estimated: 0, actual: 0, count: 0 };
      map[cat].estimated += Number(it.estimated_cost) || 0;
      if (it.is_completed && typeof it.actual_cost === "number") {
        map[cat].actual += Number(it.actual_cost) || 0;
      }
      map[cat].count += 1;
    });

    return map;
  }, [items]);

  // Items untuk hari terpilih pada Tab Jadwal
  const itemsForSelectedDay = useMemo(() => {
    return items.filter((it) => it.day_number === selectedDay);
  }, [items, selectedDay]);

  // Kendaraan & Pos terkait
  const linkedVehicle = useMemo(() => {
    if (!trip?.vehicle_id) return null;
    return vehicles.find((v) => v.id === trip.vehicle_id) || null;
  }, [trip, vehicles]);

  const linkedPos = useMemo(() => {
    if (!trip?.finance_pos_id) return null;
    return posList.find((p) => p.id === trip.finance_pos_id) || null;
  }, [trip, posList]);

  // Actions
  const handleOpenCatatAktual = (item: TripItem) => {
    if (!canExecuteExpense) {
      showToast("Peran Anak tidak memiliki hak mencatat pengeluaran pos.", "error");
      return;
    }
    setItemForExpense(item);
    setIsExpenseOpen(true);
  };

  const handleRollbackItem = async (item: TripItem) => {
    if (!canExecuteExpense) return;
    if (!confirm(`Batalkan pengeluaran "${item.title}"? Saldo pos akan dikembalikan.`)) return;

    try {
      const res = await rollbackTripExpense(item.id);
      if (!res.success) throw new Error(res.error);

      showToast("Pengeluaran dibatalkan & saldo dipulihkan", "success");
      loadData();
      if (refreshData) refreshData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Gagal membatalkan pengeluaran", "error");
    }
  };

  const handleDeleteItem = async (item: TripItem) => {
    if (!confirm(`Hapus acara "${item.title}"?`)) return;
    try {
      const { error } = await deleteTripItem(item.id);
      if (error) throw new Error(error.message);

      showToast("Acara berhasil dihapus", "success");
      loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Gagal menghapus acara", "error");
    }
  };

  const handleUpdateStatus = async (newStatus: TripStatus) => {
    if (!trip) return;
    try {
      await updateTrip(trip.id, { status: newStatus });
      setTrip((prev) => (prev ? { ...prev, status: newStatus } : null));
      showToast(`Status perjalanan diubah menjadi ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      showToast("Gagal memperbarui status", "error");
    }
  };

  const handleSaveVehicle = async (vehicleId: string | null) => {
    if (!trip) return;
    setSavingVehicle(true);
    try {
      const { error } = await updateTrip(trip.id, { vehicle_id: vehicleId });
      if (error) throw new Error(error.message);
      setTrip((prev) => (prev ? { ...prev, vehicle_id: vehicleId } : null));
      setIsChangeVehicleOpen(false);
      showToast(vehicleId ? "Kendaraan perjalanan berhasil diperbarui" : "Kendaraan perjalanan dilepas");
    } catch (err: any) {
      console.error(err);
      showToast("Gagal memperbarui kendaraan: " + err.message, "error");
    } finally {
      setSavingVehicle(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px" }}>
        <Skeleton height={60} borderRadius={12} />
        <div style={{ marginTop: "16px" }}>
          <Skeleton height={140} borderRadius={18} />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <h3>Rencana Wisata Tidak Ditemukan</h3>
        <p style={{ color: "#64748b", fontSize: "14px" }}>Perjalanan mungkin telah dihapus atau Anda tidak memiliki akses.</p>
        <Link href="/wisata" style={{ color: "var(--brand-primary, #287ff0)", fontWeight: 600 }}>
          Kembali ke Daftar Wisata
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
        paddingBottom: "128px",
      }}
    >
      <PageHeader
        title={trip.title}
        subtitle={`${trip.destination} • ${formatTripDates(trip.start_date, trip.end_date)}`}
        backHref="/wisata"
        action={
          <Link
            href={`/wisata/${trip.id}/cetak`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 10px",
              borderRadius: "8px",
              backgroundColor: "rgba(40, 127, 240, 0.1)",
              color: "var(--brand-primary, #287ff0)",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Printer size={14} />
            <span>Struk</span>
          </Link>
        }
      />

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {noticeMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              backgroundColor: noticeMsg.type === "error" ? "rgba(240, 68, 103, 0.15)" : "rgba(22, 168, 154, 0.15)",
              color: noticeMsg.type === "error" ? "#f04467" : "#0d9488",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {noticeMsg.text}
          </div>
        )}

        {/* Dual Layer Budget Progress Bar */}
        <BudgetProgressBar
          actualCost={summaryCost.actual}
          estimatedCost={summaryCost.estimated}
          budgetLimit={trip.total_budget_limit}
        />

        {/* Status Perjalanan & Pos Terhubung */}
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "14px",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span style={{ color: "var(--text-muted, #64748b)" }}>Status:</span>
            <TripStatusBadge status={trip.status} />
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>
            {trip.status !== "ongoing" && trip.status !== "completed" && (
              <button
                onClick={() => handleUpdateStatus("ongoing")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border, #cbd5e1)",
                  backgroundColor: "transparent",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Mulai Liburan
              </button>
            )}
            {trip.status !== "completed" && (
              <button
                onClick={() => handleUpdateStatus("completed")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "rgba(100, 116, 139, 0.15)",
                  color: "#475569",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Tandai Selesai
              </button>
            )}
          </div>
        </div>

        {/* Info Kendaraan Road Trip & Opsi Ganti Kendaraan */}
        <div
          style={{
            backgroundColor: "var(--surface, #ffffff)",
            borderRadius: "14px",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: linkedVehicle ? "rgba(37, 99, 235, 0.1)" : "rgba(100, 116, 139, 0.1)",
                color: linkedVehicle ? "#2563eb" : "#64748b",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Car size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--text, #1e293b)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {linkedVehicle
                  ? `${linkedVehicle.vehicle_type === "Motor" ? "🛵" : "🚗"} ${linkedVehicle.brand} ${linkedVehicle.model} (${linkedVehicle.plate_number})`
                  : "Tanpa Kendaraan Keluarga"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted, #64748b)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {linkedVehicle
                  ? `Odometer: ${(linkedVehicle.last_odometer || 0).toLocaleString("id-ID")} km`
                  : "Kendaraan umum / rental"}
              </div>
            </div>
          </div>

          {canExecuteExpense && (
            <button
              onClick={() => {
                setSelectedVehicleForTrip(trip.vehicle_id || "");
                setIsChangeVehicleOpen(true);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                backgroundColor: "transparent",
                color: "var(--brand-primary, #287ff0)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {linkedVehicle ? "Ganti" : "+ Hubungkan"}
            </button>
          )}
        </div>

        {/* 3 Tab Navigasi Workspace */}
        <div
          style={{
            display: "flex",
            backgroundColor: "rgba(100, 116, 139, 0.08)",
            padding: "4px",
            borderRadius: "12px",
            gap: "4px",
          }}
        >
          {[
            { id: "jadwal", label: "📅 Jadwal" },
            { id: "biaya", label: "💸 Biaya" },
            { id: "bawaan", label: "🎒 Bawaan" },
          ].map((tab) => {
            const isActive = workspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setWorkspaceTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "9px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isActive ? "var(--surface, #ffffff)" : "transparent",
                  color: isActive ? "var(--brand-primary, #287ff0)" : "var(--text-muted, #64748b)",
                  boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: JADWAL TIMELINE */}
        {workspaceTab === "jadwal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Horizontal Day Pills */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                paddingBottom: "4px",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
              }}
            >
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((dayNum) => {
                const isSelected = selectedDay === dayNum;
                const countForDay = items.filter((it) => it.day_number === dayNum).length;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "12px",
                      border: `1px solid ${isSelected ? "var(--brand-primary, #287ff0)" : "var(--border, rgba(0,0,0,0.08))"}`,
                      backgroundColor: isSelected ? "var(--brand-primary, #287ff0)" : "var(--surface, #ffffff)",
                      color: isSelected ? "#ffffff" : "var(--text, #1e293b)",
                      fontSize: "13px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>Hari {dayNum}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "1px 6px",
                        borderRadius: "999px",
                        backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "rgba(100,116,139,0.12)",
                      }}
                    >
                      {countForDay}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tombol Tambah Acara Hari Ini */}
            <button
              onClick={() => {
                setItemToEdit(null);
                setIsAddItemOpen(true);
              }}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px dashed var(--brand-primary, #287ff0)",
                backgroundColor: "rgba(40, 127, 240, 0.04)",
                color: "var(--brand-primary, #287ff0)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Plus size={16} />
              <span>Tambah Acara di Hari ke-{selectedDay}</span>
            </button>

            {/* List Acara Hari Ini */}
            {itemsForSelectedDay.length === 0 ? (
              <div
                style={{
                  backgroundColor: "var(--surface, #ffffff)",
                  borderRadius: "16px",
                  border: "1px solid var(--border, rgba(0,0,0,0.08))",
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "var(--text-muted, #64748b)",
                  fontSize: "13px",
                }}
              >
                Belum ada agenda di Hari ke-{selectedDay}. Klik tombol di atas untuk menambahkan jadwal kunjungan.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {itemsForSelectedDay.map((item) => (
                  <TimelineItemCard
                    key={item.id}
                    item={item}
                    canExecuteExpense={canExecuteExpense}
                    onCatatAktual={handleOpenCatatAktual}
                    onRollback={handleRollbackItem}
                    onDelete={handleDeleteItem}
                    onEdit={(it) => {
                      setItemToEdit(it);
                      setIsAddItemOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BIAYA & REKAPITULASI */}
        {workspaceTab === "biaya" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
              Rincian Pengeluaran per Kategori
            </h4>

            {Object.entries(categoryBreakdown).map(([catKey, data]) => {
              const meta = CATEGORY_META[catKey as TripCategory] || CATEGORY_META.other;
              const delta = data.estimated - data.actual;

              return (
                <div
                  key={catKey}
                  style={{
                    backgroundColor: "var(--surface, #ffffff)",
                    borderRadius: "14px",
                    border: "1px solid var(--border, rgba(0,0,0,0.08))",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        backgroundColor: meta.bgColor,
                        color: meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "var(--text, #1e293b)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {meta.label}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted, #64748b)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {data.count} Acara • Proyeksi: {formatRp(data.estimated)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-fraunces, serif)", color: "var(--text, #1e293b)", whiteSpace: "nowrap" }}>
                      {formatRp(data.actual)}
                    </div>
                    {data.actual > 0 && (
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: delta >= 0 ? "#0d9488" : "#ea580c",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {delta > 0 ? `Hemat ${formatRp(delta)}` : delta < 0 ? `+${formatRp(Math.abs(delta))}` : "Pas"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: BAWAAN CHECKLIST */}
        {workspaceTab === "bawaan" && (
          <ChecklistSection tripId={trip.id} canEdit={true} />
        )}
      </div>

      {/* Modal Tambah / Edit Acara */}
      <AddTripItemModal
        isOpen={isAddItemOpen}
        onClose={() => {
          setIsAddItemOpen(false);
          setItemToEdit(null);
        }}
        tripId={trip.id}
        totalDays={totalDays}
        currentDay={selectedDay}
        itemToEdit={itemToEdit}
        onSuccess={() => {
          loadData();
          showToast(itemToEdit ? "Acara diperbarui" : "Acara baru ditambahkan");
        }}
      />

      {/* Modal One-Tap Expense */}
      <OneTapExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => {
          setIsExpenseOpen(false);
          setItemForExpense(null);
        }}
        item={itemForExpense}
        trip={trip}
        pos={linkedPos}
        sakuList={sakuList}
        vehicle={linkedVehicle}
        userRole={userRole}
        userId={currentMember?.id || "unknown"}
        userName={currentMember?.display_name || "Keluarga"}
        onSuccess={() => {
          loadData();
          if (refreshData) refreshData();
          showToast("Pengeluaran berhasil dicatat & saldo pos terpotong", "success");
        }}
      />

      {/* Modal Ganti / Hubungkan Kendaraan */}
      <Modal isOpen={isChangeVehicleOpen} onClose={() => setIsChangeVehicleOpen(false)}>
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: "var(--text, #1e293b)" }}>
              Pilih Kendaraan Perjalanan
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
              Tentukan kendaraan keluarga untuk mencatat konsumsi BBM dan update odometer selama liburan
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: !selectedVehicleForTrip ? "2px solid var(--brand-primary, #287ff0)" : "1px solid var(--border, #cbd5e1)",
                backgroundColor: !selectedVehicleForTrip ? "rgba(40, 127, 240, 0.05)" : "transparent",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="vehicleChoice"
                checked={!selectedVehicleForTrip}
                onChange={() => setSelectedVehicleForTrip("")}
              />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text, #1e293b)" }}>
                Tanpa Kendaraan (Transportasi Umum / Sewa)
              </span>
            </label>

            {vehicles.map((v) => (
              <label
                key={v.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: selectedVehicleForTrip === v.id ? "2px solid var(--brand-primary, #287ff0)" : "1px solid var(--border, #cbd5e1)",
                  backgroundColor: selectedVehicleForTrip === v.id ? "rgba(40, 127, 240, 0.05)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="vehicleChoice"
                  checked={selectedVehicleForTrip === v.id}
                  onChange={() => setSelectedVehicleForTrip(v.id)}
                />
                <div style={{ fontSize: "13px" }}>
                  <div style={{ fontWeight: 600, color: "var(--text, #1e293b)" }}>
                    {v.vehicle_type === "Motor" ? "🛵" : "🚗"} {v.brand} {v.model} ({v.plate_number})
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
                    Odometer: {(v.last_odometer || 0).toLocaleString("id-ID")} km
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => setIsChangeVehicleOpen(false)}
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
              type="button"
              disabled={savingVehicle}
              onClick={() => handleSaveVehicle(selectedVehicleForTrip || null)}
              style={{
                flex: 2,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "var(--brand-primary, #287ff0)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: savingVehicle ? "not-allowed" : "pointer",
              }}
            >
              {savingVehicle ? "Menyimpan..." : "Simpan Kendaraan"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
