"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";

export default function InputPage() {
  const { posList, addTransaction } = useApp();
  const searchParams = useSearchParams();

  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [user, setUser] = useState<"suami" | "istri">("suami");
  const [nominal, setNominal] = useState("");
  const [posId, setPosId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saved, setSaved] = useState(false);

  // Auto-select pos from URL query param (e.g. /input?pos=p2)
  useEffect(() => {
    const posParam = searchParams.get("pos");
    if (posParam && posList.some((p) => p.id === posParam)) {
      setPosId(posParam);
    }
  }, [searchParams, posList]);

  const handleSave = () => {
    const amount = Number(nominal.replace(/\D/g, ""));
    if (!amount || !posId) return;

    addTransaction(amount, posId, user, keterangan, txType);

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setNominal("");
      setPosId("");
      setKeterangan("");
    }, 2000);
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setNominal("");
      return;
    }
    setNominal(Number(rawValue).toLocaleString("id-ID"));
  };

  const isIncome = txType === "income";

  return (
    <main id="pg-input" className="page active">
      <div className="ph ph-border">
        <h2>{isIncome ? "💰 Input Pemasukan" : "✏️ Input Pengeluaran"}</h2>
        <p>{isIncome ? "Catat pemasukan ke pos keuangan" : "Catat pengeluaran manual ke pos"}</p>
      </div>
      <div className="form-body">
        {/* Type toggle */}
        <div className="fg">
          <div className="fl">Jenis Transaksi</div>
          <div className="type-toggle">
            <div
              className={`type-opt ${txType === "expense" ? "active-out" : ""}`}
              onClick={() => setTxType("expense")}
            >
              📤 Pengeluaran
            </div>
            <div
              className={`type-opt ${txType === "income" ? "active-in" : ""}`}
              onClick={() => setTxType("income")}
            >
              📥 Pemasukan
            </div>
          </div>
        </div>
        <div className="fg">
          <div className="fl">Dicatat oleh</div>
          <div className="user-row">
            <div
              className={`user-chip ${user === "suami" ? "active" : ""}`}
              onClick={() => setUser("suami")}
            >
              👨‍💼 Suami
            </div>
            <div
              className={`user-chip ${user === "istri" ? "active" : ""}`}
              onClick={() => setUser("istri")}
            >
              👩 Istri
            </div>
          </div>
        </div>
        <div className="fg">
          <div className="fl">Nominal</div>
          <div className="amt-wrap">
            <span className="amt-pre">Rp</span>
            <input
              className="amt-input"
              type="tel"
              placeholder="0"
              value={nominal}
              onChange={handleNominalChange}
            />
          </div>
        </div>
        <div className="fg">
          <div className="fl">Pos Keuangan</div>
          <div className="sw">
            <select
              className="fi"
              value={posId}
              onChange={(e) => setPosId(e.target.value)}
            >
              <option value="">— Pilih Pos —</option>
              {posList
                .filter((p) => isIncome ? true : p.name !== "Tabungan")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
            </select>
            <span className="sa">▼</span>
          </div>
        </div>
        <div className="fg">
          <div className="fl">Keterangan</div>
          <textarea
            className="fi"
            placeholder={isIncome ? "Contoh: Bonus proyek freelance…" : "Contoh: Beli beras 5kg di pasar…"}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          ></textarea>
        </div>
        <button
          className="btn-primary"
          style={{
            background: isIncome
              ? "linear-gradient(135deg, var(--teal), #00a88c)"
              : "linear-gradient(135deg, var(--pink), #d43a7a)",
          }}
          onClick={handleSave}
        >
          {saved
            ? "✅ Tersimpan!"
            : isIncome
              ? "💰 Simpan Pemasukan"
              : "💾 Simpan Pengeluaran"}
        </button>
      </div>
    </main>
  );
}
