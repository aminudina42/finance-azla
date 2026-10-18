"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatISOToDDMMYYYY, parseDDMMYYYYToISO, formatDateIndo } from "@/lib/vehicle-utils";

interface DateInputProps {
  value: string; // ISO format: "YYYY-MM-DD"
  onChange: (isoValue: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export default function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/YYYY (contoh: 22/10/2026)",
  required = false,
  disabled = false,
  id,
}: DateInputProps) {
  const [displayText, setDisplayText] = useState(() => formatISOToDDMMYYYY(value));
  const hiddenPickerRef = useRef<HTMLInputElement>(null);

  // Sync when prop value changes from outside
  useEffect(() => {
    const formatted = formatISOToDDMMYYYY(value);
    setDisplayText(formatted);
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").slice(0, 8); // max 8 digits: DDMMYYYY

    let formatted = "";
    if (digits.length > 0) {
      formatted = digits.slice(0, 2);
    }
    if (digits.length >= 3) {
      formatted += "/" + digits.slice(2, 4);
    }
    if (digits.length >= 5) {
      formatted += "/" + digits.slice(4, 8);
    }

    setDisplayText(formatted);

    if (digits.length === 8) {
      const iso = parseDDMMYYYYToISO(digits);
      if (iso) {
        onChange(iso);
      }
    } else if (digits.length === 0) {
      onChange("");
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    if (isoVal) {
      onChange(isoVal);
      setDisplayText(formatISOToDDMMYYYY(isoVal));
    }
  };

  const openPicker = () => {
    if (hiddenPickerRef.current) {
      try {
        if ("showPicker" in HTMLInputElement.prototype) {
          hiddenPickerRef.current.showPicker();
        } else {
          hiddenPickerRef.current.click();
        }
      } catch {
        hiddenPickerRef.current.click();
      }
    }
  };

  return (
    <div>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder={placeholder}
          value={displayText}
          onChange={handleTextChange}
          required={required}
          disabled={disabled}
          style={{
            width: "100%",
            height: "44px",
            padding: "0 44px 0 14px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            fontSize: "14px",
            fontWeight: 650,
            color: "var(--text)",
            boxSizing: "border-box",
            outline: "none",
            letterSpacing: "0.4px",
          }}
        />

        {/* Hidden HTML date picker used as popup calendar */}
        <input
          ref={hiddenPickerRef}
          type="date"
          tabIndex={-1}
          value={value || ""}
          onChange={handlePickerChange}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />

        {/* Calendar button on the right */}
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            padding: "6px",
            color: "var(--primary)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            borderRadius: "8px",
          }}
          aria-label="Pilih tanggal dari kalender"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {/* Helper text showing formatted Indonesian date confirmation */}
      {value && (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 550 }}>
          Terpilih: <strong style={{ color: "var(--navy)" }}>{formatDateIndo(value)}</strong> ({displayText})
        </div>
      )}
    </div>
  );
}
