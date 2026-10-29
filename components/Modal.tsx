"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModalBackHandler } from "@/lib/hooks/useModalBackHandler";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isLocked?: boolean;
}

export default function Modal({ isOpen, onClose, children, isLocked = false }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const startYRef = useRef<number>(0);
  const currentDeltaRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  useModalBackHandler({ isOpen, onClose, isLocked });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (sheetRef.current) {
        sheetRef.current.style.transform = "translateY(0px)";
        sheetRef.current.style.transition = "";
        sheetRef.current.style.opacity = "1";
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLocked) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLocked, onClose]);

  const checkCanDrag = (target: EventTarget | null): boolean => {
    if (isLocked) return false;

    if (target instanceof HTMLElement) {
      if (target.closest("input, textarea, select, button, a")) {
        return false;
      }
    }

    let el = target as HTMLElement | null;
    while (el && el !== sheetRef.current && el !== document.body) {
      if (el.scrollTop > 0) {
        return false;
      }
      el = el.parentElement;
    }
    if (sheetRef.current && sheetRef.current.scrollTop > 0) {
      return false;
    }

    return true;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!checkCanDrag(e.target)) return;
    if (isDraggingRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    startYRef.current = touch.clientY;
    currentDeltaRef.current = 0;
    isDraggingRef.current = true;

    if (sheetRef.current) {
      sheetRef.current.style.transition = "none";
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || isLocked) return;

    const touch = e.touches[0];
    if (!touch) return;

    const rawDelta = touch.clientY - startYRef.current;
    // Clamp upward drags (delta < 0) to 0
    const delta = Math.max(0, rawDelta);
    currentDeltaRef.current = delta;

    if (sheetRef.current) {
      sheetRef.current.style.transition = "none";
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const delta = currentDeltaRef.current;
    if (delta > 90) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease";
        sheetRef.current.style.transform = "translateY(100%)";
        sheetRef.current.style.opacity = "0";
      }
      onClose();
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)";
        sheetRef.current.style.transform = "translateY(0px)";
      }
    }
    currentDeltaRef.current = 0;
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="mo open"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current && !isLocked) onClose();
      }}
    >
      <div
        className="mb"
        ref={sheetRef}
        style={{
          position: "relative",
          paddingBottom: "max(32px, env(safe-area-inset-bottom))",
          transform: "translateY(0px)",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="modal-drag-zone"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{
            touchAction: "none",
            width: "100%",
            paddingTop: "2px",
            paddingBottom: "6px",
            cursor: isLocked ? "default" : "grab",
          }}
        >
          <div
            className="mh"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          ></div>
        </div>
        {!isLocked && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "44px",
              height: "44px",
              minWidth: "44px",
              minHeight: "44px",
              background: "transparent",
              border: "none",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <span
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "15px",
                background: "var(--bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                color: "var(--muted)",
                pointerEvents: "none",
              }}
            >
              ✕
            </span>
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
