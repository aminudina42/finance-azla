"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import ThermalReceipt from "@/components/ThermalReceipt";
import type { ReceiptItem } from "@/lib/types";

function generateReceiptNumber() {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `INV-${dateStr}-${rand}`;
}

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function NewStrukPage() {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const { logoSettings } = useApp();

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [items, setItems] = useState<Partial<ReceiptItem>[]>([
    { item_name: "", quantity: 1, price: 0, discount: 0 },
  ]);

  // Load draft from localStorage or fallback to last used store
  useEffect(() => {
    const draft = localStorage.getItem("struk_draft");
    if (draft) {
      try {
        const p = JSON.parse(draft);
        if (p.storeName)    setStoreName(p.storeName);
        if (p.storeAddress) setStoreAddress(p.storeAddress);
        if (p.items?.length) setItems(p.items);
      } catch { /* ignore */ }
    } else {
      // Load last used store from localStorage
      const lastStoreName = localStorage.getItem("last_store_name");
      const lastStoreAddress = localStorage.getItem("last_store_address");
      if (lastStoreName) setStoreName(lastStoreName);
      if (lastStoreAddress) setStoreAddress(lastStoreAddress);

      // Fetch from Supabase for sync across devices
      const loadLastStoreFromDb = async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData?.session?.user?.id;
          if (userId) {
            const { data: lastStore } = await supabase
              .from("stores")
              .select("name, address")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastStore) {
              setStoreName(prev => prev || lastStore.name);
              setStoreAddress(prev => prev || lastStore.address);
              localStorage.setItem("last_store_name", lastStore.name);
              localStorage.setItem("last_store_address", lastStore.address);
            }
          }
        } catch { /* ignore */ }
      };
      loadLastStoreFromDb();
    }
    setReceiptNumber(generateReceiptNumber());
  }, []);

  // Autosave draft
  useEffect(() => {
    localStorage.setItem("struk_draft", JSON.stringify({ storeName, storeAddress, items }));
  }, [storeName, storeAddress, items]);

  const total = useMemo(() =>
    items.reduce((sum, item) => {
      const q = item.quantity || 1;
      const p = item.price    || 0;
      const d = item.discount || 0;
      return sum + ((p - d) * q);
    }, 0),
  [items]);

  const handleAddItem = () =>
    setItems(prev => [...prev, { item_name: "", quantity: 1, price: 0, discount: 0 }]);

  const handleRemoveItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx));

  // Clears to 0 if empty
  const handleNumberChange = (idx: number, field: keyof ReceiptItem, valStr: string) => {
    if (field === "quantity") {
      const val = valStr === "" ? 0 : Number(valStr.replace(/\D/g, ""));
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
      return;
    }
    const cleanStr = valStr.replace(/\D/g, "");
    const val = cleanStr === "" ? 0 : Number(cleanStr);
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const handleItemChange = (idx: number, field: keyof ReceiptItem, value: any) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const handleSave = async () => {
    if (!storeName.trim()) { alert("Isi nama toko terlebih dahulu."); return; }
    if (items.some(i => !i.item_name?.trim())) { alert("Semua nama barang wajib diisi."); return; }

    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Silakan login terlebih dahulu");

      // Upsert Store
      let storeId = "";
      const { data: existing } = await supabase
        .from("stores").select("id").eq("name", storeName).eq("user_id", userId).limit(1).single();

      if (existing) {
        storeId = existing.id;
        await supabase.from("stores").update({ address: storeAddress }).eq("id", storeId);
      } else {
        const { data: ns, error: nsErr } = await supabase
          .from("stores").insert({ name: storeName, address: storeAddress, user_id: userId })
          .select("id").single();
        if (nsErr) throw nsErr;
        storeId = ns.id;
      }

      // Insert Receipt
      const { data: receipt, error: rErr } = await supabase
        .from("receipts")
        .insert({ store_id: storeId, user_id: userId, receipt_number: receiptNumber, total })
        .select("id").single();
      if (rErr) throw rErr;

      // Insert Items
      await supabase.from("receipt_items").insert(
        items.map((it, idx) => ({
          receipt_id: receipt.id,
          item_name: it.item_name,
          quantity:  it.quantity  || 1,
          price:     it.price     || 0,
          discount:  it.discount  || 0,
          sort_order: idx,
        }))
      );

      localStorage.removeItem("struk_draft");
      localStorage.setItem("last_store_name", storeName);
      localStorage.setItem("last_store_address", storeAddress);
      router.push(`/struk/${receipt.id}`);
    } catch (e: any) {
      alert("Gagal menyimpan: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="page active" style={{ paddingBottom: "100px" }}>
      {/* Header */}
      <div className="ph ph-border" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button onClick={() => router.back()} className="ib" style={{ fontSize: "18px" }}>←</button>
        <div>
          <h2>✏️ Buat Struk</h2>
          <p>Isi data toko dan barang, lalu simpan</p>
        </div>
      </div>

      <div className="struk-body">

        {/* ── Nomor Struk badge ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 14px", borderRadius: "var(--r-sm)",
          background: "var(--purple-dim)", border: "1px solid rgba(139,114,255,.2)",
        }}>
          <span style={{ fontSize: "16px" }}>🔢</span>
          <div>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted)" }}>Nomor Struk</div>
            <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 800, fontSize: "14px", color: "var(--purple)" }}>{receiptNumber}</div>
          </div>
          <div style={{ fontSize: "9px", color: "var(--muted)", marginLeft: "auto" }}>
            💾 Autosave aktif
          </div>
        </div>

        {/* ── Form Toko ── */}
        <div style={{
          background: "var(--s1)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px"
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--teal)" }}>
            🏪 Data Toko
          </div>
          <div className="fg">
            <div className="fl">Nama Toko</div>
            <input type="text" className="fi" placeholder="Contoh: Toko Berkah Jaya"
              value={storeName} onChange={e => setStoreName(e.target.value)} />
          </div>
          <div className="fg">
            <div className="fl">Alamat Toko</div>
            <textarea className="fi" placeholder="Contoh: Jl. Merdeka No.1, Jakarta"
              value={storeAddress} onChange={e => setStoreAddress(e.target.value)} />
          </div>
        </div>

        {/* ── Form Items ── */}
        <div style={{
          background: "var(--s1)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px"
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--amber)" }}>
            📦 Daftar Barang
          </div>

          {items.map((item, idx) => (
            <div key={idx} style={{
              background: "var(--s2)", padding: "14px", borderRadius: "var(--r-sm)",
              border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "10px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.5px" }}>
                  ITEM #{idx + 1}
                </span>
                {items.length > 1 && (
                  <button onClick={() => handleRemoveItem(idx)}
                    style={{ background: "rgba(255,79,109,.12)", border: "1px solid rgba(255,79,109,.25)", color: "var(--red)", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>
                    Hapus
                  </button>
                )}
              </div>

              <div className="fg">
                <div className="fl">Nama Barang</div>
                <input type="text" className="fi"
                  value={item.item_name || ""} onChange={e => handleItemChange(idx, "item_name", e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px" }}>
                <div className="fg">
                  <div className="fl">Qty</div>
                  <input type="number" className="fi" min="1"
                    value={item.quantity === 0 ? "" : (item.quantity?.toString() ?? "")}
                    onChange={e => handleNumberChange(idx, "quantity", e.target.value)} />
                </div>
                <div className="fg">
                  <div className="fl">Harga Satuan</div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--muted)", pointerEvents: "none" }}>Rp</span>
                    <input type="text" className="fi" style={{ paddingLeft: "34px" }}
                      value={(item.price || 0) === 0 ? "" : (item.price || 0).toLocaleString("id-ID")}
                      onChange={e => handleNumberChange(idx, "price", e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", alignItems: "flex-end" }}>
                <div className="fg">
                  <div className="fl">Diskon (Rp)</div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--muted)", pointerEvents: "none" }}>Rp</span>
                    <input type="text" className="fi" style={{ paddingLeft: "34px" }}
                      value={(item.discount || 0) === 0 ? "" : (item.discount || 0).toLocaleString("id-ID")}
                      onChange={e => handleNumberChange(idx, "discount", e.target.value)} />
                  </div>
                </div>
                <div style={{
                  padding: "10px 14px", background: "var(--teal-dim)", border: "1px solid rgba(0,201,167,.2)",
                  borderRadius: "var(--r-sm)", textAlign: "right"
                }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Subtotal</div>
                  <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 900, color: "var(--teal)", fontSize: "14px" }}>
                    {formatRp(((item.price || 0) - (item.discount || 0)) * (item.quantity || 1))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button className="add-btn" onClick={handleAddItem}>＋ Tambah Barang</button>
        </div>

        {/* ── Total bar ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderRadius: "var(--r)",
          background: "linear-gradient(135deg, rgba(0,201,167,.12), rgba(139,114,255,.08))",
          border: "1px solid rgba(0,201,167,.25)"
        }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted)" }}>Total Keseluruhan</div>
            <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 900, fontSize: "24px", color: "var(--teal)" }}>{formatRp(total)}</div>
          </div>
          <span style={{ fontSize: "30px", opacity: 0.5 }}>🧾</span>
        </div>

        {/* ── Preview Struk (pakai logo dari pengaturan) ── */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "10px" }}>
            👁 Preview Struk
          </div>
          <div className="thermal-wrap">
            <ThermalReceipt
              ref={receiptRef}
              storeName={storeName}
              storeAddress={storeAddress}
              receiptNumber={receiptNumber}
              date={new Date().toLocaleString("id-ID")}
              items={items}
              total={total}
              logoSettings={logoSettings}
            />
          </div>
        </div>

        {/* ── Save Button ── */}
        <button
          className="btn-primary"
          style={{ background: "linear-gradient(135deg, var(--teal), #00a88c)", marginTop: "4px" }}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "⏳ Menyimpan..." : "💾 Simpan Struk"}
        </button>
      </div>
    </main>
  );
}
