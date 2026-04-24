"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "./supabase";
import type { Pos, Child, ChildTransaction, Transaction, Cycle } from "./types";

// ═══ Fallback Mock Data ═══
const FALLBACK_CYCLES: Cycle[] = [
  { id: "c4", start_date: "2026-03-25", end_date: "2026-04-24", is_active: true, label: "25 Mar – 24 Apr 2026" },
  { id: "c3", start_date: "2026-02-25", end_date: "2026-03-24", is_active: false, label: "25 Feb – 24 Mar 2026" },
  { id: "c2", start_date: "2026-01-25", end_date: "2026-02-24", is_active: false, label: "25 Jan – 24 Feb 2026" },
  { id: "c1", start_date: "2025-12-25", end_date: "2026-01-24", is_active: false, label: "25 Des – 24 Jan 2026" },
];
const FALLBACK_POS: Pos[] = [
  { id: "p1", name: "Tabungan", icon: "🏦", sub: "Akumulasi otomatis", monthly_target: 2000000, current_balance: 2450000, order_index: 0 },
  { id: "p2", name: "Belanja Dapur", icon: "🍚", sub: "Kebutuhan harian", monthly_target: 1200000, current_balance: 780000, order_index: 1 },
  { id: "p3", name: "Suami", icon: "👨‍💼", sub: "Uang saku", monthly_target: 1000000, current_balance: 600000, order_index: 2 },
  { id: "p4", name: "Istri", icon: "👩", sub: "Uang saku", monthly_target: 1000000, current_balance: 150000, order_index: 3 },
  { id: "p5", name: "Listrik", icon: "⚡", sub: "Token PLN", monthly_target: 500000, current_balance: 350000, order_index: 4 },
  { id: "p6", name: "Online Shop", icon: "🛒", sub: "E-commerce", monthly_target: 500000, current_balance: -45000, order_index: 5 },
  { id: "p7", name: "Sabun", icon: "🧴", sub: "Toiletries", monthly_target: 250000, current_balance: 200000, order_index: 6 },
  { id: "p8", name: "Tagihan", icon: "📱", sub: "Internet, pulsa", monthly_target: 600000, current_balance: 120000, order_index: 7 },
];
const FALLBACK_TX: Transaction[] = [];
const FALLBACK_CHILDREN: Child[] = [
  { id: "ch1", name: "Raka", icon: "👦", balance: 185000 },
  { id: "ch2", name: "Nisa", icon: "👧", balance: 92000 },
];
const FALLBACK_CHILD_TX: ChildTransaction[] = [];

