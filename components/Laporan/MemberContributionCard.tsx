"use client";

import React from "react";
import type { MemberExpenseShare } from "@/lib/report-service";
import { formatRp } from "@/lib/report-service";
import { Users, ShoppingBag } from "lucide-react";

interface MemberContributionCardProps {
  memberShares: MemberExpenseShare[];
  totalExpense: number;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; bar: string; icon: string }> = {
  suami: { bg: "bg-blue-50", text: "text-blue-700", bar: "#287ff0", icon: "👨‍💼" },
  istri: { bg: "bg-rose-50", text: "text-rose-700", bar: "#f04467", icon: "👩" },
  anak: { bg: "bg-amber-50", text: "text-amber-700", bar: "#f4a33b", icon: "👧" },
  lainnya: { bg: "bg-slate-50", text: "text-slate-700", bar: "#64748b", icon: "👤" },
};

export default function MemberContributionCard({ memberShares, totalExpense }: MemberContributionCardProps) {
  return (
    <section className="flex flex-col gap-3.5" aria-label="Kontribusi Belanja Anggota Keluarga">
      {/* 1. Header & Deskripsi Kolaborasi */}
      <div
        className="p-4 rounded-2xl flex flex-col gap-2.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                Transparansi Belanja Pasutri
              </h3>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                Evaluasi kolaboratif pengeluaran Suami &amp; Istri
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>
            Total: {formatRp(totalExpense)}
          </span>
        </div>

        {/* 2. Stacked Proportion Bar */}
        {totalExpense > 0 && memberShares.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            <div
              className="w-full h-3 rounded-full overflow-hidden flex"
              style={{ background: "var(--track, #e5edf5)" }}
            >
              {memberShares.map((m) => {
                const conf = ROLE_COLORS[m.role] || ROLE_COLORS.lainnya;
                return (
                  <div
                    key={`${m.role}_${m.name}`}
                    style={{
                      width: `${m.percentage}%`,
                      background: conf.bar,
                    }}
                    className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                    title={`${m.name}: ${m.percentage.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
              {memberShares.map((m) => {
                const conf = ROLE_COLORS[m.role] || ROLE_COLORS.lainnya;
                return (
                  <div key={`${m.role}_${m.name}`} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: conf.bar }} />
                    <span>{m.name}: <strong>{m.percentage.toFixed(0)}%</strong></span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Kartu Detail Anggota */}
      <div className="flex flex-col gap-2.5">
        {memberShares.length === 0 ? (
          <div
            className="p-8 text-center rounded-2xl border text-xs font-medium"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--muted)" }}
          >
            Belum ada catatan transaksi oleh anggota keluarga pada periode ini.
          </div>
        ) : (
          memberShares.map((member) => {
            const conf = ROLE_COLORS[member.role] || ROLE_COLORS.lainnya;

            return (
              <div
                key={`${member.role}_${member.name}`}
                className="p-4 rounded-2xl flex flex-col gap-2.5"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow, 0 4px 12px rgba(16,45,85,0.04))",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{conf.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                          {member.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${conf.bg} ${conf.text}`}
                        >
                          {member.role}
                        </span>
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                        {member.transactionCount} Transaksi Tercatat
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="text-xs font-extrabold"
                      style={{ fontFamily: "var(--font-fraunces), serif", color: "var(--navy)" }}
                    >
                      {formatRp(member.totalSpent)}
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: conf.bar }}>
                      {member.percentage.toFixed(1)}% dari total belanja
                    </span>
                  </div>
                </div>

                {/* Top Category Spent by this Member */}
                {member.topPosName !== "-" && (
                  <div
                    className="p-2 rounded-xl flex items-center justify-between text-[11px]"
                    style={{ background: "var(--surface-soft, #f8fbff)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-1.5 truncate" style={{ color: "var(--text-secondary)" }}>
                      <ShoppingBag size={13} style={{ color: "var(--primary)" }} />
                      <span className="truncate">
                        Pengeluaran Terbanyak: <strong>{member.topPosName}</strong>
                      </span>
                    </div>
                    <span className="font-bold shrink-0" style={{ color: "var(--text)" }}>
                      {formatRp(member.topPosAmount)}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

