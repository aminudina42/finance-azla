"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import DebtModal from "@/components/Modals/DebtModal";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import PayDebtModal from "@/components/Modals/PayDebtModal";

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
    <main id="pg-debts" className="page active">
      <div className="ph ph-border">
        <h2>💳 Hutang & Cicilan</h2>
        <p>Pantau kewajiban keuangan keluarga</p>
      </div>

      {/* Summary hero */}
      <div style={{ padding: "0 20px" }}>
        <div className="debt-hero">
          <div className="dh-row">
            <div>
              <div className="dh-label">Total Sisa Hutang</div>
              <div className="dh-amount">{formatRp(totalDebt)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="dh-label">Cicilan / Bulan</div>
              <div className="dh-monthly">{formatRp(totalMonthly)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Debt list */}
      <div className="debt-body">
        {debts.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>💳</div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>Belum ada hutang</div>
            <div style={{ fontSize: "13px" }}>Bagus! Atau tap tombol <strong>＋ Tambah</strong> di bawah untuk mencatat cicilan.</div>
          </div>
        )}
        {debts.map((debt) => {
          const progress = debt.total_amount > 0
            ? Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100)
            : 0;
          const isLunas = debt.remaining_amount <= 0;
          const isKredit = (debt.tenor_months || 0) > 0;

          return (
            <div key={debt.id} className={`debt-card ${isLunas ? "lunas" : ""}`}>
              <div className="dc-top">
                <div className="dc-icon">{debt.icon}</div>
                <div className="dc-info">
                  <div className="dc-name">
                    {debt.name}
                    {isLunas && <span className="lunas-badge">✅ LUNAS</span>}
                  </div>
                  <div className="dc-meta">
                    Cicilan {formatRp(debt.monthly_payment)} · Jatuh tempo tgl {debt.due_date}
                  </div>
                </div>
                <div className="dc-actions">
                  <div className="ib e" onClick={() => openEdit(debt)}>✏️</div>
                  <div className="ib d" onClick={() => setDebtToDelete(debt)}>🗑</div>
                </div>
              </div>
              {isKredit ? (
                <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "8px" }}>
                    <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>Sisa Tagihan</div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: isLunas ? "var(--teal)" : "var(--red)" }}>
                      {formatRp(debt.remaining_amount)} {!isLunas && <span style={{ fontSize: "11px", fontWeight: 600 }}>(Sisa {(debt.tenor_months || 0) - (debt.paid_months || 0)}x)</span>}
                    </div>
                  </div>
                  {(debt.principal_amount || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>Total Pinjaman</div>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>{formatRp(debt.principal_amount!)}</div>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>Total Kewajiban</div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>{formatRp(debt.total_amount)}</div>
                  </div>
                </div>
              ) : (
                <div className="dc-amounts">
                  <div>
                    <div className="dc-amt-label">Sisa</div>
                    <div className="dc-amt-value" style={{ color: isLunas ? "var(--teal)" : "var(--red)" }}>
                      {formatRp(debt.remaining_amount)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="dc-amt-label">dari Total</div>
                    <div className="dc-amt-value" style={{ color: "var(--muted)" }}>
                      {formatRp(debt.total_amount)}
                    </div>
                  </div>
                </div>
              )}
              <div className="ec-bar" style={{ margin: "8px 0 4px" }}>
                <div className="ec-fill" style={{ width: `${progress}%`, background: isLunas ? "var(--teal)" : "var(--purple)" }}></div>
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)" }}>{progress}% terbayar</div>

              {/* Pay button */}
              {!isLunas && (
                <button
                  className="dc-pay-btn"
                  onClick={() => setPayingDebt(debt)}
                >
                  💸 Bayar Cicilan {(debt.paid_months || 0) > 0 || isKredit ? `Ke-${(debt.paid_months || 0) + 1}` : ""}
                </button>
              )}
            </div>
          );
        })}
        <button className="add-btn" onClick={openAdd}>＋ Tambah Hutang Baru</button>
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
