"use client";

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { getHealthFamilyMembers } from "@/lib/health-service";
import type { HealthFamilyMember } from "@/lib/types";

interface ExpenseReminderCardProps {
  // Optional prop for manual time override in dev/testing mode
  forcedHour?: number;
}

const emptySubscribe = () => () => {};

export default function ExpenseReminderCard({ forcedHour }: ExpenseReminderCardProps) {
  const router = useRouter();
  const { currentMember, sessionUser, transactions, currentKeluarga } = useApp();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [localDismissed, setLocalDismissed] = useState(false);
  const [healthMembers, setHealthMembers] = useState<HealthFamilyMember[]>([]);

  // Tanggal hari ini dalam format YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Kunci local storage dismissal
  const dismissalStorageKey = useMemo(() => {
    const userId = currentMember?.id || sessionUser?.id || "guest";
    return `expense_reminder_dismissed_${userId}_${todayStr}`;
  }, [currentMember?.id, sessionUser?.id, todayStr]);

  const isStoredDismissed = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => {
      try {
        return localStorage.getItem(dismissalStorageKey) === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  const isDismissed = localDismissed || isStoredDismissed;

  // Ambil data kesehatan untuk fallback identifikasi gender anak jika belum tersimpan di members
  useEffect(() => {
    let active = true;
    if (currentKeluarga?.id) {
      getHealthFamilyMembers(currentKeluarga.id).then((data) => {
        if (active) setHealthMembers(data);
      });
    }
    return () => {
      active = false;
    };
  }, [currentKeluarga?.id]);

  // 1. Cek pemicu waktu: Aktif mulai jam 18:00 (malam/sore)
  const isTimeTriggered = useMemo(() => {
    if (typeof forcedHour === "number") {
      return forcedHour >= 18;
    }
    const currentHour = new Date().getHours();
    return currentHour >= 18;
  }, [forcedHour]);

  // 2. Cek apakah user yang sedang login sudah mencatat transaksi pengeluaran hari ini
  const hasRecordedExpenseToday = useMemo(() => {
    if (!currentMember && !sessionUser) return false;

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    const myMemberId = currentMember?.id;
    const myAuthId = sessionUser?.id;
    const myName = currentMember?.display_name?.trim().toLowerCase();

    return transactions.some((tx) => {
      // Hanya transaksi tipe pengeluaran (expense)
      if (tx.type !== "expense") return false;

      // Cek apakah tanggal transaksi adalah hari ini
      if (!tx.created_at) return false;
      const txDate = new Date(tx.created_at);
      const isToday =
        txDate.getFullYear() === todayYear &&
        txDate.getMonth() === todayMonth &&
        txDate.getDate() === todayDate;

      if (!isToday) return false;

      // Cek apakah transaksi milik user ini
      const isMyTx =
        (myMemberId && tx.user_id === myMemberId) ||
        (myAuthId && tx.user_id === myAuthId) ||
        (myName && tx.user_name && tx.user_name.trim().toLowerCase() === myName);

      return Boolean(isMyTx);
    });
  }, [transactions, currentMember, sessionUser]);

  // Resolusi greeting sapaan berdasarkan peran & gender
  const greetingConfig = useMemo(() => {
    const role = currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri");
    let gender = currentMember?.gender;

    // Fallback gender jika belum di-set di member
    if (!gender && healthMembers.length > 0 && currentMember?.id) {
      const matched = healthMembers.find((h) => h.auth_member_id === currentMember.id);
      if (matched?.gender) {
        gender = matched.gender;
      }
    }

    // Fallback berdasarkan petunjuk nama jika role anak
    if (!gender && role === "anak") {
      const nameLower = (currentMember?.display_name || "").toLowerCase();
      if (nameLower.includes("kakak") || nameLower.includes("nisa") || nameLower.includes("putri") || nameLower.includes("girl")) {
        gender = "female";
      } else {
        gender = "male";
      }
    }

    if (role === "suami") {
      return {
        greeting: "Halo Paksu, kamu ada yang perlu dicatat ga hari ini?",
        emoji: "👨‍💼",
        roleTag: "PENGINGAT KEUANGAN • SUAMI",
        subtitle: "Catat pengeluaran harianmu sebelum istirahat agar anggaran keluarga tetap terkendali.",
        gradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #eff6ff 100%)",
        borderColor: "rgba(37, 99, 235, 0.28)",
        accentColor: "#2563eb",
        badgeBg: "rgba(37, 99, 235, 0.12)",
      };
    }

    if (role === "istri") {
      return {
        greeting: "Halo Bunda, kamu ada yang perlu dicatat ga hari ini?",
        emoji: "👩",
        roleTag: "PENGINGAT KEUANGAN • BUNDA",
        subtitle: "Ada belanja dapur, perlengkapan, atau jajan yang belum sempat dicatat hari ini?",
        gradient: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #f0fdfa 100%)",
        borderColor: "rgba(20, 184, 166, 0.28)",
        accentColor: "#0d9488",
        badgeBg: "rgba(20, 184, 166, 0.12)",
      };
    }

    if (role === "anak") {
      if (gender === "female") {
        return {
          greeting: "Halo Kakak, kamu ada yang perlu dicatat ga hari ini?",
          emoji: "👧",
          roleTag: "PENGINGAT KEUANGAN • KAKAK",
          subtitle: "Jangan lupa catat jajan atau keperluan sekolahmu hari ini ya Kak!",
          gradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)",
          borderColor: "rgba(236, 72, 153, 0.28)",
          accentColor: "#db2777",
          badgeBg: "rgba(236, 72, 153, 0.12)",
        };
      }
      return {
        greeting: "Halo Abang, kamu ada yang perlu dicatat ga hari ini?",
        emoji: "👦",
        roleTag: "PENGINGAT KEUANGAN • ABANG",
        subtitle: "Ada jajan, bensin, atau pengeluaran yang perlu dicatat hari ini Bang?",
        gradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)",
        borderColor: "rgba(245, 158, 11, 0.28)",
        accentColor: "#d97706",
        badgeBg: "rgba(245, 158, 11, 0.12)",
      };
    }

    // Default Fallback
    const name = currentMember?.display_name || "Kamu";
    return {
      greeting: `Halo ${name}, kamu ada yang perlu dicatat ga hari ini?`,
      emoji: "📝",
      roleTag: "PENGINGAT KEUANGAN HARIAN",
      subtitle: "Pastikan seluruh transaksi pengeluaran hari ini sudah tercatat rapi.",
      gradient: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)",
      borderColor: "rgba(100, 116, 139, 0.25)",
      accentColor: "#475569",
      badgeBg: "rgba(100, 116, 139, 0.12)",
    };
  }, [currentMember, healthMembers]);

  // Aksi: User memilih "Tidak Ada" -> Tutup & simpan dismissal hari ini
  const handleDismiss = useCallback(() => {
    setLocalDismissed(true);
    try {
      localStorage.setItem(dismissalStorageKey, "true");
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  }, [dismissalStorageKey]);

  // Aksi: User memilih "Ada, Catat Sekarang" -> Arahkan ke /input
  const handleGoToInput = useCallback(() => {
    router.push("/input");
  }, [router]);

  // Kondisi render:
  // 1. Sudah di-mount di browser (client)
  // 2. Waktu sudah jam 18:00 ke atas
  // 3. User belum mencatat pengeluaran hari ini
  // 4. Belum di-dismiss oleh user hari ini
  if (!isClient) return null;
  if (!isTimeTriggered) return null;
  if (hasRecordedExpenseToday) return null;
  if (isDismissed) return null;

  return (
    <div
      style={{
        position: "relative",
        background: greetingConfig.gradient,
        borderRadius: "20px",
        padding: "18px 20px",
        border: `1.5px solid ${greetingConfig.borderColor}`,
        boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        marginBottom: "16px",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Tombol Close silang di pojok kanan atas */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup Pengingat"
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          background: "rgba(0, 0, 0, 0.05)",
          border: "none",
          borderRadius: "50%",
          width: "28px",
          height: "28px",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          color: "var(--muted, #64748b)",
          fontSize: "14px",
          fontWeight: 700,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.12)";
          e.currentTarget.style.color = "#0f172a";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
          e.currentTarget.style.color = "var(--muted, #64748b)";
        }}
      >
        ✕
      </button>

      {/* Bagian Konten Utama */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        {/* Avatar Icon */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "16px",
            background: "#ffffff",
            display: "grid",
            placeItems: "center",
            fontSize: "26px",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            border: "2px solid #ffffff",
          }}
        >
          {greetingConfig.emoji}
        </div>

        {/* Teks Pesan */}
        <div style={{ flex: 1, paddingRight: "24px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "6px",
              background: greetingConfig.badgeBg,
              color: greetingConfig.accentColor,
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              marginBottom: "6px",
            }}
          >
            <span>⏰ 18:00</span>
            <span>•</span>
            <span>{greetingConfig.roleTag}</span>
          </div>

          <h3
            style={{
              fontSize: "15.5px",
              fontWeight: 800,
              color: "var(--navy, #0f172a)",
              lineHeight: 1.35,
              margin: "0 0 4px 0",
            }}
          >
            {greetingConfig.greeting}
          </h3>

          <p
            style={{
              fontSize: "12px",
              color: "var(--text-secondary, #475569)",
              lineHeight: 1.45,
              margin: 0,
            }}
          >
            {greetingConfig.subtitle}
          </p>
        </div>
      </div>

      {/* Tombol Interaksi */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            padding: "8px 16px",
            borderRadius: "10px",
            border: "1.5px solid rgba(0, 0, 0, 0.12)",
            background: "#ffffff",
            color: "var(--text-secondary, #475569)",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f8fafc";
            e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.22)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.12)";
          }}
        >
          Tidak ada
        </button>

        <button
          type="button"
          onClick={handleGoToInput}
          style={{
            padding: "8px 18px",
            borderRadius: "10px",
            border: "none",
            background: greetingConfig.accentColor,
            color: "#ffffff",
            fontSize: "12.5px",
            fontWeight: 750,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: `0 4px 12px -2px ${greetingConfig.accentColor}55`,
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = `0 6px 16px -2px ${greetingConfig.accentColor}77`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 4px 12px -2px ${greetingConfig.accentColor}55`;
          }}
        >
          <span>Ada, Catat Sekarang</span>
          <span style={{ fontSize: "14px" }}>→</span>
        </button>
      </div>
    </div>
  );
}
