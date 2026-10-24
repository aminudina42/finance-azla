"use client";

import React from "react";
import type { HealthFamilyMember } from "@/lib/types";
import { calculateDetailedAge } from "@/lib/health-utils";
import { Plus, User, Baby, Heart } from "lucide-react";

interface MemberSwitcherProps {
  members: HealthFamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onAddMember: () => void;
}

export default function MemberSwitcher({
  members,
  selectedMemberId,
  onSelectMember,
  onAddMember,
}: MemberSwitcherProps) {
  const getRelationBadge = (role: string) => {
    switch (role) {
      case "suami":
        return { label: "Ayah / Suami", color: "bg-blue-50 text-blue-700 border border-blue-200" };
      case "istri":
        return { label: "Ibu / Istri", color: "bg-pink-50 text-pink-700 border border-pink-200" };
      case "anak":
        return { label: "Anak", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
      case "orang_tua":
        return { label: "Kakek/Nenek", color: "bg-slate-50 text-slate-700 border border-slate-200" };
      default:
        return { label: "Keluarga", color: "bg-slate-50 text-slate-700 border border-slate-200" };
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-none">
      <div className="flex items-center gap-3 min-w-max px-1">
        {members.map((m) => {
          const isSelected = m.id === selectedMemberId;
          const badge = getRelationBadge(m.relation_role);
          const ageInfo = calculateDetailedAge(m.birth_date);

          return (
            <button
              key={m.id}
              onClick={() => onSelectMember(m.id)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-colors text-left"
              style={{
                background: isSelected ? "var(--surface-blue, #eaf5fc)" : "var(--surface)",
                border: `1.5px solid ${isSelected ? "var(--color-da-primary, #287ff0)" : "var(--border)"}`,
                color: "var(--text)",
              }}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  isSelected
                    ? "bg-rose-500 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {m.relation_role === "anak" ? (
                  <Baby size={18} />
                ) : (
                  <User size={18} />
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold text-sm ${
                      isSelected
                        ? "text-rose-950"
                        : "text-slate-900"
                    }`}
                  >
                    {m.name}
                  </span>
                  {m.blood_type && m.blood_type !== "unknown" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {m.blood_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {ageInfo.formatted}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        <button
          onClick={onAddMember}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors h-[58px] cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Plus size={16} />
          </div>
          <span>Tambah Anggota</span>
        </button>
      </div>
    </div>
  );
}

