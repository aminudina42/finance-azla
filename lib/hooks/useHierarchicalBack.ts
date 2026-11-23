"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isAnyModalOpen } from "./useModalBackHandler";

export interface UseHierarchicalBackOptions {
  enabled?: boolean;
  onBack?: () => void;
  backHref?: string;
}

/**
 * Custom hook to intercept native mobile hardware back button and swipe-back gestures
 * for hierarchical sub-page navigation or custom onBack step wizards.
 * Prioritizes active modals first so modal closing is not bypassed.
 */
export function useHierarchicalBack({
  enabled = true,
  onBack,
  backHref,
}: UseHierarchicalBackOptions): void {
  const router = useRouter();
  const onBackRef = useRef(onBack);
  const backHrefRef = useRef(backHref);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    onBackRef.current = onBack;
    backHrefRef.current = backHref;
  }, [onBack, backHref]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!onBack && !backHref) return;

    isNavigatingRef.current = false;
    const initialUrl = window.location.href;

    // Push a virtual sentinel state for this sub-page if not already marked,
    // ensuring the native back button reliably fires a popstate event without
    // closing the browser/PWA on a freshly loaded or refreshed page.
    if (!window.history.state?.__hierarchicalSentinel) {
      window.history.pushState(
        { ...window.history.state, __hierarchicalSentinel: true },
        "",
        window.location.href
      );
    }

    const handlePopState = (e: PopStateEvent) => {
      // 1. If any modal / bottomsheet is open, let useModalBackHandler handle it
      if (isAnyModalOpen()) {
        return;
      }

      if (isNavigatingRef.current) return;

      // 2. Custom onBack handler (e.g. multi-step form wizard)
      if (onBackRef.current) {
        onBackRef.current();

        // If onBack kept user on the same page (e.g. setStep(step - 1)),
        // re-push the sentinel after a tick so the next native back press is also caught.
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.href === initialUrl) {
            if (!window.history.state?.__hierarchicalSentinel) {
              window.history.pushState(
                { ...window.history.state, __hierarchicalSentinel: true },
                "",
                window.location.href
              );
            }
          }
        }, 50);
        return;
      }

      // 3. Fallback to parent route (Hierarchical Back)
      if (backHrefRef.current) {
        isNavigatingRef.current = true;
        router.replace(backHrefRef.current);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled, onBack, backHref, router]);
}
