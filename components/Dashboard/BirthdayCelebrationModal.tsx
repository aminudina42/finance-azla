"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import type { HealthFamilyMember } from "@/lib/types";

interface BirthdayCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: HealthFamilyMember;
  age: number;
  wishes: {
    title: string;
    subtitle: string;
    quote: string;
    tag: string;
  };
  isBlown: boolean;
  balloonCount: number;
  onBlowCandle: (id: string) => void;
  onSendBalloon: (id: string) => void;
  avatarIcon: string;
}

export default function BirthdayCelebrationModal({
  isOpen,
  onClose,
  member,
  age,
  wishes,
  isBlown,
  balloonCount,
  onBlowCandle,
  onSendBalloon,
  avatarIcon,
}: BirthdayCelebrationModalProps) {
  const [floatingItems, setFloatingItems] = useState<{ id: number; char: string; left: number }[]>([]);

  // Trigger festive confetti upon opening modal
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f97316", "#fbbf24", "#ec4899", "#3b82f6", "#10b981"],
        });
      } catch {
        // ignore if canvas not supported
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBlow = () => {
    onBlowCandle(member.id);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }
  };

  const handleBalloon = () => {
    onSendBalloon(member.id);
    const chars = ["🎈", "💖", "✨", "🎉", "🌟"];
    const randomChar = chars[Math.floor(Math.random() * chars.length)];
    const newItem = {
      id: Date.now() + Math.random(),
      char: randomChar,
      left: Math.floor(Math.random() * 60) + 20,
    };
    setFloatingItems((prev) => [...prev, newItem]);
    setTimeout(() => {
      setFloatingItems((prev) => prev.filter((item) => item.id !== newItem.id));
    }, 1600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bday-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "grid",
        placeItems: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.9); opacity: 1; }
          100% { transform: translateY(-90px) scale(1.3); opacity: 0; }
        }
        @keyframes crownWiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(12deg) scale(1.1); }
        }
      `}</style>

      {/* Floating particles */}
      {floatingItems.map((item) => (
        <div
          key={item.id}
          style={{
            position: "fixed",
            bottom: "30%",
            left: `${item.left}%`,
            fontSize: "28px",
            pointerEvents: "none",
            animation: "floatUp 1.5s ease-out forwards",
            zIndex: 10001,
          }}
        >
          {item.char}
        </div>
      ))}

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          borderRadius: "24px",
          background: "linear-gradient(145deg, #fff7ed 0%, #ffedd5 50%, #fef2f2 100%)",
          border: "1.5px solid #fed7aa",
          boxShadow: "0 20px 40px -10px rgba(249, 115, 22, 0.25)",
          padding: "24px 20px 20px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Tombol Tutup Silang */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Perayaan"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.8)",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: "14px",
            fontWeight: 800,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          ✕
        </button>

        {/* Badge Header */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "999px",
              background: "#f97316",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              boxShadow: "0 2px 8px rgba(249, 115, 22, 0.35)",
            }}
          >
            {wishes.tag}
          </span>
        </div>

        {/* Avatar with Crown */}
        <div style={{ position: "relative", width: "76px", height: "76px", margin: "0 auto 14px" }}>
          <div
            style={{
              position: "absolute",
              top: "-16px",
              right: "-6px",
              fontSize: "26px",
              zIndex: 3,
              animation: "crownWiggle 2.5s ease-in-out infinite",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
            }}
          >
            👑
          </div>
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)",
              border: "3px solid #ffffff",
              boxShadow: "0 6px 16px rgba(249, 115, 22, 0.28)",
              display: "grid",
              placeItems: "center",
              fontSize: "36px",
              overflow: "hidden",
            }}
          >
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatar_url}
                alt={member.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span>{avatarIcon}</span>
            )}
          </div>
        </div>

        {/* Title & Age */}
        <h2
          id="bday-modal-title"
          style={{
            margin: "0 0 4px",
            fontSize: "19px",
            fontWeight: 850,
            color: "#7c2d12",
            lineHeight: 1.25,
          }}
        >
          {wishes.title}
        </h2>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#ea580c", marginBottom: "12px" }}>
          Genap berusia {age} tahun hari ini!
        </div>

        {/* Quote / Warm Wishes */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            borderRadius: "14px",
            border: "1px dashed #fdba74",
            padding: "12px 14px",
            marginBottom: "18px",
            fontSize: "12.5px",
            lineHeight: 1.5,
            color: "#9a3412",
            fontStyle: "italic",
          }}
        >
          “{wishes.quote}”
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "10px" }}>
          {/* Blow Candle */}
          <button
            type="button"
            onClick={handleBlow}
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: "14px",
              background: isBlown
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              boxShadow: isBlown
                ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                : "0 4px 12px rgba(234, 88, 12, 0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            <span>{isBlown ? "✨ Lilin Tertiup!" : "🎂 Tiup Lilin"}</span>
            <span style={{ fontSize: "15px" }}>{isBlown ? "💨" : "🕯️"}</span>
          </button>

          {/* Send Balloon */}
          <button
            type="button"
            onClick={handleBalloon}
            style={{
              padding: "11px 16px",
              borderRadius: "14px",
              background: "#ffffff",
              border: "1.5px solid #f97316",
              color: "#c2410c",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(249, 115, 22, 0.12)",
            }}
          >
            <span>🎈 Beri Balon</span>
            <span
              style={{
                background: "#ffedd5",
                color: "#ea580c",
                fontSize: "11px",
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: "999px",
              }}
            >
              {balloonCount}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#9a3412",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            padding: "6px",
            textDecoration: "underline",
          }}
        >
          Tutup & Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}

