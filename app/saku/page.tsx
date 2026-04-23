export default function SakuPage() {
  return (
    <main id="pg-saku" className="page active">
      <div className="ph">
        <h2>🧒 Saku Anak</h2>
        <p>Tabungan & pengeluaran tiap anak</p>
      </div>

      <div className="saku-note" style={{ marginBottom: "14px" }}>
        💡 Saku anak bersifat <strong>independen</strong> — tidak terkait siklus gajian. Catat pemasukan & pengeluaran kapan saja.
      </div>

      {/* Child selector */}
      <div className="child-selector">
        <div className="child-chip active">
          <span className="child-chip-icon">👦</span>
          <span className="child-chip-name">Raka</span>
        </div>
        <div className="child-chip">
          <span className="child-chip-icon">👧</span>
          <span className="child-chip-name">Nisa</span>
        </div>
        <div className="child-chip" style={{ borderStyle: "dashed" }}>
          <span className="child-chip-icon">＋</span>
          <span className="child-chip-name">Tambah</span>
        </div>
      </div>

      {/* Balance hero */}
      <div style={{ padding: "14px 20px 0" }}>
        <div className="saku-hero">
          <div className="sh-label">Saldo Saku</div>
          <div className="sh-name">👦 Raka</div>
          <div className="sh-bal">Rp 185.000</div>
          <div className="sh-actions">
            <button className="sh-btn out">➖ Pengeluaran</button>
            <button className="sh-btn in">➕ Pemasukan</button>
          </div>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="saku-section">
        <div className="sec-label">Ringkasan Bulan Ini</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "rgba(255,79,109,.08)", border: "1px solid rgba(255,79,109,.2)", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "11px", color: "var(--red)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "4px" }}>Keluar</div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: "20px", fontWeight: 900, color: "var(--red)" }}>Rp 65.000</div>
          </div>
          <div style={{ background: "rgba(0,201,167,.08)", border: "1px solid rgba(0,201,167,.2)", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "11px", color: "var(--teal)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "4px" }}>Masuk</div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: "20px", fontWeight: 900, color: "var(--teal)" }}>Rp 150.000</div>
          </div>
        </div>
      </div>

      {/* Tx list */}
      <div className="saku-section">
        <div className="sec-label">Riwayat Transaksi</div>

        <div className="sk-item">
          <div className="sk-dot in">🎁</div>
          <div className="sk-info">
            <div className="sk-desc">Uang jajan dari Oma</div>
            <div className="sk-date">19 Apr 2025</div>
          </div>
          <div className="sk-amt-in">+Rp 50.000</div>
        </div>

        <div className="sk-item">
          <div className="sk-dot out">🍦</div>
          <div className="sk-info">
            <div className="sk-desc">Beli es krim di sekolah</div>
            <div className="sk-date">18 Apr 2025</div>
          </div>
          <div className="sk-amt-out">-Rp 15.000</div>
        </div>

        <div className="sk-item">
          <div className="sk-dot in">💰</div>
          <div className="sk-info">
            <div className="sk-desc">Uang saku mingguan</div>
            <div className="sk-date">15 Apr 2025</div>
          </div>
          <div className="sk-amt-in">+Rp 100.000</div>
        </div>

      </div>
    </main>
  );
}
