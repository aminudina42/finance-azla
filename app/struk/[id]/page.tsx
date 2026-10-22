"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { toPng } from "html-to-image";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import ThermalReceipt from "@/components/ThermalReceipt";
import PageHeader from "@/components/PageHeader";
import type { ReceiptItem } from "@/lib/types";

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function DetailStrukPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const receiptRef = useRef<HTMLDivElement>(null);
  const { logoSettings, setIsMutating, setIsNavigating } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [date, setDate] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [qrisActive, setQrisActive] = useState(false);
  const [qrisData, setQrisData] = useState("");
  const [qrisName, setQrisName] = useState("");
  const [isUploadingQris, setIsUploadingQris] = useState(false);

  const [items, setItems] = useState<Partial<ReceiptItem>[]>([
    { item_name: "", quantity: 1, price: 0, cost_price: 0, discount: 0 }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: receipt, error: rErr } = await supabase
          .from("receipts")
          .select("*, stores(name, address, qris_active, qris_data, qris_name)")
          .eq("id", id)
          .single();

        if (rErr) throw rErr;

        setStoreName(receipt.stores?.name ?? "");
        setStoreAddress(receipt.stores?.address ?? "");
        setQrisActive(!!receipt.stores?.qris_active);
        setQrisData(receipt.stores?.qris_data ?? "");
        setQrisName(receipt.stores?.qris_name ?? "");
        setReceiptNumber(receipt.receipt_number);
        setDate(new Date(receipt.created_at).toLocaleString("id-ID"));

        // Fetch creator's name from users table
        if (receipt.user_id) {
          const { data: uData } = await supabase
            .from("users")
            .select("name")
            .eq("id", receipt.user_id)
            .maybeSingle();
          if (uData) setCreatorName(uData.name);
        }

        const { data: rItems, error: iErr } = await supabase
          .from("receipt_items")
          .select("*")
          .eq("receipt_id", id)
          .order("sort_order", { ascending: true });

        if (iErr) throw iErr;
        if (rItems && rItems.length > 0) {
          setItems(rItems.map((it: any) => ({ ...it, cost_price: it.cost_price || 0 })));
        }
      } catch (e) {
        console.error("Gagal memuat transaksi kasir", e);
        alert("Gagal memuat transaksi kasir");
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

  const totalModal = useMemo(() =>
    items.reduce((sum, item) => {
      const q = item.quantity || 1;
      const c = item.cost_price || 0;
      return sum + (c * q);
    }, 0),
  [items]);

  const totalKeuntungan = total - totalModal;
  const marginPersen = total > 0 ? Math.round((totalKeuntungan / total) * 100) : 0;

  const handleAddItem = () =>
    setItems(prev => [...prev, { item_name: "", quantity: 1, price: 0, cost_price: 0, discount: 0 }]);

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

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    if (!allowedTypes[file.type]) {
      alert("Format file tidak didukung! Harap unggah gambar JPG, PNG, atau WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file terlalu besar! Maksimal 2 MB.");
      return;
    }

    // Instant local object URL preview for fallback & speed
    const localUrl = URL.createObjectURL(file);
    setQrisData(localUrl);
    setIsUploadingQris(true);

    try {
      const fileExtension = allowedTypes[file.type];
      const fileName = `qris-${Date.now()}.${fileExtension}`;

      // Upload file directly to Supabase storage bucket 'logos'
      const { error } = await supabase.storage
        .from("logos")
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL from logos bucket
      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      setQrisData(publicUrl);
    } catch (err: any) {
      console.error("Gagal mengupload QRIS:", err);
      alert("Gagal mengupload QRIS ke Supabase Storage: " + err.message);
    } finally {
      setIsUploadingQris(false);
    }
  };

  const handleUpdate = async () => {
    if (!storeName.trim() || items.some(i => !i.item_name?.trim())) {
      alert("Mohon isi nama toko dan semua nama barang.");
      return;
    }

    setIsSaving(true);
    setIsMutating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user.id;
      if (!userId) throw new Error("Not logged in");

      // Update store name/address/QRIS
      const { data: rcpt } = await supabase.from("receipts").select("store_id").eq("id", id).single();
      if (rcpt) {
        await supabase.from("stores").update({
          name: storeName,
          address: storeAddress,
          qris_active: qrisActive,
          qris_data: qrisData,
          qris_name: qrisName
        }).eq("id", rcpt.store_id);
      }

      // Update receipts total and total_cost (with fallback if total_cost column does not exist)
      const { error: rcptErr } = await supabase
        .from("receipts")
        .update({ total, total_cost: totalModal, updated_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (rcptErr && rcptErr.message?.includes("total_cost")) {
        await supabase
          .from("receipts")
          .update({ total, updated_at: new Date().toISOString() })
          .eq("id", id);
      }

      await supabase.from("receipt_items").delete().eq("receipt_id", id);

      const itemsWithCost = items.map((item, idx) => ({
        receipt_id: id,
        item_name: item.item_name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        cost_price: item.cost_price || 0,
        discount: item.discount || 0,
        sort_order: idx
      }));

      const { error: itemErr } = await supabase.from("receipt_items").insert(itemsWithCost as any);
      if (itemErr && itemErr.message?.includes("cost_price")) {
        const itemsNoCost = items.map((item, idx) => ({
          receipt_id: id,
          item_name: item.item_name,
          quantity: item.quantity || 1,
          price: item.price || 0,
          discount: item.discount || 0,
          sort_order: idx
        }));
        await supabase.from("receipt_items").insert(itemsNoCost);
      }

      alert("Transaksi kasir berhasil diperbarui!");
    } catch (e: any) {
      alert("Gagal update transaksi: " + e.message);
    } finally {
      setIsSaving(false);
      setIsMutating(false);
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
    <main className="page active" style={{ paddingBottom: "110px" }}>
      <PageHeader
        title={`Kasir ${receiptNumber}`}
        subtitle="Edit transaksi, pantau laba modal, atau cetak struk"
        backHref="/struk"
        badge={
          creatorName ? (
            <span style={{
              color: creatorName.toLowerCase().includes("suami") ? "var(--teal)" : creatorName.toLowerCase().includes("istri") ? "var(--danger)" : "var(--primary)",
              fontWeight: 750,
              background: creatorName.toLowerCase().includes("suami") ? "rgba(22, 168, 154, 0.12)" : creatorName.toLowerCase().includes("istri") ? "rgba(240, 68, 103, 0.12)" : "rgba(40, 127, 240, 0.12)",
              padding: "2px 8px",
              borderRadius: "6px",
              fontSize: "11px"
            }}>
              👤 {creatorName}
            </span>
          ) : undefined
        }
      />

      <div className="struk-body">

        {/* ── Rekap Transaksi Kasir (Internal) ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "16px",
          borderRadius: "var(--r)",
          background: "linear-gradient(135deg, rgba(0,201,167,.12), rgba(139,114,255,.08))",
          border: "1px solid rgba(0,201,167,.25)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "var(--teal)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📊 Rekap Transaksi Ini</span>
            </div>
            <span style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              background: totalKeuntungan >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: totalKeuntungan >= 0 ? "#10b981" : "#ef4444",
              border: totalKeuntungan >= 0 ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)"
            }}>
              Margin: {marginPersen}%
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "2px" }}>
            <div style={{ background: "var(--surface)", padding: "10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Omset (Jual)</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 900, fontSize: "15px", color: "var(--teal)", marginTop: "2px" }}>
                {formatRp(total)}
              </div>
            </div>

            <div style={{ background: "var(--surface)", padding: "10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Total Modal</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 900, fontSize: "15px", color: "#f59e0b", marginTop: "2px" }}>
                {formatRp(totalModal)}
              </div>
            </div>

            <div style={{ background: "var(--surface)", padding: "10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Keuntungan</div>
              <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 900, fontSize: "15px", color: totalKeuntungan >= 0 ? "#10b981" : "#ef4444", marginTop: "2px" }}>
                {totalKeuntungan >= 0 ? `+${formatRp(totalKeuntungan)}` : formatRp(totalKeuntungan)}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "10px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
            <span>🔒</span>
            <span>Data modal dan keuntungan hanya tercatat untuk rekap pembukuan, tidak dicetak di struk pelanggan.</span>
          </div>
        </div>

        {/* ── Preview (logo dari pengaturan app) ── */}
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
          👁 Preview Struk Pelanggan
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
            qrisActive={qrisActive}
            qrisData={qrisData}
            qrisName={qrisName}
          />
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button className="btn-primary"
            style={{ padding: "12px", fontSize: "14px", background: "var(--s2)", color: "var(--text)", border: "1px solid var(--border)" }}
            onClick={() => { setIsNavigating(true); router.push(`/struk/${id}/print`); }}>
            Cetak
          </button>
          <button className="btn-primary"
            style={{ padding: "12px", fontSize: "14px", background: "var(--s2)", color: "var(--text)", border: "1px solid var(--border)" }}
            onClick={handleDownloadPNG} disabled={isProcessing}>
            Unduh PNG
          </button>
        </div>
        <button className="btn-primary"
          style={{ padding: "12px", fontSize: "14px", background: "#25D366", color: "#fff" }}
          onClick={handleShareWA} disabled={isProcessing}>
          Bagikan ke WhatsApp
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

        {/* ── Form QRIS ── */}
        <div style={{
          background: "var(--s1)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px",
          transition: "all 0.3s ease",
          boxShadow: qrisActive ? "0 0 15px rgba(139, 114, 255, 0.15)" : "none",
          borderColor: qrisActive ? "var(--purple)" : "var(--border)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--purple)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📱 QRIS / Pembayaran Digital</span>
            </div>
            {/* Toggle switch */}
            <label style={{ position: "relative", display: "inline-block", width: "42px", height: "24px", cursor: "pointer" }}>
              <input type="checkbox" checked={qrisActive} onChange={e => setQrisActive(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: qrisActive ? "var(--purple)" : "#333",
                transition: ".3s", borderRadius: "24px"
              }}>
                <span style={{
                  position: "absolute", content: "", height: "18px", width: "18px", left: "3px", bottom: "3px",
                  backgroundColor: "white", transition: ".3s", borderRadius: "50%",
                  transform: qrisActive ? "translateX(18px)" : "translateX(0)"
                }} />
              </span>
            </label>
          </div>
          
          {qrisActive && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", animation: "pageIn .2s ease both" }}>
              <div className="fg">
                <div className="fl">Nama Merchant / Pemilik</div>
                <input type="text" className="fi" placeholder="Contoh: CATAT STORE"
                  value={qrisName} onChange={e => setQrisName(e.target.value)} />
              </div>
              
              <div className="fg">
                <div className="fl">Gambar Lembar QRIS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrisUpload}
                    style={{ display: "none" }}
                    id="qris-image-file-input"
                  />
                  
                  {!qrisData ? (
                    <label
                      htmlFor="qris-image-file-input"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px 14px",
                        borderRadius: "10px",
                        border: "2px dashed var(--border)",
                        cursor: "pointer",
                        background: "var(--s2)",
                        transition: "all 0.2s"
                      }}
                    >
                      <span style={{ fontSize: "24px", marginBottom: "4px" }}>📸</span>
                      <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--purple)" }}>
                        {isUploadingQris ? "⏳ Mengunggah..." : "Pilih Lembar QRIS (PNG/JPG)"}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--muted)", marginTop: "4px", textAlign: "center" }}>
                        Pilih foto atau screenshot lembar QRIS toko Anda.
                      </span>
                    </label>
                  ) : (
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: "12px",
                      background: "var(--s2)",
                      borderRadius: "10px",
                      border: "1px solid var(--border)"
                    }}>
                      <div style={{
                        position: "relative",
                        width: "120px",
                        height: "170px",
                        background: "#fff",
                        padding: "4px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden"
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrisData}
                          alt="QRIS Preview"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                        {isUploadingQris && (
                          <div style={{
                            position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: "11px", fontWeight: "bold"
                          }}>
                            ⏳ Mengunggah...
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "12px" }}>
                        <label
                          htmlFor="qris-image-file-input"
                          style={{
                            flex: 1, padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.05)",
                            border: "1px solid var(--border)", color: "var(--text)", fontSize: "11px",
                            fontWeight: "bold", textAlign: "center", cursor: "pointer"
                          }}
                        >
                          Ganti
                        </label>
                        <button
                          type="button"
                          onClick={() => setQrisData("")}
                          style={{
                            flex: 1, padding: "8px", borderRadius: "8px", background: "rgba(255,79,109,0.1)",
                            border: "1px solid rgba(255,79,109,0.2)", color: "var(--red)", fontSize: "11px",
                            fontWeight: "bold", cursor: "pointer"
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Edit Items ── */}
        <div style={{
          background: "var(--s1)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px"
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--amber)" }}>
            📦 Daftar Barang &amp; Harga Modal
          </div>

          {items.map((item, idx) => {
            const q = item.quantity || 1;
            const p = item.price || 0;
            const d = item.discount || 0;
            const c = item.cost_price || 0;
            const subOmset = (p - d) * q;
            const subModal = c * q;
            const subUntung = subOmset - subModal;

            return (
              <div key={idx} style={{
                background: "var(--s2)", padding: "14px", borderRadius: "var(--r-sm)",
                border: "1.5px solid var(--border)", display: "flex", flexDirection: "column", gap: "10px"
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
                  <input type="text" className="fi" placeholder="Contoh: Beras Ramos 5kg"
                    value={item.item_name || ""} onChange={e => handleItemChange(idx, "item_name", e.target.value)} />
                </div>

                {/* Qty & Harga Jual Satuan */}
                <div style={{ display: "grid", gridTemplateColumns: "85px 1fr", gap: "10px" }}>
                  <div className="fg">
                    <div className="fl">Qty</div>
                    <input type="number" className="fi" min="1"
                      value={item.quantity === 0 ? "" : (item.quantity?.toString() ?? "")}
                      onChange={e => handleNumberChange(idx, "quantity", e.target.value)} />
                  </div>
                  <div className="fg">
                    <div className="fl">Harga Jual (Satuan)</div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--muted)", pointerEvents: "none" }}>Rp</span>
                      <input type="text" className="fi" style={{ paddingLeft: "34px" }}
                        placeholder="0"
                        value={(item.price || 0) === 0 ? "" : (item.price || 0).toLocaleString("id-ID")}
                        onChange={e => handleNumberChange(idx, "price", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Harga Modal Satuan & Diskon */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="fg">
                    <div className="fl" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Harga Modal</span>
                      <span style={{ fontSize: "9px", color: "var(--muted)", fontWeight: "normal" }}>🔒 Internal</span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--muted)", pointerEvents: "none" }}>Rp</span>
                      <input type="text" className="fi" style={{ paddingLeft: "34px", borderColor: item.cost_price ? "rgba(40, 127, 240, 0.4)" : undefined }}
                        placeholder="0"
                        value={(item.cost_price || 0) === 0 ? "" : (item.cost_price || 0).toLocaleString("id-ID")}
                        onChange={e => handleNumberChange(idx, "cost_price", e.target.value)} />
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", marginTop: "2px" }}>
                      Tidak masuk ke struk
                    </div>
                  </div>

                  <div className="fg">
                    <div className="fl">Diskon (Rp)</div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--muted)", pointerEvents: "none" }}>Rp</span>
                      <input type="text" className="fi" style={{ paddingLeft: "34px" }}
                        placeholder="0"
                        value={(item.discount || 0) === 0 ? "" : (item.discount || 0).toLocaleString("id-ID")}
                        onChange={e => handleNumberChange(idx, "discount", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Subtotal & Profit Item Badge */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  padding: "10px 12px",
                  background: "rgba(0, 201, 167, 0.06)",
                  border: "1px solid rgba(0, 201, 167, 0.2)",
                  borderRadius: "var(--r-sm)"
                }}>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Subtotal Jual (Omset)
                    </div>
                    <div style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 900, color: "var(--teal)", fontSize: "14px" }}>
                      {formatRp(subOmset)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: subUntung >= 0 ? "#10b981" : "#ef4444", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {subUntung >= 0 ? "📈 Laba Item" : "📉 Rugi Item"}
                    </div>
                    <div style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: subUntung >= 0 ? "#10b981" : "#ef4444"
                    }}>
                      {subUntung >= 0 ? `+${formatRp(subUntung)}` : formatRp(subUntung)}
                      {c > 0 && (
                        <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted)", marginLeft: "4px" }}>
                          (Modal: {formatRp(subModal)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button className="add-btn" onClick={handleAddItem}>＋ Tambah Barang</button>
        </div>

        <button className="btn-primary"
          style={{ marginTop: "4px", background: "linear-gradient(135deg, var(--purple), var(--pink))" }}
          onClick={handleUpdate} disabled={isSaving}>
          {isSaving ? "Menyimpan..." : "Simpan Perubahan Transaksi Kasir"}
        </button>
      </div>
    </main>
  );
}
