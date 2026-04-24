"use client";

import Modal from "@/components/Modal";

interface CyclePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycles: string[];
  activeCycleIndex: number;
  selectedCycleIndex: number;
  onPickCycle: (index: number) => void;
}

export default function CyclePickerModal({
  isOpen,
  onClose,
  cycles,
  activeCycleIndex,
  selectedCycleIndex,
  onPickCycle,
}: CyclePickerModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mt">📅 Pilih Siklus</div>
      {cycles.map((cycle, i) => (
        <div
          key={i}
          className={`cyc-opt ${i === selectedCycleIndex ? "sel" : ""}`}
          onClick={() => {
            onPickCycle(i);
            onClose();
          }}
        >
          {cycle}
          {i === activeCycleIndex && (
            <span className="cyc-badge">● Aktif</span>
          )}
        </div>
      ))}
      <div className="m-actions">
        <button className="m-cancel" onClick={onClose}>
          Tutup
        </button>
      </div>
    </Modal>
  );
}
