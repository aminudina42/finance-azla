"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import type { Vehicle, VehicleTaxPayment, VehicleService } from "@/lib/types";
import { getVehicles, getVehicleTaxPayments, getVehicleServices } from "@/lib/vehicle-service";
import {
  calculateTaxStatus,
  calculateServiceStatus,
  getDaysUntilTaxDue,
  formatDateIndo,
  formatRp,
} from "@/lib/vehicle-utils";

interface NotifItem {
  id: string;
  category: "Kendaraan" | "Keuangan";
  type: "service_reminder" | "tax_reminder" | "tax_success" | "service_success";
  title: string;
  description: string;
  timestampStr: string;
  vehicleId?: string;
  iconBg: string;
  iconColor: string;
}

export default function NotifikasiPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"semua" | "keuangan" | "kendaraan">("semua");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const vehicles = await getVehicles();
      const items: NotifItem[] = [];

      for (const v of vehicles) {
        // 1. Check Service Reminder
        const sStatus = calculateServiceStatus(
          v.last_service_date,
          v.service_reminder_interval_months || 1
        );
        if (sStatus === "Perlu Servis") {
          items.push({
            id: `srv-rem-${v.id}`,
            category: "Kendaraan",
            type: "service_reminder",
            title: "Reminder Servis",
            description: `${v.brand} ${v.model} perlu dijadwalkan servis. Servis terakhir ${v.last_service_date ? formatDateIndo(v.last_service_date) : "belum pernah"}.`,
            timestampStr: "Perlu perhatian",
            vehicleId: v.id,
            iconBg: "#fff7ed",
            iconColor: "#ea580c",
          });
        }

        // 2. Check Tax Reminder (H-30 or overdue)
        const daysLeft = getDaysUntilTaxDue(v.next_tax_due_date);
        const tStatus = calculateTaxStatus(v.next_tax_due_date);

        if (tStatus === "Terlambat") {
          items.push({
            id: `tax-late-${v.id}`,
            category: "Kendaraan",
            type: "tax_reminder",
            title: "Pajak Terlambat!",
            description: `Pajak kendaraan ${v.brand} ${v.model} (${v.plate_number}) telah melewati tanggal jatuh tempo (${formatDateIndo(v.next_tax_due_date)}).`,
            timestampStr: "Segera lunasi",
            vehicleId: v.id,
            iconBg: "#fee2e2",
            iconColor: "#ef4444",
          });
        } else if (daysLeft !== null && daysLeft <= 30 && daysLeft >= 0) {
          items.push({
            id: `tax-rem-${v.id}`,
            category: "Kendaraan",
            type: "tax_reminder",
            title: "Reminder Pajak",
            description: `Pajak ${v.brand} ${v.model} akan jatuh tempo dalam ${daysLeft} hari (${formatDateIndo(v.next_tax_due_date)}).`,
            timestampStr: `${daysLeft} hari lagi`,
            vehicleId: v.id,
            iconBg: "#fef3c7",
            iconColor: "#d97706",
          });
        }

        // 3. Load latest tax payment for success info
        const taxes = await getVehicleTaxPayments(v.id);
        if (taxes.length > 0) {
          const latestTax = taxes[0];
          items.push({
            id: `tax-suc-${latestTax.id}`,
            category: "Kendaraan",
            type: "tax_success",
            title: "Pembayaran Pajak Berhasil",
            description: `${v.brand} ${v.model} — ${formatRp(latestTax.amount)} (Periode ${latestTax.tax_period})`,
            timestampStr: formatDateIndo(latestTax.payment_date),
            vehicleId: v.id,
            iconBg: "#e6f8f5",
            iconColor: "#16a89a",
          });
        }

        // 4. Load latest service for record info
        const srvs = await getVehicleServices(v.id);
        if (srvs.length > 0) {
          const latestSrv = srvs[0];
          items.push({
            id: `srv-suc-${latestSrv.id}`,
            category: "Kendaraan",
            type: "service_success",
            title: "Riwayat Servis Tercatat",
            description: `${v.brand} ${v.model} — ${formatRp(latestSrv.total_cost)} (${formatDateIndo(latestSrv.service_date)})`,
            timestampStr: formatDateIndo(latestSrv.service_date),
            vehicleId: v.id,
            iconBg: "#eaf5fc",
            iconColor: "#287ff0",
          });
        }
      }

      setNotifications(items);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filtered = useMemo(() => {
    if (filter === "semua") return notifications;
    if (filter === "keuangan") return notifications.filter((n) => n.category === "Keuangan");
    if (filter === "kendaraan") return notifications.filter((n) => n.category === "Kendaraan");
    return notifications;
  }, [notifications, filter]);

  return (
    <main className="page active" style={{ paddingBottom: "110px" }}>
      {/* Standardized Header */}
      <PageHeader
        title="Notifikasi"
        subtitle="Pemberitahuan jatuh tempo & aktivitas keluarga"
        backHref="/"
      />

      <div style={{ padding: "0 20px" }}>
        {/* Filter Pills (Screen 10 mockup) */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[
            { id: "semua", label: "Semua" },
            { id: "keuangan", label: "Keuangan" },
            { id: "kendaraan", label: "Kendaraan" },
          ].map((pill) => {
            const active = filter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilter(pill.id as any)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "999px",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: active ? "var(--primary)" : "var(--surface)",
                  color: active ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "12.5px",
                  fontWeight: active ? 700 : 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Notif List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  padding: "14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <Skeleton width="38px" height="38px" borderRadius="10px" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Skeleton width="130px" height="15px" borderRadius="4px" />
                    <Skeleton width="70px" height="12px" borderRadius="4px" />
                  </div>
                  <Skeleton width="100%" height="12px" borderRadius="4px" />
                  <Skeleton width="75%" height="12px" borderRadius="4px" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "50px 20px",
              background: "var(--surface)",
              borderRadius: "16px",
              border: "1px dashed var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔔</div>
            <div style={{ fontSize: "15px", fontWeight: 750, color: "var(--navy)", marginBottom: "4px" }}>
              Tidak ada notifikasi baru
            </div>
            <div style={{ fontSize: "12.5px" }}>
              Semua jadwal pajak dan perawatan kendaraan Anda berada dalam kondisi aman.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={item.vehicleId ? `/kendaraan/${item.vehicleId}` : "/kendaraan"}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: "var(--surface)",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                    padding: "14px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    boxShadow: "0 2px 8px rgba(16, 45, 85, 0.03)",
                    cursor: "pointer",
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: item.iconBg,
                      color: item.iconColor,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.type === "service_reminder" ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    ) : item.type === "tax_reminder" ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    ) : item.type === "tax_success" ? (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 750, color: "var(--navy)" }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>
                        {item.timestampStr}
                      </span>
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                      {item.description}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
