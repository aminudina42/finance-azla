"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { getHealthFamilyMembers } from "@/lib/health-service";
import type { HealthFamilyMember, Member } from "@/lib/types";

interface BirthdayCardProps {
  keluargaId?: string | null;
  currentMember?: Member | null;
}

// Ucapan hangat & apresiasi lucu khas keluarga berdasarkan peran
function getAppreciationWishes(role: string, name: string, age: number, isSelf: boolean) {
  if (isSelf) {
    return {
      title: `Selamat Ulang Tahun untuk Dirimu, ${name}! 👑🎂`,
      subtitle: `Hari ini kamu genap berusia ${age} tahun!`,
      quote:
        "Hari ini adalah hari istimewamu! Terima kasih sudah selalu berusaha memberikan yang terbaik untuk keluarga. Luangkan waktu untuk tersenyum, nikmati harimu, dan jangan lupa bahagia! ✨🥰",
      tag: "👑 RAJA / RATU HARI INI",
    };
  }

  switch (role) {
    case "suami":
      return {
        title: `Selamat Ulang Tahun, Ayah ${name}! 🏆🎉`,
        subtitle: `Genap berusia ${age} tahun hari ini`,
        quote:
          "Terima kasih sudah menjadi nahkoda tangguh pelindung keluarga. Setiap peluh, kerja keras, dan canda tawamu adalah berkah terindah untuk kami. Semoga selalu sehat, lapang rezeki, dan bahagia selamanya! 💙",
        tag: "🏆 KEPALA KELUARGA HEBAT",
      };
    case "istri":
      return {
        title: `Selamat Ulang Tahun, Bunda ${name}! 🌸💖`,
        subtitle: `Genap berusia ${age} tahun hari ini`,
        quote:
          "Terima kasih sudah menjadi pelita dan kehangatan rumah kita tercinta. Ketulusan, kebaikan hati, dan senyumanmu selalu jadi sumber semangat keluarga. Sehat, awet muda, dan selalu dalam lindungan-Nya! ✨",
        tag: "🌸 BIDADARI KELUARGA",
      };
    case "anak":
      return {
        title: `Selamat Ulang Tahun, Sayang ${name}! 🚀🎂`,
        subtitle: `Tumbuh makin pintar di usia ${age} tahun!`,
        quote:
          "Selamat ulang tahun jagoan & kesayangan keluarga! Tumbuhlah jadi anak yang sehat, sholeh/sholehah, berbakti, dan selalu ceria. Ayah dan Bunda selalu bangga dan sayang padamu seluas samudra! 🌟🎈",
        tag: "🌟 KESAYANGAN KELUARGA",
      };
    case "orang_tua":
      return {
        title: `Selamat Ulang Tahun, Orang Tua Terkasih ${name}! 🤲❤️`,
        subtitle: `Genap berusia ${age} tahun hari ini`,
        quote:
          "Terima kasih atas doa tulus, kasih sayang tanpa pamrih, dan bimbingan yang tak terhingga sepanjang waktu. Semoga senantiasa diberikan nikmat sehat walafiat, ketenangan, dan umur yang penuh berkah. 🌼",
        tag: "🤲 SOSOK TERCINTA",
      };
    default:
      return {
        title: `Selamat Ulang Tahun, ${name}! 🥳🎉`,
        subtitle: `Genap berusia ${age} tahun hari ini`,
        quote:
          "Selamat hari lahir! Semoga panjang umur, sehat selalu, bertambah bahagia, dan senantiasa dikelilingi cinta hangat bersama keluarga tercinta! 🎂🎁",
        tag: "🎉 HARI SPESIAL",
      };
  }
}

// Icon emoji avatar default jika tidak ada foto
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

