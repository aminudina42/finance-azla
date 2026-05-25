"use client";

import { forwardRef } from "react";
import type { ReceiptItem } from "@/lib/types";

function formatRp(n: number): string {
  return n.toLocaleString("id-ID");
}

interface LogoSettings {
  type: "emoji" | "image";
  emoji: string;
  bg: string;
  image: string;
}

interface ThermalReceiptProps {
  storeName: string;
  storeAddress: string;
  receiptNumber: string;
  date: string;
  items: Partial<ReceiptItem>[];
  total: number;
  logoSettings?: LogoSettings;
}

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ storeName, storeAddress, receiptNumber, date, items, total, logoSettings }, ref) => {
    return (
      <div className="thermal-preview" ref={ref}>
        {/* Header */}
        <div className="thermal-header">

          {/* Logo */}
          {logoSettings && (
            <div style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "10px",
            }}>
              <div style={{
                width: "52px",
                height: "52px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                overflow: "hidden",
                flexShrink: 0,
              }}>
                {logoSettings.type === "image" && logoSettings.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSettings.image}
                    alt="Logo"
                    crossOrigin="anonymous"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  logoSettings.emoji
                )}
              </div>
            </div>
          )}

          <div className="thermal-store">{storeName || "NAMA TOKO"}</div>
          {storeAddress && (
            <div className="thermal-addr">{storeAddress}</div>
          )}
        </div>

        <div className="thermal-divider" />

        {/* Meta */}
        <div className="thermal-row" style={{ marginBottom: "4px" }}>
          <span>{date}</span>
          <span style={{ fontWeight: "bold" }}>{receiptNumber}</span>
        </div>

        <div className="thermal-divider" />

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.length === 0 ? (
            <div style={{ color: "#888", textAlign: "center", padding: "8px 0" }}>
              Belum ada item
            </div>
          ) : (
            items.map((item, idx) => {
              const qty   = item.quantity || 1;
              const price = item.price    || 0;
              const disc  = item.discount || 0;
              const sub   = (price - disc) * qty;

              return (
                <div key={idx}>
                  <div className="thermal-item-name">{item.item_name || "Nama Barang"}</div>
                  <div className="thermal-item-detail">
                    <span>{qty} x Rp{formatRp(price)}</span>
                    <span>Rp{formatRp(sub)}</span>
                  </div>
                  {disc > 0 && (
                    <div className="thermal-item-detail" style={{ color: "#888" }}>
                      <span>Diskon</span>
                      <span>-Rp{formatRp(disc * qty)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="thermal-divider" />

        {/* Total */}
        <div className="thermal-total-row">
          <span>TOTAL</span>
          <span>Rp{formatRp(total)}</span>
        </div>

        <div className="thermal-divider" />

        <div style={{ textAlign: "center", marginTop: "12px", fontSize: "11px", color: "#666" }}>
          ★ Terima Kasih Atas Kunjungan Anda ★
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = "ThermalReceipt";
export default ThermalReceipt;
