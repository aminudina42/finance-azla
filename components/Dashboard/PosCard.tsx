"use client";

import React from "react";
import Link from "next/link";
import type { Pos } from "@/lib/types";

interface PosCardProps {
  pos: Pos;
  onOpenMenu?: (pos: Pos, e: React.MouseEvent) => void;
}

function formatRp(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return prefix + "Rp " + Math.abs(n).toLocaleString("id-ID");
}

export default function PosCard({ pos, onOpenMenu }: PosCardProps) {
  const isGoal = Boolean(pos.is_goal);
  const isOverbudget = pos.current_balance < 0;
  const pct = pos.monthly_target > 0 ? pos.current_balance / pos.monthly_target : 0;
  const isLow = !isGoal && !isOverbudget && pct <= 0.25;

  // Determine amount & bar styles
  let amountClass = "amount-navy";
  let barClass = "bar-blue";
  let iconClass = "icon-teal";

  if (isOverbudget) {
    amountClass = "amount-red";
    barClass = "bar-red";
    iconClass = "icon-red";
  } else if (isLow) {
    amountClass = "amount-orange";
    barClass = "bar-orange";
    iconClass = "icon-amber";
  } else if (isGoal) {
    amountClass = "amount-navy";
    barClass = "bar-teal";
    iconClass = "icon-teal";
  } else {
    amountClass = "amount-navy";
    barClass = "bar-blue";
    iconClass = "icon-purple";
  }

  // Calculate percentage & fill width
  let fillWidth = 0;
  let statusText = "";
  let percentLabel = "";

  if (isGoal && pos.goal_target > 0) {
    const goalPct = Math.round((pos.current_balance / pos.goal_target) * 100);
    fillWidth = Math.min(100, Math.max(0, goalPct));
    statusText = `🎯 ${goalPct}% dari target`;
    percentLabel = `${goalPct}%`;
  } else if (pos.name === "Tabungan") {
    const diff = pos.current_balance - pos.monthly_target;
    fillWidth = Math.min(100, Math.max(0, Math.round(pct * 100)));
    statusText = diff >= 0 ? `Akumulasi +${formatRp(diff)}` : `${formatRp(pos.current_balance)} tersisa`;
    percentLabel = `${Math.round(pct * 100)}%`;
  } else if (isOverbudget) {
    const overPct = pos.monthly_target > 0 ? Math.round(Math.abs(pos.current_balance / pos.monthly_target) * 100) + 100 : 100;
    fillWidth = 100;
    statusText = "Overbudget";
    percentLabel = `${overPct}%`;
  } else {
    const normalPct = Math.round(pct * 100);
    fillWidth = Math.min(100, Math.max(0, normalPct));
    statusText = `${normalPct}% tersisa`;
    percentLabel = `${normalPct}%`;
  }

  return (
    <article className="pos-card-wrap" style={{ display: "contents" }}>
      <Link
        href={`/pos/${pos.id}`}
        className="pos-card"
        aria-label={`Pos ${pos.name}: Saldo ${formatRp(pos.current_balance)}`}
      >
        {/* Header row: Icon on left, Menu ⋮ on right */}
        <div className="pos-card-head">
          <span className={`pos-icon ${iconClass}`} aria-hidden="true">
            {pos.icon || "💰"}
          </span>

          <button
            type="button"
            className="card-menu"
            aria-label={`Aksi untuk ${pos.name}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenMenu?.(pos, e);
            }}
          >
            ⋮
          </button>
        </div>

        {/* Pos Content: Name & Amount span the full width of the card without clipping */}
        <div className="pos-card-body">
          <div className="pos-name">
            <span>{pos.name}</span>
            {isGoal && <span className="pos-goal-badge">GOAL</span>}
          </div>
          <div className={`pos-amount ${amountClass}`}>
            {formatRp(pos.current_balance)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress" aria-hidden="true">
          <span className={barClass} style={{ width: `${fillWidth}%` }} />
        </div>

        {/* Footer info */}
        <div className="pos-foot">
          {isOverbudget ? (
            <span className="warning">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3 23 21H1L12 3Z" />
                <path d="M12 9v5m0 3h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{statusText}</span>
            </span>
          ) : (
            <span>{statusText}</span>
          )}
          <span>{percentLabel}</span>
        </div>
      </Link>
    </article>
  );
}
