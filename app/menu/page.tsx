"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import AlertModal from "@/components/Modals/AlertModal";
import { useApp } from "@/lib/store";
import {
  AVAILABLE_MENUS,
  getMenuItem,
  MenuIcon,
  DEFAULT_QUICK_MENU,
} from "@/lib/menu-config";
import {
  SlidersHorizontal,
  ArrowLeft,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Search,
} from "lucide-react";

export default function SemuaMenuPage() {
  const router = useRouter();
  const {
    sessionUser,
    currentMember,
    currentKeluarga,
    logout,
    quickMenuItems,
    updateQuickMenuItems,
    menuIconOverrides,
  } = useApp();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Quick Menu Customization State
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const valid = (quickMenuItems && quickMenuItems.length > 0 ? quickMenuItems : DEFAULT_QUICK_MENU)
      .filter((id) => AVAILABLE_MENUS.some((m) => m.id === id));
    return valid.length > 0 ? valid : DEFAULT_QUICK_MENU;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => {
      setToastNotice(null);
    }, 2500);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Gagal logout:", err);
      setIsLoggingOut(false);
    }
  };

  const handleItemClick = (path: string) => {
    router.push(path);
  };

  const handleMove = (index: number, newIndex: number) => {
    if (newIndex < 0 || newIndex >= selectedIds.length) return;
    const updated = [...selectedIds];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setSelectedIds(updated);
  };

  const handleAdd = (id: string) => {
    if (selectedIds.includes(id)) return;
    if (selectedIds.length >= 5) {
      showToast("Maksimal 5 menu! Hapus salah satu menu terlebih dahulu.");
      return;
    }
    setSelectedIds([...selectedIds, id]);
  };

  const handleRemove = (id: string) => {
    setSelectedIds(selectedIds.filter((item) => item !== id));
  };

  const handleSaveQuickMenu = async () => {
    if (selectedIds.length === 0) {
      showToast("Pilih minimal 1 menu untuk diletakkan di Menu Cepat!");
      return;
    }
    setIsSaving(true);
    try {
      await updateQuickMenuItems(selectedIds);
      showToast("Menu Cepat beranda berhasil diperbarui! ✨");
      setIsCustomizing(false);
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan preferensi menu cepat.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMenus = AVAILABLE_MENUS.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-dvh pb-32" style={{ background: "var(--bg, #f8fafc)", color: "var(--text, #17375f)" }}>
      <PageHeader
        title={isCustomizing ? "Atur Menu Cepat" : "Semua Fitur"}
        subtitle={isCustomizing ? "Pilih & urutkan 5 menu utama di beranda" : "Katalog Menu & Akses Lengkap"}
        backHref="/"
        action={
          !isCustomizing ? (
            <button
              type="button"
              onClick={() => setIsCustomizing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <SlidersHorizontal size={14} />
              <span>Atur Beranda</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCustomizing(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>
          )
        }
      />

      <main className="max-w-xl mx-auto px-4 pt-4">
        {toastNotice && (
          <div className="mb-4 p-3 rounded-xl bg-blue-600 text-white text-xs font-bold text-center shadow-lg transition-all animate-bounce">
            {toastNotice}
          </div>
        )}

        {isCustomizing ? (
          /* ── MODE CUSTOMIZE MENU CEPAT ── */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs leading-relaxed flex items-start gap-2.5 shadow-sm">
              <Sparkles size={16} className="text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong>Petunjuk:</strong> Pilih maksimal <strong>5 menu</strong> untuk ditampilkan di Beranda. Gunakan panah <strong>◀ ▶</strong> untuk mengatur urutan posisinya.
              </div>
            </div>

            {/* Preview Slot Beranda */}
            <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-3" style={{ borderColor: "var(--border, #e2e8f0)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Urutan di Menu Cepat ({selectedIds.length}/5):
                </span>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Kosongkan Semua
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-2">
                {selectedIds.map((id, idx) => {
                  const item = getMenuItem(id);
                  if (!item) return null;

                  return (
                    <div
                      key={id}
                      className="relative p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center text-center"
                    >
                      {/* Slot Badge */}
                      <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                        {idx + 1}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold flex items-center justify-center cursor-pointer hover:bg-rose-200"
                        title="Hapus"
                      >
                        ✕
                      </button>

                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-1 mt-1"
                        style={{ background: item.iconBg }}
                      >
                        <div className="scale-75">
                          {menuIconOverrides?.[item.id] ? (
                            <MenuIcon
                              src={menuIconOverrides[item.id]}
                              alt={item.name}
                              size={44}
                              fallbackSvg={item.iconModal}
                            />
                          ) : (
                            item.iconModal
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-slate-800 truncate max-w-full">
                        {item.name}
                      </span>

                      {/* Reorder Arrows */}
                      <div className="flex gap-1 mt-2">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, idx - 1)}
                          className="w-5 h-5 rounded border border-slate-200 bg-white text-slate-600 text-[10px] font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          title="Geser ke kiri"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedIds.length - 1}
                          onClick={() => handleMove(idx, idx + 1)}
                          className="w-5 h-5 rounded border border-slate-200 bg-white text-slate-600 text-[10px] font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          title="Geser ke kanan"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  );
                })}

                {Array.from({ length: Math.max(0, 5 - selectedIds.length) }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center min-h-[96px] text-center"
                  >
                    <span className="text-xs text-slate-300 font-bold">
                      Slot #{selectedIds.length + i + 1}
                    </span>
                    <span className="text-[10px] text-slate-300 mt-1">Kosong</span>
                  </div>
                ))}
              </div>
            </div>

            {/* List Menu yang Tersedia untuk Ditambahkan */}
            <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-3" style={{ borderColor: "var(--border, #e2e8f0)" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pilih Menu untuk Ditambahkan:
              </h3>

              <div className="space-y-2">
                {AVAILABLE_MENUS.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  const slotIndex = selectedIds.indexOf(m.id);

                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? "bg-blue-50/50 border-blue-400"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: m.iconBg }}
                        >
                          <div className="scale-75">
                            {menuIconOverrides?.[m.id] ? (
                              <MenuIcon
                                src={menuIconOverrides[m.id]}
                                alt={m.name}
                                size={44}
                                fallbackSvg={m.iconModal}
                              />
                            ) : (
                              m.iconModal
                            )}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {m.desc}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <button
                          type="button"
                          onClick={() => handleRemove(m.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                        >
                          <span>Slot #{slotIndex + 1}</span>
                          <span className="font-extrabold">✕</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAdd(m.id)}
                          disabled={selectedIds.length >= 5}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                        >
                          + Pasang
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Bottom Simpan */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-30">
              <div className="max-w-xl mx-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={selectedIds.length === 0 || isSaving}
                  onClick={handleSaveQuickMenu}
                  className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>Simpan Menu Cepat</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── MODE KATALOG SEMUA MENU ── */
          <div className="space-y-5">
            {/* Search Box */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari fitur aplikasi (misal: Saku, Hutang, Wisata)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* Bento Grid 4 Kolom */}
            <div className="p-5 rounded-3xl border bg-white shadow-sm space-y-4" style={{ borderColor: "var(--border, #e2e8f0)" }}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-sm font-extrabold text-slate-900">Fitur Utama</h2>
                <span className="text-xs text-slate-400 font-semibold">
                  {filteredMenus.length} Modul
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {filteredMenus.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.path)}
                    className="group flex flex-col items-center text-center p-2 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                  >
                    {/* Icon Card */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all"
                      style={{ background: item.iconBg }}
                    >
                      <div className="scale-85">
                        {menuIconOverrides?.[item.id] ? (
                          <MenuIcon
                            src={menuIconOverrides[item.id]}
                            alt={item.name}
                            size={44}
                            fallbackSvg={item.iconModal}
                          />
                        ) : (
                          item.iconModal
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Account Card & Logout */}
            <div className="p-4 rounded-2xl border bg-white shadow-sm flex items-center justify-between gap-3" style={{ borderColor: "var(--border, #e2e8f0)" }}>
              <div className="flex items-center gap-3 min-w-0">
                {sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sessionUser.user_metadata.avatar_url || sessionUser.user_metadata.picture}
                    alt="Avatar"
                    crossOrigin="anonymous"
                    className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                    {(currentMember?.display_name || sessionUser?.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {currentMember?.display_name || sessionUser?.user_metadata?.full_name || "Pengguna"}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {currentKeluarga?.nama_keluarga || "Keluarga Kami"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Logout */}
        <AlertModal
          isOpen={showLogoutConfirm}
          title="Keluar dari Akun?"
          message="Anda akan keluar dari sesi ini dan perlu login kembali untuk mengakses data keluarga."
          confirmText="Ya, Logout"
          cancelText="Batal"
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
      </main>
    </div>
  );
}
