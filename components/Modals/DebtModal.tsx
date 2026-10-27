"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { evaluateDebtRatio } from "@/lib/debt-utils";

const DEBT_ICONS = [
  "💳", "🏦", "🏠", "🚗", "📱", "💊", "🎓", "🛒",
  "🏥", "✈️", "👗", "🔧", "📺", "💻", "🪑", "🧊",
];

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  debtName?: string;
  debtIcon?: string;
  debtTotal?: number;
  debtRemaining?: number;
  debtMonthly?: number;
  debtDueDate?: number;
  debtPrincipal?: number;
  debtTenor?: number;
  debtPaidMonths?: number;
  debtCreditor?: string;
  debtAccountNumber?: string;
  debtNotes?: string;
  currentTotalMonthlyDebt?: number;
  monthlyIncome?: number;
  maxSafePercentage?: number;
  onSave: (
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
  ) => void;
}

function DebtModalContent({
  isOpen,
  onClose,
  mode,
  debtName = "",
  debtIcon = "💳",
  debtTotal = 0,
  debtRemaining = 0,
  debtMonthly = 0,
  debtDueDate = 1,
  debtPrincipal = 0,
  debtTenor = 0,
  debtPaidMonths = 0,
  debtCreditor = "",
  debtAccountNumber = "",
  debtNotes = "",
  currentTotalMonthlyDebt = 0,
  monthlyIncome = 0,
  maxSafePercentage = 25,
  onSave,
}: DebtModalProps) {
  const [name, setName] = useState(debtName);
  const [icon, setIcon] = useState(debtIcon);
  const [totalStr, setTotalStr] = useState(debtTotal ? debtTotal.toLocaleString("id-ID") : "");
  const [remainingStr, setRemainingStr] = useState(debtRemaining ? debtRemaining.toLocaleString("id-ID") : "");
  const [monthlyStr, setMonthlyStr] = useState(debtMonthly ? debtMonthly.toLocaleString("id-ID") : "");
  const [dueDateStr, setDueDateStr] = useState(debtDueDate ? debtDueDate.toString() : "1");

  const [isKredit, setIsKredit] = useState(debtTenor > 0);
  const [principalStr, setPrincipalStr] = useState(debtPrincipal ? debtPrincipal.toLocaleString("id-ID") : "");
  const [tenor, setTenor] = useState(debtTenor);
  const [paidMonths, setPaidMonths] = useState(debtPaidMonths);
  const [creditor, setCreditor] = useState(debtCreditor);
  const [accountNumber, setAccountNumber] = useState(debtAccountNumber);
  const [notes, setNotes] = useState(debtNotes);

  const handleSave = () => {
    let total = Number(totalStr.replace(/\D/g, ""));
    let remaining = mode === "edit" ? Number(remainingStr.replace(/\D/g, "")) : total;
    const monthly = Number(monthlyStr.replace(/\D/g, ""));
    const dueNum = Math.min(31, Math.max(1, Number(dueDateStr) || 1));
    let principal = 0;
    let tenorM = 0;
    let paidM = 0;

    if (isKredit) {
      principal = Number(principalStr.replace(/\D/g, ""));
      tenorM = tenor;
      paidM = paidMonths;
      total = tenorM * monthly;
      remaining = total - (paidM * monthly);
    } else {
      tenorM = tenor;
      paidM = paidMonths;
      if (mode === "add" && paidM > 0 && monthly > 0) {
        remaining = total - (paidM * monthly);
      }
    }

    if (!name || !total) return;
    onSave(
      name,
      icon,
      total,
      Math.max(0, remaining),
      monthly,
      dueNum,
      principal,
      tenorM,
      paidM,
      creditor.trim(),
      accountNumber.trim(),
      notes.trim()
    );
    onClose();
  };

  const handleAmtChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setter("");
      return;
    }
    setter(Number(rawValue).toLocaleString("id-ID"));
  };

  const enteredMonthly = Number(monthlyStr.replace(/\D/g, "")) || 0;
  const simulatedTotalDebt = mode === "add"
    ? (currentTotalMonthlyDebt || 0) + enteredMonthly
    : Math.max(0, (currentTotalMonthlyDebt || 0) - (debtMonthly || 0) + enteredMonthly);

  const evaluation = evaluateDebtRatio(simulatedTotalDebt, monthlyIncome || 0, maxSafePercentage || 25);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">{mode === "add" ? "💳 Tambah Hutang Baru" : "✏️ Edit Hutang"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        
        <div className="fg" style={{ flexDirection: "row", alignItems: "center", gap: "8px", background: "var(--bg)", padding: "10px", borderRadius: "8px" }}>
          <input
            type="checkbox"
            id="iskredit"
            checked={isKredit}
            onChange={(e) => setIsKredit(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--teal)" }}
          />
          <label htmlFor="iskredit" style={{ fontSize: "14px", fontWeight: 600, color: "var(--teal)", cursor: "pointer" }}>
            Skema Kredit Berbunga (KPR, Leasing, dll)
          </label>
        </div>

        <div className="fg">
          <div className="fl">Nama Hutang / Cicilan</div>
          <input
            type="text"
            className="fi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Cicilan Motor, KPR Rumah…"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div className="fg">
            <div className="fl">Kreditur / Lembaga</div>
            <input
              type="text"
              className="fi"
              value={creditor}
              onChange={(e) => setCreditor(e.target.value)}
              placeholder="BCA, BTN, dll"
            />
          </div>
          <div className="fg">
            <div className="fl">No. VA / Rekening / Kontrak</div>
            <input
              type="text"
              className="fi"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="No. VA / Kontrak"
            />
          </div>
        </div>
        
        <div className="fg">
          <div className="fl">Icon</div>
          <div className="epick">
            {DEBT_ICONS.map((em) => (
              <div
                key={em}
                className={`eo ${em === icon ? "sel" : ""}`}
                onClick={() => setIcon(em)}
              >
                {em}
              </div>
            ))}
          </div>
        </div>

        {isKredit ? (
          <>
            <div className="fg">
              <div className="fl">Pokok Pinjaman (Asli)</div>
              <div className="amt-wrap">
                <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
                <input
                  type="tel"
                  className="fi"
                  value={principalStr}
                  onChange={handleAmtChange(setPrincipalStr)}
                  style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                  placeholder="0"
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div className="fg" style={{ flex: 1 }}>
                <div className="fl">Tenor (Bulan)</div>
                <input
                  type="number"
                  className="fi"
                  value={tenor || ""}
                  onChange={(e) => setTenor(Number(e.target.value))}
                  min={0}
                  style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                  placeholder="0"
                />
              </div>
              <div className="fg" style={{ flex: 1 }}>
                <div className="fl">Cicilan Ke-</div>
                <input
                  type="number"
                  className="fi"
                  value={paidMonths || ""}
                  onChange={(e) => setPaidMonths(Number(e.target.value))}
                  min={0}
                  style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                  placeholder="0"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="fg">
            <div className="fl">Total Hutang</div>
            <div className="amt-wrap">
              <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
              <input
                type="tel"
                className="fi"
                value={totalStr}
                onChange={handleAmtChange(setTotalStr)}
                style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                placeholder="0"
              />
            </div>
          </div>
        )}

        {mode === "edit" && !isKredit && (
          <div className="fg">
            <div className="fl">Sisa Hutang</div>
            <div className="amt-wrap">
              <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
              <input
                type="tel"
                className="fi"
                value={remainingStr}
                onChange={handleAmtChange(setRemainingStr)}
                style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                placeholder="0"
              />
            </div>
          </div>
        )}

        {!isKredit && (
          <div style={{ display: "flex", gap: "10px" }}>
            <div className="fg" style={{ flex: 1 }}>
              <div className="fl">Tenor (Bulan)</div>
              <input
                type="number"
                className="fi"
                value={tenor || ""}
                onChange={(e) => setTenor(Number(e.target.value))}
                min={0}
                style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                placeholder="0"
              />
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <div className="fl">Cicilan Ke-</div>
              <input
                type="number"
                className="fi"
                value={paidMonths || ""}
                onChange={(e) => setPaidMonths(Number(e.target.value))}
                min={0}
                style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                placeholder="0"
              />
            </div>
          </div>
        )}

        <div className="fg">
          <div className="fl">Cicilan per Bulan</div>
          <div className="amt-wrap">
            <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
            <input
              type="tel"
              className="fi"
              value={monthlyStr}
              onChange={handleAmtChange(setMonthlyStr)}
              style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
              placeholder="0"
            />
          </div>
          {isKredit && tenor > 0 && monthlyStr && (
            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
              Total Kewajiban: Rp {(tenor * Number(monthlyStr.replace(/\D/g, ""))).toLocaleString("id-ID")}
            </div>
          )}

          {enteredMonthly > 0 && (
            <div
              style={{
                marginTop: "10px",
                padding: "10px 12px",
                borderRadius: "12px",
                background: evaluation.badgeBg,
                border: `1.5px solid ${
                  evaluation.tier === "safe"
                    ? "rgba(22, 168, 154, 0.35)"
                    : evaluation.tier === "caution"
                    ? "rgba(244, 163, 59, 0.45)"
                    : "rgba(240, 68, 103, 0.45)"
                }`,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                animation: "fadeIn 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "14px" }}>
                    {evaluation.tier === "safe" ? "🟢" : evaluation.tier === "caution" ? "🟡" : "🔴"}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: evaluation.badgeColor }}>
                    {evaluation.title}
                  </span>
                </div>
                {monthlyIncome > 0 && (
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      padding: "2px 7px",
                      borderRadius: "6px",
                      background: "#ffffff",
                      color: evaluation.badgeColor,
                      border: `1px solid ${
                        evaluation.tier === "safe"
                          ? "rgba(22, 168, 154, 0.3)"
                          : evaluation.tier === "caution"
                          ? "rgba(244, 163, 59, 0.3)"
                          : "rgba(240, 68, 103, 0.3)"
                      }`,
                    }}
                  >
                    Rasio {evaluation.ratio}% (Batas {evaluation.maxSafePct}%)
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--navy)", lineHeight: "1.4" }}>
                {evaluation.message}
              </p>
            </div>
          )}
        </div>

        <div className="fg">
          <div className="fl">Tanggal Jatuh Tempo (1–31)</div>
          <input
            type="number"
            className="fi"
            value={dueDateStr}
            onChange={(e) => setDueDateStr(e.target.value)}
            min={1}
            max={31}
            style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
          />
        </div>

        <div className="fg">
          <div className="fl">Catatan Tambahan (Opsional)</div>
          <input
            type="text"
            className="fi"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Bunga flat 6% p.a, kontak PIC Pak Joko"
          />
        </div>

      </div>
      <div className="m-actions">
        <button className="m-cancel" onClick={onClose}>Batal</button>
        <button className="m-save" onClick={handleSave}>Simpan</button>
      </div>
    </Modal>
  );
}

export default function DebtModal(props: DebtModalProps) {
  if (!props.isOpen) return null;
  return (
    <DebtModalContent
      key={(props.debtName || "") + (props.debtTotal || 0) + (props.debtMonthly || 0) + props.mode}
      {...props}
    />
  );
}
