"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import DebtModal from "@/components/Modals/DebtModal";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import PayDebtModal from "@/components/Modals/PayDebtModal";
import PageHeader from "@/components/PageHeader";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function DebtsPage() {
  const { debts, posList, addDebt, updateDebt, deleteDebt, payDebt } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [debtToDelete, setDebtToDelete] = useState<any>(null);
  const [payingDebt, setPayingDebt] = useState<any>(null);

  const totalDebt = debts.reduce((s, d) => s + d.remaining_amount, 0);
  const totalMonthly = debts.reduce((s, d) => s + d.monthly_payment, 0);

  const openAdd = () => {
    setEditingDebt(null); setModalMode("add"); setShowModal(true);
  };

  const openEdit = (d: any) => {
    setEditingDebt(d); setModalMode("edit"); setShowModal(true);
  };

  const handleSave = (name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number, principalAmount?: number, tenorMonths?: number, paidMonths?: number) => {
    if (modalMode === "add") {
      addDebt(name, icon, totalAmount, remainingAmount, monthlyPayment, dueDate, principalAmount, tenorMonths, paidMonths);
    } else if (editingDebt) {
      updateDebt(editingDebt.id, name, icon, totalAmount, remainingAmount, monthlyPayment, dueDate, principalAmount, tenorMonths, paidMonths);
    }
  };

  const handlePay = (posId: string, amount: number) => {
    if (payingDebt) {
      payDebt(payingDebt.id, amount, posId);
      setPayingDebt(null);
    }
  };

  const confirmDelete = () => {
    if (debtToDelete) {
      deleteDebt(debtToDelete.id);
      setDebtToDelete(null);
    }
  };

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
        </div>
      </div>

      {/* Debt list */}
      <div style={{ padding: "16px 20px 0" }}>
        {debts.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "#ffffff", borderRadius: "16px", border: "1.5px dashed var(--border)", color: "var(--text-secondary)", marginTop: "8px" }}>
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>💳</div>
            <div style={{ fontSize: "15px", fontWeight: 750, color: "var(--navy)", marginBottom: "4px" }}>Belum Ada Hutang</div>
            <div style={{ fontSize: "12.5px" }}>Bagus! Atau tap tombol <strong>＋ Tambah</strong> untuk mencatat kewajiban cicilan.</div>
          </div>
        )}
        {debts.map((debt) => {
          const progress = debt.total_amount > 0
            ? Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100)
            : 0;
          const isLunas = debt.remaining_amount <= 0;
          const isKredit = (debt.tenor_months || 0) > 0;

          return (
            <div
              key={debt.id}
              style={{
                background: "#ffffff",
                border: `1.5px solid ${isLunas ? "rgba(22, 168, 154, 0.25)" : "var(--border)"}`,
                borderRadius: "16px",
                padding: "16px",
                marginBottom: "12px",
                boxShadow: "0 4px 14px rgba(16, 45, 85, 0.04)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: isLunas ? "rgba(22, 168, 154, 0.1)" : "#f1f8fd",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "20px",
                      flexShrink: 0,
                    }}
                  >
                    {debt.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", fontWeight: 750, color: "var(--navy)" }}>{debt.name}</span>
                      {isLunas && (
                        <span style={{ fontSize: "9.5px", fontWeight: 750, padding: "2px 6px", borderRadius: "4px", background: "rgba(22, 168, 154, 0.12)", color: "var(--teal)" }}>
                          ✅ LUNAS
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Cicilan <strong style={{ color: "var(--navy)" }}>{formatRp(debt.monthly_payment)}</strong> · Jatuh tempo tgl {debt.due_date}
                    </div>
                  </div>
                </div>
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
                      fontSize: "12px",
                    }}
                    title="Edit"
                  >
                    ✏️
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
                      fontSize: "12px",
                    }}
                    title="Hapus"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {isKredit ? (
                <div style={{ margin: "14px 0", display: "flex", flexDirection: "column", gap: "8px", background: "#f8fbff", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "8px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 650 }}>Sisa Tagihan</div>
                    <div style={{ fontSize: "14.5px", fontWeight: 800, color: isLunas ? "var(--teal)" : "var(--danger)", fontVariantNumeric: "tabular-nums" }}>
                      {formatRp(debt.remaining_amount)} {!isLunas && <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>(Sisa {(debt.tenor_months || 0) - (debt.paid_months || 0)}x)</span>}
                    </div>
                  </div>
                  {(debt.principal_amount || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 650 }}>Total Pinjaman</div>
                      <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)", fontVariantNumeric: "tabular-nums" }}>{formatRp(debt.principal_amount!)}</div>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 650 }}>Total Kewajiban</div>
                    <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)", fontVariantNumeric: "tabular-nums" }}>{formatRp(debt.total_amount)}</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0 10px", padding: "10px 14px", background: "#f8fbff", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Sisa</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: isLunas ? "var(--teal)" : "var(--danger)", fontVariantNumeric: "tabular-nums", marginTop: "2px" }}>
                      {formatRp(debt.remaining_amount)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>dari Total</div>
                    <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)", fontVariantNumeric: "tabular-nums", marginTop: "2px" }}>
                      {formatRp(debt.total_amount)}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div style={{ height: "6px", borderRadius: "99px", background: "var(--track)", overflow: "hidden", margin: "10px 0 6px" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: isLunas ? "var(--teal)" : "var(--primary)", borderRadius: "99px", transition: "width 0.3s ease" }}></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600 }}>
                <span>{progress}% terbayar</span>
                <span>{formatRp(debt.total_amount - debt.remaining_amount)}</span>
              </div>

              {/* Pay button */}
              {!isLunas && (
                <button
                  type="button"
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(40, 127, 240, 0.2)",
                    background: "rgba(40, 127, 240, 0.08)",
                    color: "var(--primary)",
                    fontWeight: 750,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "background 0.15s ease",
                  }}
                  onClick={() => setPayingDebt(debt)}
                >
                  💸 Bayar Cicilan {(debt.paid_months || 0) > 0 || isKredit ? `Ke-${(debt.paid_months || 0) + 1}` : ""}
                </button>
              )}
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
        onSave={handleSave}
      />

      <ConfirmModal
        isOpen={!!debtToDelete}
        title="Hapus Hutang?"
        message={`Apakah Anda yakin ingin menghapus data ${debtToDelete?.name}? Data yang dihapus tidak dapat dikembalikan.`}
        confirmText="Hapus"
        onConfirm={confirmDelete}
        onCancel={() => setDebtToDelete(null)}
      />

      <PayDebtModal
        isOpen={!!payingDebt}
        onClose={() => setPayingDebt(null)}
        debtName={payingDebt?.name || ""}
        debtIcon={payingDebt?.icon || "💳"}
        monthlyPayment={payingDebt?.monthly_payment || 0}
        paidMonths={payingDebt?.paid_months || 0}
        tenorMonths={payingDebt?.tenor_months || 0}
        posList={posList}
        onPay={handlePay}
      />
    </main>
  );
}
