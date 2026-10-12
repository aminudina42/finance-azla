"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import type { Child } from "@/lib/types";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

interface SakuBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Total pengeluaran yang sudah diinput user */
  totalExpense: number;
  /** Saldo pos saat ini (bisa negatif jika overbudget) */
  posBalance: number;
  /** List saku yang bisa dipilih */
  sakuList: Child[];
  /** Callback saat user konfirmasi pinjam */
  onConfirm: (sakuId: string, sakuWithdrawAmount: number) => void;
}

export default function SakuBorrowModal({
  isOpen,
  onClose,
  totalExpense,
  posBalance,
  sakuList,
  onConfirm,
}: SakuBorrowModalProps) {
  const shortfall = Math.max(0, totalExpense - posBalance);

  const [selectedSakuId, setSelectedSakuId] = useState("");
  const [withdrawStr, setWithdrawStr] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSakuId(sakuList[0]?.id ?? "");
      setWithdrawStr(shortfall > 0 ? shortfall.toLocaleString("id-ID") : "");
      setShowConfirm(false);
    }
  }, [isOpen, sakuList, shortfall]);

  const withdrawAmount = Number(withdrawStr.replace(/\D/g, "")) || 0;
  const selectedSaku = sakuList.find((s) => s.id === selectedSakuId);
  const afterBalance = (selectedSaku?.balance ?? 0) - withdrawAmount;
  const isNegativeAfter = afterBalance < 0;

  const handleWithdrawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) { setWithdrawStr(""); return; }
    setWithdrawStr(Number(rawValue).toLocaleString("id-ID"));
  };

  const handleProceed = () => {
    if (!selectedSakuId || withdrawAmount <= 0) return;
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    onConfirm(selectedSakuId, withdrawAmount);
    onClose();
  };

  const availableSaku = sakuList.filter((s) => s.balance !== 0 || true); // show all saku

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">🏧 Pinjam dari Saku</div>

      {!showConfirm ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Info shortfall */}
          {shortfall > 0 && (
            <div style={{
              padding: "12px 14px",
              background: "rgba(255,79,109,.1)",
              borderRadius: "12px",
              border: "1px solid rgba(255,79,109,.25)",
            }}>
              <div style={{ fontSize: "12px", color: "var(--red)", fontWeight: 700, marginBottom: "4px" }}>
                ⚠️ KEKURANGAN SALDO POS
              </div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: "22px", fontWeight: 900, color: "var(--red)" }}>
                {formatRp(shortfall)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                Saldo pos tidak mencukupi untuk pengeluaran {formatRp(totalExpense)}
              </div>
            </div>
          )}

          {/* Pilih Saku */}
          <div className="fg">
            <div className="fl">Pilih Saku</div>
            <div className="sw">
              <select
                className="fi"
                value={selectedSakuId}
                onChange={(e) => setSelectedSakuId(e.target.value)}
              >
                {availableSaku.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name} — {formatRp(s.balance)}
                  </option>
                ))}
              </select>
              <span className="sa">▼</span>
            </div>
          </div>

          {/* Nominal penarikan */}
          <div className="fg">
            <div className="fl">Nominal Tarik dari Saku</div>
            <div className="amt-wrap">
              <span className="amt-pre">Rp</span>
              <input
                type="tel"
                className="fi"
                style={{ paddingLeft: "42px", fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 900 }}
                placeholder="0"
                value={withdrawStr}
                onChange={handleWithdrawChange}
              />
            </div>
          </div>

          {/* Preview saldo setelah */}
          {selectedSaku && withdrawAmount > 0 && (
            <div style={{
              padding: "12px 14px",
              background: isNegativeAfter ? "rgba(255,79,109,.08)" : "rgba(0,201,167,.08)",
              borderRadius: "12px",
              border: `1px solid ${isNegativeAfter ? "rgba(255,79,109,.2)" : "rgba(0,201,167,.2)"}`,
            }}>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                Saldo {selectedSaku.icon} {selectedSaku.name} setelah tarik:
              </div>
              <div style={{
                fontFamily: "'Fraunces',serif",
                fontSize: "20px",
                fontWeight: 900,
                color: isNegativeAfter ? "var(--red)" : "var(--teal)",
              }}>
                {formatRp(afterBalance)}
              </div>
              {isNegativeAfter && (
                <div style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>
                  ⚠️ Saldo Saku akan negatif — perlu dikembalikan kemudian
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Konfirmasi final */
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
          <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px", color: "var(--text)" }}>
            Konfirmasi Pinjam Saku
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: "1.6", marginBottom: "16px" }}>
            Anda akan menarik <strong style={{ color: "var(--text)" }}>{formatRp(withdrawAmount)}</strong> dari{" "}
            <strong style={{ color: "var(--text)" }}>{selectedSaku?.icon} {selectedSaku?.name}</strong>.<br />
            <br />
            <span style={{ color: "var(--amber)", fontWeight: 600 }}>
              Anda harus mengembalikan saldo Saku ini di kemudian hari.
            </span>
          </div>
        </div>
      )}

      <div className="m-actions">
        {!showConfirm ? (
          <>
            <button className="m-cancel" onClick={onClose}>Lewati</button>
            <button
              className="m-save"
              onClick={handleProceed}
              style={{
                opacity: (!selectedSakuId || withdrawAmount <= 0) ? 0.5 : 1,
                background: "linear-gradient(135deg, var(--amber), #e09000)",
              }}
              disabled={!selectedSakuId || withdrawAmount <= 0}
            >
              Lanjutkan →
            </button>
          </>
        ) : (
          <>
            <button className="m-cancel" onClick={() => setShowConfirm(false)}>Kembali</button>
            <button
              className="m-save"
              onClick={handleConfirm}
              style={{ background: "linear-gradient(135deg, var(--red), #c0344e)" }}
            >
              ✅ Ya, Tarik Saku
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
