"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { getHealthFamilyMembers } from "@/lib/health-service";
import { formatRp } from "@/lib/debt-utils";
import type { HealthFamilyMember, Member, Debt } from "@/lib/types";
import BirthdayCelebrationModal from "./BirthdayCelebrationModal";

interface ReminderFlagboxProps {
  keluargaId?: string | null;
  currentMember?: Member | null;
  upcomingDebts?: Debt[];
  todayDate?: number;
  forcedHour?: number; // Opsional untuk testing/dev
}

const emptySubscribe = () => () => {};

// Helper Ucapan & Apresiasi Ulang Tahun
function getAppreciationWishes(role: string, name: string, age: number, isSelf: boolean) {
  if (isSelf) {
    return {
      title: `Selamat Ulang Tahun untuk Dirimu, ${name}! 👑🎂`,
      subtitle: `Genap berusia ${age} tahun hari ini`,
      quote:
        "Terima kasih sudah selalu memberikan yang terbaik untuk keluarga. Luangkan waktu untuk tersenyum dan nikmati harimu! ✨🥰",
      tag: "👑 HARI SPESIALMU",
    };
  }

  switch (role) {
    case "suami":
      return {
        title: `Selamat Ulang Tahun, Ayah ${name}! 🏆🎉`,
        subtitle: `Genap berusia ${age} tahun hari ini`,
        quote: "Terima kasih sudah menjadi nahkoda pelindung keluarga. Semoga selalu sehat dan berkah! 💙",
        tag: "🏆 KEPALA KELUARGA",
      };
    case "istri":
      return {
        title: `Selamat Ulang Tahun, Bunda ${name}! 🌸💖`,
        subtitle: `Genap berusia ${age} tahun hari ini`,
        quote: "Terima kasih atas kehangatan dan ketulusanmu merawat rumah kita. Sehat dan bahagia selalu! ✨",
        tag: "🌸 BIDADARI KELUARGA",
      };
    case "anak":
      return {
        title: `Selamat Ulang Tahun, Sayang ${name}! 🚀🎂`,
        subtitle: `Tumbuh pintar di usia ${age} tahun!`,
        quote: "Tumbuhlah jadi anak yang sehat, berbakti, dan selalu ceria. Kami bangga dan sayang padamu! 🎈",
        tag: "🌟 KESAYANGAN",
      };
    case "orang_tua":
      return {
        title: `Selamat Ulang Tahun, ${name}! 🤲❤️`,
        subtitle: `Genap berusia ${age} tahun hari ini`,
        quote: "Terima kasih atas doa tulus dan bimbingan sepanjang masa. Semoga senantiasa sehat dan berkah. 🌼",
        tag: "🤲 SOSOK TERCINTA",
      };
    default:
      return {
        title: `Selamat Ulang Tahun, ${name}! 🥳🎉`,
        subtitle: `Genap berusia ${age} tahun hari ini`,
        quote: "Semoga panjang umur, sehat selalu, dan dikelilingi cinta hangat bersama keluarga tercinta! 🎂",
        tag: "🎉 HARI SPESIAL",
      };
  }
}

function getDefaultRoleAvatar(role: string): string {
  switch (role) {
    case "suami":
      return "👨";
    case "istri":
      return "👩";
    case "anak":
      return "👦";
    case "orang_tua":
      return "🧓";
    default:
      return "🥳";
  }
}

