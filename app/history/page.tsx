export default function HistoryPage() {
  return (
    <main id="pg-history" className="page active">
      <div className="ph ph-border">
        <h2>📋 Riwayat</h2>
        <p>Semua pengeluaran yang sudah tercatat</p>
      </div>

      <div className="hist-filters">
        <div className="frow">
          <div className="fc cycle-fc active">25 Mar–24 Apr</div>
          <div className="fc cycle-fc">25 Feb–24 Mar</div>
          <div className="fc cycle-fc">25 Jan–24 Feb</div>
        </div>
        <div className="frow">
          <div className="fc active">Semua</div>
          <div className="fc">🍚 Dapur</div>
          <div className="fc">👨‍💼 Suami</div>
          <div className="fc">👩 Istri</div>
          <div className="fc">⚡ Listrik</div>
        </div>
      </div>

      <div className="hist-body">
        <div className="hday">
          <div className="hday-label">Hari ini · 19 Apr 2025</div>
          <div className="hi">
            <div className="hi-ic">🛍️</div>
            <div className="hi-info">
              <div className="hi-desc">Belanja online Shopee</div>
              <div className="hi-meta">🛒 Online Shop · 👩 Istri</div>
            </div>
            <div className="hi-amt">-Rp 89.000</div>
          </div>
        </div>

        <div className="hday">
          <div className="hday-label">Kemarin · 18 Apr 2025</div>
          <div className="hi">
            <div className="hi-ic">⚡</div>
            <div className="hi-info">
              <div className="hi-desc">Token PLN Listrik</div>
              <div className="hi-meta">⚡ Listrik · 👨‍💼 Suami</div>
            </div>
            <div className="hi-amt">-Rp 250.000</div>
          </div>
          <div className="hi">
            <div className="hi-ic">🍱</div>
            <div className="hi-info">
              <div className="hi-desc">Beli beras 5kg + lauk</div>
              <div className="hi-meta">🍚 Dapur · 👩 Istri</div>
            </div>
            <div className="hi-amt">-Rp 120.000</div>
          </div>
        </div>
      </div>
    </main>
  );
}