// ═══ Context ═══
interface AppState {
  cycles: Cycle[];
  cycleIndex: number;
  setCycleIndex: (i: number) => void;
  shiftCycle: (dir: number) => void;
  gajianDate: number;
  setGajianDate: (d: number) => void;
  posList: Pos[];
  addPos: (name: string, icon: string, sub: string, amount: number) => void;
  updatePos: (id: string, name: string, icon: string, sub: string, amount: number) => void;
  deletePos: (id: string) => void;
  transactions: Transaction[];
  addTransaction: (amount: number, posId: string, userRole: "suami" | "istri", description: string) => void;
  children: Child[];
  addChild: (name: string, icon: string, initialBalance: number) => void;
  childTransactions: ChildTransaction[];
  addChildTransaction: (childId: string, type: "in" | "out", amount: number, description: string) => void;
  startNewCycle: () => void;
  isLoading: boolean;
  dbConnected: boolean;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

// ═══ Provider ═══
export function AppProvider({ children: reactChildren }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>(FALLBACK_CYCLES);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [gajianDate, setGajianDate] = useState(25);
  const [posList, setPosList] = useState<Pos[]>(FALLBACK_POS);
  const [transactions, setTransactions] = useState<Transaction[]>(FALLBACK_TX);
  const [childrenList, setChildrenList] = useState<Child[]>(FALLBACK_CHILDREN);
  const [childTransactions, setChildTransactions] = useState<ChildTransaction[]>(FALLBACK_CHILD_TX);

  // ── Load from Supabase on mount ──
  useEffect(() => {
    async function loadData() {
      try {
        const [posRes, cycRes, txRes, childRes, ctxRes] = await Promise.all([
          supabase.from("pos").select("*").order("order_index"),
          supabase.from("cycles").select("*").order("start_date", { ascending: false }),
          supabase.from("transactions").select("*").order("created_at", { ascending: false }),
          supabase.from("children").select("*"),
          supabase.from("child_transactions").select("*").order("created_at", { ascending: false }),
        ]);

        // If ANY query succeeds (no error), we're connected to Supabase
        const connected = !posRes.error && !cycRes.error;
        if (connected) {
          setDbConnected(true);
          setPosList((posRes.data as Pos[]) ?? []);
          setCycles((cycRes.data as Cycle[]) ?? FALLBACK_CYCLES);
          setTransactions((txRes.data as Transaction[]) ?? []);
          setChildrenList((childRes.data as Child[]) ?? []);
          setChildTransactions((ctxRes.data as ChildTransaction[]) ?? []);
        }
      } catch {
        console.log("Supabase not available, using fallback data");
      }
      setIsLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session && pathname !== "/login") router.replace("/login");
      if (session && pathname === "/login") router.replace("/");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      if (!session && pathname !== "/login") router.replace("/login");
      if (session && pathname === "/login") router.replace("/");
    });

    loadData();

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const shiftCycle = useCallback(
    (dir: number) => setCycleIndex((prev) => Math.max(0, Math.min(cycles.length - 1, prev + dir))),
    [cycles.length]
  );

  // ── Pos actions ──
  const addPos = useCallback(async (name: string, icon: string, sub: string, amount: number) => {
    const newPos: Pos = { id: "p" + Date.now(), name, icon, sub, monthly_target: amount, current_balance: amount, order_index: 99 };
    setPosList((prev) => [...prev, newPos]);

    const { data } = await supabase.from("pos").insert({ name, icon, sub, monthly_target: amount, current_balance: amount, order_index: 99 }).select().single();
    if (data) setPosList((prev) => prev.map((p) => (p.id === newPos.id ? { ...data } as Pos : p)));
  }, []);

  const updatePos = useCallback(async (id: string, name: string, icon: string, sub: string, amount: number) => {
    setPosList((prev) => prev.map((p) => (p.id === id ? { ...p, name, icon, sub, monthly_target: amount } : p)));
    await supabase.from("pos").update({ name, icon, sub, monthly_target: amount }).eq("id", id);
  }, []);

  const deletePos = useCallback(async (id: string) => {
    setPosList((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("pos").delete().eq("id", id);
  }, []);

  // ── Transaction actions ──
  const addTransaction = useCallback(
    async (amount: number, posId: string, userRole: "suami" | "istri", description: string) => {
      const pos = posList.find((p) => p.id === posId);
      if (!pos) return;
      const userName = userRole === "suami" ? "Suami" : "Istri";

      const newTx: Transaction = {
        id: "t" + Date.now(), amount, pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
        user_id: userRole === "suami" ? "u1" : "u2", user_name: userName, user_role: userRole,
        description: description || `Pengeluaran ${pos.name}`, created_at: new Date().toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
      const newBalance = pos.current_balance - amount;
      setPosList((prev) => prev.map((p) => (p.id === posId ? { ...p, current_balance: newBalance } : p)));

      // Sync to Supabase
      await supabase.from("transactions").insert({
        amount, pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
        user_id: userRole === "suami" ? "u1" : "u2", user_name: userName, user_role: userRole,
        description: newTx.description,
      });
      await supabase.from("pos").update({ current_balance: newBalance }).eq("id", posId);
    },
    [posList]
  );

  // ── Child actions ──
  const addChild = useCallback(async (name: string, icon: string, initialBalance: number) => {
    const localChild: Child = { id: "ch" + Date.now(), name, icon, balance: initialBalance };
    setChildrenList((prev) => [...prev, localChild]);

    const { data } = await supabase.from("children").insert({ name, icon, balance: initialBalance }).select().single();
    if (data) setChildrenList((prev) => prev.map((c) => (c.id === localChild.id ? { ...data } as Child : c)));
  }, []);

  const addChildTransaction = useCallback(
    async (childId: string, type: "in" | "out", amount: number, description: string) => {
      const icons = type === "in" ? ["💰", "🎁", "💸", "🏦"] : ["🍦", "🍔", "🖊️", "🛍️", "🎮"];
      const icon = icons[Math.floor(Math.random() * icons.length)];
      const desc = description || (type === "in" ? "Pemasukan" : "Pengeluaran");

      const localTx: ChildTransaction = { id: "ct" + Date.now(), child_id: childId, type, amount, description: desc, icon, created_at: new Date().toISOString() };
      setChildTransactions((prev) => [localTx, ...prev]);

      const child = childrenList.find((c) => c.id === childId);
      const newBal = (child?.balance ?? 0) + (type === "in" ? amount : -amount);
      setChildrenList((prev) => prev.map((c) => (c.id === childId ? { ...c, balance: newBal } : c)));

      // Sync to Supabase
      await supabase.from("child_transactions").insert({ child_id: childId, type, amount, description: desc, icon });
      await supabase.from("children").update({ balance: newBal }).eq("id", childId);
    },
    [childrenList]
  );

  // ── Gajian Tiba! — Start New Cycle ──
  const startNewCycle = useCallback(async () => {
    // 1. Calculate leftover from non-Tabungan pos → sweep to Tabungan
    const tabungan = posList.find((p) => p.name === "Tabungan");
    const otherPos = posList.filter((p) => p.name !== "Tabungan");
    const leftover = otherPos.reduce((sum, p) => sum + Math.max(0, p.current_balance), 0);

    // 2. Reset all pos to monthly_target, add leftover to Tabungan
    const updatedPos = posList.map((p) => {
      if (p.name === "Tabungan") {
        return { ...p, current_balance: p.current_balance + leftover };
      }
      return { ...p, current_balance: p.monthly_target };
    });
    setPosList(updatedPos);

    // 3. Create new cycle
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);
    const newCycle: Cycle = {
      id: "cyc" + Date.now(),
      start_date: today.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      is_active: true,
      label: `${today.getDate()} ${today.toLocaleDateString("id-ID", { month: "short" })} – ${endDate.getDate()} ${endDate.toLocaleDateString("id-ID", { month: "short" })} ${endDate.getFullYear()}`,
    };

    // Deactivate old cycles, add new one
    const updatedCycles = [newCycle, ...cycles.map((c) => ({ ...c, is_active: false }))];
    setCycles(updatedCycles);
    setCycleIndex(0);

    // 4. Sync to Supabase
    for (const p of updatedPos) {
      await supabase.from("pos").update({ current_balance: p.current_balance }).eq("id", p.id);
    }
    await supabase.from("cycles").update({ is_active: false }).neq("id", "none");
    await supabase.from("cycles").insert({
      start_date: newCycle.start_date, end_date: newCycle.end_date,
      is_active: true, label: newCycle.label,
    });
  }, [posList, cycles]);

  const value: AppState = {
    cycles, cycleIndex, setCycleIndex, shiftCycle,
    gajianDate, setGajianDate,
    posList, addPos, updatePos, deletePos,
    transactions, addTransaction,
    children: childrenList, addChild,
    childTransactions, addChildTransaction,
    startNewCycle,
    isLoading, dbConnected,
  };

  if (authLoading) return null; // Or a loading spinner
  if (!sessionUser && pathname !== "/login") return null;

  return <AppContext.Provider value={value}>{reactChildren}</AppContext.Provider>;
}
