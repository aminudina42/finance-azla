"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import DebtModal from "@/components/Modals/DebtModal";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import PayDebtModal from "@/components/Modals/PayDebtModal";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";
import type { Debt, DebtPayment } from "@/lib/types";
import {
  formatRp,
  formatDateIndo,
  getRemainingMonths,
  getDebtMonthlyStatus,
} from "@/lib/debt-utils";

export default function DebtsPage() {
  const {
    debts,
    debtPayments,
    transactions,
    posList,
    addDebt,
    updateDebt,
    deleteDebt,
    payDebt,
    rollbackDebtPayment,
    cycles,
    cycleIndex,
    isLoading,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentToRollback, setPaymentToRollback] = useState<DebtPayment | null>(null);
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeCycle = cycles[cycleIndex] || cycles[0] || null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Hanya hutang yang masih berjalan (belum lunas) yang masuk ke total cicilan & sisa hutang
  const activeDebts = useMemo(() => debts.filter((d) => d.remaining_amount > 0), [debts]);
  const totalDebt = useMemo(() => activeDebts.reduce((s, d) => s + d.remaining_amount, 0), [activeDebts]);
  const totalMonthly = useMemo(() => activeDebts.reduce((s, d) => s + d.monthly_payment, 0), [activeDebts]);

  // Statistik status bulan ini
  const monthlyStats = useMemo(() => {
    let paidCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    activeDebts.forEach((d) => {
      const st = getDebtMonthlyStatus(d, debtPayments, transactions, activeCycle);
      if (st.status === "paid") paidCount++;
      else if (st.status === "overdue") overdueCount++;
      else if (st.status === "due_soon") dueSoonCount++;
    });

    return {
      paidCount,
      dueSoonCount,
      overdueCount,
      totalActive: activeDebts.length,
    };
  }, [activeDebts, debtPayments, transactions, activeCycle]);

  // Hirarki Sorting:
  // 1. Yang belum lunas selalu di atas, yang sudah lunas di paling bawah
  // 2. Berdasarkan status bulan ini: overdue > due_soon > pending > paid > settled
  // 3. Berdasarkan sisa jumlah bulan pembayaran terkecil
  const sortedDebts = useMemo(() => {
    return [...debts].sort((a, b) => {
      const isLunasA = a.remaining_amount <= 0;
      const isLunasB = b.remaining_amount <= 0;

      if (isLunasA !== isLunasB) {
        return isLunasA ? 1 : -1;
      }

      if (isLunasA && isLunasB) {
        return (b.total_amount || 0) - (a.total_amount || 0);
      }

      const stA = getDebtMonthlyStatus(a, debtPayments, transactions, activeCycle).status;
      const stB = getDebtMonthlyStatus(b, debtPayments, transactions, activeCycle).status;

      const priority: Record<string, number> = {
        overdue: 1,
        due_soon: 2,
        pending: 3,
        paid: 4,
        settled: 5,
      };

      if (priority[stA] !== priority[stB]) {
        return priority[stA] - priority[stB];
      }

      const monthsA = getRemainingMonths(a);
      const monthsB = getRemainingMonths(b);

      if (monthsA !== monthsB) {
        return monthsA - monthsB;
      }

      if ((b.monthly_payment || 0) !== (a.monthly_payment || 0)) {
        return (b.monthly_payment || 0) - (a.monthly_payment || 0);
      }

      return b.remaining_amount - a.remaining_amount;
    });
  }, [debts, debtPayments, transactions, activeCycle]);

  const toggleHistory = (debtId: string) => {
    setExpandedHistories((prev) => ({
      ...prev,
      [debtId]: !prev[debtId],
    }));
  };

  const copyToClipboard = (text: string, label = "Nomor") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} berhasil disalin! 📋`);
  };

  const openAdd = () => {
    setEditingDebt(null);
    setModalMode("add");
    setShowModal(true);
  };

  const openEdit = (d: Debt) => {
    setEditingDebt(d);
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSave = (
    name: string,
    icon: string,
    totalAmount: number,
    remainingAmount: number,
    monthlyPayment: number,
    dueDate: number,
    principalAmount?: number,
    tenorMonths?: number,
    paidMonths?: number,
    creditorName?: string,
    accountNumber?: string,
    notes?: string
  ) => {
    if (modalMode === "add") {
      addDebt(
        name,
        icon,
        totalAmount,
        remainingAmount,
        monthlyPayment,
        dueDate,
        principalAmount,
        tenorMonths,
        paidMonths,
        creditorName,
        accountNumber,
        notes
      );
      showToast("Hutang baru berhasil dicatat! 💳");
    } else if (editingDebt) {
      updateDebt(
        editingDebt.id,
        name,
        icon,
        totalAmount,
        remainingAmount,
        monthlyPayment,
        dueDate,
        principalAmount,
        tenorMonths,
        paidMonths,
        creditorName,
        accountNumber,
        notes
      );
      showToast("Perubahan hutang berhasil disimpan! ✓");
    }
  };

  const handlePay = (posId: string, amount: number, notes?: string, paymentDate?: string) => {
    if (payingDebt) {
      payDebt(payingDebt.id, amount, posId, notes, paymentDate);
      showToast(`Cicilan ${payingDebt.name} berhasil dibayarkan! 🎉`);
      setPayingDebt(null);
    }
  };

  const confirmDelete = () => {
    if (debtToDelete) {
      deleteDebt(debtToDelete.id);
      showToast("Data hutang berhasil dihapus.");
      setDebtToDelete(null);
    }
  };

  const confirmRollbackPayment = () => {
    if (paymentToRollback) {
      rollbackDebtPayment(paymentToRollback.id);
      showToast("Pembayaran berhasil dibatalkan & saldo pos dikembalikan! ↩️");
      setPaymentToRollback(null);
    }
  };

  if (isLoading) {
    return (
      <main id="pg-debts" className="page active" style={{ paddingBottom: "110px" }}>
        <PageHeader
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/icon-menu-hutang.png"
                alt="Menu Hutang"
                style={{ width: "30px", height: "30px", objectFit: "contain" }}
              />
              <span>Hutang &amp; Cicilan</span>
            </span>
          }
          subtitle="Pantau kewajiban keuangan keluarga"
          backHref="/"
        />
        <div style={{ padding: "16px 20px 0" }}>
          {/* Summary Card Skeleton */}
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid var(--border)",
              borderRadius: "20px",
              padding: "18px 20px",
              marginBottom: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Skeleton width="110px" height="11px" borderRadius="4px" />
              <Skeleton width="130px" height="24px" borderRadius="6px" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Skeleton width="110px" height="11px" borderRadius="4px" />
              <Skeleton width="120px" height="24px" borderRadius="6px" />
            </div>
          </div>

          {/* Debt Cards Skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  border: "1.5px solid var(--border)",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Skeleton width="42px" height="42px" borderRadius="12px" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <Skeleton width="140px" height="16px" borderRadius="4px" />
                      <Skeleton width="100px" height="12px" borderRadius="4px" />
                    </div>
                  </div>
                  <Skeleton width="60px" height="24px" borderRadius="6px" />
                </div>
                <Skeleton width="100%" height="48px" borderRadius="12px" />
                <Skeleton width="100%" height="6px" borderRadius="99px" />
                <Skeleton width="100%" height="38px" borderRadius="10px" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="pg-debts" className="page active" style={{ paddingBottom: "110px" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(16, 45, 85, 0.95)",
            color: "#ffffff",
            padding: "9px 18px",
            borderRadius: "99px",
            fontSize: "12.5px",
            fontWeight: 700,
            zIndex: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/icon-menu-hutang.png"
              alt="Menu Hutang"
              style={{ width: "30px", height: "30px", objectFit: "contain" }}
            />
            <span>Hutang &amp; Cicilan</span>
          </span>
        }
        subtitle="Pantau kewajiban keuangan keluarga"
        backHref="/"
        action={
          <button
            type="button"
            onClick={openAdd}
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              background: "var(--primary)",
              color: "#ffffff",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 3px 10px rgba(40, 127, 240, 0.25)",
            }}
          >
            <span>＋</span> Tambah
          </button>
        }
      />

      {/* Summary hero */}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 750, color: "var(--text-secondary)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                Total Sisa Hutang
              </div>
              <div style={{ fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 850, color: "var(--navy)", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
                {formatRp(totalDebt)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 750, color: "var(--text-secondary)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                Cicilan / Bulan
              </div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
                {formatRp(totalMonthly)}
              </div>
            </div>
          </div>

          {/* Status Periode Berjalan */}
          {monthlyStats.totalActive > 0 && (
            <div
              style={{
                marginTop: "14px",
                paddingTop: "12px",
                borderTop: "1px dashed #d1e7f8",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 650 }}>
                Status Bulan Ini:{" "}
                <strong style={{ color: monthlyStats.paidCount === monthlyStats.totalActive ? "var(--teal)" : "var(--navy)" }}>
                  {monthlyStats.paidCount} dari {monthlyStats.totalActive} Sudah Dibayar
                </strong>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                {monthlyStats.overdueCount > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 750,
                      padding: "2px 7px",
                      borderRadius: "6px",
                      background: "rgba(240, 68, 103, 0.12)",
                      color: "var(--danger)",
                    }}
                  >
                    ⚠️ {monthlyStats.overdueCount} Lewat Tempo
                  </span>
                )}
                {monthlyStats.dueSoonCount > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 750,
                      padding: "2px 7px",
                      borderRadius: "6px",
                      background: "rgba(234, 154, 28, 0.12)",
                      color: "#d97706",
                    }}
                  >
                    ⏳ {monthlyStats.dueSoonCount} Segera Tempo
                  </span>
                )}
                {monthlyStats.paidCount === monthlyStats.totalActive && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 750,
                      padding: "2px 7px",
                      borderRadius: "6px",
                      background: "rgba(22, 168, 154, 0.12)",
                      color: "var(--teal)",
                    }}
                  >
                    ✓ Semua Cicilan Beres
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debt list */}
      <div style={{ padding: "16px 20px 0" }}>
        {debts.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "#ffffff",
              borderRadius: "16px",
              border: "1.5px dashed var(--border)",
              color: "var(--text-secondary)",
              marginTop: "8px",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>💳</div>
            <div style={{ fontSize: "15px", fontWeight: 750, color: "var(--navy)", marginBottom: "4px" }}>
              Belum Ada Hutang
            </div>
            <div style={{ fontSize: "12.5px" }}>
              Alhamdulillah! Atau tap tombol <strong>＋ Tambah</strong> untuk mencatat kewajiban cicilan keluarga.
            </div>
          </div>
        )}

        {sortedDebts.map((debt) => {
          const progress = debt.total_amount > 0
            ? Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100)
            : 0;
          const isLunas = debt.remaining_amount <= 0;
          const isKredit = (debt.tenor_months || 0) > 0;
          const monthlyStatus = getDebtMonthlyStatus(debt, debtPayments, transactions, activeCycle);

          // Ambil riwayat pembayaran spesifik hutang ini
          const paymentsForDebt = (debtPayments || [])
            .filter((p) => p.debt_id === debt.id)
            .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

          const isHistoryExpanded = Boolean(expandedHistories[debt.id]);

          return (
            <div
              key={debt.id}
              style={{
                background: "#ffffff",
                border: `1.5px solid ${
                  isLunas
                    ? "rgba(22, 168, 154, 0.25)"
                    : monthlyStatus.status === "overdue"
                    ? "rgba(240, 68, 103, 0.35)"
                    : "var(--border)"
                }`,
                borderRadius: "18px",
                padding: "16px",
                marginBottom: "14px",
                boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {/* 1. Header Kartu: Icon, Nama, Badges, Action Buttons */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: isLunas ? "rgba(22, 168, 154, 0.1)" : "#f1f8fd",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "22px",
                      flexShrink: 0,
                    }}
                  >
                    {debt.icon}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15.5px", fontWeight: 800, color: "var(--navy)", wordBreak: "break-word" }}>
                        {debt.name}
                      </span>
                      {debt.creditor_name && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 750,
                            padding: "2px 7px",
                            borderRadius: "5px",
                            background: "#eef4ff",
                            color: "var(--primary)",
                          }}
                        >
                          {debt.creditor_name}
                        </span>
                      )}
                      {isKredit && (
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "5px",
                            background: "#f0fdf4",
                            color: "#15803d",
                          }}
                        >
                          Kredit
                        </span>
                      )}
                    </div>

                    {/* VA / Rekening Pill (Inline & Rapi) */}
                    {debt.account_number && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "4px",
                          background: "#f8fafc",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          maxWidth: "100%",
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600 }}>
                          VA: <strong style={{ color: "var(--navy)" }}>{debt.account_number}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(debt.account_number!, "Nomor Rekening")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--primary)",
                            fontSize: "10.5px",
                            fontWeight: 750,
                            cursor: "pointer",
                            padding: "0 2px",
                          }}
                        >
                          Salin
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Buttons */}
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => openEdit(debt)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--text-secondary)",
                    }}
                    title="Edit"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtToDelete(debt)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: "1px solid rgba(240, 68, 103, 0.2)",
                      background: "rgba(240, 68, 103, 0.08)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--danger)",
                    }}
                    title="Hapus"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 2. Status Banner (Status Bulan Ini) */}
              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: monthlyStatus.badgeBg,
                  color: monthlyStatus.badgeColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: 750 }}>
                  {monthlyStatus.status === "paid" && <span>✓</span>}
                  {monthlyStatus.status === "overdue" && <span>⚠️</span>}
                  {monthlyStatus.status === "due_soon" && <span>⏳</span>}
                  <span>{monthlyStatus.label}</span>
                </div>
                {monthlyStatus.detail && (
                  <span style={{ fontSize: "11px", fontWeight: 600, opacity: 0.9 }}>
                    {monthlyStatus.detail}
                  </span>
                )}
              </div>

              {/* 3. Info Finansial Bento Box (3 Kolom Seimbang & Rapi) */}
              <div
                style={{
                  marginTop: "10px",
                  background: "#f8fbff",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr",
                  gap: "10px",
                }}
              >
                {/* Kolom 1: Sisa Tagihan */}
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 750, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Sisa Tagihan
                  </div>
                  <div
                    style={{
                      fontSize: "14.5px",
                      fontWeight: 850,
                      color: isLunas ? "var(--teal)" : "var(--danger)",
                      fontVariantNumeric: "tabular-nums",
                      marginTop: "3px",
                    }}
                  >
                    {formatRp(debt.remaining_amount)}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    dari {formatRp(debt.total_amount)}
                  </div>
                </div>

                {/* Kolom 2: Cicilan Bulanan */}
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 750, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Cicilan / Bln
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "var(--navy)",
                      fontVariantNumeric: "tabular-nums",
                      marginTop: "3px",
                    }}
                  >
                    {formatRp(debt.monthly_payment)}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Tgl {debt.due_date} tiap bulan
                  </div>
                </div>

                {/* Kolom 3: Progress & Tenor */}
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 750, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    Progress
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "var(--navy)",
                      fontVariantNumeric: "tabular-nums",
                      marginTop: "3px",
                    }}
                  >
                    {isKredit || (debt.tenor_months || 0) > 0
                      ? `Ke-${debt.paid_months || 0} / ${debt.tenor_months || 0}`
                      : `${progress}%`}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {!isLunas ? `Sisa ${getRemainingMonths(debt)}x lagi` : "Lunas"}
                  </div>
                </div>
              </div>

              {/* 4. Progress bar */}
              <div style={{ height: "6px", borderRadius: "99px", background: "var(--track)", overflow: "hidden", margin: "12px 0 6px" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: isLunas ? "var(--teal)" : "var(--primary)",
                    borderRadius: "99px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600 }}>
                <span>{progress}% terbayar ({debt.paid_months || 0}x angsuran)</span>
                <span>Terbayar {formatRp(debt.total_amount - debt.remaining_amount)}</span>
              </div>

              {/* Catatan jika ada */}
              {debt.notes && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "11.5px",
                    color: "var(--text-secondary)",
                    fontStyle: "italic",
                    background: "#f8fafc",
                    padding: "6px 10px",
                    borderRadius: "8px",
                  }}
                >
                  💬 &ldquo;{debt.notes}&rdquo;
                </div>
              )}

              {/* 5. Tombol Aksi Bayar */}
              {!isLunas && (
                <button
                  type="button"
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: monthlyStatus.status === "paid"
                      ? "1.5px solid rgba(22, 168, 154, 0.3)"
                      : "1.5px solid rgba(40, 127, 240, 0.2)",
                    background: monthlyStatus.status === "paid"
                      ? "rgba(22, 168, 154, 0.08)"
                      : "rgba(40, 127, 240, 0.08)",
                    color: monthlyStatus.status === "paid" ? "var(--teal)" : "var(--primary)",
                    fontWeight: 750,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => setPayingDebt(debt)}
                >
                  {monthlyStatus.status === "paid" ? (
                    <span>✓ Cicilan Bulan Ini Sudah Dibayar (Bayar Lagi?)</span>
                  ) : (
                    <span>💸 Bayar Cicilan {(debt.paid_months || 0) > 0 || isKredit ? `Ke-${(debt.paid_months || 0) + 1}` : ""}</span>
                  )}
                </button>
              )}

              {/* 6. Accordion Toggle: Riwayat Pembayaran */}
              <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => toggleHistory(debt.id)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "4px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📋 Riwayat Angsuran</span>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "99px",
                        background: "#eef2f6",
                        color: "var(--navy)",
                        fontWeight: 750,
                      }}
                    >
                      {paymentsForDebt.length}
                    </span>
                  </span>
                  <span>{isHistoryExpanded ? "▲ Tutup" : "▼ Lihat"}</span>
                </button>

                {/* Daftar Riwayat Angsuran */}
                {isHistoryExpanded && (
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {paymentsForDebt.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "16px 12px",
                          background: "var(--bg)",
                          borderRadius: "10px",
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Belum ada riwayat pembayaran yang tercatat melalui aplikasi.
                      </div>
                    ) : (
                      paymentsForDebt.map((pay) => (
                        <div
                          key={pay.id}
                          style={{
                            background: "var(--bg)",
                            borderRadius: "10px",
                            padding: "10px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "12.5px", fontWeight: 750, color: "var(--navy)" }}>
                                Angsuran Ke-{pay.payment_number}
                              </span>
                              <span style={{ fontSize: "10.5px", color: "var(--text-secondary)" }}>
                                · {formatDateIndo(pay.payment_date)}
                              </span>
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                              Dari {pay.pos_name || "Pos"} {pay.user_name ? `oleh ${pay.user_name}` : ""}
                              {pay.notes && ` · "${pay.notes}"`}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--teal)", fontVariantNumeric: "tabular-nums" }}>
                              {formatRp(pay.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPaymentToRollback(pay)}
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "6px",
                                border: "1px solid rgba(240, 68, 103, 0.2)",
                                background: "rgba(240, 68, 103, 0.08)",
                                color: "var(--danger)",
                                cursor: "pointer",
                                display: "grid",
                                placeItems: "center",
                              }}
                              title="Batalkan Pembayaran Ini"
                            >
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="add-btn"
          onClick={openAdd}
          style={{
            marginTop: "14px",
            background: "#ffffff",
            border: "1.5px dashed var(--border)",
            color: "var(--primary)",
            fontWeight: 700,
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(38, 111, 183, 0.04)",
          }}
        >
          ＋ Tambah Hutang Baru
        </button>
      </div>

      {/* Modal Input/Edit Hutang */}
      <DebtModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
        debtName={editingDebt?.name}
        debtIcon={editingDebt?.icon}
        debtTotal={editingDebt?.total_amount}
        debtRemaining={editingDebt?.remaining_amount}
        debtMonthly={editingDebt?.monthly_payment}
        debtDueDate={editingDebt?.due_date}
        debtPrincipal={editingDebt?.principal_amount}
        debtTenor={editingDebt?.tenor_months}
        debtPaidMonths={editingDebt?.paid_months}
        debtCreditor={editingDebt?.creditor_name}
        debtAccountNumber={editingDebt?.account_number}
        debtNotes={editingDebt?.notes}
        onSave={handleSave}
      />

      {/* Modal Konfirmasi Hapus Hutang */}
      <ConfirmModal
        isOpen={!!debtToDelete}
        title="Hapus Hutang?"
        message={`Apakah Anda yakin ingin menghapus data ${debtToDelete?.name}? Riwayat dan data kewajiban ini akan dihapus permanen.`}
        confirmText="Hapus"
        onConfirm={confirmDelete}
        onCancel={() => setDebtToDelete(null)}
      />

      {/* Modal Konfirmasi Batalkan Pembayaran (Rollback) */}
      <ConfirmModal
        isOpen={!!paymentToRollback}
        title="Batalkan Pembayaran?"
        message={`Apakah Anda yakin ingin membatalkan Angsuran Ke-${paymentToRollback?.payment_number} sebesar ${formatRp(paymentToRollback?.amount || 0)}? Saldo pos '${paymentToRollback?.pos_name || "Pos"}' akan dikembalikan dan sisa hutang akan bertambah kembali.`}
        confirmText="Batalkan Bayar"
        onConfirm={confirmRollbackPayment}
        onCancel={() => setPaymentToRollback(null)}
      />

      {/* Modal Bayar Hutang */}
      <PayDebtModal
        isOpen={!!payingDebt}
        onClose={() => setPayingDebt(null)}
        debtName={payingDebt?.name || ""}
        debtIcon={payingDebt?.icon || "💳"}
        monthlyPayment={payingDebt?.monthly_payment || 0}
        paidMonths={payingDebt?.paid_months || 0}
        tenorMonths={payingDebt?.tenor_months || 0}
        remainingAmount={payingDebt?.remaining_amount || 0}
        creditorName={payingDebt?.creditor_name || ""}
        accountNumber={payingDebt?.account_number || ""}
        posList={posList}
        onPay={handlePay}
      />
    </main>
  );
}
