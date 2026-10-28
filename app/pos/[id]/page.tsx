"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import type { Pos, Transaction, Vehicle, VehicleFuelLog } from "@/lib/types";
import { getVehicles, getFuelLogsByPosId } from "@/lib/vehicle-service";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import VehicleTypeIcon from "@/components/Kendaraan/VehicleTypeIcon";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";

function formatRp(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(n).toLocaleString("id-ID");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Hari ini · ${formatDate(iso)}`;
  if (d.toDateString() === yesterday.toDateString()) return `Kemarin · ${formatDate(iso)}`;
  return formatDate(iso);
}

function PosDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramCycleId = searchParams?.get("cycleId") ?? null;
  const posId = params.id as string;
  const { posList, transactions, cycles, cyclePosHistory, deleteTransaction, isLoading, cycleIndex, setCycleIndex } = useApp();

  const pos = useMemo(() => {
    const active = posList.find((p) => p.id === posId);
    if (active) return active;

    const hist = cyclePosHistory.find((h) => h.pos_id === posId);
    const pastTx = transactions.find((t) => t.pos_id === posId);
    if (hist || pastTx) {
      return {
        id: posId,
        name: pastTx?.pos_name || "Pos (Arsip)",
        icon: pastTx?.pos_icon || "📦",
        sub: "Pos siklus lampau",
        monthly_target: hist?.monthly_target ?? 0,
        goal_target: hist?.goal_target ?? 0,
        current_balance: 0,
        is_goal: (hist?.goal_target ?? 0) > 0,
        order_index: 999,
      } as Pos;
    }
    return undefined;
  }, [posList, posId, cyclePosHistory, transactions]);

  const [selectedCycleId, setSelectedCycleId] = useState<string>(() => {
    if (paramCycleId) return paramCycleId;
    if (typeof cycleIndex === "number" && cycles[cycleIndex]?.id) {
      return cycles[cycleIndex].id;
    }
    return cycles[0]?.id ?? "";
  });

  // Sync cycle when paramCycleId changes or cycles finishes loading
  useEffect(() => {
    if (paramCycleId && cycles.some((c) => c.id === paramCycleId)) {
      setSelectedCycleId(paramCycleId);
      const idx = cycles.findIndex((c) => c.id === paramCycleId);
      if (idx !== -1 && setCycleIndex) {
        setCycleIndex(idx);
      }
    } else if (!selectedCycleId && cycles.length > 0) {
      const targetId = (typeof cycleIndex === "number" && cycles[cycleIndex]?.id) ? cycles[cycleIndex].id : cycles[0].id;
      setSelectedCycleId(targetId);
    }
  }, [paramCycleId, cycles, cycleIndex, selectedCycleId, setCycleIndex]);

  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense">("all");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [connectedVehicles, setConnectedVehicles] = useState<Vehicle[]>([]);
  const [posFuelLogs, setPosFuelLogs] = useState<VehicleFuelLog[]>([]);

  // Ambil armada kendaraan dan riwayat bensin yang dibiayai oleh pos ini
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getVehicles(),
      getFuelLogsByPosId(posId),
    ]).then(([vehs, logs]) => {
      if (isMounted) {
        setAllVehicles(vehs);
        setConnectedVehicles(vehs.filter((v) => v.finance_pos_id === posId));
        setPosFuelLogs(logs);
      }
    });
    return () => { isMounted = false; };
  }, [posId]);

  // Pencocokan transaksi BBM dengan kendaraan terkait
  const getVehicleForTx = useCallback((tx: Transaction): Vehicle | null => {
    // 1. Cek dari relasi vehicle_fuel_logs finance_transaction_id
    const matchedLog = posFuelLogs.find((l) => l.finance_transaction_id === tx.id);
    if (matchedLog) {
      const v = allVehicles.find((veh) => veh.id === matchedLog.vehicle_id);
      if (v) return v;
    }

    // 2. Deteksi dari format deskripsi bensin ('BBM Pertalite — Honda Beat (B 1234 ABC) @ 15.000 km')
    if (tx.description && (tx.description.startsWith("BBM ") || tx.description.includes("BBM"))) {
      // Cek berdasarkan plat nomor yang tercantum di deskripsi
      const vByPlate = allVehicles.find((veh) => veh.plate_number && tx.description.includes(veh.plate_number));
      if (vByPlate) return vByPlate;

      // Cek berdasarkan brand & model
      const vByModel = allVehicles.find((veh) =>
        tx.description.toLowerCase().includes(veh.brand.toLowerCase()) &&
        tx.description.toLowerCase().includes(veh.model.toLowerCase())
      );
      if (vByModel) return vByModel;

      // Fallback jika pos ini terhubung ke 1 kendaraan
      if (connectedVehicles.length === 1) return connectedVehicles[0];
    }

    return null;
  }, [posFuelLogs, allVehicles, connectedVehicles]);

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  // Reset type filter when cycle changes
  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setSelectedType("all");
    const idx = cycles.findIndex((c) => c.id === cycleId);
    if (idx !== -1 && setCycleIndex) {
      setCycleIndex(idx);
    }
  };

  // Transactions for this pos filtered by cycle only (for accurate summary totals)
  const cycleFiltered = useMemo(() => {
    if (!selectedCycle) return [];
    const start = new Date(selectedCycle.start_date + "T00:00:00");
    const end = new Date(selectedCycle.end_date + "T23:59:59");
    const isLatestCycle = selectedCycle.id === cycles[0]?.id;

    return transactions.filter((tx) => {
      if (tx.pos_id !== posId) return false;
      const txDate = new Date(tx.created_at);
      if (txDate < start) return false;
      if (!isLatestCycle && txDate > end) return false;
      return true;
    });
  }, [transactions, posId, selectedCycle, cycles]);

  // Transactions filtered by cycle + type (for display list)
  const filtered = useMemo(() => {
    return cycleFiltered.filter((tx) => {
      if (selectedType !== "all" && tx.type !== selectedType) return false;
      return true;
    });
  }, [cycleFiltered, selectedType]);

  // Summary — always calculated from cycleFiltered (not affected by type filter)
  // Treat transactions with missing type as "expense" for safety
  const totalIncome = useMemo(() => cycleFiltered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [cycleFiltered]);
  const totalExpense = useMemo(() => cycleFiltered.filter((t) => t.type !== "income").reduce((s, t) => s + t.amount, 0), [cycleFiltered]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach((tx) => {
      const label = getDateLabel(tx.created_at);
      if (!groups[label]) groups[label] = [];
      groups[label].push(tx);
    });
    return groups;
  }, [filtered]);

  const shortLabel = (label: string) => label.replace(/\s\d{4}$/, "").replace(" – ", "–");

  if (isLoading) {
    return (
      <main id="pg-pos-detail" className="page active" style={{ paddingBottom: "110px" }}>
        <PageHeader title="Memuat Pos..." subtitle="Amplop Keuangan" backHref="/" />
        <div style={{ padding: "16px 20px 0" }}>
          {/* Hero Card Skeleton */}
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid var(--border)",
              borderRadius: "20px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <Skeleton width="44px" height="44px" borderRadius="14px" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <Skeleton width="110px" height="11px" borderRadius="4px" />
                <Skeleton width="150px" height="18px" borderRadius="4px" />
              </div>
            </div>
            <Skeleton width="160px" height="32px" borderRadius="8px" style={{ marginBottom: "12px" }} />
            <Skeleton width="100%" height="8px" borderRadius="99px" style={{ marginBottom: "8px" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Skeleton width="90px" height="12px" borderRadius="4px" />
              <Skeleton width="70px" height="12px" borderRadius="4px" />
            </div>
          </div>

          {/* Filter Pills Skeleton */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <Skeleton width="70px" height="32px" borderRadius="99px" />
            <Skeleton width="90px" height="32px" borderRadius="99px" />
            <Skeleton width="80px" height="32px" borderRadius="99px" />
          </div>

          {/* Transaction items skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                  <Skeleton width="36px" height="36px" borderRadius="10px" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
                    <Skeleton width="130px" height="14px" borderRadius="4px" />
                    <Skeleton width="80px" height="10px" borderRadius="4px" />
                  </div>
                </div>
                <Skeleton width="85px" height="16px" borderRadius="4px" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!pos) {
    return (
      <main id="pg-pos-detail" className="page active" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "18px", fontWeight: 800 }}>Pos tidak ditemukan</div>
          <Link href="/" className="pos-detail-back" style={{ marginTop: "16px", display: "inline-flex" }}>
            ‹ Kembali ke Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Determine actual target based on selected cycle history
  const activeCycle = cycles[0];
  const isPastCycle = selectedCycleId !== activeCycle?.id;

  const snapshot = isPastCycle 
    ? cyclePosHistory.find(h => h.cycle_id === selectedCycleId && h.pos_id === posId)
    : null;

  const displayTarget = snapshot ? snapshot.monthly_target : pos.monthly_target;
  const displayGoalTarget = snapshot ? snapshot.goal_target : pos.goal_target;

  // Reconstruct balance for past cycles (for standard pos)
  const displayBalance = isPastCycle && !pos.is_goal && pos.name !== "Tabungan"
    ? displayTarget + totalIncome - totalExpense
    : pos.current_balance;

  // Budget calculations
  const isGoal = pos.is_goal;
  const fillWidth = isGoal && displayGoalTarget > 0
    ? Math.min(100, Math.max(0, (displayBalance / displayGoalTarget) * 100))
    : displayBalance < 0
      ? 100
      : displayTarget > 0
        ? Math.min(100, Math.max(0, (displayBalance / displayTarget) * 100))
        : 0;

  const balanceClass = displayBalance < 0
    ? "negative"
    : displayTarget > 0 && displayBalance / displayTarget <= 0.25
      ? "warning"
      : "positive";

  const targetLabel = isGoal && displayGoalTarget > 0
    ? `Target: ${formatRp(displayGoalTarget)}`
    : `Budget: ${formatRp(displayTarget)}`;

  const pctLabel = isGoal && displayGoalTarget > 0
    ? `${Math.round((displayBalance / displayGoalTarget) * 100)}% tercapai`
    : displayBalance < 0
      ? "Overbudget!"
      : displayTarget > 0
        ? `${Math.round(fillWidth)}% tersisa`
        : "–";

  return (
    <main id="pg-pos-detail" className="page active" style={{ paddingBottom: "110px" }}>
      <PageHeader
        title={pos.name}
        subtitle={pos.sub || "Amplop Keuangan"}
        backHref="/"
        badge={
          pos.is_goal ? (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 750,
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(22, 168, 154, 0.12)",
                color: "var(--teal)",
                letterSpacing: "0.5px",
              }}
            >
              🎯 GOAL
            </span>
          ) : undefined
        }
      />

      {/* Hero Card */}
      <div style={{ padding: "16px 20px 0" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(115deg, #ffffff 0%, #f7fbff 72%, #eaf6ff 100%)",
            border: "1.5px solid #c7e5fb",
            borderRadius: "20px",
            boxShadow: "0 10px 24px rgba(38, 111, 183, 0.08)",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: "#f1f8fd",
                border: "1px solid var(--border)",
                display: "grid",
                placeItems: "center",
                fontSize: "22px",
                flexShrink: 0,
              }}
            >
              {pos.icon}
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 750, color: "var(--text-secondary)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                Saldo Amplop Tersedia
              </div>
              <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)" }}>
                {pos.name}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "clamp(28px, 6.5vw, 38px)",
              fontWeight: 850,
              letterSpacing: "-1px",
              color: displayBalance < 0 ? "var(--danger)" : "var(--navy)",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.15,
              margin: "4px 0 14px",
            }}
          >
            {formatRp(displayBalance)}
          </div>

          {/* Progress bar */}
          <div style={{ height: "7px", borderRadius: "99px", background: "var(--track)", overflow: "hidden", marginBottom: "8px" }}>
            <div
              style={{
                height: "100%",
                width: `${fillWidth}%`,
                background: displayBalance < 0
                  ? "var(--danger)"
                  : isGoal
                    ? "var(--teal)"
                    : displayBalance / displayTarget <= 0.25
                      ? "var(--warning)"
                      : "var(--primary)",
                borderRadius: "99px",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 650 }}>
            <span>{targetLabel}</span>
            <span style={{ color: displayBalance < 0 ? "var(--danger)" : "var(--navy)" }}>{pctLabel}</span>
          </div>
        </div>
      </div>

      {/* Section: Kendaraan Terhubung (1 Pos -> Banyak Kendaraan) */}
      {connectedVehicles.length > 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "18px",
              border: "1px solid var(--border)",
              padding: "16px 18px",
              boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🚗</span>
                <span>Kendaraan Terhubung ({connectedVehicles.length})</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                BBM & Perawatan
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {connectedVehicles.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background: "var(--s1)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Link
                    href={`/kendaraan/${v.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      textDecoration: "none",
                      color: "inherit",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <VehicleTypeIcon type={v.vehicle_type} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 750, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {v.brand} {v.model}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        {v.plate_number} · Odometer {v.last_odometer.toLocaleString("id-ID")} km
                      </div>
                    </div>
                  </Link>

                  <Link
                    href={`/kendaraan/${v.id}/bbm`}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#f59e0b",
                      color: "#ffffff",
                      fontSize: "11.5px",
                      fontWeight: 750,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      flexShrink: 0,
                      boxShadow: "0 2px 6px rgba(245, 158, 11, 0.25)",
                    }}
                  >
                    <span>Isi BBM</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="pos-detail-body">
        {/* Filters */}
        <div className="gh-filters">
          {/* Cycle filter */}
          <div className="frow">
            {cycles.map((c) => (
              <div
                key={c.id}
                className={`fc cycle-fc ${c.id === selectedCycleId ? "active" : ""}`}
                onClick={() => handleCycleChange(c.id)}
              >
                {shortLabel(c.label)}
              </div>
            ))}
          </div>
          {/* Type filter */}
          <div className="frow">
            <div
              className={`fc ${selectedType === "all" ? "active" : ""}`}
              onClick={() => setSelectedType("all")}
            >
              Semua
            </div>
            <div
              className={`fc ${selectedType === "expense" ? "active" : ""}`}
              onClick={() => setSelectedType("expense")}
            >
              Pengeluaran
            </div>
            <div
              className={`fc ${selectedType === "income" ? "active" : ""}`}
              onClick={() => setSelectedType("income")}
            >
              Pemasukan
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="gh-summary">
          <div className="gh-summary-card income">
            <div className="gh-summary-label">📥 Pemasukan</div>
            <div className="gh-summary-amount">{formatRp(totalIncome)}</div>
          </div>
          <div className="gh-summary-card expense">
            <div className="gh-summary-label">📤 Pengeluaran</div>
            <div className="gh-summary-amount">{formatRp(totalExpense)}</div>
          </div>
        </div>
        {/* Nett calculation info */}
        <div style={{ padding: "8px 14px", margin: "0 0 6px", borderRadius: "10px", background: "var(--s2)", border: "1px solid var(--border)", fontSize: "11px", color: "var(--muted)", lineHeight: 1.7 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>💼 Budget</span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{formatRp(displayTarget)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>📤 Pengeluaran</span>
            <span style={{ fontWeight: 700, color: "var(--red)" }}>-{formatRp(totalExpense)}</span>
          </div>
          {totalIncome > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>📥 Pemasukan</span>
              <span style={{ fontWeight: 700, color: "var(--teal)" }}>+{formatRp(totalIncome)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "4px", marginTop: "4px" }}>
            <span style={{ fontWeight: 700 }}>📊 Sisa Saldo</span>
            <span style={{ fontWeight: 900, fontFamily: "var(--font-fraunces), serif", color: (displayTarget + totalIncome - totalExpense) < 0 ? "var(--red)" : "var(--teal)" }}>
              {formatRp(displayTarget + totalIncome - totalExpense)}
            </span>
          </div>
        </div>

        {/* Transaction List */}
        {Object.keys(grouped).length === 0 ? (
          <div className="gh-empty">
            <div className="gh-empty-icon">📭</div>
            <div className="gh-empty-title">Belum ada transaksi</div>
            <div className="gh-empty-sub">
              Belum ada transaksi untuk {pos.name} di siklus ini.
            </div>
          </div>
        ) : (
          Object.entries(grouped).map(([label, txs]) => (
            <div className="hday" key={label}>
              <div className="hday-label">{label}</div>
              {txs.map((tx) => {
                const isIncome = tx.type === "income";
                const vehicleForTx = getVehicleForTx(tx);
                return (
                  <div
                    className="hi"
                    key={tx.id}
                    style={{
                      position: "relative",
                      cursor: vehicleForTx ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      borderLeft: vehicleForTx ? "3.5px solid #f59e0b" : undefined,
                    }}
                    onClick={() => {
                      if (vehicleForTx) {
                        router.push(`/kendaraan/${vehicleForTx.id}?tab=bbm&txId=${tx.id}`);
                      }
                    }}
                  >
                    <div
                      className="hi-ic"
                      style={
                        isIncome
                          ? { background: "rgba(0,201,167,.12)" }
                          : vehicleForTx
                          ? { background: "rgba(245, 158, 11, 0.12)", color: "#b45309" }
                          : {}
                      }
                    >
                      {vehicleForTx ? "⛽" : tx.pos_icon}
                    </div>
                    <div className="hi-info">
                      <div className="hi-desc">
                        <span>{tx.description}</span>
                        {vehicleForTx && (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              marginTop: "4px",
                              padding: "2.5px 8px",
                              borderRadius: "6px",
                              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                              border: "1px solid #fde68a",
                              color: "#b45309",
                              fontSize: "11px",
                              fontWeight: 750,
                              width: "fit-content",
                            }}
                          >
                            <VehicleTypeIcon type={vehicleForTx.vehicle_type} size={16} />
                            <span>{vehicleForTx.brand} {vehicleForTx.model} ({vehicleForTx.plate_number})</span>
                            <span style={{ fontSize: "11px", marginLeft: "2px", opacity: 0.8 }}>›</span>
                          </div>
                        )}
                      </div>
                      <div className="hi-meta">
                        {tx.user_role === "suami" ? "👨‍💼" : tx.user_role === "istri" ? "👩" : "🧒"} {tx.user_name}
                        {isIncome && (
                          <span style={{ color: "var(--teal)", marginLeft: "6px", fontWeight: 700 }}>
                            MASUK
                          </span>
                        )}
                        {vehicleForTx && (
                          <span style={{ color: "#b45309", marginLeft: "6px", fontWeight: 700 }}>
                            · Riwayat BBM Kendaraan
                          </span>
                        )}
                      </div>
                      <div className="hi-time">{formatTime(tx.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                      <div className={isIncome ? "hi-amt-in" : "hi-amt"}>
                        {isIncome ? "+" : "-"}Rp {tx.amount.toLocaleString("id-ID")}
                      </div>
                      <button
                        className="hi-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(tx);
                        }}
                        title="Hapus transaksi"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Transaksi?"
        message={
          deleteTarget
            ? `Hapus "${deleteTarget.description}" sebesar ${formatRp(deleteTarget.amount)}? Saldo pos akan dikembalikan.`
            : ""
        }
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteTarget) {
            deleteTransaction(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        isDanger={true}
      />
    </main>
  );
}

export default function PosDetailPage() {
  return (
    <Suspense
      fallback={
        <main id="pg-pos-detail" className="page active" style={{ paddingBottom: "110px" }}>
          <PageHeader title="Memuat Pos..." subtitle="Amplop Keuangan" backHref="/" />
          <div style={{ padding: "16px 20px 0" }}>
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid var(--border)",
                borderRadius: "20px",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <Skeleton width="44px" height="44px" borderRadius="14px" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Skeleton width="110px" height="11px" borderRadius="4px" />
                  <Skeleton width="150px" height="18px" borderRadius="4px" />
                </div>
              </div>
              <Skeleton width="160px" height="32px" borderRadius="8px" style={{ marginBottom: "12px" }} />
              <Skeleton width="100%" height="8px" borderRadius="99px" style={{ marginBottom: "8px" }} />
            </div>
          </div>
        </main>
      }
    >
      <PosDetailContent />
    </Suspense>
  );
}
