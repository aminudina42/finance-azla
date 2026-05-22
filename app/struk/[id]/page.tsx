"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { toPng } from "html-to-image";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import ThermalReceipt from "@/components/ThermalReceipt";
import type { ReceiptItem } from "@/lib/types";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function DetailStrukPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const receiptRef = useRef<HTMLDivElement>(null);
  const { logoSettings } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [date, setDate] = useState("");

  const [items, setItems] = useState<Partial<ReceiptItem>[]>([
    { item_name: "", quantity: 1, price: 0, discount: 0 }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: receipt, error: rErr } = await supabase
          .from("receipts")
          .select("*, stores(name, address)")
          .eq("id", id)
          .single();

        if (rErr) throw rErr;

        setStoreName(receipt.stores?.name ?? "");
        setStoreAddress(receipt.stores?.address ?? "");
        setReceiptNumber(receipt.receipt_number);
        setDate(new Date(receipt.created_at).toLocaleString("id-ID"));

        const { data: rItems, error: iErr } = await supabase
          .from("receipt_items")
          .select("*")
          .eq("receipt_id", id)
          .order("sort_order", { ascending: true });

        if (iErr) throw iErr;
        if (rItems && rItems.length > 0) setItems(rItems);
      } catch (e) {
        console.error("Gagal memuat struk", e);
        alert("Gagal memuat struk");
        router.back();
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadData();
  }, [id, router]);

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

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

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

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) =>
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));

  const handleUpdate = async () => {
    if (!storeName.trim() || items.some(i => !i.item_name?.trim())) {
      alert("Mohon isi nama toko dan semua nama barang.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user.id;
      if (!userId) throw new Error("Not logged in");

      // Update store name/address
      const { data: rcpt } = await supabase.from("receipts").select("store_id").eq("id", id).single();
      if (rcpt) {
        await supabase.from("stores").update({ name: storeName, address: storeAddress }).eq("id", rcpt.store_id);
      }

      await supabase.from("receipts").update({ total, updated_at: new Date().toISOString() }).eq("id", id);
      await supabase.from("receipt_items").delete().eq("receipt_id", id);
      await supabase.from("receipt_items").insert(
        items.map((item, idx) => ({
          receipt_id: id,
          item_name: item.item_name,
          quantity: item.quantity || 1,
          price: item.price || 0,
          discount: item.discount || 0,
          sort_order: idx
        }))
      );

      alert("Berhasil diperbarui");
    } catch (e: any) {
      alert("Gagal update struk: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPNG = async () => {
    if (!receiptRef.current) return;
    setIsProcessing(true);
    try {
      const dataUrl = await toPng(receiptRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `Struk_${receiptNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Gagal membuat gambar PNG");
    }
    setIsProcessing(false);
  };

  const handleShareWA = async () => {
    if (!receiptRef.current) return;
    setIsProcessing(true);
    try {
      const blob = await toPng(receiptRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" })
        .then(res => fetch(res).then(r => r.blob()));
      const file = new File([blob], "struk.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Struk Transaksi", files: [file] });
      } else {
        const fileName = `${id}.png`;
        const { error } = await supabase.storage
          .from("receipt-images")
          .upload(`receipts/${fileName}`, file, { contentType: "image/png", upsert: true });
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("receipt-images")
          .getPublicUrl(`receipts/${fileName}`);

        const waUrl = `https://wa.me/?text=${encodeURIComponent("Berikut struk transaksi: " + publicUrl)}`;
        window.open(waUrl, "_blank");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal membagikan ke WA");
    }
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <main className="page active" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "var(--muted)" }}>Memuat data struk...</p>
      </main>
    );
  }

  return (
    <main className="page active" style={{ paddingBottom: "100px" }}>
      <div className="ph ph-border" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button onClick={() => router.push("/struk")} className="ib" style={{ fontSize: "18px" }}>←</button>
        <div>
          <h2>Struk {receiptNumber}</h2>
          <p>Edit atau bagikan struk ini</p>
        </div>
      </div>

      <div className="struk-body">

        {/* ── Preview (logo dari pengaturan app) ── */}
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
          👁 Preview Struk
        </div>
        <div className="thermal-wrap" style={{ marginBottom: "4px" }}>
          <ThermalReceipt
            ref={receiptRef}
            storeName={storeName}
            storeAddress={storeAddress}
            receiptNumber={receiptNumber}
            date={date}
            items={items}
            total={total}
            logoSettings={logoSettings}
          />
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button className="btn-primary"
            style={{ padding: "12px", fontSize: "14px", background: "var(--s2)", color: "var(--text)", border: "1px solid var(--border)" }}
            onClick={() => router.push(`/struk/${id}/print`)}>
            🖨️ Cetak
          </button>
          <button className="btn-primary"
            style={{ padding: "12px", fontSize: "14px", background: "var(--s2)", color: "var(--text)", border: "1px solid var(--border)" }}
            onClick={handleDownloadPNG} disabled={isProcessing}>
            ⬇️ Unduh PNG
          </button>
        </div>
        <button className="btn-primary"
          style={{ padding: "12px", fontSize: "14px", background: "#25D366", color: "#fff" }}
          onClick={handleShareWA} disabled={isProcessing}>
          💬 Bagikan ke WhatsApp
        </button>

        <div style={{ borderTop: "1px dashed var(--border)", margin: "8px 0" }} />

        {/* ── Edit Form Toko ── */}
        <div style={{
          background: "var(--s1)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px"
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--teal)" }}>
            🏪 Data Toko
          </div>
          <div className="fg">
            <div className="fl">Nama Toko</div>
            <input type="text" className="fi" value={storeName} onChange={e => setStoreName(e.target.value)} />
          </div>
          <div className="fg">
            <div className="fl">Alamat Toko</div>
            <textarea className="fi" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} />
          </div>
        </div>

        {/* ── Edit Items ── */}
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
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.5px" }}>ITEM #{idx + 1}</span>
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

        <button className="btn-primary"
          style={{ marginTop: "4px", background: "linear-gradient(135deg, var(--purple), var(--pink))" }}
          onClick={handleUpdate} disabled={isSaving}>
          {isSaving ? "⏳ Menyimpan..." : "💾 Simpan Perubahan"}
        </button>
      </div>
    </main>
  );
}
