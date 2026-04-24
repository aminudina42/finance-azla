"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import SakuTxModal from "@/components/Modals/SakuTxModal";
import AddChildModal from "@/components/Modals/AddChildModal";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function SakuPage() {
  const { children, childTransactions, addChild, addChildTransaction } = useApp();

  const [selectedChildId, setSelectedChildId] = useState("");
  const [showSakuTx, setShowSakuTx] = useState(false);
  const [sakuTxType, setSakuTxType] = useState<"in" | "out">("out");
  const [showAddChild, setShowAddChild] = useState(false);

  // Auto-select first child or newly added child
  useEffect(() => {
    if (children.length > 0 && !children.find((c) => c.id === selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const childTxs = childTransactions.filter((t) => t.child_id === selectedChildId);
  const totalIn = childTxs.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = childTxs.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);

  const openSakuTx = (type: "in" | "out") => {
    setSakuTxType(type);
    setShowSakuTx(true);
  };

  const handleSakuTxSave = (amount: number, desc: string, type: "in" | "out") => {
    addChildTransaction(selectedChildId, type, amount, desc);
  };

  const handleAddChild = (name: string, icon: string, initialBalance: number) => {
    addChild(name, icon, initialBalance);
  };

  return (
    <main id="pg-saku" className="page active">
      <div className="ph">
        <h2>🧒 Saku Anak</h2>
        <p>Tabungan &amp; pengeluaran tiap anak</p>
      </div>

      <div className="saku-note" style={{ marginBottom: "14px" }}>
        💡 Saku anak bersifat <strong>independen</strong> — tidak terkait siklus
        gajian. Catat pemasukan &amp; pengeluaran kapan saja.
      </div>

      {/* Child selector */}
      <div className="child-selector">
        {children.map((child) => (
          <div
            key={child.id}
            className={`child-chip ${child.id === selectedChildId ? "active" : ""}`}
            onClick={() => setSelectedChildId(child.id)}
          >
            <span className="child-chip-icon">{child.icon}</span>
            <span className="child-chip-name">{child.name}</span>
          </div>
        ))}
        <div
          className="child-chip"
          style={{ borderStyle: "dashed" }}
          onClick={() => setShowAddChild(true)}
        >
          <span className="child-chip-icon">＋</span>
          <span className="child-chip-name">Tambah</span>
        </div>
      </div>

      {/* Empty state */}
      {children.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🧒</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>Belum ada anak</div>
          <div style={{ fontSize: "13px" }}>Tap tombol <strong>＋ Tambah</strong> di atas untuk menambahkan anak pertama.</div>
        </div>
      )}
      {selectedChild && (
        <div style={{ padding: "14px 20px 0" }}>
          <div className="saku-hero">
            <div className="sh-label">Saldo Saku</div>
            <div className="sh-name">
              {selectedChild.icon} {selectedChild.name}
            </div>
            <div className="sh-bal">{formatRp(selectedChild.balance)}</div>
            <div className="sh-actions">
              <button className="sh-btn out" onClick={() => openSakuTx("out")}>
                ➖ Pengeluaran
              </button>
              <button className="sh-btn in" onClick={() => openSakuTx("in")}>
                ➕ Pemasukan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan */}
      <div className="saku-section">
        <div className="sec-label">Ringkasan Bulan Ini</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              background: "rgba(255,79,109,.08)",
              border: "1px solid rgba(255,79,109,.2)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "var(--red)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".8px",
                marginBottom: "4px",
              }}
            >
              Keluar
            </div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--red)",
              }}
            >
              {formatRp(totalOut)}
            </div>
          </div>
          <div
            style={{
              background: "rgba(0,201,167,.08)",
              border: "1px solid rgba(0,201,167,.2)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "var(--teal)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".8px",
                marginBottom: "4px",
              }}
            >
              Masuk
            </div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--teal)",
              }}
            >
              {formatRp(totalIn)}
            </div>
          </div>
        </div>
      </div>

      {/* Tx list */}
      <div className="saku-section">
        <div className="sec-label">Riwayat Transaksi</div>
        {childTxs.length === 0 && (
          <p
            style={{
              color: "var(--muted)",
              fontSize: "13px",
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            Belum ada transaksi untuk anak ini.
          </p>
        )}
        {childTxs.map((tx) => {
          const dateStr = new Date(tx.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          return (
            <div className="sk-item" key={tx.id}>
              <div className={`sk-dot ${tx.type}`}>{tx.icon}</div>
              <div className="sk-info">
                <div className="sk-desc">{tx.description}</div>
                <div className="sk-date">{dateStr}</div>
              </div>
              <div className={tx.type === "in" ? "sk-amt-in" : "sk-amt-out"}>
                {tx.type === "in" ? "+" : "-"}
                {formatRp(tx.amount)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <SakuTxModal
        isOpen={showSakuTx}
        onClose={() => setShowSakuTx(false)}
        type={sakuTxType}
        onSave={handleSakuTxSave}
      />
      <AddChildModal
        isOpen={showAddChild}
        onClose={() => setShowAddChild(false)}
        onSave={handleAddChild}
      />
    </main>
  );
}
