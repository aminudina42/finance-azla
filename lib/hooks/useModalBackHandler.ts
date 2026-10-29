"use client";

import { useEffect, useRef } from "react";

export interface UseModalBackHandlerOptions {
  isOpen: boolean;
  onClose: () => void;
  isLocked?: boolean;
}

// Global LIFO modal tracker for nested modals
const modalStack: string[] = [];

/**
 * Custom hook to intercept browser hardware back button and swipe-back gestures
 * when a modal or bottomsheet is open, preventing accidental page exits.
 */
export function useModalBackHandler({
  isOpen,
  onClose,
  isLocked = false,
}: UseModalBackHandlerOptions): void {
  const isClosingByPopstate = useRef(false);
  const onCloseRef = useRef(onClose);
  const isLockedRef = useRef(isLocked);
  const modalIdRef = useRef<string>("");

  // Keep callback and lock state synchronized without re-triggering effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const modalId = `modal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    modalIdRef.current = modalId;
    modalStack.push(modalId);
    isClosingByPopstate.current = false;

    // Push virtual history state for the modal trap
    window.history.pushState({ isModalTrap: true, modalId }, "");

    const handlePopState = (e: PopStateEvent) => {
      // Only the topmost modal in the stack handles this popstate event
      const isTop = modalStack[modalStack.length - 1] === modalId;
      if (!isTop) {
        return;
      }

      // If history popped back into this modal from a child modal, ignore
      if (e.state && e.state.isModalTrap && e.state.modalId === modalId) {
        return;
      }

      if (isLockedRef.current) {
        // Modal is locked: immediately re-push virtual history entry to prevent leaving
        window.history.pushState({ isModalTrap: true, modalId }, "");
        return;
      }

      // Normal dismissal via back button / gesture
      isClosingByPopstate.current = true;
      const idx = modalStack.indexOf(modalId);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      const idx = modalStack.indexOf(modalId);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }

      // If closed via UI (✕ button, backdrop tap, form submit), clean up virtual entry
      if (!isClosingByPopstate.current) {
        if (typeof window !== "undefined" && window.history.state?.isModalTrap) {
          window.history.back();
        }
      }
    };
  }, [isOpen]);
}
