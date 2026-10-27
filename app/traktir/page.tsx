"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Skeleton from "@/components/Skeleton";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: "7px 14px",
        borderRadius: "8px",
        background: copied ? "var(--success, #16a89a)" : "var(--primary, #287ff0)",
        color: "#ffffff",
        border: "none",
        fontWeight: 700,
        fontSize: "12px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        flexShrink: 0,
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
      }}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "12px", height: "12px" }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Tersalin!
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "12px", height: "12px" }}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Salin
        </>
      )}
    </button>
  );
}

export default function TraktirPage() {
  const { developerSettings, isLoading } = useApp();
  const [qrisImgError, setQrisImgError] = useState(false);

  const hasQris = developerSettings.show_qris && developerSettings.qris_url && !qrisImgError;
  const activeBanks = developerSettings.banks.filter((b) => b.enabled && b.account.trim() !== "");
  const hasContent = hasQris || activeBanks.length > 0;

  return (
    <main id="pg-traktir" className="page active" style={{ paddingBottom: "110px" }}>
      <PageHeader
        title="Traktir Dev ☕"
        subtitle="Support pengembang CatatKeluarga"
        backHref="/"
      />

      <div style={{ padding: "0 16px" }}>

        {/* ── Hero Card ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 60%, #fde68a 100%)",
            borderRadius: "20px",
            padding: "24px 20px",
            marginBottom: "20px",
            border: "1px solid #fcd34d",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(245, 158, 11, 0.12)",
          }}
        >
          <div style={{ fontSize: "56px", marginBottom: "10px", lineHeight: 1 }}>☕</div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 850,
              color: "#78350f",
              margin: "0 0 8px",
              letterSpacing: "-0.3px",
            }}
          >
            Traktir Kopi Developer
          </h2>
          <div
            style={{
              fontSize: "13px",
              color: "#92400e",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: "280px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {isLoading ? (
              <Skeleton width="240px" height="40px" borderRadius="6px" as="span" style={{ display: "inline-block" }} />
            ) : (
              developerSettings.message || "Terima kasih sudah menggunakan CatatKeluarga! ❤️"
            )}
          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Skeleton width="100%" height="280px" borderRadius="16px" />
            <Skeleton width="100%" height="80px" borderRadius="14px" />
            <Skeleton width="100%" height="80px" borderRadius="14px" />
          </div>
        )}

        {/* ── Empty State ── */}
        {!isLoading && !hasContent && (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              borderRadius: "16px",
              background: "var(--s2, #f8fafc)",
              border: "1.5px dashed var(--border)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🙏</div>
            <p style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 600, margin: 0 }}>
              Metode pembayaran belum dikonfigurasi
            </p>
            <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
              Hubungi developer untuk informasi donasi
            </p>
          </div>
        )}

        {/* ── QRIS Section ── */}
        {!isLoading && hasQris && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "20px",
              marginBottom: "16px",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 12px rgba(16, 45, 85, 0.06)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "#e0f2fe",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                📱
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)" }}>
                  Bayar via QRIS
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "1px" }}>
                  Scan dengan aplikasi dompet digital apapun
                </div>
              </div>
            </div>

            {/* QR Image */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={developerSettings.qris_url}
                alt="QRIS Code"
                onError={() => setQrisImgError(true)}
                style={{
                  width: "100%",
                  maxWidth: "240px",
                  height: "auto",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  display: "block",
                }}
              />
              {developerSettings.qris_name && (
                <div
                  style={{
                    padding: "8px 16px",
                    background: "var(--s2, #f8fafc)",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--navy)",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                  }}
                >
                  a/n {developerSettings.qris_name}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bank Transfer Section ── */}
        {!isLoading && activeBanks.length > 0 && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "20px",
              marginBottom: "16px",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 12px rgba(16, 45, 85, 0.06)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "#e8f3ff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                🏦
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)" }}>
                  Transfer Rekening
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "1px" }}>
                  Salin nomor rekening lalu transfer
                </div>
              </div>
            </div>

            {/* Bank List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {activeBanks.map((bank, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "14px",
                    background: "var(--s2, #f8fafc)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "3px",
                      }}
                    >
                      {bank.name}
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "var(--navy)",
                        fontFamily: "monospace",
                        letterSpacing: "1px",
                        wordBreak: "break-all",
                      }}
                    >
                      {bank.account}
                    </div>
                    {bank.holder && (
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                        a/n {bank.holder}
                      </div>
                    )}
                  </div>

                  <CopyButton text={bank.account} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer appreciation ── */}
        {!isLoading && hasContent && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
              border: "1px solid #bbf7d0",
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>❤️</div>
            <p style={{ fontSize: "12.5px", color: "#166534", fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
              Dukunganmu sangat berarti dan memotivasi pengembang untuk terus<br />
              mengembangkan fitur-fitur baru yang bermanfaat!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

