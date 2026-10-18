"use client";

import Modal from "@/components/Modal";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmText = "OK",
  cancelText = "Batal",
  confirmColor,
}: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt" style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)" }}>
        {title}
      </div>
      <div style={{ padding: "12px 0 4px 0" }}>
        <p style={{ marginBottom: "22px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          {onConfirm && (
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "auto",
                padding: "9px 18px",
                background: "var(--s1)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className="m-save"
            onClick={() => {
              if (onConfirm) {
                onConfirm();
              } else {
                onClose();
              }
            }}
            style={{
              width: "auto",
              padding: "9px 22px",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13px",
              background: confirmColor || undefined,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
