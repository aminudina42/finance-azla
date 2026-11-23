"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { triggerHaptic } from "@/lib/haptics";
import { isAnyModalOpen } from "@/lib/hooks/useModalBackHandler";

const EXIT_INTERVAL_MS = 2000;

export default function NativeBackManager() {
  const pathname = usePathname();
  const [showExitToast, setShowExitToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBackPressRef = useRef<number>(0);
  const isExitingRef = useRef<boolean>(false);

  // Normalize pathname: only active on Root ("/")
  const normalizedPath = pathname ? (pathname.replace(/\/$/, "") || "/") : "/";
  const isRoot = normalizedPath === "/";

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reset exit confirmation state whenever path changes
    lastBackPressRef.current = 0;
    setShowExitToast(false);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    // ONLY manage double-back to exit on Root ("/")
    if (!isRoot) return;

    // Ensure a sentinel history entry exists only on Root
    if (!window.history.state?.__catatKeluargaRootSentinel) {
      window.history.pushState(
        { ...window.history.state, __catatKeluargaRootSentinel: true },
        "",
        window.location.href
      );
    }

    const handlePopState = (e: PopStateEvent) => {
      // 1. If any modal is active, let useModalBackHandler close it first
      if (isAnyModalOpen()) {
        return;
      }

      // If already authorized to exit, do not block
      if (isExitingRef.current) {
        return;
      }

      // 2. We are on Root ("/"): Double-back to exit logic
      const now = Date.now();
      const diff = now - lastBackPressRef.current;

      if (diff < EXIT_INTERVAL_MS) {
        // Second press within 2s -> Allow exit
        isExitingRef.current = true;
        setShowExitToast(false);
        triggerHaptic("heavy");
        window.history.back();
      } else {
        // First press -> Trap exit, show toast, trigger haptic
        lastBackPressRef.current = now;
        window.history.pushState(
          { ...window.history.state, __catatKeluargaRootSentinel: true },
          "",
          window.location.href
        );

        triggerHaptic("medium");
        setShowExitToast(true);

        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          setShowExitToast(false);
          lastBackPressRef.current = 0;
        }, EXIT_INTERVAL_MS);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [isRoot]);

  if (!showExitToast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-none select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        bottom: "max(84px, calc(env(safe-area-inset-bottom, 0px) + 74px))",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-tight text-[#F7F6F3] shadow-[0_8px_32px_rgba(0,0,0,0.32)] border border-white/10"
        style={{
          background: "rgba(18, 20, 24, 0.94)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          animation: "nativeBackToastIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400 shrink-0"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="whitespace-nowrap">Tekan sekali lagi untuk keluar aplikasi</span>
      </div>
    </div>
  );
}
