"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import Modal from "@/components/Modal";

interface NewCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newBudgets?: Record<string, { monthly_target: number; goal_target: number }>) => void;
}

export default function NewCycleModal({ isOpen, onClose, onConfirm }: NewCycleModalProps) {
  const { posList } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [budgets, setBudgets] = useState<Record<string, { monthly_target: number; goal_target: number }>>({});

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const initialBudgets: Record<string, { monthly_target: number; goal_target: number }> = {};
      posList.forEach(p => {
        initialBudgets[p.id] = { monthly_target: p.monthly_target, goal_target: p.goal_target };
      });
      setBudgets(initialBudgets);
    }
  }, [isOpen, posList]);

  if (!isOpen) return null;

  const handleBudgetChange = (id: string, field: "monthly_target" | "goal_target", value: string) => {
    const numValue = parseInt(value.replace(/\D/g, ""), 10) || 0;
    setBudgets(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: numValue
      }
    }));
  };

  const handleConfirmWithNewBudgets = () => {
    onConfirm(budgets);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">Gajian Tiba! 🎉</div>
      
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
              onClick={() => onConfirm()}
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

      {step === 2 && (
        <div>
          <p style={{ marginBottom: "16px", fontSize: "13px", color: "var(--muted)" }}>
            Sesuaikan target budget untuk siklus bulan ini:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxHeight: "60vh", overflowY: "auto", paddingRight: "8px", marginBottom: "20px" }}>
            {posList.filter(p => !p.is_goal && p.name !== "Tabungan").map(p => (
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
            
            {/* Optional: if you want to allow editing goal targets too */}
            {posList.filter(p => p.is_goal && p.name !== "Tabungan").map(p => (
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
            <button className="m-cancel" onClick={() => setStep(1)}>
              Kembali
            </button>
            <button className="m-save" onClick={handleConfirmWithNewBudgets}>
              Mulai Siklus
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
