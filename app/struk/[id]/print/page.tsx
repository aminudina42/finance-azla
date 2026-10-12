"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import ThermalReceipt from "@/components/ThermalReceipt";
import type { ReceiptItem } from "@/lib/types";

export default function PrintStrukPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { logoSettings } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<Partial<ReceiptItem>[]>([]);
  const [qrisActive, setQrisActive] = useState(false);
  const [qrisData, setQrisData] = useState("");
  const [qrisName, setQrisName] = useState("");

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

        const { data: rItems, error: iErr } = await supabase
          .from("receipt_items")
          .select("*")
          .eq("receipt_id", id)
          .order("sort_order", { ascending: true });

        if (iErr) throw iErr;
        if (rItems) setItems(rItems);
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
      return sum + ((q * p) - d);
    }, 0),
  [items]);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fff", color: "#000" }}>
        <p>Memuat struk untuk dicetak...</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "20px" }}>
      <div className="struk-no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => router.back()}
          style={{ padding: "10px 16px", cursor: "pointer", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "6px", fontSize: "13px" }}>
          ← Kembali
        </button>
        <button onClick={() => window.print()}
          style={{ padding: "10px 16px", cursor: "pointer", background: "#25D366", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700 }}>
          🖨️ Cetak Lagi
        </button>
      </div>

      {/* Logo sama dengan pengaturan app */}
      <ThermalReceipt
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
  );
}
