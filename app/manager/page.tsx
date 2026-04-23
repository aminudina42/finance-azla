export default function ManagerPage() {
  return (
    <main id="pg-manager" className="page active">
      <div className="ph ph-border">
        <h2>⚙️ Manager Pos</h2>
        <p>Kelola amplop keuangan keluarga</p>
      </div>
      <div className="mgr-body">
        <div className="gajian-card">
          <div className="gc-left">
            <p>Gajian tiap tgl <strong style={{ color: "var(--text)" }}>25</strong></p>
            <h3>🎉 Mulai siklus baru?</h3>
          </div>
          <button className="gc-btn">💰 Gajian Tiba!</button>
        </div>

        <div className="pos-hdr">
          <span>Icon</span><span>Nama</span><span style={{ textAlign: "right" }}>Jatah</span><span>Aksi</span>
        </div>

        <div className="pos-row">
          <div className="pos-em">🍚</div>
          <div><div className="pos-name">Belanja Dapur</div><div className="pos-sub">Kebutuhan harian</div></div>
          <div className="pos-amt">Rp 1.200.000</div>
          <div className="row-acts">
            <div className="ib e">✏️</div>
            <div className="ib d">🗑</div>
          </div>
        </div>

        <div className="pos-row">
          <div className="pos-em">👨‍💼</div>
          <div><div className="pos-name">Suami</div><div className="pos-sub">Uang saku</div></div>
          <div className="pos-amt">Rp 1.000.000</div>
          <div className="row-acts">
            <div className="ib e">✏️</div>
            <div className="ib d">🗑</div>
          </div>
        </div>

        <div className="pos-row">
          <div className="pos-em">👩</div>
          <div><div className="pos-name">Istri</div><div className="pos-sub">Uang saku</div></div>
          <div className="pos-amt">Rp 1.000.000</div>
          <div className="row-acts">
            <div className="ib e">✏️</div>
            <div className="ib d">🗑</div>
          </div>
        </div>

        <div className="pos-row">
          <div className="pos-em">⚡</div>
          <div><div className="pos-name">Listrik</div><div className="pos-sub">Token PLN</div></div>
          <div className="pos-amt">Rp 500.000</div>
          <div className="row-acts">
            <div className="ib e">✏️</div>
            <div className="ib d">🗑</div>
          </div>
        </div>

        <div className="pos-row">
          <div className="pos-em">🏦</div>
          <div><div className="pos-name">Tabungan</div><div className="pos-sub">Akumulasi otomatis</div></div>
          <div className="pos-amt">Rp 2.000.000</div>
          <div className="row-acts">
            <div className="ib e">✏️</div>
            <div className="ib d">🗑</div>
          </div>
        </div>

        <button className="add-btn">＋ Tambah Pos Baru</button>
      </div>
    </main>
  );
}
