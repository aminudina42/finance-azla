"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";

export default function InputPage() {
  const { posList, addTransaction } = useApp();

  const [user, setUser] = useState<"suami" | "istri">("suami");
  const [nominal, setNominal] = useState("");
  const [posId, setPosId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const amount = Number(nominal.replace(/\D/g, ""));
    if (!amount || !posId) return;

    addTransaction(amount, posId, user, keterangan);

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

  return (
    <main id="pg-input" className="page active">
      <div className="ph ph-border">
        <h2>✏️ Input Pengeluaran</h2>
        <p>Catat pengeluaran manual ke pos</p>
      </div>
      <div className="form-body">
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
                .filter((p) => p.name !== "Tabungan")
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
            placeholder="Contoh: Beli beras 5kg di pasar…"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          ></textarea>
        </div>
        <button
          className="btn-primary"
          style={{
            background: "linear-gradient(135deg,var(--pink),#d43a7a)",
          }}
          onClick={handleSave}
        >
          {saved ? "✅ Tersimpan!" : "💾 Simpan Pengeluaran"}
        </button>
      </div>
    </main>
  );
}
