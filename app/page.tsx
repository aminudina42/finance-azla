import Link from "next/link";

export default function Home() {
  return (
    <main id="pg-dash" className="page active">
      <div className="dash-top">
        <div className="dash-top-left">
          <h1>Dompet Pintar 💳</h1>
          <p>Selamat datang kembali!</p>
        </div>
      </div>

      {/* Cycle nav */}
      <div className="cycle-nav">
        <div className="cyc-arr">‹</div>
        <div className="cyc-btn" id="cycleLabel">25 Mar – 24 Apr 2025</div>
        <div className="cyc-arr">›</div>
      </div>

      {/* Budget hero */}
      <div style={{ padding: "12px 20px 0" }}>
        <div className="budget-hero">
          <div className="bh-label">Sisa Budget Siklus Ini</div>
          <div className="bh-amount">Rp 4.280.000</div>
          <div className="bh-meta">
            <span>💼 Total Rp 8.500.000</span>
            <span>📅 Hari ke-12</span>
          </div>
        </div>
      </div>

      {/* Gajian setting */}
      <div className="gajian-row">
        <span>Gajian tiap tgl <strong>25</strong></span>
        <div className="gajian-chip">⚙️ Atur Tgl Gajian</div>
      </div>

      {/* Envelopes */}
      <div className="env-wrap">
        <div className="sec-label">Pos Keuangan</div>
        <div className="env-grid">

          <div className="ec wide g">
            <span className="ec-icon">🏦</span>
            <div className="ec-left">
              <div className="ec-name">Tabungan</div>
              <div className="ec-amt">Rp 2.450.000</div>
              <div className="ec-bar"><div className="ec-fill" style={{ width: "82%" }}></div></div>
              <div className="ec-pct">Akumulasi +Rp 320.000</div>
            </div>
          </div>

          <div className="ec g">
            <span className="ec-icon">🍚</span>
            <div className="ec-name">Belanja Dapur</div>
            <div className="ec-amt">Rp 780.000</div>
            <div className="ec-bar"><div className="ec-fill" style={{ width: "65%" }}></div></div>
            <div className="ec-pct">65% tersisa</div>
          </div>

          <div className="ec g">
            <span className="ec-icon">👨‍💼</span>
            <div className="ec-name">Suami</div>
            <div className="ec-amt">Rp 600.000</div>
            <div className="ec-bar"><div className="ec-fill" style={{ width: "60%" }}></div></div>
            <div className="ec-pct">60% tersisa</div>
          </div>

          <div className="ec y">
            <span className="ec-icon">👩</span>
            <div className="ec-name">Istri</div>
            <div className="ec-amt">Rp 150.000</div>
            <div className="ec-bar"><div className="ec-fill" style={{ width: "15%" }}></div></div>
            <div className="ec-pct">15% tersisa</div>
          </div>

          <div className="ec g">
            <span className="ec-icon">⚡</span>
            <div className="ec-name">Listrik</div>
            <div className="ec-amt">Rp 350.000</div>
            <div className="ec-bar"><div className="ec-fill" style={{ width: "70%" }}></div></div>
            <div className="ec-pct">70% tersisa</div>
          </div>

          <div className="ec r">
            <span className="ec-icon">🛒</span>
            <div className="ec-name">Online Shop</div>
            <div className="ec-amt">-Rp 45.000</div>
            <div className="ec-bar"><div className="ec-fill" style={{ width: "100%" }}></div></div>
            <div className="ec-pct">⚠️ Overbudget!</div>
          </div>

          <div className="ec g">
            <span className="ec-icon">🧴</span>
            <div className="ec-name">Sabun</div>
            <div className="ec-amt">Rp 200.000</div>
            <div className="ec-bar"><div className="ec-fill" style={{ width: "80%" }}></div></div>
            <div className="ec-pct">80% tersisa</div>
          </div>

          <div className="ec y">
            <span className="ec-icon">📱</span>
            <div className="ec-name">Tagihan</div>
            <div className="ec-amt">Rp 120.000</div>
            <div className="ec-bar"><div className="ec-fill" style={{ width: "20%" }}></div></div>
            <div className="ec-pct">20% tersisa</div>
          </div>

        </div>
      </div>

      <Link href="/input" className="fab flex items-center justify-center no-underline">
        ＋
      </Link>
    </main>
  );
}
