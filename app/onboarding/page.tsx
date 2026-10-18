"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentKeluarga } = useApp();

  const codeFromUrl = searchParams.get("code") || "";

  const [mode, setMode] = useState<"create" | "join">(codeFromUrl ? "join" : "create");
  const [namaKeluarga, setNamaKeluarga] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Pre-fill user display name from session user metadata
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      // If user already belongs to a family, redirect to dashboard
      if (currentKeluarga?.id) {
        router.replace("/");
        return;
      }

      const u = session.user;
      const initialName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "";
      if (initialName) {
        setDisplayName(initialName);
        if (!namaKeluarga && mode === "create") {
          setNamaKeluarga(`Keluarga ${initialName}`);
        }
      }
    }

    checkUser();
  }, [currentKeluarga, router, mode, namaKeluarga]);

  // Handle Tab switch
  const handleSelectMode = (newMode: "create" | "join") => {
    setMode(newMode);
    setErrorMsg("");
    setSuccessMsg("");
    if (newMode === "create" && displayName && !namaKeluarga) {
      setNamaKeluarga(`Keluarga ${displayName}`);
    }
  };

  // Submit Handler: Buat Keluarga Baru
  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKeluarga.trim()) {
      setErrorMsg("Nama keluarga wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.rpc("create_new_keluarga", {
        p_nama_keluarga: namaKeluarga.trim(),
        p_display_name: displayName.trim() || "Admin",
      });

      if (error) throw error;

      if (data && data.success) {
        setSuccessMsg(`Berhasil membuat "${data.nama_keluarga}"! Mengalihkan ke dashboard...`);
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      } else {
        setErrorMsg(data?.message || "Gagal membuat keluarga baru.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat membuat keluarga.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler: Gabung Keluarga
  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setErrorMsg("Kode undangan wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.rpc("join_keluarga_by_code", {
        p_invite_code: inviteCode.trim(),
        p_display_name: displayName.trim() || "Anggota",
      });

      if (error) throw error;

      if (data && data.success) {
        setSuccessMsg(`Berhasil bergabung dengan "${data.nama_keluarga}"! Mengalihkan...`);
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      } else {
        setErrorMsg(data?.message || "Kode undangan tidak valid.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal bergabung dengan keluarga.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
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
      {/* Sky backdrop selaras dengan Beranda */}
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
            <linearGradient id="skyOnboardingG" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#bfe5ff" stopOpacity=".85" />
              <stop offset="1" stopColor="#f7fbff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 170C80 150 85 108 165 124 220 70 290 98 323 140 390 102 438 117 478 155 548 99 625 119 665 155 725 86 808 100 840 144 900 91 960 113 1000 151V300H0Z"
            fill="url(#skyOnboardingG)"
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

      {/* Floating Card Onboarding */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "24px",
          border: "1px solid var(--border)",
          boxShadow: "0 14px 38px rgba(38, 111, 183, 0.1)",
          padding: "36px 26px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header Onboarding */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "20px",
              background: "#ffffff",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(40, 127, 240, 0.12)",
              display: "grid",
              placeItems: "center",
              fontSize: "32px",
              margin: "0 auto 16px auto",
            }}
          >
            {mode === "create" ? "🏠" : "🔗"}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-fraunces), serif",
              fontSize: "24px",
              color: "var(--navy)",
              fontWeight: 800,
            }}
          >
            Selamat Datang di Catat Keluarga
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
            Mulai kelola pos keuangan keluarga bersama pasangan
          </p>
        </div>

        {/* Reason Alert Banner if user was removed or left */}
        {searchParams.get("reason") === "removed" && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              color: "#be123c",
              fontSize: "12.5px",
              lineHeight: "1.45"
            }}
          >
            <span style={{ fontSize: "18px" }}>ℹ️</span>
            <div>
              <strong>Informasi Keanggotaan:</strong> Anda saat ini tidak lagi terhubung dengan keluarga sebelumnya. Anda dapat membuat keluarga baru atau memasukkan kode undangan keluarga lain di bawah ini.
            </div>
          </div>
        )}
        {searchParams.get("reason") === "left" && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              color: "#1e40af",
              fontSize: "12.5px",
              lineHeight: "1.45"
            }}
          >
            <span style={{ fontSize: "18px" }}>👋</span>
            <div>
              <strong>Anda telah keluar dari keluarga.</strong> Silakan buat keluarga baru atau gabung ke keluarga lain dengan memasukkan kode undangan di bawah ini.
            </div>
          </div>
        )}

        {/* Tab Pilihan Mode: Buat vs Gabung */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            background: "var(--s1)",
            padding: "4px",
            borderRadius: "14px",
            marginBottom: "24px",
            border: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => handleSelectMode("create")}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              background: mode === "create" ? "#ffffff" : "transparent",
              color: mode === "create" ? "var(--navy)" : "var(--muted)",
              boxShadow: mode === "create" ? "0 2px 8px rgba(38, 111, 183, 0.1)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            🏠 Buat Keluarga
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("join")}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              background: mode === "join" ? "#ffffff" : "transparent",
              color: mode === "join" ? "var(--navy)" : "var(--muted)",
              boxShadow: mode === "join" ? "0 2px 8px rgba(38, 111, 183, 0.1)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            🔗 Gabung Keluarga
          </button>
        </div>

        {/* Feedback Alert */}
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

        {/* Form Mode: Buat Keluarga Baru */}
        {mode === "create" && (
          <form onSubmit={handleCreateFamily} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="fg" style={{ margin: 0 }}>
              <div className="fl" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
                Nama Keluarga / Rumah Tangga
              </div>
              <input
                type="text"
                className="fi"
                value={namaKeluarga}
                onChange={(e) => setNamaKeluarga(e.target.value)}
                placeholder="Contoh: Keluarga Kami"
                required
                style={{
                  background: "#f8fbff",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "11px 14px",
                  fontSize: "14px",
                  color: "var(--navy)",
                  fontWeight: 600,
                }}
              />
            </div>

            <div className="fg" style={{ margin: 0 }}>
              <div className="fl" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
                Nama Panggilan Anda
              </div>
              <input
                type="text"
                className="fi"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Contoh: Ayah / Suami"
                required
                style={{
                  background: "#f8fbff",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "11px 14px",
                  fontSize: "14px",
                  color: "var(--navy)",
                }}
              />
            </div>

            {/* Benefit Box */}
            <div
              style={{
                background: "var(--s1)",
                border: "1px solid var(--border)",
                padding: "12px 14px",
                borderRadius: "12px",
                fontSize: "12px",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>👑</span>
                <span>Anda otomatis menjadi <strong>Admin</strong> keluarga.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📦</span>
                <span>Disediakan amplop pos awal yang bisa disesuaikan.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📋</span>
                <span>Mendapatkan <strong>Kode Undangan</strong> untuk dibagikan ke pasangan.</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
                color: "#ffffff",
                fontWeight: 750,
                fontSize: "14px",
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(40, 127, 240, 0.28)",
                marginTop: "4px",
              }}
            >
              {loading ? "Membuat Keluarga..." : "Buat Keluarga & Mulai 🚀"}
            </button>
          </form>
        )}

        {/* Form Mode: Gabung Keluarga yang Ada */}
        {mode === "join" && (
          <form onSubmit={handleJoinFamily} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="fg" style={{ margin: 0 }}>
              <div className="fl" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
                Kode Undangan Keluarga
              </div>
              <input
                type="text"
                className="fi"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="CK-XXXXXX"
                required
                style={{
                  background: "#f8fbff",
                  border: "1.5px dashed var(--primary)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontSize: "16px",
                  fontFamily: "monospace",
                  fontWeight: 800,
                  letterSpacing: "1.5px",
                  color: "var(--navy)",
                  textAlign: "center",
                  textTransform: "uppercase",
                }}
              />
            </div>

            <div className="fg" style={{ margin: 0 }}>
              <div className="fl" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
                Nama Panggilan Anda
              </div>
              <input
                type="text"
                className="fi"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Contoh: Ibu / Istri"
                required
                style={{
                  background: "#f8fbff",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "11px 14px",
                  fontSize: "14px",
                  color: "var(--navy)",
                }}
              />
            </div>

            {/* Info Box */}
            <div
              style={{
                background: "var(--s1)",
                border: "1px solid var(--border)",
                padding: "12px 14px",
                borderRadius: "12px",
                fontSize: "12px",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🤝</span>
                <span>Langsung terhubung dengan dompet yang dibuat pasangan Anda.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚡</span>
                <span>Catatan belanja dan sisa budget tersinkronisasi realtime.</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, var(--teal), #00a88c)",
                color: "#ffffff",
                fontWeight: 750,
                fontSize: "14px",
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(22, 168, 154, 0.28)",
                marginTop: "4px",
              }}
            >
              {loading ? "Memverifikasi Kode..." : "Gabung Keluarga Sekarang →"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--navy)", fontWeight: 700 }}>
          Memuat halaman onboarding...
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

