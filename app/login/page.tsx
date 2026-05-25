"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [logoSettings, setLogoSettings] = useState({
    type: "emoji",
    emoji: "💳",
    bg: "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
    image: "",
  });

  useEffect(() => {
    async function loadLogo() {
      try {
        const { data } = await supabase.from("app_settings").select("*");
        if (data) {
          const settingsMap = new Map(data.map((s) => [s.key, s.value]));
          const lType = settingsMap.get("website_logo_type") as "emoji" | "image" | undefined;
          const lEmoji = settingsMap.get("website_logo_emoji");
          const lBg = settingsMap.get("website_logo_bg");
          const lImg = settingsMap.get("website_logo_image");
          setLogoSettings({
            type: lType || "emoji",
            emoji: lEmoji || "💳",
            bg: lBg || "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
            image: lImg || "",
          });
        }
      } catch (err) {
        console.error("Failed to load login logo settings:", err);
      }
    }
    loadLogo();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else if (data.user) {
      setSuccessMsg("Pendaftaran berhasil! Silakan login (atau cek email jika verifikasi aktif).");
    }
    setLoading(false);
  };

  return (
    <main className="page active" style={{ justifyContent: "center", display: "flex", flexDirection: "column", padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          {logoSettings.type === "image" && logoSettings.image ? (
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: logoSettings.bg || "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid var(--border)",
                flexShrink: 0
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSettings.image}
                alt="Logo"
                crossOrigin="anonymous"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: "5px"
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: logoSettings.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                color: "#fff",
                border: "1px solid var(--border)"
              }}
            >
              {logoSettings.emoji}
            </div>
          )}
        </div>
        <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: "28px" }}>Dompet Pintar</h1>
        <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "5px" }}>Login untuk mengatur keuangan keluarga</p>
      </div>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {errorMsg && <div style={{ color: "var(--red)", fontSize: "13px", textAlign: "center", background: "rgba(255, 79, 109, 0.1)", padding: "10px", borderRadius: "8px" }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: "var(--teal)", fontSize: "13px", textAlign: "center", background: "rgba(0, 201, 167, 0.1)", padding: "10px", borderRadius: "8px" }}>{successMsg}</div>}

        <div className="fg">
          <div className="fl">Email</div>
          <input
            type="email"
            className="fi"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="suami@istri.com"
            required
          />
        </div>
        <div className="fg">
          <div className="fl">Password</div>
          <input
            type="password"
            className="fi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ background: "linear-gradient(135deg, var(--purple), var(--pink))", marginTop: "10px" }}
          disabled={loading}
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>

        <button
          type="button"
          onClick={handleSignUp}
          className="btn-primary"
          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
          disabled={loading}
        >
          Daftar Akun Baru
        </button>
      </form>
    </main>
  );
}
