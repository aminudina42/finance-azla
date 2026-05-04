"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="mo open"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="mb" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <div className="mh"></div>
        <button 
          onClick={onClose} 
          style={{ position: "absolute", top: "15px", right: "15px", background: "var(--bg)", border: "none", width: "30px", height: "30px", borderRadius: "15px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "var(--muted)", cursor: "pointer", zIndex: 10 }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
