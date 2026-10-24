"use client";

import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/store";
import Modal from "@/components/Modal";
import type { PosConfigItem } from "@/lib/types";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const EMOJI_OPTIONS = [
  "🍚", "🏦", "👨‍💼", "👩", "⚡", "🛒", "🧴", "📱",
  "🏥", "🚗", "🎓", "🍔", "✈️", "🎮", "💊", "👗",
  "🏠", "🐕", "💪", "🎁", "⛽", "🎨", "📚", "🧸", "🏷️"
];

interface NewCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (posConfigs: PosConfigItem[], deletedPosIds: string[]) => void | Promise<void>;
}

export default function NewCycleModal({ isOpen, onClose, onConfirm }: NewCycleModalProps) {
  const { posList, children } = useApp();
  const [step, setStep] = useState<"configure" | "saku_preview">("configure");
  const [items, setItems] = useState<PosConfigItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [pickingEmojiIndex, setPickingEmojiIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("configure");
      setDeletedIds([]);
      setPickingEmojiIndex(null);
      setErrorMsg(null);
      setIsSubmitting(false);

      // Populate with existing pos list
      const initialItems: PosConfigItem[] = posList.map((p) => ({
        id: p.id,
        name: p.name,
        icon: p.icon || "📦",
        monthly_target: p.monthly_target,
        is_goal: p.is_goal,
      }));
      setItems(initialItems);
    }
  }, [isOpen, posList]);

  // Compute Saku transfers preview
  const sakuTransfers = useMemo(() => {
    return children
      .filter((s) => s.type === "linked" && s.linked_pos_id)
      .map((saku) => {
        const linkedPos = posList.find((p) => p.id === saku.linked_pos_id);
        if (!linkedPos) return null;
        const delta = linkedPos.current_balance;
        return { saku, linkedPos, delta };
      })
      .filter(Boolean) as { saku: typeof children[number]; linkedPos: typeof posList[number]; delta: number }[];
  }, [children, posList]);

  const hasSakuTransfers = sakuTransfers.length > 0;

  const totalBudget = useMemo(() => {
    return items
      .filter((item) => !item.is_goal)
      .reduce((sum, item) => sum + (item.monthly_target || 0), 0);
  }, [items]);

  if (!isOpen) return null;

  const handleUpdateName = (idx: number, name: string) => {
    setErrorMsg(null);
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, name } : item)));
  };

  const handleUpdateBudget = (idx: number, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, ""), 10) || 0;
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, monthly_target: numValue } : item))
    );
  };

  const handleUpdateEmoji = (idx: number, icon: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, icon } : item)));
  };

  const handleDeleteItem = (idx: number) => {
    const target = items[idx];
    if (!target) return;
    if (target.name === "Tabungan" || target.is_goal) {
      return; // Tabungan cannot be deleted
    }

    if (target.id && !target.id.startsWith("new_")) {
      setDeletedIds((prev) => [...prev, target.id!]);
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (pickingEmojiIndex === idx) setPickingEmojiIndex(null);
  };

  const handleAddNewPos = () => {
    setErrorMsg(null);
    const newId = "new_" + Date.now();
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        icon: "🏷️",
        monthly_target: 0,
        is_goal: false,
      },
    ]);
  };

  const handleFinalConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(items, deletedIds);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleProceed = () => {
    // Validate empty names
    const emptyPos = items.find((i) => !i.name.trim());
    if (emptyPos) {
      setErrorMsg("Ada nama pos yang masih kosong. Mohon isi semua nama pos.");
      return;
    }

    if (items.length === 0) {
      setErrorMsg("Minimal harus ada satu pos.");
      return;
    }

    if (hasSakuTransfers) {
      setStep("saku_preview");
    } else {
      handleFinalConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isLocked={isSubmitting}>
      {/* Step 1: Mandatory Pos & Budget Configuration */}
      {step === "configure" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                display: "grid",
                placeItems: "center",
                fontSize: "26px",
                margin: "0 auto 10px auto",
                border: "1px solid #bae6fd",
              }}
            >
              🎉
            </div>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: "20px",
                fontWeight: 800,
                color: "var(--navy)",
                margin: "0 0 6px 0",
              }}
            >
              Gajian Tiba! Atur Pos Keuangan
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              Mari tentukan nama pos dan jatah budget untuk kebutuhan bulan ini sebelum memulai siklus baru.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#b91c1c",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                marginBottom: "12px",
                fontWeight: 600,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Pos configuration rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "50vh",
              overflowY: "auto",
              paddingRight: "4px",
              marginBottom: "14px",
            }}
          >
            {items.map((item, idx) => {
              const isProtected = item.name === "Tabungan" || item.is_goal;
              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "12px",
                    borderRadius: "14px",
                    border: "1.5px solid var(--border)",
                    background: isProtected ? "var(--s1, #f8fbff)" : "#ffffff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Emoji Button */}
                    <button
                      type="button"
                      onClick={() => setPickingEmojiIndex(pickingEmojiIndex === idx ? null : idx)}
                      style={{
                        fontSize: "20px",
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        border: "1px solid var(--border)",
                        background: "var(--s2, #f1f5f9)",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                      title="Ubah Icon"
                    >
                      {item.icon || "📦"}
                    </button>

                    {/* Pos Name Input */}
                    <input
                      type="text"
                      placeholder="Nama Pos (misal: Belanja)"
                      value={item.name}
                      onChange={(e) => handleUpdateName(idx, e.target.value)}
                      disabled={item.name === "Tabungan"}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: "1px solid var(--border)",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--navy)",
                        background: item.name === "Tabungan" ? "var(--s2, #f1f5f9)" : "#ffffff",
                      }}
                    />

                    {/* Delete button (or protected label) */}
                    {!isProtected ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          border: "none",
                          background: "#fee2e2",
                          color: "#ef4444",
                          fontSize: "14px",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                        title="Hapus Pos Ini"
                      >
                        🗑️
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          background: "var(--s2)",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        🔒 Tabungan
                      </span>
                    )}
                  </div>

                  {/* Inline Emoji Selector Popup */}
                  {pickingEmojiIndex === idx && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        padding: "8px",
                        background: "var(--s2, #f1f5f9)",
                        borderRadius: "10px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {EMOJI_OPTIONS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            handleUpdateEmoji(idx, em);
                            setPickingEmojiIndex(null);
                          }}
                          style={{
                            fontSize: "18px",
                            padding: "4px 6px",
                            border: item.icon === em ? "1.5px solid var(--teal)" : "1px solid transparent",
                            borderRadius: "6px",
                            background: item.icon === em ? "#e0f7f1" : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Budget Input */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", minWidth: "48px" }}>
                      Budget:
                    </span>
                    <div className="amt-wrap" style={{ flex: 1 }}>
                      <span className="amt-pre" style={{ fontSize: "13px" }}>Rp</span>
                      <input
                        type="tel"
                        className="fi"
                        placeholder="0"
                        value={item.monthly_target > 0 ? item.monthly_target.toLocaleString("id-ID") : ""}
                        onChange={(e) => handleUpdateBudget(idx, e.target.value)}
                        style={{
                          paddingLeft: "36px",
                          fontFamily: "'Fraunces', serif",
                          fontSize: "16px",
                          fontWeight: 800,
                          paddingTop: "6px",
                          paddingBottom: "6px",
                          borderRadius: "8px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add pos button */}
          <button
            type="button"
            onClick={handleAddNewPos}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "12px",
              border: "1.5px dashed #38bdf8",
              background: "#f0f9ff",
              color: "#0284c7",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span>+</span> Tambah Pos Baru
          </button>

          {/* Total Budget Summary Box */}
          <div
            style={{
              background: "var(--s1, #f8fbff)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>Total Rencana Budget:</span>
              <span
                style={{
                  fontFamily: "var(--font-fraunces), serif",
                  fontSize: "16px",
                  fontWeight: 900,
                  color: "var(--navy)",
                }}
              >
                {formatRp(totalBudget)}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
              💡 Sisa saldo pos dari bulan lalu otomatis dipindahkan ke pos Tabungan.
            </div>
          </div>

          <div className="m-actions">
            <button className="m-cancel" onClick={onClose} disabled={isSubmitting}>
              Batal
            </button>
            <button className="m-save" disabled={isSubmitting} onClick={handleProceed}>
              {isSubmitting ? "Memproses..." : hasSakuTransfers ? "Lanjut ke Transfer Saku →" : "Mulai Siklus Baru →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Saku transfer preview (if user has linked Sakus) */}
      {step === "saku_preview" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <h2
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--navy)",
                margin: "0 0 6px 0",
              }}
            >
              Transfer Otomatis ke Saku
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              Sisa saldo pada pos yang terhubung ke Saku akan otomatis disesuaikan:
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {sakuTransfers.map(({ saku, linkedPos, delta }) => {
              const isPositive = delta > 0;
              const isNeutral = delta === 0;
              return (
                <div
                  key={saku.id}
                  style={{
                    padding: "12px 14px",
                    background: isNeutral
                      ? "var(--s2)"
                      : isPositive
                        ? "rgba(0,201,167,.08)"
                        : "rgba(255,79,109,.08)",
                    border: `1px solid ${isNeutral ? "var(--s3)" : isPositive ? "rgba(0,201,167,.25)" : "rgba(255,79,109,.25)"}`,
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                        {saku.icon} {saku.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                        via 🔗 {linkedPos.icon} {linkedPos.name}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: "17px",
                        fontWeight: 900,
                        color: isNeutral ? "var(--muted)" : isPositive ? "var(--teal)" : "var(--red)",
                      }}
                    >
                      {isNeutral ? "±0" : `${isPositive ? "+" : ""}${formatRp(delta)}`}
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                    {isPositive
                      ? `🟢 Surplus — sisa saldo pos akan masuk ke Saku`
                      : isNeutral
                        ? `Saldo pos nol — tidak ada perubahan`
                        : `🔴 Defisit — saldo Saku akan berkurang`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="m-actions">
            <button className="m-cancel" onClick={() => setStep("configure")} disabled={isSubmitting}>
              ← Kembali
            </button>
            <button
              className="m-save"
              disabled={isSubmitting}
              onClick={handleFinalConfirm}
            >
              {isSubmitting ? "Memproses..." : "Mulai Siklus Baru"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
