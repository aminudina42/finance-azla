"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [logoSettings, setLogoSettings] = useState<{
    type: "emoji" | "image";
    emoji: string;
    bg: string;
    image: string;
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("logoSettings");
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return {
      type: "image",
      emoji: "💳",
      bg: "#ffffff",
      image: "/logo-icon.png",
    };
  });
  const [logoImgError, setLogoImgError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung ke server. Periksa koneksi internet Anda.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        setSuccessMsg("Pendaftaran berhasil! Silakan login (atau cek email jika konfirmasi aktif).");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung ke server. Periksa koneksi internet Anda.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg("");
    try {
      const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungkan ke Google.";
      setErrorMsg(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main
      className="page active"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        background: "linear-gradient(180deg, #eef8ff 0%, #f7fbff 280px, #ffffff 650px)",
      }}
    >
      {/* Sky backdrop */}
      <div
        className="sky"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "260px",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <svg viewBox="0 0 1000 300" preserveAspectRatio="xMidYMin slice" style={{ width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="skyLoginG" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#bfe5ff" stopOpacity=".85" />
              <stop offset="1" stopColor="#f7fbff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 170C80 150 85 108 165 124 220 70 290 98 323 140 390 102 438 117 478 155 548 99 625 119 665 155 725 86 808 100 840 144 900 91 960 113 1000 151V300H0Z"
            fill="url(#skyLoginG)"
          />
          <g fill="#fff" opacity=".55">
            <ellipse cx="755" cy="142" rx="82" ry="35" />
            <ellipse cx="809" cy="125" rx="61" ry="48" />
            <ellipse cx="867" cy="153" rx="83" ry="33" />
            <ellipse cx="922" cy="111" rx="55" ry="44" />
          </g>
          <path d="M610 222Q725 174 810 215T1000 205V300H610Z" fill="#dcefff" opacity=".65" />
        </svg>
      </div>

      {/* Floating Card Login */}
      <div
        style={{
          width: "100%",
          maxWidth: "410px",
          background: "#ffffff",
          borderRadius: "24px",
          border: "1px solid var(--border)",
          boxShadow: "0 14px 38px rgba(38, 111, 183, 0.1)",
          padding: "36px 26px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            {logoSettings.type === "image" && logoSettings.image && !logoImgError ? (
              <div
                style={{
                  width: "76px",
                  height: "76px",
                  borderRadius: "20px",
                  background: logoSettings.bg || "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 24px rgba(40, 127, 240, 0.12)",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSettings.image}
                  alt="Logo"
                  crossOrigin="anonymous"
                  onError={() => setLogoImgError(true)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: "6px",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: "76px",
                  height: "76px",
                  borderRadius: "20px",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 24px rgba(40, 127, 240, 0.12)",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-icon.png"
                  alt="Catat Keluarga"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-fraunces), serif",
              fontSize: "26px",
              color: "var(--navy)",
              fontWeight: 800,
              letterSpacing: "-0.5px",
            }}
          >
            Catat Keluarga
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
            Manajemen Keuangan Cerdas Keluarga
          </p>
        </div>

        {/* Notifikasi Pesan Error / Sukses */}
        {errorMsg && (
          <div
            style={{
              color: "var(--red)",
              fontSize: "13px",
              textAlign: "center",
              background: "rgba(240, 68, 103, 0.08)",
              border: "1px solid rgba(240, 68, 103, 0.2)",
              padding: "10px 14px",
              borderRadius: "10px",
              marginBottom: "18px",
              lineHeight: "1.4",
            }}
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              color: "var(--teal)",
              fontSize: "13px",
              textAlign: "center",
              background: "rgba(22, 168, 154, 0.08)",
              border: "1px solid rgba(22, 168, 154, 0.2)",
              padding: "10px 14px",
              borderRadius: "10px",
              marginBottom: "18px",
              lineHeight: "1.4",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* 1. Tombol Login dengan Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "#ffffff",
            border: "1.5px solid var(--border)",
            color: "var(--text)",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(38, 111, 183, 0.06)",
            transition: "all 0.15s ease",
          }}
        >
          <svg style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{googleLoading ? "Menghubungkan..." : "Masuk dengan Google"}</span>
        </button>

        {/* Pembatas / Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "20px 0",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            atau dengan email
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* 2. Form Login Email & Password */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="fg" style={{ margin: 0 }}>
            <div className="fl" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Email
            </div>
            <input
              type="email"
              className="fi"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@keluarga.com"
              required
              style={{
                background: "#f8fbff",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "var(--navy)",
              }}
            />
          </div>

          <div className="fg" style={{ margin: 0 }}>
            <div className="fl" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Password
            </div>
            <input
              type="password"
              className="fi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                background: "#f8fbff",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "var(--navy)",
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
              color: "#ffffff",
              fontWeight: 750,
              fontSize: "14px",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(40, 127, 240, 0.28)",
              marginTop: "6px",
              transition: "transform 0.15s ease",
            }}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            className="btn-primary"
            style={{
              background: "#f1f8fd",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontSize: "13px",
              fontWeight: 700,
              padding: "11px",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            disabled={loading}
          >
            Daftar Akun Baru
          </button>
        </form>
      </div>
    </main>
  );
}
