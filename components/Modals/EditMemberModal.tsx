"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import type { Member, StatusKeluarga } from "@/lib/types";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  isAdmin: boolean;
  isSelf: boolean;
  isSoleAdmin: boolean;
  onSave: (memberId: string, displayName: string, role: "admin" | "member", statusKeluarga: StatusKeluarga) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onLeaveFamily?: () => Promise<void>;
}

export default function EditMemberModal({
  isOpen,
  onClose,
  member,
  isAdmin,
  isSelf,
  isSoleAdmin,
  onSave,
  onRemove,
  onLeaveFamily,
}: EditMemberModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [statusKeluarga, setStatusKeluarga] = useState<StatusKeluarga>("suami");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  useEffect(() => {
    if (member) {
      setDisplayName(member.display_name || "");
      setRole(member.role || "member");
      setStatusKeluarga(member.status_keluarga || (member.role === "admin" ? "suami" : "istri"));
      setErrorMsg("");
      setConfirmDeleteOpen(false);
      setConfirmLeaveOpen(false);
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = displayName.trim();
    if (!trimmed) {
      setErrorMsg("Nama panggilan tidak boleh kosong.");
      return;
    }

    if (isSoleAdmin && role === "member") {
      setErrorMsg("Keluarga harus memiliki minimal satu Admin. Tunjuk anggota lain sebagai Admin terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(member.id, trimmed, role, statusKeluarga);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menyimpan perubahan anggota.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteRemove = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await onRemove(member.id);
      setConfirmDeleteOpen(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengeluarkan anggota.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteLeave = async () => {
    if (!onLeaveFamily) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await onLeaveFamily();
      setConfirmLeaveOpen(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal keluar dari keluarga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px 2px" }}>
        {/* Eyebrow & Title */}
        <div>
          <div style={{
            fontSize: "10.5px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--muted)",
            marginBottom: "4px"
          }}>
            HAK AKSES &amp; PROFIL KELUARGA
          </div>
          <div className="mt" style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)", fontSize: "20px" }}>
            {isSelf ? "Kelola Profil Anda" : `Kelola Anggota: ${member.display_name}`}
          </div>
        </div>

        {/* Member Preview Card (Passport Style) */}
        <div
          style={{
            background: "linear-gradient(135deg, #f8fbfe 0%, #edf5fc 100%)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: role === "admin" ? "var(--primary, #287ff0)" : "var(--teal, #16a89a)",
              display: "grid",
              placeItems: "center",
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: 800,
              border: "2px solid #ffffff",
              boxShadow: role === "admin"
                ? "0 2px 8px rgba(40, 127, 240, 0.20)"
                : "0 2px 8px rgba(22, 168, 154, 0.20)",
              flexShrink: 0
            }}
          >
            {statusKeluarga === "suami" ? "👨‍💼" : statusKeluarga === "istri" ? "👩" : "🧒"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: 750, color: "var(--navy)" }}>
                {displayName || member.display_name}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 750,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: statusKeluarga === "suami"
                    ? "rgba(40,127,240,0.12)"
                    : statusKeluarga === "istri"
                    ? "rgba(22,168,154,0.12)"
                    : "rgba(244,163,59,0.14)",
                  color: statusKeluarga === "suami"
                    ? "#287ff0"
                    : statusKeluarga === "istri"
                    ? "#16a89a"
                    : "#d97706"
                }}
              >
                {statusKeluarga === "suami" ? "Suami" : statusKeluarga === "istri" ? "Istri" : "Anak"}
              </span>
              {isSelf && (
                <span style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(40,127,240,0.14)",
                  color: "var(--primary)"
                }}>
                  Anda
                </span>
              )}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
              {role === "admin" ? "👑 Memiliki hak akses penuh sebagai Admin" : "👤 Anggota keluarga (Pencatat transaksi)"}
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              padding: "10px 12px",
              borderRadius: "10px",
              fontSize: "12.5px",
              lineHeight: "1.4"
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Field 1: Nama Panggilan */}
          <div className="fg" style={{ margin: 0 }}>
            <label className="fl" style={{ fontSize: "11px", fontWeight: 750, color: "var(--navy)" }}>
              Nama Panggilan di Keluarga
            </label>
            <input
              type="text"
              className="fi"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Ayah, Bunda, Istri, Kakak..."
              maxLength={40}
              required
              disabled={isSubmitting || (!isAdmin && !isSelf)}
              style={{
                fontSize: "14px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "var(--surface)",
                border: "1.5px solid var(--border)"
              }}
            />
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
              Nama ini akan muncul pada riwayat catatan pengeluaran, kasir, dan amplop dompet.
            </div>
          </div>

          {/* Field 2: Status di Keluarga (Suami, Istri, Anak) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="fl" style={{ fontSize: "11px", fontWeight: 750, color: "var(--navy)", margin: 0 }}>
                Status di Keluarga
              </label>
              <span style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: 600 }}>
                Hubungan Rumah Tangga
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {/* Option Suami */}
              <div
                onClick={() => {
                  if (isAdmin || isSelf) setStatusKeluarga("suami");
                }}
                style={{
                  border: statusKeluarga === "suami" ? "2px solid #287ff0" : "1.5px solid var(--border)",
                  background: statusKeluarga === "suami" ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" : "var(--surface)",
                  borderRadius: "12px",
                  padding: "10px 8px",
                  cursor: isAdmin || isSelf ? "pointer" : "not-allowed",
                  opacity: isAdmin || isSelf ? 1 : 0.6,
                  transition: "all 0.18s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "4px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: "18px" }}>👨‍💼</span>
                  {statusKeluarga === "suami" && <span style={{ fontSize: "11px", color: "#287ff0", fontWeight: 800 }}>✓</span>}
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 750, color: "var(--navy)", marginTop: "2px" }}>
                  Suami
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--text-secondary)", lineHeight: "1.2" }}>
                  Kepala Keluarga
                </div>
              </div>

              {/* Option Istri */}
              <div
                onClick={() => {
                  if (isAdmin || isSelf) setStatusKeluarga("istri");
                }}
                style={{
                  border: statusKeluarga === "istri" ? "2px solid #16a89a" : "1.5px solid var(--border)",
                  background: statusKeluarga === "istri" ? "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)" : "var(--surface)",
                  borderRadius: "12px",
                  padding: "10px 8px",
                  cursor: isAdmin || isSelf ? "pointer" : "not-allowed",
                  opacity: isAdmin || isSelf ? 1 : 0.6,
                  transition: "all 0.18s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "4px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: "18px" }}>👩</span>
                  {statusKeluarga === "istri" && <span style={{ fontSize: "11px", color: "#16a89a", fontWeight: 800 }}>✓</span>}
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 750, color: "var(--navy)", marginTop: "2px" }}>
                  Istri
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--text-secondary)", lineHeight: "1.2" }}>
                  Ibu Rumah Tangga
                </div>
              </div>

              {/* Option Anak */}
              <div
                onClick={() => {
                  if (isAdmin || isSelf) setStatusKeluarga("anak");
                }}
                style={{
                  border: statusKeluarga === "anak" ? "2px solid #f4a33b" : "1.5px solid var(--border)",
                  background: statusKeluarga === "anak" ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : "var(--surface)",
                  borderRadius: "12px",
                  padding: "10px 8px",
                  cursor: isAdmin || isSelf ? "pointer" : "not-allowed",
                  opacity: isAdmin || isSelf ? 1 : 0.6,
                  transition: "all 0.18s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "4px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: "18px" }}>🧒</span>
                  {statusKeluarga === "anak" && <span style={{ fontSize: "11px", color: "#f4a33b", fontWeight: 800 }}>✓</span>}
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 750, color: "var(--navy)", marginTop: "2px" }}>
                  Anak
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--text-secondary)", lineHeight: "1.2" }}>
                  Putra / Putri
                </div>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>
              Status ini digunakan untuk label catatan transaksi, kasir, dan pembukuan keluarga.
            </div>
          </div>

          {/* Field 3: Peran & Wewenang Akun (Role Selector) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label className="fl" style={{ fontSize: "11px", fontWeight: 750, color: "var(--navy)", margin: 0 }}>
              Peran &amp; Wewenang Akun
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {/* Option Admin */}
              <div
                onClick={() => {
                  if (isAdmin) setRole("admin");
                }}
                style={{
                  border: role === "admin" ? "2px solid #2563eb" : "1.5px solid var(--border)",
                  background: role === "admin" ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" : "var(--surface)",
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: isAdmin ? "pointer" : "not-allowed",
                  opacity: isAdmin ? 1 : 0.6,
                  transition: "all 0.18s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "15px" }}>👑</span>
                  {role === "admin" && (
                    <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 800 }}>✓</span>
                  )}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 750, color: "var(--navy)", marginTop: "4px" }}>
                  Admin
                </div>
                <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", lineHeight: "1.3" }}>
                  Kelola pos, siklus, anggota &amp; aturan keluarga.
                </div>
              </div>

              {/* Option Member */}
              <div
                onClick={() => {
                  if (!isAdmin) return;
                  if (isSoleAdmin) {
                    setErrorMsg("Keluarga harus memiliki minimal satu Admin. Tunjuk anggota lain sebagai Admin terlebih dahulu.");
                    return;
                  }
                  setRole("member");
                }}
                style={{
                  border: role === "member" ? "2px solid #059669" : "1.5px solid var(--border)",
                  background: role === "member" ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" : "var(--surface)",
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: !isAdmin || isSoleAdmin ? "not-allowed" : "pointer",
                  opacity: !isAdmin || isSoleAdmin ? 0.6 : 1,
                  transition: "all 0.18s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "15px" }}>👤</span>
                  {role === "member" && (
                    <span style={{ fontSize: "12px", color: "#059669", fontWeight: 800 }}>✓</span>
                  )}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 750, color: "var(--navy)", marginTop: "4px" }}>
                  Anggota
                </div>
                <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", lineHeight: "1.3" }}>
                  Catat transaksi, kasir, dan lihat laporan keluarga.
                </div>
              </div>
            </div>

            {/* Note if sole admin */}
            {isSoleAdmin && (
              <div style={{
                fontSize: "11px",
                color: "#b45309",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                padding: "8px 10px",
                marginTop: "2px"
              }}>
                🔒 <strong>Admin Tunggal</strong>: Anggota ini adalah satu-satunya Admin saat ini. Angkat anggota lain sebagai Admin terlebih dahulu jika ingin menurunkan perannya.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                background: "var(--s1)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "10px 22px",
                borderRadius: "10px",
                background: "var(--primary, #287ff0)",
                border: "none",
                color: "#ffffff",
                fontWeight: 750,
                fontSize: "13px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(40, 127, 240, 0.25)"
              }}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>

        {/* Destructive Zone: Keluarkan / Tinggalkan Keluarga */}
        <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "14px", marginTop: "4px" }}>
          {/* Case A: Admin kicking other member */}
          {isAdmin && !isSelf && (
            <div>
              {!confirmDeleteOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    borderRadius: "10px",
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#be123c",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <span>🚪</span>
                  <span>Keluarkan {member.display_name} dari Keluarga</span>
                </button>
              ) : (
                <div
                  style={{
                    background: "#fff1f2",
                    border: "1.5px solid #fecdd3",
                    borderRadius: "12px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}
                >
                  <div style={{ fontSize: "12.5px", fontWeight: 750, color: "#9f1239" }}>
                    ⚠️ Konfirmasi: Keluarkan dari Keluarga?
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#be123c", lineHeight: "1.4" }}>
                    Akses <strong>{member.display_name}</strong> ke keluarga ini akan langsung dicabut. Data catatan pengeluaran lama yang pernah dicatat tetap aman tersimpan.
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(false)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #fecdd3",
                        color: "var(--text)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteRemove}
                      disabled={isSubmitting}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "8px",
                        background: "#e11d48",
                        border: "none",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 750,
                        cursor: isSubmitting ? "not-allowed" : "pointer"
                      }}
                    >
                      {isSubmitting ? "Memproses..." : "Ya, Keluarkan"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Case B: User leaving family by themselves */}
          {isSelf && onLeaveFamily && (
            <div>
              {!confirmLeaveOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isSoleAdmin) {
                      setErrorMsg("Anda adalah satu-satunya Admin. Tunjuk anggota keluarga lain sebagai Admin terlebih dahulu sebelum keluar.");
                      return;
                    }
                    setConfirmLeaveOpen(true);
                  }}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    borderRadius: "10px",
                    background: "#fef2f2",
                    border: "1px solid #fee2e2",
                    color: "#991b1b",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <span>🚶‍♂️</span>
                  <span>Keluar dari Keluarga Ini (Tinggalkan)</span>
                </button>
              ) : (
                <div
                  style={{
                    background: "#fff1f2",
                    border: "1.5px solid #fecdd3",
                    borderRadius: "12px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}
                >
                  <div style={{ fontSize: "12.5px", fontWeight: 750, color: "#9f1239" }}>
                    ⚠️ Konfirmasi: Tinggalkan Keluarga?
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#be123c", lineHeight: "1.4" }}>
                    Anda akan melepaskan keanggotaan dari keluarga ini dan diarahkan ke layar buat atau gabung keluarga baru.
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setConfirmLeaveOpen(false)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #fecdd3",
                        color: "var(--text)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteLeave}
                      disabled={isSubmitting}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "8px",
                        background: "#e11d48",
                        border: "none",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 750,
                        cursor: isSubmitting ? "not-allowed" : "pointer"
                      }}
                    >
                      {isSubmitting ? "Memproses..." : "Ya, Tinggalkan Keluarga"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

