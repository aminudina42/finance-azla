"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import DebtModal from "@/components/Modals/DebtModal";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function DebtsPage() {
  const { debts, posList, addDebt, updateDebt, deleteDebt, payDebt } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [payPosId, setPayPosId] = useState("");
  const [payAmountStr, setPayAmountStr] = useState("");

  const totalDebt = debts.reduce((s, d) => s + d.remaining_amount, 0);
  const totalMonthly = debts.reduce((s, d) => s + d.monthly_payment, 0);

  const openAdd = () => {
    setEditingDebt(null); setModalMode("add"); setShowModal(true);
  };

  const openEdit = (d: any) => {
    setEditingDebt(d); setModalMode("edit"); setShowModal(true);
  };

  const handleSave = (name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number) => {
    if (modalMode === "add") {
      addDebt(name, icon, totalAmount, monthlyPayment, dueDate);
    } else if (editingDebt) {
      updateDebt(editingDebt.id, name, icon, totalAmount, remainingAmount, monthlyPayment, dueDate);
    }
  };

  const handlePay = (debtId: string) => {
    const amount = Number(payAmountStr.replace(/\D/g, ""));
    if (!amount || !payPosId) return;
    payDebt(debtId, amount, payPosId);
    setPayingDebtId(null);
    setPayAmountStr("");
    setPayPosId("");
  };

  const handlePayAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) { setPayAmountStr(""); return; }
    setPayAmountStr(Number(rawValue).toLocaleString("id-ID"));
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
          const isPaying = payingDebtId === debt.id;
          const isLunas = debt.remaining_amount <= 0;

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
                  <div className="ib d" onClick={() => deleteDebt(debt.id)}>🗑</div>
                </div>
              </div>
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
              <div className="ec-bar" style={{ margin: "8px 0 4px" }}>
                <div className="ec-fill" style={{ width: `${progress}%`, background: isLunas ? "var(--teal)" : "var(--purple)" }}></div>
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)" }}>{progress}% terbayar</div>

              {/* Pay button */}
              {!isLunas && !isPaying && (
                <button
                  className="dc-pay-btn"
                  onClick={() => { setPayingDebtId(debt.id); setPayAmountStr(debt.monthly_payment.toLocaleString("id-ID")); }}
                >
                  💸 Bayar Cicilan
                </button>
              )}

              {/* Pay form */}
              {isPaying && (
                <div className="dc-pay-form">
                  <div className="fg">
                    <div className="fl">Bayar dari Pos</div>
                    <div className="sw">
                      <select className="fi" value={payPosId} onChange={(e) => setPayPosId(e.target.value)} style={{ fontSize: "13px" }}>
                        <option value="">— Pilih Pos —</option>
                        {posList.filter((p) => !p.is_goal).map((p) => (
                          <option key={p.id} value={p.id}>{p.icon} {p.name} ({formatRp(p.current_balance)})</option>
                        ))}
                      </select>
                      <span className="sa">▼</span>
                    </div>
                  </div>
                  <div className="fg">
                    <div className="fl">Nominal Bayar</div>
                    <div className="amt-wrap">
                      <span className="amt-pre" style={{ fontSize: "12px" }}>Rp</span>
                      <input type="tel" className="fi" value={payAmountStr} onChange={handlePayAmtChange} style={{ paddingLeft: "38px", fontFamily: "'Fraunces',serif", fontSize: "18px", fontWeight: 900 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="m-cancel" style={{ flex: 1, padding: "10px", fontSize: "12px" }} onClick={() => setPayingDebtId(null)}>Batal</button>
                    <button className="m-save" style={{ flex: 2, padding: "10px", fontSize: "12px" }} onClick={() => handlePay(debt.id)}>✅ Konfirmasi Bayar</button>
                  </div>
                </div>
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
        onSave={handleSave}
      />
    </main>
  );
}