export default function ReminderFlagbox({
  keluargaId,
  currentMember,
  upcomingDebts = [],
  todayDate = new Date().getDate(),
  forcedHour,
}: ReminderFlagboxProps) {
  const router = useRouter();
  const { sessionUser, transactions } = useApp();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Carousel ref & active index
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // State Dismissal Independen
  const [dismissedMap, setDismissedMap] = useState<Record<string, boolean>>({});

  // State Khusus Ulang Tahun
  const [birthdayMembers, setBirthdayMembers] = useState<HealthFamilyMember[]>([]);
  const [healthMembers, setHealthMembers] = useState<HealthFamilyMember[]>([]);
  const [birthdayIdx, setBirthdayIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [candleBlown, setCandleBlown] = useState<Record<string, boolean>>({});
  const [balloonCounts, setBalloonCounts] = useState<Record<string, number>>({});

  // Tanggal hari ini YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  }, []);

  // Storage keys
  const birthdayDismissKey = useMemo(
    () => `birthday_wishes_dismissed_${keluargaId || "default"}_${todayKey}`,
    [keluargaId, todayKey]
  );
  const expenseDismissKey = useMemo(() => {
    const userId = currentMember?.id || sessionUser?.id || "guest";
    return `expense_reminder_dismissed_${userId}_${todayStr}`;
  }, [currentMember?.id, sessionUser?.id, todayStr]);
  const debtDismissKey = useMemo(
    () => `debt_warning_dismissed_${keluargaId || "default"}_${todayStr}`,
    [keluargaId, todayStr]
  );

  // Ambil data anggota kesehatan untuk ultah & fallback gender
  useEffect(() => {
    let active = true;
    if (keluargaId) {
      getHealthFamilyMembers(keluargaId).then((members) => {
        if (!active) return;
        setHealthMembers(members);

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        const todayBirthdays = members.filter((m) => {
          if (!m.birth_date) return false;
          const parts = m.birth_date.split("-");
          if (parts.length < 3) return false;
          return parseInt(parts[1], 10) === currentMonth && parseInt(parts[2], 10) === currentDay;
        });

        // Mode preview testing via URL params
        const isPreview =
          typeof window !== "undefined" &&
          (new URLSearchParams(window.location.search).has("preview_birthday") ||
            new URLSearchParams(window.location.search).has("birthday_test"));

        if (todayBirthdays.length === 0 && isPreview) {
          todayBirthdays.push({
            id: "preview-birthday-user",
            keluarga_id: keluargaId,
            name: currentMember?.display_name || "Bunda Sari",
            relation_role: (currentMember?.status_keluarga || "istri") as HealthFamilyMember["relation_role"],
            gender: "female",
            birth_date: `${now.getFullYear() - 28}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`,
            blood_type: "O+",
            allergies: [],
            chronic_conditions: [],
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          });
        }

        setBirthdayMembers(todayBirthdays);
      });
    }
    return () => {
      active = false;
    };
  }, [keluargaId, currentMember]);

  const subscribeStorage = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const isBdayStoredDismissed = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(birthdayDismissKey) === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  const isExpenseStoredDismissed = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(expenseDismissKey) === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  const isDebtStoredDismissed = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(debtDismissKey) === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  const isBirthdayDismissed = Boolean(dismissedMap.birthday || isBdayStoredDismissed);
  const isExpenseDismissed = Boolean(dismissedMap.expense || isExpenseStoredDismissed);
  const isDebtDismissed = Boolean(dismissedMap.debt || isDebtStoredDismissed);

  // Handler dismiss per tipe
  const handleDismissType = useCallback(
    (type: "birthday" | "expense" | "debt") => {
      setDismissedMap((prev) => ({ ...prev, [type]: true }));
      try {
        let storageKey = "";
        if (type === "birthday") storageKey = birthdayDismissKey;
        if (type === "expense") storageKey = expenseDismissKey;
        if (type === "debt") storageKey = debtDismissKey;
        if (storageKey) {
          localStorage.setItem(storageKey, "true");
          window.dispatchEvent(new Event("storage"));
        }
      } catch {
        // ignore
      }
    },
    [birthdayDismissKey, expenseDismissKey, debtDismissKey]
  );

  // Cek kondisi Expense Reminder (Jam 18:00 & belum catat hari ini)
  const isExpenseTimeTriggered = useMemo(() => {
    if (typeof forcedHour === "number") return forcedHour >= 18;
    return new Date().getHours() >= 18;
  }, [forcedHour]);

  const hasRecordedExpenseToday = useMemo(() => {
    if (!currentMember && !sessionUser) return false;
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayD = now.getDate();

    const myMemberId = currentMember?.id;
    const myAuthId = sessionUser?.id;
    const myName = currentMember?.display_name?.trim().toLowerCase();

    return transactions.some((tx) => {
      if (tx.type !== "expense") return false;
      if (!tx.created_at) return false;
      const txDate = new Date(tx.created_at);
      const isDateMatch =
        txDate.getFullYear() === todayYear &&
        txDate.getMonth() === todayMonth &&
        txDate.getDate() === todayD;
      if (!isDateMatch) return false;

      const isMyTx =
        (myMemberId && tx.user_id === myMemberId) ||
        (myAuthId && tx.user_id === myAuthId) ||
        (myName && tx.user_name && tx.user_name.trim().toLowerCase() === myName);
      return Boolean(isMyTx);
    });
  }, [currentMember, sessionUser, transactions]);

  // Greeting config untuk Expense Reminder
  const expenseGreeting = useMemo(() => {
    const role = (currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri")).toLowerCase();
    let gender = (currentMember?.gender || "").toLowerCase();

    if (!gender && healthMembers.length > 0) {
      const match = healthMembers.find(
        (hm) =>
          hm.auth_member_id === currentMember?.id ||
          hm.name.toLowerCase() === currentMember?.display_name?.toLowerCase()
      );
      if (match?.gender) gender = match.gender.toLowerCase();
    }

    if (!gender && role === "anak") {
      const nameLower = (currentMember?.display_name || "").toLowerCase();
      gender = nameLower.includes("kakak") || nameLower.includes("putri") ? "female" : "male";
    }

    if (role === "suami") {
      return {
        greeting: "Halo Paksu, ada yang perlu dicatat hari ini?",
        emoji: "👨‍💼",
        roleTag: "PENGINGAT KEUANGAN • SUAMI",
        subtitle: "Catat pengeluaran harianmu sebelum istirahat agar saldo siklus tetap terpantau rapi.",
      };
    }
    if (role === "istri") {
      return {
        greeting: "Halo Bunda, ada belanja yang belum dicatat?",
        emoji: "👩",
        roleTag: "PENGINGAT KEUANGAN • BUNDA",
        subtitle: "Ada belanja dapur atau kebutuhan harian yang belum sempat dicatat hari ini?",
      };
    }
    if (role === "anak") {
      const isKakak = gender === "female";
      return {
        greeting: `Halo ${isKakak ? "Kakak" : "Abang"}, ada pengeluaran hari ini?`,
        emoji: isKakak ? "👧" : "👦",
        roleTag: `PENGINGAT KEUANGAN • ${isKakak ? "KAKAK" : "ABANG"}`,
        subtitle: "Jangan lupa catat jajan atau keperluan sekolahmu hari ini ya!",
      };
    }

    const name = currentMember?.display_name || "Kamu";
    return {
      greeting: `Halo ${name}, ada transaksi yang perlu dicatat?`,
      emoji: "📝",
      roleTag: "PENGINGAT KEUANGAN HARIAN",
      subtitle: "Pastikan seluruh transaksi pengeluaran hari ini sudah tercatat rapi.",
    };
  }, [currentMember, healthMembers]);

  // Susun Slide Aktif
  const activeSlides = useMemo(() => {
    const list: Array<{
      id: string;
      type: "birthday" | "expense" | "debt";
      badge: { text: string; bg: string; color: string; border?: string };
      emoji: string | React.ReactNode;
      title: string;
      subtitle: string;
      highlight?: string;
      bgGradient: string;
      borderColor: string;
      primaryCta: { label: string; action: () => void; bg?: string };
      secondaryCta?: { label: string; action: () => void };
      onDismiss: () => void;
    }> = [];

    // 1. SLIDE ULANG TAHUN (Prioritas 1)
    if (birthdayMembers.length > 0 && !isBirthdayDismissed) {
      const person = birthdayMembers[birthdayIdx] || birthdayMembers[0];
      const birthYear = parseInt(person.birth_date.split("-")[0], 10);
      const calculatedAge = Math.max(1, new Date().getFullYear() - birthYear);
      const isSelf = Boolean(
        (currentMember?.id && person.auth_member_id === currentMember.id) ||
          (currentMember?.display_name &&
            person.name.toLowerCase() === currentMember.display_name.toLowerCase())
      );
      const wishes = getAppreciationWishes(
        person.relation_role,
        person.name,
        calculatedAge,
        isSelf
      );

      list.push({
        id: "birthday-slide",
        type: "birthday",
        badge: {
          text: `🎉 ${wishes.tag}`,
          bg: "#ea580c",
          color: "#ffffff",
          border: "rgba(255,255,255,0.4)",
        },
        emoji: person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt={person.name}
            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          getDefaultRoleAvatar(person.relation_role)
        ),
        title: wishes.title,
        subtitle: wishes.quote,
        highlight: `Genap berusia ${calculatedAge} tahun!`,
        bgGradient: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fff1f2 100%)",
        borderColor: "#fed7aa",
        primaryCta: {
          label: "Rayakan & Tiup Lilin 🎂",
          action: () => setIsModalOpen(true),
          bg: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
        },
        secondaryCta:
          birthdayMembers.length > 1
            ? {
                label: `Lainnya (${birthdayIdx + 1}/${birthdayMembers.length}) ➔`,
                action: () => setBirthdayIdx((prev) => (prev + 1) % birthdayMembers.length),
              }
            : undefined,
        onDismiss: () => handleDismissType("birthday"),
      });
    }

    // 2. SLIDE JATUH TEMPO HUTANG (Prioritas 2)
    if (upcomingDebts.length > 0 && !isDebtDismissed) {
      const topDebt = upcomingDebts[0];
      const daysLeft =
        topDebt.due_date >= todayDate
          ? topDebt.due_date - todayDate
          : 30 - todayDate + topDebt.due_date;

      const dueLabel = daysLeft === 0 ? "HARI INI!" : `${daysLeft} hari lagi`;
      const subtitleText =
        upcomingDebts.length > 1
          ? `${topDebt.name} (${dueLabel} · ${formatRp(topDebt.monthly_payment)}) serta ${upcomingDebts.length - 1} hutang lainnya.`
          : `${topDebt.name} jatuh tempo ${dueLabel}. Angsuran: ${formatRp(topDebt.monthly_payment)}.`;

      list.push({
        id: "debt-slide",
        type: "debt",
        badge: {
          text: "⚠️ JATUH TEMPO TERDEKAT",
          bg: "#dc2626",
          color: "#ffffff",
          border: "rgba(255,255,255,0.3)",
        },
        emoji: topDebt.icon || "💳",
        title: `Hutang Jatuh Tempo (${dueLabel})`,
        subtitle: subtitleText,
        highlight: `Segera bayar sebelum jatuh tempo`,
        bgGradient: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fff7ed 100%)",
        borderColor: "#fecaca",
        primaryCta: {
          label: "Rincian Hutang 💳",
          action: () => router.push("/debts"),
          bg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
        },
        secondaryCta: {
          label: "Nanti Saja",
          action: () => handleDismissType("debt"),
        },
        onDismiss: () => handleDismissType("debt"),
      });
    }

    // 3. SLIDE CATAT PENGELUARAN 18:00 (Prioritas 3)
    if (isExpenseTimeTriggered && !hasRecordedExpenseToday && !isExpenseDismissed) {
      list.push({
        id: "expense-slide",
        type: "expense",
        badge: {
          text: `⏰ 18:00 • ${expenseGreeting.roleTag}`,
          bg: "#4f46e5",
          color: "#ffffff",
          border: "rgba(255,255,255,0.3)",
        },
        emoji: expenseGreeting.emoji,
        title: expenseGreeting.greeting,
        subtitle: expenseGreeting.subtitle,
        bgGradient: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #f5f3ff 100%)",
        borderColor: "#c7d2fe",
        primaryCta: {
          label: "Catat Sekarang ✍️",
          action: () => router.push("/input"),
          bg: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
        },
        secondaryCta: {
          label: "Tidak Ada",
          action: () => handleDismissType("expense"),
        },
        onDismiss: () => handleDismissType("expense"),
      });
    }

    return list;
  }, [
    birthdayMembers,
    isBirthdayDismissed,
    isDebtDismissed,
    isExpenseDismissed,
    birthdayIdx,
    currentMember,
    upcomingDebts,
    todayDate,
    isExpenseTimeTriggered,
    hasRecordedExpenseToday,
    expenseGreeting,
    handleDismissType,
    router,
  ]);

  // Sinkronisasi index slide aktif saat digeser
  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    if (clientWidth > 0) {
      const newIdx = Math.round(scrollLeft / clientWidth);
      if (newIdx !== activeSlide && newIdx >= 0 && newIdx < activeSlides.length) {
        setActiveSlide(newIdx);
      }
    }
  }, [activeSlide, activeSlides.length]);

  // Scroll ke index slide spesifik
  const scrollToIndex = useCallback((idx: number) => {
    if (!carouselRef.current) return;
    const clientWidth = carouselRef.current.clientWidth;
    carouselRef.current.scrollTo({
      left: idx * clientWidth,
      behavior: "smooth",
    });
    setActiveSlide(idx);
  }, []);

  // Jika tidak di client atau tidak ada slide aktif, tidak perlu render
  if (!isClient) return null;
  if (activeSlides.length === 0) return null;

  const currentBirthdayPerson = birthdayMembers[birthdayIdx] || birthdayMembers[0];
  const birthYear = currentBirthdayPerson?.birth_date
    ? parseInt(currentBirthdayPerson.birth_date.split("-")[0], 10)
    : 2000;
  const currentAge = Math.max(1, new Date().getFullYear() - birthYear);
  const currentBdayWishes = currentBirthdayPerson
    ? getAppreciationWishes(
        currentBirthdayPerson.relation_role,
        currentBirthdayPerson.name,
        currentAge,
        Boolean(
          currentMember?.id && currentBirthdayPerson.auth_member_id === currentMember.id
        )
      )
    : { title: "", subtitle: "", quote: "", tag: "" };

  return (
    <>
      <section
        aria-label="Pusat Peringatan & Pengingat Hari Ini"
        className="reminder-flagbox-container"
      >
        {/* Container Kartu Luar (Double-Bezel High-End Minimalist) */}
        <div className="reminder-flagbox-shell">
          {/* Track Carousel dengan CSS Scroll Snap */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            style={{
              display: "flex",
              overflowX: activeSlides.length > 1 ? "auto" : "hidden",
              scrollSnapType: activeSlides.length > 1 ? "x mandatory" : "none",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {activeSlides.map((slide, idx) => (
              <div
                key={slide.id}
                className={
                  slide.type === "birthday"
                    ? "reminder-slide-bday"
                    : slide.type === "debt"
                    ? "reminder-slide-debt"
                    : "reminder-slide-expense"
                }
                style={{
                  flex: "0 0 100%",
                  minWidth: "100%",
                  scrollSnapAlign: "start",
                  scrollSnapStop: "always",
                  boxSizing: "border-box",
                  padding: "16px 18px 14px",
                  minHeight: "154px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                {/* Bar Atas: Badge Kategori & Tombol Dismiss */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: "999px",
                        background: slide.badge.bg,
                        color: slide.badge.color,
                        border: slide.badge.border ? `1px solid ${slide.badge.border}` : "none",
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.12)",
                      }}
                    >
                      {slide.badge.text}
                    </span>

                    {activeSlides.length > 1 && (
                      <span
                        className="reminder-sub-counter"
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "999px",
                        }}
                      >
                        {idx + 1} dari {activeSlides.length}
                      </span>
                    )}
                  </div>

                  {/* Tombol Tutup Silang (✕) */}
                  <button
                    type="button"
                    onClick={slide.onDismiss}
                    aria-label={`Tutup pengingat ${slide.badge.text}`}
                    title="Sembunyikan untuk hari ini"
                    className="reminder-btn-dismiss"
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Konten Utama: Avatar/Ikon + Teks */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  {/* Ikon / Avatar */}
                  <div
                    className="reminder-avatar-box"
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "14px",
                      boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "22px",
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {slide.emoji}
                  </div>

                  {/* Judul & Deskripsi */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      className="reminder-title"
                      style={{
                        margin: "0 0 3px",
                        fontSize: "14.5px",
                        fontWeight: 800,
                        lineHeight: 1.3,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={slide.title}
                    >
                      {slide.title}
                    </h3>
                    <p
                      className="reminder-desc"
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {slide.subtitle}
                    </p>
                  </div>
                </div>

                {/* Footer Bar: Tombol Aksi (CTA) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "8px",
                  }}
                >
                  {slide.secondaryCta && (
                    <button
                      type="button"
                      onClick={slide.secondaryCta.action}
                      className="reminder-btn-secondary"
                      style={{
                        padding: "7px 12px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {slide.secondaryCta.label}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={slide.primaryCta.action}
                    style={{
                      padding: "7px 15px",
                      borderRadius: "10px",
                      background: slide.primaryCta.bg || "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12.5px",
                      fontWeight: 750,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18)",
                      transition: "transform 0.12s ease",
                    }}
                  >
                    <span>{slide.primaryCta.label}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Navigasi Dots (Hanya muncul jika lebih dari 1 pengingat) */}
          {activeSlides.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: "6px",
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "5px",
                pointerEvents: "none",
              }}
            >
              {activeSlides.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  onClick={() => scrollToIndex(i)}
                  aria-label={`Buka slide ke-${i + 1}`}
                  className={activeSlide === i ? "reminder-dot-active" : "reminder-dot-inactive"}
                  style={{
                    pointerEvents: "auto",
                    width: activeSlide === i ? "18px" : "6px",
                    height: "5px",
                    borderRadius: "999px",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pop-up Modal Perayaan Interaktif Ulang Tahun */}
      {currentBirthdayPerson && (
        <BirthdayCelebrationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          member={currentBirthdayPerson}
          age={currentAge}
          wishes={currentBdayWishes}
          isBlown={candleBlown[currentBirthdayPerson.id] || false}
          balloonCount={balloonCounts[currentBirthdayPerson.id] ?? 5}
          onBlowCandle={(id) => setCandleBlown((prev) => ({ ...prev, [id]: true }))}
          onSendBalloon={(id) =>
            setBalloonCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 5) + 1 }))
          }
          avatarIcon={getDefaultRoleAvatar(currentBirthdayPerson.relation_role)}
        />
      )}
    </>
  );
}
