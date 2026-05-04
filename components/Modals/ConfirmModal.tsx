"use client";

import Modal from "@/components/Modal";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title = "Konfirmasi",
  message,
  confirmText = "Ya",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  isDanger = true,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: "40px", marginBottom: "15px" }}>
          {isDanger ? "⚠️" : "❓"}
        </div>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "var(--text)" }}>{title}</h3>
        <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.5" }}>{message}</p>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={onCancel}
            style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--s2)", color: "var(--text)", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: isDanger ? "var(--red)" : "var(--teal)", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
