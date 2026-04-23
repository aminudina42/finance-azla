export default function InputPage() {
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
            <div className="user-chip active">👨‍💼 Suami</div>
            <div className="user-chip">👩 Istri</div>
          </div>
        </div>
        <div className="fg">
          <div className="fl">Nominal</div>
          <div className="amt-wrap">
            <span className="amt-pre">Rp</span>
            <input className="amt-input" type="number" placeholder="0" />
          </div>
        </div>
        <div className="fg">
          <div className="fl">Pos Keuangan</div>
          <div className="sw">
            <select className="fi">
              <option value="">— Pilih Pos —</option>
              <option>🍚 Belanja Dapur</option>
              <option>👨‍💼 Suami</option>
              <option>👩 Istri</option>
              <option>⚡ Listrik</option>
              <option>🛒 Online Shop</option>
              <option>🧴 Sabun</option>
              <option>📱 Tagihan</option>
              <option>🏦 Tabungan</option>
            </select>
            <span className="sa">▼</span>
          </div>
        </div>
        <div className="fg">
          <div className="fl">Keterangan</div>
          <textarea className="fi" placeholder="Contoh: Beli beras 5kg di pasar…"></textarea>
        </div>
        <button className="btn-primary" style={{ background: "linear-gradient(135deg,var(--pink),#d43a7a)" }}>
          💾 Simpan Pengeluaran
        </button>
      </div>
    </main>
  );
}
