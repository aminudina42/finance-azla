"use client";

import { forwardRef, useState, useEffect } from "react";
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
  qrisActive?: boolean;
  qrisData?: string;
  qrisName?: string;
}

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ storeName, storeAddress, receiptNumber, date, items, total, logoSettings, qrisActive, qrisData, qrisName }, ref) => {
    const [logoBase64, setLogoBase64] = useState<string>("");
    const [qrisBase64, setQrisBase64] = useState<string>("");

    useEffect(() => {
      if (logoSettings?.type === "image" && logoSettings.image) {
        // Convert to Base64 to bypass iOS Safari CORS / SVG foreignObject limitations
        // when rendering canvas/PNG from DOM elements
        fetch(logoSettings.image)
          .then((res) => res.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              setLogoBase64(reader.result as string);
            };
            reader.readAsDataURL(blob);
          })
          .catch((err) => {
            console.error("Gagal men-convert logo ke base64:", err);
            // Fallback to original image URL
            setLogoBase64(logoSettings.image);
          });
      } else {
        setLogoBase64("");
      }
    }, [logoSettings?.type, logoSettings?.image]);

    useEffect(() => {
      if (qrisActive && qrisData) {
        // Fetch the uploaded QRIS image directly and convert to Base64 to prevent Safari CORS issues
        fetch(qrisData)
          .then((res) => res.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              setQrisBase64(reader.result as string);
            };
            reader.readAsDataURL(blob);
          })
          .catch((err) => {
            console.error("Gagal men-convert QRIS ke base64:", err);
            // Fallback to original image URL
            setQrisBase64(qrisData);
          });
      } else {
        setQrisBase64("");
      }
    }, [qrisActive, qrisData]);

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
                {logoSettings.type === "image" && (logoBase64 || logoSettings.image) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoBase64 || logoSettings.image}
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

        {/* QRIS Section */}
        {qrisActive && qrisData && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "12px",
            marginBottom: "4px"
          }}>
            <div className="thermal-divider" style={{ width: "100%", margin: "4px 0 10px 0" }} />
            <div style={{
              fontSize: "10px",
              fontWeight: "bold",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "6px",
              color: "#333",
              textAlign: "center"
            }}>
              ▲ PINDAI UNTUK MEMBAYAR ▲
            </div>
            
            {/* QRIS Image Container - styled for vertical portrait QRIS sheets */}
            <div style={{
              width: "100%",
              maxWidth: "220px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
              padding: "6px",
              border: "1px solid #ddd",
              marginBottom: "6px"
            }}>
              {(qrisBase64 || qrisData) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrisBase64 || qrisData}
                  alt="QRIS"
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: "auto", maxHeight: "280px", objectFit: "contain" }}
                />
              )}
            </div>
            
            {/* QRIS Merchant/Owner Name */}
            {qrisName && (
              <div style={{
                fontSize: "10px",
                fontWeight: "bold",
                textTransform: "uppercase",
                color: "#111",
                textAlign: "center"
              }}>
                A/N: {qrisName}
              </div>
            )}
            
            <div style={{
              fontSize: "9px",
              color: "#666",
              marginTop: "2px",
              textAlign: "center"
            }}>
              Mendukung QRIS & E-Wallet
            </div>
          </div>
        )}

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
