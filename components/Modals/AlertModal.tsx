"use client";

import Modal from "@/components/Modal";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function AlertModal({ isOpen, onClose, title, message }: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">{title}</div>
      <div style={{ padding: "10px 0" }}>
        <p style={{ marginBottom: "20px", fontSize: "14px", color: "var(--muted)", lineHeight: "1.5" }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            className="m-save"
            onClick={onClose}
            style={{ width: "auto", padding: "10px 24px" }}
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
}
