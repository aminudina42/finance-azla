import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  const errors: string[] = [];

  // 1. Create tables via raw SQL using rpc
  // Note: Tables must be created via Supabase SQL Editor first.
  // This route seeds initial data if tables are empty.

  // Check if pos table has data
  const { data: existingPos } = await supabase.from("pos").select("id").limit(1);

  if (existingPos && existingPos.length > 0) {
    return NextResponse.json({ message: "Database sudah berisi data.", status: "already_seeded" });
  }

  // Seed Pos
  const { error: posErr } = await supabase.from("pos").insert([
    { name: "Tabungan", icon: "🏦", sub: "Akumulasi otomatis", monthly_target: 2000000, current_balance: 2450000, order_index: 0 },
    { name: "Belanja Dapur", icon: "🍚", sub: "Kebutuhan harian", monthly_target: 1200000, current_balance: 780000, order_index: 1 },
    { name: "Suami", icon: "👨‍💼", sub: "Uang saku", monthly_target: 1000000, current_balance: 600000, order_index: 2 },
    { name: "Istri", icon: "👩", sub: "Uang saku", monthly_target: 1000000, current_balance: 150000, order_index: 3 },
    { name: "Listrik", icon: "⚡", sub: "Token PLN", monthly_target: 500000, current_balance: 350000, order_index: 4 },
    { name: "Online Shop", icon: "🛒", sub: "E-commerce", monthly_target: 500000, current_balance: -45000, order_index: 5 },
    { name: "Sabun", icon: "🧴", sub: "Toiletries", monthly_target: 250000, current_balance: 200000, order_index: 6 },
    { name: "Tagihan", icon: "📱", sub: "Internet, pulsa", monthly_target: 600000, current_balance: 120000, order_index: 7 },
  ]);
  if (posErr) errors.push(`pos: ${posErr.message}`);

  // Seed Cycles
  const { error: cycErr } = await supabase.from("cycles").insert([
    { start_date: "2026-03-25", end_date: "2026-04-24", is_active: true, label: "25 Mar – 24 Apr 2026" },
    { start_date: "2026-02-25", end_date: "2026-03-24", is_active: false, label: "25 Feb – 24 Mar 2026" },
    { start_date: "2026-01-25", end_date: "2026-02-24", is_active: false, label: "25 Jan – 24 Feb 2026" },
    { start_date: "2025-12-25", end_date: "2026-01-24", is_active: false, label: "25 Des – 24 Jan 2026" },
  ]);
  if (cycErr) errors.push(`cycles: ${cycErr.message}`);

  // Seed Children
  const { error: childErr } = await supabase.from("children").insert([
    { name: "Raka", icon: "👦", balance: 185000 },
    { name: "Nisa", icon: "👧", balance: 92000 },
  ]);
  if (childErr) errors.push(`children: ${childErr.message}`);

  if (errors.length > 0) {
    return NextResponse.json({ message: "Ada error saat seed", errors }, { status: 500 });
  }

  return NextResponse.json({ message: "Database berhasil di-seed! ✅", status: "seeded" });
}
