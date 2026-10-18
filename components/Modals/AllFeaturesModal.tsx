"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import AlertModal from "@/components/Modals/AlertModal";
import { useApp } from "@/lib/store";

interface AllFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MainFeature {
  id: string;
  name: string;
  path: string;
  iconBg: string;
  icon: React.ReactNode;
}

export default function AllFeaturesModal({
  isOpen,
  onClose,
}: AllFeaturesModalProps) {
  const router = useRouter();
  const { sessionUser, currentMember, currentKeluarga, logout } = useApp();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Gagal logout:", err);
      setIsLoggingOut(false);
    }
  };

  const mainFeatures: MainFeature[] = [
    {
      id: "saku",
      name: "Saku",
      path: "/saku",
      iconBg: "#e8f3ff",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
          <rect x="5" y="8" width="22" height="18" rx="5" fill="#3b82f6" opacity="0.2" />
          <path d="M5 12C5 9.79086 6.79086 8 9 8H23C25.2091 8 27 9.79086 27 12V22C27 24.2091 25.2091 26 23 26H9C6.79086 26 5 24.2091 5 22V12Z" stroke="#2563eb" strokeWidth="2.2" />
          <path d="M19 14H27V20H19C17.3431 20 16 18.6569 16 17C16 15.3431 17.3431 14 19 14Z" fill="#60a5fa" stroke="#2563eb" strokeWidth="2" />
          <circle cx="21.5" cy="17" r="1.5" fill="#ffffff" />
        </svg>
      ),
    },
    {
      id: "hutang",
      name: "Hutang",
      path: "/debts",
      iconBg: "#fff3e5",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
          <rect x="4" y="9" width="24" height="16" rx="4" fill="#f97316" opacity="0.18" />
          <rect x="4" y="9" width="24" height="16" rx="4" stroke="#ea580c" strokeWidth="2.2" />
          <path d="M4 14H28" stroke="#ea580c" strokeWidth="2.2" />
          <rect x="8" y="19" width="6" height="3" rx="1" fill="#f97316" />
          <circle cx="22" cy="20.5" r="2" fill="#fb923c" />
        </svg>
      ),
    },
    {
      id: "struk",
      name: "Struk",
      path: "/struk",
      iconBg: "#e5f7ff",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
          <path d="M7 6C7 4.89543 7.89543 4 9 4H23C24.1046 4 25 4.89543 25 6V28L22 26L19 28L16 26L13 28L10 26L7 28V6Z" fill="#0284c7" opacity="0.15" />
          <path d="M7 6C7 4.89543 7.89543 4 9 4H23C24.1046 4 25 4.89543 25 6V28L22 26L19 28L16 26L13 28L10 26L7 28V6Z" stroke="#0284c7" strokeWidth="2.2" strokeLinejoin="round" />
          <line x1="11" y1="10" x2="21" y2="10" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
          <line x1="11" y1="15" x2="21" y2="15" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
          <line x1="11" y1="20" x2="17" y2="20" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "dompet",
      name: "Dompet",
      path: "/dompet",
      iconBg: "#e6faf5",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
          <path d="M6 10.5L20 5.5L22 9L7 14.5" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="5" y="10" width="22" height="16" rx="4" fill="#14b8a6" opacity="0.2" stroke="#0d9488" strokeWidth="2.2" />
          <path d="M20 15H27V21H20C18.3431 21 17 19.6569 17 18C17 16.3431 18.3431 15 20 15Z" fill="#2dd4bf" stroke="#0d9488" strokeWidth="2" />
          <circle cx="22" cy="18" r="1.5" fill="#ffffff" />
        </svg>
      ),
    },
    {
      id: "kendaraan",
      name: "Kendaraan",
      path: "/kendaraan",
      iconBg: "#eaf5fc",
      icon: (
        <svg viewBox="0 0 32 32" fill="none" style={{ width: "28px", height: "28px" }}>
          <rect x="4" y="9" width="24" height="15" rx="4" fill="#287ff0" opacity="0.18" />
          <path d="M5 16L7.5 10.5C7.8 9.8 8.6 9.3 9.4 9.3H22.6C23.4 9.3 24.2 9.8 24.5 10.5L27 16" stroke="#287ff0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="15" width="24" height="9" rx="3" stroke="#287ff0" strokeWidth="2.2" />
          <circle cx="8.5" cy="20" r="2" fill="#287ff0" />
          <circle cx="23.5" cy="20" r="2" fill="#287ff0" />
        </svg>
      ),
    },
  ];

  const handleItemClick = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", margin: "-6px -4px 0", paddingBottom: "10px" }}>
        {/* Header - Matches Bank Raya "Semua Menu" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            paddingRight: "36px",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--navy)",
              margin: 0,
              letterSpacing: "-0.4px",
            }}
          >
            Semua Menu
          </h2>
        </div>

        {/* Section Title */}
        <div
          style={{
            marginBottom: "14px",
          }}
        >
          <h3
            style={{
              fontSize: "14.5px",
              fontWeight: 750,
              color: "var(--navy)",
              margin: 0,
            }}
          >
            Fitur Utama
          </h3>
        </div>

        {/* 4-Column Grid for Fitur Utama */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            columnGap: "8px",
            rowGap: "16px",
            alignItems: "start",
          }}
        >
          {mainFeatures.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => handleItemClick(item.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleItemClick(item.path);
                }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                textAlign: "center",
                userSelect: "none",
              }}
            >
              {/* Rounded Square Icon Card */}
              <div
                style={{
                  position: "relative",
                  width: "58px",
                  height: "58px",
                  borderRadius: "18px",
                  background: item.iconBg || "var(--s2)",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: "8px",
                  transition: "transform 0.16s ease, box-shadow 0.16s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.06)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 45, 85, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {item.icon}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 650,
                  color: "var(--navy)",
                  lineHeight: 1.25,
                  textAlign: "center",
                  maxWidth: "68px",
                }}
              >
                {item.name}
              </span>
            </div>
          ))}
        </div>

        {/* Account Strip & Quick Logout with Characterful Styling */}
        <div
          style={{
            marginTop: "22px",
            paddingTop: "14px",
            borderTop: "1px dashed var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sessionUser.user_metadata.avatar_url || sessionUser.user_metadata.picture}
                alt="Avatar"
                crossOrigin="anonymous"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: "1.5px solid #ffffff",
                  boxShadow: "0 2px 6px rgba(16,45,85,0.12)",
                  objectFit: "cover",
                  flexShrink: 0
                }}
              />
            ) : (
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--navy), #2563eb)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {(currentMember?.display_name || sessionUser?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12.5px",
                  fontWeight: 750,
                  color: "var(--navy)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {currentMember?.display_name || sessionUser?.user_metadata?.full_name || "Pengguna"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {currentKeluarga?.nama_keluarga || "Keluarga Azla"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexShrink: 0,
              transition: "all 0.15s ease"
            }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      <AlertModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Akhiri Sesi Dompet Azla?"
        message={`Apakah Anda yakin ingin keluar dari akun ${sessionUser?.email || "ini"}? Anda dapat masuk kembali dengan akun Google Anda kapan saja.`}
        confirmText={isLoggingOut ? "Mengakhiri Sesi..." : "Ya, Keluar Akun"}
        cancelText="Batal"
        confirmColor="#f04467"
        onConfirm={handleLogout}
      />
    </Modal>
  );
}
