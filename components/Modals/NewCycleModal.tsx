"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import Modal from "@/components/Modal";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

interface NewCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newBudgets?: Record<string, { monthly_target: number; goal_target: number }>) => void;
}

export default function NewCycleModal({ isOpen, onClose, onConfirm }: NewCycleModalProps) {
  const { posList, children } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prevStep, setPrevStep] = useState<1 | 2>(1);
  const [budgets, setBudgets] = useState<Record<string, { monthly_target: number; goal_target: number }>>({});

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPrevStep(1);
      const initialBudgets: Record<string, { monthly_target: number; goal_target: number }> = {};
      posList.forEach((p) => {
        initialBudgets[p.id] = { monthly_target: p.monthly_target, goal_target: p.goal_target };
      });
      setBudgets(initialBudgets);
    }
  }, [isOpen, posList]);

  if (!isOpen) return null;

  // Compute Saku transfers preview
  const sakuTransfers = children
    .filter((s) => s.type === "linked" && s.linked_pos_id)
    .map((saku) => {
      const linkedPos = posList.find((p) => p.id === saku.linked_pos_id);
      if (!linkedPos) return null;
      const delta = linkedPos.current_balance;
      return { saku, linkedPos, delta };
    })
    .filter(Boolean) as { saku: typeof children[number]; linkedPos: typeof posList[number]; delta: number }[];

  const hasSakuTransfers = sakuTransfers.length > 0;

  const handleBudgetChange = (id: string, field: "monthly_target" | "goal_target", value: string) => {
    const numValue = parseInt(value.replace(/\D/g, ""), 10) || 0;
    setBudgets((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: numValue },
    }));
  };

  const handleConfirmWithNewBudgets = () => {
    onConfirm(budgets);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">Gajian Tiba! 🎉</div>

      {/* Step 1: Confirm or edit budget */}
      {step === 1 && (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <p style={{ marginBottom: "20px", fontSize: "14px", color: "var(--muted)", lineHeight: "1.5" }}>
            Siklus baru akan dimulai. Sisa saldo bulan lalu akan dipindahkan ke Tabungan.
            <br /><br />
            Apakah Anda ingin menggunakan <strong>alokasi budget Pos yang sama</strong> seperti bulan lalu?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              className="m-save"
              onClick={() => {
                if (hasSakuTransfers) { setPrevStep(1); setStep(3); }
                else onConfirm();
              }}
              style={{ width: "100%" }}
            >
              ✅ Ya, Gunakan Budget Lama
            </button>
            <button
              className="m-cancel"
              onClick={() => setStep(2)}
              style={{ width: "100%", background: "var(--s2)", color: "var(--text)" }}
            >
              ⚙️ Tidak, Ubah Budget Dulu
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Edit budgets */}
      {step === 2 && (
        <div>
          <p style={{ marginBottom: "16px", fontSize: "13px", color: "var(--muted)" }}>
            Sesuaikan target budget untuk siklus bulan ini:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxHeight: "60vh", overflowY: "auto", paddingRight: "8px", marginBottom: "20px" }}>
            {posList.filter((p) => !p.is_goal && p.name !== "Tabungan").map((p) => (
              <div className="fg" key={p.id}>
                <div className="fl">{p.icon} {p.name}</div>
                <div className="amt-wrap">
                  <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
                  <input
                    type="tel"
                    className="fi"
                    value={budgets[p.id]?.monthly_target.toLocaleString("id-ID") || ""}
                    onChange={(e) => handleBudgetChange(p.id, "monthly_target", e.target.value)}
                    style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                  />
                </div>
              </div>
            ))}
            {posList.filter((p) => p.is_goal && p.name !== "Tabungan").map((p) => (
              <div className="fg" key={p.id}>
                <div className="fl">{p.icon} {p.name} (Target Gol)</div>
                <div className="amt-wrap">
                  <span className="amt-pre" style={{ fontSize: "14px" }}>Rp</span>
                  <input
                    type="tel"
                    className="fi"
                    value={budgets[p.id]?.goal_target.toLocaleString("id-ID") || ""}
                    onChange={(e) => handleBudgetChange(p.id, "goal_target", e.target.value)}
                    style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "20px", fontWeight: 900 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="m-actions">
            <button className="m-cancel" onClick={() => setStep(1)}>Kembali</button>
            <button
              className="m-save"
              onClick={() => {
                if (hasSakuTransfers) { setPrevStep(2); setStep(3); }
                else handleConfirmWithNewBudgets();
              }}
            >
              {hasSakuTransfers ? "Lanjutkan →" : "Mulai Siklus"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Saku transfer preview */}
      {step === 3 && (
        <div>
          <p style={{ marginBottom: "12px", fontSize: "13px", color: "var(--muted)" }}>
            Transfer otomatis ke Saku yang terhubung akan dilakukan saat siklus dimulai:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {sakuTransfers.map(({ saku, linkedPos, delta }) => {
              const isPositive = delta > 0;
              const isNeutral = delta === 0;
              return (
                <div key={saku.id} style={{
                  padding: "12px 14px",
                  background: isNeutral
                    ? "var(--s2)"
                    : isPositive
                      ? "rgba(0,201,167,.08)"
                      : "rgba(255,79,109,.08)",
                  border: `1px solid ${isNeutral ? "var(--s3)" : isPositive ? "rgba(0,201,167,.25)" : "rgba(255,79,109,.25)"}`,
                  borderRadius: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                        {saku.icon} {saku.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                        via 🔗 {linkedPos.icon} {linkedPos.name}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: "18px",
                      fontWeight: 900,
                      color: isNeutral ? "var(--muted)" : isPositive ? "var(--teal)" : "var(--red)",
                    }}>
                      {isNeutral ? "±0" : `${isPositive ? "+" : ""}${formatRp(delta)}`}
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                    {isPositive
                      ? `🟢 Surplus — sisa saldo pos akan masuk ke Saku`
                      : isNeutral
                        ? `Saldo pos nol — tidak ada transfer`
                        : `🔴 Defisit — saldo Saku akan berkurang`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="m-actions">
            <button className="m-cancel" onClick={() => setStep(prevStep)}>Kembali</button>
            <button
              className="m-save"
              onClick={() => prevStep === 2 ? handleConfirmWithNewBudgets() : onConfirm()}
            >
              🚀 Mulai Siklus Baru
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
