"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  showBack?: boolean;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  showBack = true,
  action,
  badge,
  className = "",
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={`page-header-sticky ${className}`}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 25,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "14px 20px",
        background: "rgba(247, 251, 255, 0.90)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border)",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        {showBack && (
          backHref ? (
            <Link
              href={backHref}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                color: "var(--navy)",
                boxShadow: "0 2px 8px rgba(38, 111, 183, 0.05)",
                textDecoration: "none",
                flexShrink: 0,
                transition: "transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
              }}
              aria-label="Kembali"
            >
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                color: "var(--navy)",
                boxShadow: "0 2px 8px rgba(38, 111, 183, 0.05)",
                cursor: "pointer",
                flexShrink: 0,
                padding: 0,
                transition: "transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
              }}
              aria-label="Kembali"
            >
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )
        )}

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h1
              style={{
                fontSize: "19px",
                fontWeight: 800,
                color: "var(--navy)",
                margin: 0,
                letterSpacing: "-0.4px",
                lineHeight: 1.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                margin: "2px 0 0",
                fontWeight: 500,
                lineHeight: 1.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          {action}
        </div>
      )}
    </header>
  );
}
