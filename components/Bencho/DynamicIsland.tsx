"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Wallet,
  Coins,
  Clock,
  ChevronUp,
  X,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { playBenchoSound, isSoundEnabled, setSoundEnabled } from "@/lib/bencho-sound";

export interface BenchoIslandProps {
  totalTarget: number;
  totalSpent: number;
  remainingDaysToPayday: number | null;
  cycleLabel: string;
  isHideNominal: boolean;
  onToggleHideNominal: () => void;
  className?: string;
}

export default function BenchoDynamicIsland({
  totalTarget,
  totalSpent,
  remainingDaysToPayday,
  cycleLabel,
  isHideNominal,
  onToggleHideNominal,
  className = "",
}: BenchoIslandProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initial sound state
  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  // Handle click outside & Esc key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isExpanded) {
          playBenchoSound("collapse");
          setIsExpanded(false);
        }
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isExpanded) {
        playBenchoSound("collapse");
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    setSoundEnabled(nextVal);
    if (nextVal) {
      playBenchoSound("toggle");
    }
  };

  const handleExpandToggle = () => {
    if (!isExpanded) {
      playBenchoSound("expand");
      setIsExpanded(true);
    } else {
      playBenchoSound("collapse");
      setIsExpanded(false);
    }
  };

  const handleNavigate = (path: string) => {
    playBenchoSound("pop");
    setIsExpanded(false);
    router.push(path);
  };

  // Calculations
  const remainingBudget = totalTarget - totalSpent;
  const spentPercent = totalTarget > 0 ? Math.min(100, Math.round((totalSpent / totalTarget) * 100)) : 0;

  // Status Color Logic
  const getStatusBadge = () => {
    if (totalTarget <= 0) {
      return { dot: "bg-cyan-400", text: "text-cyan-300", label: "Aktif", bg: "bg-cyan-500/10" };
    }
    if (spentPercent < 75) {
      return { dot: "bg-emerald-400", text: "text-emerald-300", label: "Aman", bg: "bg-emerald-500/10" };
    }
    if (spentPercent <= 100) {
      return { dot: "bg-amber-400", text: "text-amber-300", label: "Waspada", bg: "bg-amber-500/10" };
    }
    return { dot: "bg-rose-400", text: "text-rose-300", label: "Overbudget", bg: "bg-rose-500/10" };
  };

  const status = getStatusBadge();

  const formatRupiah = (val: number) => {
    if (isHideNominal) return "Rp ••••••";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      ref={containerRef}
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-[440px] pointer-events-auto select-none font-sans ${className}`}
    >
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.8,
        }}
        className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/90 text-white backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/5"
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* ================= COMPACT PILL STATE ================= */
            <motion.div
              key="compact"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={handleExpandToggle}
              className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer group"
              role="button"
              aria-label="Buka ringkasan Bencho Dynamic Island"
            >
              {/* Left Indicator */}
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.dot} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${status.dot}`} />
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                    Sisa Budget
                  </span>
                  <span className="text-xs font-semibold text-slate-100 tracking-tight">
                    {formatRupiah(remainingBudget)}
                  </span>
                </div>
              </div>

              {/* Center Divider & Payday counter */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>
                  {remainingDaysToPayday !== null
                    ? `${remainingDaysToPayday} hr gajian`
                    : `Siklus ${cycleLabel}`}
                </span>
              </div>

              {/* Right Trigger & Quick Plus Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate("/input");
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-90 transition-transform"
                  aria-label="Catat transaksi baru"
                  title="Catat Transaksi"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 text-slate-400 group-hover:text-slate-200 transition-colors">
                  <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                </div>
              </div>
            </motion.div>
          ) : (
            /* ================= EXPANDED BENCHO CAPSULE ================= */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="p-4 flex flex-col gap-3.5"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                      Bencho Control Hub
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Siklus: {cycleLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Sound Toggle */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                    title={soundOn ? "Matikan audio Bencho" : "Nyalakan audio Bencho"}
                    aria-label="Toggle suara Bencho"
                  >
                    {soundOn ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>

                  {/* Hide Nominal Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playBenchoSound("toggle");
                      onToggleHideNominal();
                    }}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                    title={isHideNominal ? "Tampilkan nominal" : "Sembunyikan nominal"}
                    aria-label="Toggle privasi nominal"
                  >
                    {isHideNominal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  {/* Close Pill */}
                  <button
                    type="button"
                    onClick={handleExpandToggle}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Tutup panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress & Financial Heartbeat */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Pengeluaran Siklus Ini</span>
                  <span className="font-semibold text-slate-200">{spentPercent}%</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${spentPercent}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className={`h-full rounded-full ${
                      spentPercent < 75
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : spentPercent <= 100
                        ? "bg-gradient-to-r from-amber-500 to-orange-400"
                        : "bg-gradient-to-r from-rose-500 to-red-400"
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Terpakai: <strong className="text-slate-300 font-normal">{formatRupiah(totalSpent)}</strong></span>
                  <span>Target: <strong className="text-slate-300 font-normal">{formatRupiah(totalTarget)}</strong></span>
                </div>
              </div>

              {/* Bento Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Catat Transaksi */}
                <button
                  type="button"
                  onClick={() => handleNavigate("/input")}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-[0.97] transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:scale-105 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-100">Catat</span>
                    <span className="block text-[10px] text-emerald-300/80">Input Transaksi</span>
                  </div>
                </button>

                {/* Dompet */}
                <button
                  type="button"
                  onClick={() => handleNavigate("/dompet")}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 active:scale-[0.97] transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 group-hover:scale-105 transition-transform">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-100">Dompet</span>
                    <span className="block text-[10px] text-blue-300/80">Cek Saldo Kas</span>
                  </div>
                </button>

                {/* Uang Saku */}
                <button
                  type="button"
                  onClick={() => handleNavigate("/saku")}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 active:scale-[0.97] transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 group-hover:scale-105 transition-transform">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-100">Uang Saku</span>
                    <span className="block text-[10px] text-amber-300/80">Alokasi Anggota</span>
                  </div>
                </button>

                {/* Cicilan & Hutang */}
                <button
                  type="button"
                  onClick={() => handleNavigate("/debts")}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 active:scale-[0.97] transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-100">Hutang</span>
                    <span className="block text-[10px] text-rose-300/80">Jatuh Tempo</span>
                  </div>
                </button>
              </div>

              {/* Bottom Quick Link */}
              <button
                type="button"
                onClick={() => handleNavigate("/laporan")}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/5 text-[11px] text-slate-300 transition-all"
              >
                <span>Lihat Analisis & Laporan Lengkap</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
