"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import SakuTxModal from "@/components/Modals/SakuTxModal";
import AddSakuModal from "@/components/Modals/AddSakuModal";
import EditSakuModal from "@/components/Modals/EditSakuModal";
import type { Child, SakuTxType } from "@/lib/types";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const TX_TYPE_LABELS: Record<SakuTxType, { label: string; color: string; sign: string }> = {
  in:              { label: "Manual",    color: "var(--teal)",   sign: "+" },
  out:             { label: "Manual",    color: "var(--red)",    sign: "-" },
  cycle_surplus:   { label: "Otomatis",  color: "var(--teal)",   sign: "+" },
  cycle_deficit:   { label: "Otomatis",  color: "var(--red)",    sign: "-" },
  withdraw_for_pos:{ label: "Pinjam Pos",color: "var(--red)",    sign: "-" },
  return_to_saku:  { label: "Bayar Balik", color: "var(--teal)", sign: "+" },
};

export default function SakuPage() {
  const {
    children, childTransactions, posList,
    addChildTransaction, addSaku, updateSaku, deleteSaku, addSakuReturnTransaction,
  } = useApp();

  const [selectedSakuId, setSelectedSakuId] = useState("");
  const [showSakuTx, setShowSakuTx] = useState(false);
  const [sakuTxType, setSakuTxType] = useState<"in" | "out">("out");
  const [showAddSaku, setShowAddSaku] = useState(false);
  const [editSaku, setEditSaku] = useState<Child | null>(null);

  // Auto-select first saku
  useEffect(() => {
    if (children.length > 0 && !children.find((c) => c.id === selectedSakuId)) {
      setSelectedSakuId(children[0].id);
    }
  }, [children, selectedSakuId]);

  const selectedSaku = children.find((c) => c.id === selectedSakuId);
  const sakuTxs = childTransactions.filter((t) => t.child_id === selectedSakuId);
  const linkedPos = selectedSaku?.linked_pos_id
    ? posList.find((p) => p.id === selectedSaku.linked_pos_id)
    : null;

  // Stats: total in vs out this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTxs = sakuTxs.filter((t) => new Date(t.created_at) >= monthStart);
  const totalIn  = monthTxs.filter((t) => ["in","cycle_surplus","return_to_saku"].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalOut = monthTxs.filter((t) => ["out","cycle_deficit","withdraw_for_pos"].includes(t.type)).reduce((s, t) => s + t.amount, 0);

  const openSakuTx = (type: "in" | "out") => { setSakuTxType(type); setShowSakuTx(true); };

  const handleSakuTxSave = (amount: number, desc: string, type: "in" | "out") => {
    addChildTransaction(selectedSakuId, type, amount, desc);
  };

  const handleReturnToSaku = () => {
    const amountStr = prompt("Jumlah yang dikembalikan ke Saku (Rp):");
    if (!amountStr) return;
    const amount = Number(amountStr.replace(/\D/g, ""));
    if (amount > 0 && selectedSakuId) {
      addSakuReturnTransaction(selectedSakuId, amount, "Bayar balik ke Saku");
    }
  };

  const isNegative = (selectedSaku?.balance ?? 0) < 0;

  return (
    <main id="pg-saku" className="page active">
      <div className="ph">
        <h2>💰 Saku</h2>
        <p>Tabungan & kantong keuangan pribadi</p>
      </div>

      {/* Saku chips */}
      <div className="child-selector">
        {children.map((saku) => (
          <div
            key={saku.id}
            className={`child-chip ${saku.id === selectedSakuId ? "active" : ""}`}
            onClick={() => setSelectedSakuId(saku.id)}
          >
            <span className="child-chip-icon">{saku.icon}</span>
            <span className="child-chip-name">{saku.name}</span>
            {saku.type === "linked" && (
              <span style={{ fontSize: "9px", color: "var(--purple)", marginLeft: "2px" }}>🔗</span>
            )}
          </div>
        ))}
        <div
          className="child-chip"
          style={{ borderStyle: "dashed" }}
          onClick={() => setShowAddSaku(true)}
        >
          <span className="child-chip-icon">＋</span>
          <span className="child-chip-name">Tambah</span>
        </div>
      </div>

      {/* Empty state */}
      {children.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>💰</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>Belum ada Saku</div>
          <div style={{ fontSize: "13px" }}>
            Tap <strong>＋ Tambah</strong> untuk membuat saku pertama Anda.
          </div>
        </div>
      )}

      {selectedSaku && (
        <div style={{ padding: "14px 20px 0" }}>

          {/* Negative balance warning */}
          {isNegative && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(255,79,109,.1)",
              border: "1px solid rgba(255,79,109,.3)",
              borderRadius: "12px",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{ fontSize: "18px" }}>⚠️</span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)" }}>SALDO NEGATIF</div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Saldo Saku ini negatif. Harap kembalikan saldo secepatnya.
                </div>
              </div>
              <button
                onClick={handleReturnToSaku}
                style={{
                  marginLeft: "auto",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--red)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ↩️ Bayar
              </button>
            </div>
          )}

          {/* Hero card */}
          <div className="saku-hero">
            <div className="sh-label">Saldo Saku</div>
            <div className="sh-name">{selectedSaku.icon} {selectedSaku.name}</div>

            {/* Linked Pos badge */}
            {linkedPos && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                background: "rgba(139,114,255,.15)",
                borderRadius: "20px",
                border: "1px solid rgba(139,114,255,.3)",
                fontSize: "11px",
                color: "var(--purple)",
                fontWeight: 600,
                marginBottom: "10px",
              }}>
                🔗 Terhubung: {linkedPos.icon} {linkedPos.name}
              </div>
            )}

            <div className="sh-bal" style={{ color: isNegative ? "var(--red)" : undefined }}>
              {formatRp(selectedSaku.balance)}
            </div>
            <div className="sh-actions">
              <button className="sh-btn out" onClick={() => openSakuTx("out")}>➖ Pengeluaran</button>
              <button className="sh-btn in" onClick={() => openSakuTx("in")}>➕ Pemasukan</button>
            </div>
            <button
              onClick={() => setEditSaku(selectedSaku)}
              style={{
                marginTop: "10px",
                padding: "6px 16px",
                borderRadius: "8px",
                border: "1px solid var(--s3)",
                background: "transparent",
                color: "var(--muted)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ✏️ Edit Saku
            </button>
          </div>
        </div>
      )}

      {/* Ringkasan bulan ini */}
      {selectedSaku && (
        <div className="saku-section">
          <div className="sec-label">Ringkasan Bulan Ini</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <div style={{ background: "rgba(255,79,109,.08)", border: "1px solid rgba(255,79,109,.2)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--red)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "4px" }}>Keluar</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: "20px", fontWeight: 900, color: "var(--red)" }}>{formatRp(totalOut)}</div>
            </div>
            <div style={{ background: "rgba(0,201,167,.08)", border: "1px solid rgba(0,201,167,.2)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--teal)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "4px" }}>Masuk</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: "20px", fontWeight: 900, color: "var(--teal)" }}>{formatRp(totalIn)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat transaksi */}
      {selectedSaku && (
        <div className="saku-section">
          <div className="sec-label">Riwayat Transaksi</div>
          {sakuTxs.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
              Belum ada transaksi.
            </p>
          )}
          {sakuTxs.map((tx) => {
            const meta = TX_TYPE_LABELS[tx.type] ?? { label: tx.type, color: "var(--muted)", sign: "" };
            const isPositive = ["in","cycle_surplus","return_to_saku"].includes(tx.type);
            const dateStr = new Date(tx.created_at).toLocaleDateString("id-ID", {
              day: "numeric", month: "short", year: "numeric",
            });
            return (
              <div className="sk-item" key={tx.id}>
                <div className={`sk-dot ${isPositive ? "in" : "out"}`}>{tx.icon}</div>
                <div className="sk-info">
                  <div className="sk-desc">{tx.description}</div>
                  <div className="sk-date" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span>{dateStr}</span>
                    <span style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "6px",
                      background: `${meta.color}22`,
                      color: meta.color,
                      fontWeight: 700,
                    }}>
                      {meta.label}
                    </span>
                  </div>
                </div>
                <div style={{ color: meta.color, fontFamily: "'Fraunces',serif", fontSize: "15px", fontWeight: 900, textAlign: "right" }}>
                  {meta.sign}{formatRp(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <SakuTxModal
        isOpen={showSakuTx}
        onClose={() => setShowSakuTx(false)}
        type={sakuTxType}
        onSave={handleSakuTxSave}
      />
      <AddSakuModal
        isOpen={showAddSaku}
        onClose={() => setShowAddSaku(false)}
        onSave={(name, icon, bal, type, linkedPosId) => addSaku(name, icon, bal, type, linkedPosId)}
      />
      <EditSakuModal
        isOpen={!!editSaku}
        onClose={() => setEditSaku(null)}
        saku={editSaku}
        onSave={(id, name, icon, type, linkedPosId) => updateSaku(id, name, icon, type, linkedPosId)}
        onDelete={(id) => { deleteSaku(id); setSelectedSakuId(""); }}
      />
    </main>
  );
}
