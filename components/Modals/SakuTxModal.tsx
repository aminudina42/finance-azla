"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import type { SakuAssetType } from "@/lib/types";
import { formatGoldGram, parseGoldInput, sanitizeGoldInputString } from "@/lib/saku-utils";

interface SakuTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "in" | "out";
  initialAssetType?: SakuAssetType;
  currentGoldBalance?: number;
  onSave: (
    amount: number,
    desc: string,
    type: "in" | "out",
    assetType: SakuAssetType
  ) => Promise<void> | void;
}

export default function SakuTxModal({
  isOpen,
  onClose,
  type,
  initialAssetType = "cash",
  currentGoldBalance = 0,
  onSave,
}: SakuTxModalProps) {
  const [assetType, setAssetType] = useState<SakuAssetType>(initialAssetType);
  const [amountStr, setAmountStr] = useState("");
  const [goldStr, setGoldStr] = useState("");
  const [desc, setDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAssetType(initialAssetType);
      setAmountStr("");
      setGoldStr("");
      setDesc("");
      setErrorMsg("");
      setSubmitting(false);
    }
  }, [isOpen, initialAssetType]);

  const isOut = type === "out";
  const isGold = assetType === "gold";

  const parsedCash = Number(amountStr.replace(/\D/g, ""));
  const parsedGold = parseGoldInput(goldStr);
  const goldExceedsBalance = isGold && isOut && parsedGold > currentGoldBalance + 1e-9;

  const canSubmit = !submitting && (isGold ? parsedGold > 0 && !goldExceedsBalance : parsedCash > 0);

  const handleAssetChange = (next: SakuAssetType) => {
    if (submitting) return;
    setAssetType(next);
    setErrorMsg("");
  };

  const handleSave = async () => {
    if (!canSubmit) return;
    setErrorMsg("");
    setSubmitting(true);
    try {
      const value = isGold ? parsedGold : parsedCash;
      await onSave(value, desc.trim(), type, assetType);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan transaksi.";
      setErrorMsg(message);
      setSubmitting(false);
    }
  };

  const handleAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setAmountStr("");
      return;
    }
    setAmountStr(Number(rawValue).toLocaleString("id-ID"));
  };

  const handleGoldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    setGoldStr(sanitizeGoldInputString(e.target.value));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isLocked={submitting}>
      <div className="mt">
        {isOut
          ? isGold
            ? "Pengeluaran Emas Saku"
            : "Pengeluaran Uang Saku"
          : isGold
            ? "Tabung Emas Saku"
            : "Pemasukan Uang Saku"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* Pemilih Jenis Aset */}
        <div className="fg">
          <div className="fl">Jenis Aset</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              padding: "4px",
              background: "#F5F7FA",
              borderRadius: "12px",
              border: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => handleAssetChange("cash")}
              style={{
                padding: "9px 12px",
                borderRadius: "9px",
                border: assetType === "cash" ? "1px solid #C7E5FB" : "1px solid transparent",
                background: assetType === "cash" ? "#FFFFFF" : "transparent",
                color: assetType === "cash" ? "var(--navy)" : "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 750,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Uang (Rp)
            </button>
            <button
              type="button"
              onClick={() => handleAssetChange("gold")}
              style={{
                padding: "9px 12px",
                borderRadius: "9px",
                border: assetType === "gold" ? "1px solid #EBD9A8" : "1px solid transparent",
                background: assetType === "gold" ? "#FBF3DB" : "transparent",
                color: assetType === "gold" ? "#8A5A00" : "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 750,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Emas (gr)
            </button>
          </div>
        </div>

        {/* Input Nominal Uang atau Berat Emas */}
        {!isGold ? (
          <div className="fg">
            <div className="fl">Nominal</div>
            <div className="amt-wrap">
              <span className="amt-pre">Rp</span>
              <input
                className="amt-input"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                placeholder="0"
                value={amountStr}
                onChange={handleAmtChange}
                style={{ fontSize: "26px" }}
              />
            </div>
          </div>
        ) : (
          <div className="fg">
            <div className="fl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Berat Emas (gram)</span>
              {isOut && (
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#8A5A00", fontVariantNumeric: "tabular-nums" }}>
                  Tersedia: {formatGoldGram(currentGoldBalance)}
                </span>
              )}
            </div>
            <div className="amt-wrap" style={{ position: "relative" }}>
              <input
                className="amt-input"
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                placeholder="0,5"
                value={goldStr}
                onChange={handleGoldChange}
                style={{
                  fontSize: "26px",
                  paddingLeft: "16px",
                  paddingRight: "52px",
                  background: "#FBF3DB55",
                  borderColor: goldExceedsBalance ? "var(--danger)" : "#EBD9A8",
                  color: "#5C3C00",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "#8A5A00",
                  pointerEvents: "none",
                }}
              >
                gr
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "5px" }}>
              Mendukung desimal hingga 4 digit (contoh: 0,05 atau 2,5). Catatan emas terpisah dari saldo uang.
            </div>
            {goldExceedsBalance && (
              <div
                style={{
                  marginTop: "6px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "#FDEBEC",
                  border: "1px solid rgba(240, 68, 103, 0.25)",
                  color: "#9F2F2D",
                  fontSize: "12px",
                  fontWeight: 650,
                }}
              >
                Saldo emas tidak mencukupi (tersedia {formatGoldGram(currentGoldBalance)}). Emas tidak dapat defisit.
              </div>
            )}
          </div>
        )}

        {/* Keterangan */}
        <div className="fg">
          <div className="fl">Keterangan</div>
          <input
            type="text"
            className="fi"
            placeholder={
              isGold
                ? "Contoh: Antam 1 gr, Pegadaian, Emas digital…"
                : "Contoh: Jajan kantin, Beli buku…"
            }
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "9px 12px",
              borderRadius: "10px",
              background: "#FDEBEC",
              border: "1px solid rgba(240, 68, 103, 0.25)",
              color: "#9F2F2D",
              fontSize: "12px",
              fontWeight: 650,
            }}
          >
            {errorMsg}
          </div>
        )}
      </div>

      <div className="m-actions">
        <button className="m-cancel" onClick={onClose} disabled={submitting}>
          Batal
        </button>
        <button
          className="m-save"
          onClick={handleSave}
          disabled={!canSubmit}
          style={{
            opacity: canSubmit ? 1 : 0.5,
            background: isOut
              ? "var(--red)"
              : isGold
                ? "#956400"
                : "var(--teal)",
          }}
        >
          {submitting ? "Memproses..." : "Simpan"}
        </button>
      </div>
    </Modal>
  );
}