export default function BirthdayCard({ keluargaId, currentMember }: BirthdayCardProps) {
  const [birthdayMembers, setBirthdayMembers] = useState<HealthFamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [candleBlown, setCandleBlown] = useState<Record<string, boolean>>({});
  const [balloonCounts, setBalloonCounts] = useState<Record<string, number>>({});
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; char: string; left: number }[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  // Ambil data anggota kesehatan & filter yang ulang tahun hari ini
  useEffect(() => {
    let isMounted = true;

    async function checkBirthdays() {
      if (!keluargaId) {
        setIsLoading(false);
        return;
      }

      try {
        const members = await getHealthFamilyMembers(keluargaId);
        if (!isMounted) return;

        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentDay = now.getDate(); // 1-31

        const todayBirthdays = members.filter((m) => {
          if (!m.birth_date) return false;
          // Format standard YYYY-MM-DD
          const parts = m.birth_date.split("-");
          if (parts.length < 3) return false;
          const bMonth = parseInt(parts[1], 10);
          const bDay = parseInt(parts[2], 10);
          return bMonth === currentMonth && bDay === currentDay;
        });

        // Mode preview / simulasi untuk pengujian (?preview_birthday=1 atau ?birthday_test=1)
        const isPreview =
          typeof window !== "undefined" &&
          (new URLSearchParams(window.location.search).has("preview_birthday") ||
            new URLSearchParams(window.location.search).has("birthday_test"));

        if (todayBirthdays.length === 0 && isPreview) {
          const sampleDate = `${now.getFullYear() - 32}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`;
          todayBirthdays.push({
            id: "preview-birthday-sample",
            keluarga_id: keluargaId || "preview",
            name: currentMember?.display_name || "Ayah",
            relation_role: (currentMember?.status_keluarga || "suami") as any,
            gender: "male",
            birth_date: sampleDate,
            blood_type: "O+",
            allergies: [],
            chronic_conditions: [],
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          });
        }

        setBirthdayMembers(todayBirthdays);
      } catch (err) {
        console.warn("Gagal membaca tanggal ulang tahun member:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    checkBirthdays();

    return () => {
      isMounted = false;
    };
  }, [keluargaId]);

  // Load balloon count from local storage
  useEffect(() => {
    if (typeof window === "undefined" || birthdayMembers.length === 0) return;
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const initialCounts: Record<string, number> = {};

    birthdayMembers.forEach((m) => {
      const stored = localStorage.getItem(`catat_keluarga_balloons_${m.id}_${todayKey}`);
      initialCounts[m.id] = stored ? parseInt(stored, 10) : 5; // default 5 balon sambutan
    });

    setBalloonCounts(initialCounts);
  }, [birthdayMembers]);

  // Handler: Tiup Lilin Digital
  const handleBlowCandle = useCallback((memberId: string) => {
    setCandleBlown((prev) => ({ ...prev, [memberId]: true }));

    // Efek ledakan confetti meriah
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f97316", "#e11d48", "#facc15", "#38bdf8", "#4ade80", "#a855f7"],
      });

      // Secondary bursts for dramatic effect
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#f43f5e", "#fbbf24", "#38bdf8"],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#10b981", "#8b5cf6", "#f59e0b"],
        });
      }, 250);
    } catch (e) {
      // Confetti fallback safely handled
    }
  }, []);

  // Handler: Kirim Balon / Kasih Cinta
  const handleSendBalloon = useCallback((memberId: string) => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    setBalloonCounts((prev) => {
      const nextVal = (prev[memberId] || 0) + 1;
      try {
        localStorage.setItem(`catat_keluarga_balloons_${memberId}_${todayKey}`, String(nextVal));
      } catch (e) {}
      return { ...prev, [memberId]: nextVal };
    });

    // Munculkan animasi partikel mengambang
    const emojis = ["🎈", "❤️", "✨", "🎁", "💖", "🎂"];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomLeft = Math.floor(Math.random() * 80) + 10;
    const newId = Date.now() + Math.random();

    setFloatingHearts((prev) => [...prev.slice(-6), { id: newId, char: randomEmoji, left: randomLeft }]);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((p) => p.id !== newId));
    }, 1800);
  }, []);

  // Jika tidak ada yang ulang tahun hari ini atau di-dismiss, tidak perlu render apapun
  if (isLoading || birthdayMembers.length === 0 || isDismissed) {
    return null;
  }

  const currentPerson = birthdayMembers[activeIdx] || birthdayMembers[0];
  const birthYear = parseInt(currentPerson.birth_date.split("-")[0], 10);
  const currentYear = new Date().getFullYear();
  const calculatedAge = Math.max(1, currentYear - birthYear);

  // Periksa apakah yang login sama dengan yang sedang ulang tahun
  const isSelf = Boolean(
    (currentMember?.id && currentPerson.auth_member_id === currentMember.id) ||
      (currentMember?.display_name &&
        currentPerson.name.toLowerCase() === currentMember.display_name.toLowerCase())
  );

  const wishes = getAppreciationWishes(
    currentPerson.relation_role,
    currentPerson.name,
    calculatedAge,
    isSelf
  );

  const isBlown = candleBlown[currentPerson.id] || false;
  const currentBalloons = balloonCounts[currentPerson.id] ?? 5;

  return (
    <section
      aria-label="Kartu Perayaan Ulang Tahun Keluarga"
      style={{
        margin: "0 20px 16px",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: "22px",
          padding: "18px 18px 16px",
          background:
            "linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fef2f2 80%, #fff1f2 100%)",
          border: "1.5px solid #fed7aa",
          boxShadow: "0 10px 28px -6px rgba(249, 115, 22, 0.16)",
          overflow: "hidden",
        }}
      >
        {/* Dekorasi Floating Partikel (CSS Keyframes) */}
        <style>{`
          @keyframes gentleBounce {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-4px) rotate(4deg); }
          }
          @keyframes crownWiggle {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(12deg) scale(1.1); }
          }
          @keyframes floatUpFade {
            0% { transform: translateY(0) scale(0.8); opacity: 1; }
            100% { transform: translateY(-80px) scale(1.3); opacity: 0; }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.35); }
            50% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
          }
        `}</style>

        {/* Floating Hearts / Balloons yang dilempar saat tap */}
        {floatingHearts.map((item) => (
          <div
            key={item.id}
            style={{
              position: "absolute",
              bottom: "40px",
              left: `${item.left}%`,
              fontSize: "24px",
              pointerEvents: "none",
              animation: "floatUpFade 1.6s ease-out forwards",
              zIndex: 10,
            }}
          >
            {item.char}
          </div>
        ))}

        {/* Decorative corner stars SVG */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-15px",
            right: "-15px",
            width: "90px",
            height: "90px",
            opacity: 0.12,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 100 100" fill="#ea580c">
            <polygon points="50,0 63,35 100,50 63,65 50,100 37,65 0,50 37,35" />
          </svg>
        </div>

        {/* Top Header Bar: Badge & Tombol Tutup */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "999px",
                background: "#f97316",
                color: "#ffffff",
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                boxShadow: "0 2px 6px rgba(249, 115, 22, 0.3)",
              }}
            >
              <span>🎉</span>
              <span>{wishes.tag}</span>
            </span>

            {birthdayMembers.length > 1 && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#ea580c",
                  background: "#ffedd5",
                  padding: "2px 8px",
                  borderRadius: "99px",
                }}
              >
                {activeIdx + 1} dari {birthdayMembers.length}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Tutup pemberitahuan ulang tahun"
            style={{
              background: "rgba(255, 255, 255, 0.6)",
              border: "none",
              color: "#9a3412",
              fontSize: "13px",
              fontWeight: 700,
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            title="Sembunyikan kartu ini untuk sesi ini"
          >
            ✕
          </button>
        </div>

        {/* Main Body: Avatar dengan Mahkota + Info Ucapan */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            marginBottom: "14px",
          }}
        >
          {/* Avatar Container with Crown */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Animated Crown / Topi Pesta */}
            <div
              style={{
                position: "absolute",
                top: "-14px",
                right: "-6px",
                fontSize: "22px",
                zIndex: 3,
                animation: "crownWiggle 2.5s ease-in-out infinite",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
              }}
              title="Raja/Ratu Hari Ini!"
            >
              👑
            </div>

            {/* Avatar Circle */}
            <div
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)",
                border: "2.5px solid #ffffff",
                boxShadow: "0 4px 12px rgba(249, 115, 22, 0.22)",
                display: "grid",
                placeItems: "center",
                fontSize: "28px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {currentPerson.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPerson.avatar_url}
                  alt={currentPerson.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span>{getDefaultRoleAvatar(currentPerson.relation_role)}</span>
              )}
            </div>
          </div>

          {/* Texts & Warm Wishes */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: "0 0 2px 0",
                fontSize: "16px",
                fontWeight: 800,
                color: "#7c2d12",
                lineHeight: 1.3,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <span>{wishes.title}</span>
            </h2>

            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#c2410c",
                marginBottom: "6px",
              }}
            >
              {wishes.subtitle}
            </div>

            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#9a3412",
                lineHeight: 1.48,
                background: "rgba(255, 255, 255, 0.65)",
                padding: "8px 12px",
                borderRadius: "12px",
                border: "1px dashed #fdba74",
              }}
            >
              “{wishes.quote}”
            </p>
          </div>
        </div>

        {/* Action Buttons: Tiup Lilin & Kirim Balon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            paddingTop: "6px",
          }}
        >
          {/* Tombol Tiup Lilin */}
          <button
            type="button"
            onClick={() => handleBlowCandle(currentPerson.id)}
            style={{
              flex: "1 1 auto",
              minWidth: "140px",
              padding: "9px 14px",
              borderRadius: "12px",
              background: isBlown
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
              color: "#ffffff",
              border: "none",
              fontSize: "12.5px",
              fontWeight: 750,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              boxShadow: isBlown
                ? "0 3px 10px rgba(16, 185, 129, 0.25)"
                : "0 3px 10px rgba(234, 88, 12, 0.25)",
              transition: "all 0.2s ease",
            }}
          >
            <span>{isBlown ? "✨ Lilin Tertiup!" : "🎂 Tiup Lilin"}</span>
            <span style={{ fontSize: "14px" }}>{isBlown ? "💨" : "🕯️"}</span>
          </button>

          {/* Tombol Kirim Balon / Pelukan Kasih Sayang */}
          <button
            type="button"
            onClick={() => handleSendBalloon(currentPerson.id)}
            style={{
              padding: "9px 14px",
              borderRadius: "12px",
              background: "#ffffff",
              border: "1.5px solid #f97316",
              color: "#c2410c",
              fontSize: "12.5px",
              fontWeight: 750,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(249, 115, 22, 0.12)",
              transition: "transform 0.1s active",
            }}
          >
            <span>🎈 Kasih Balon</span>
            <span
              style={{
                background: "#ffedd5",
                color: "#ea580c",
                fontSize: "11px",
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: "999px",
                marginLeft: "2px",
              }}
            >
              {currentBalloons}
            </span>
          </button>

          {/* Jika ada lebih dari 1 member berulang tahun hari ini: tombol navigasi */}
          {birthdayMembers.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveIdx((prev) => (prev + 1) % birthdayMembers.length)}
              style={{
                padding: "9px 12px",
                borderRadius: "12px",
                background: "#ffedd5",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
              }}
              title="Lihat anggota keluarga lain yang ulang tahun hari ini"
            >
              Selanjutnya ➔
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
