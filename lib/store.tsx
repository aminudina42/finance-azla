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
import type { Pos, Child, ChildTransaction, Transaction, Cycle, Debt, CyclePosHistory } from "./types";
import GlobalLoader from "@/components/GlobalLoader";

// ═══ Fallback Mock Data ═══
const FALLBACK_CYCLES: Cycle[] = [
  { id: "c4", start_date: "2026-03-25", end_date: "2026-04-24", is_active: true, label: "25 Mar – 24 Apr 2026" },
  { id: "c3", start_date: "2026-02-25", end_date: "2026-03-24", is_active: false, label: "25 Feb – 24 Mar 2026" },
  { id: "c2", start_date: "2026-01-25", end_date: "2026-02-24", is_active: false, label: "25 Jan – 24 Feb 2026" },
  { id: "c1", start_date: "2025-12-25", end_date: "2026-01-24", is_active: false, label: "25 Des – 24 Jan 2026" },
];
const FALLBACK_POS: Pos[] = [
  { id: "p1", name: "Tabungan", icon: "🏦", sub: "Akumulasi otomatis", monthly_target: 2000000, current_balance: 2450000, order_index: 0, is_goal: true, goal_target: 50000000 },
  { id: "p2", name: "Belanja Dapur", icon: "🍚", sub: "Kebutuhan harian", monthly_target: 1200000, current_balance: 780000, order_index: 1, is_goal: false, goal_target: 0 },
  { id: "p3", name: "Suami", icon: "👨‍💼", sub: "Uang saku", monthly_target: 1000000, current_balance: 600000, order_index: 2, is_goal: false, goal_target: 0 },
  { id: "p4", name: "Istri", icon: "👩", sub: "Uang saku", monthly_target: 1000000, current_balance: 150000, order_index: 3, is_goal: false, goal_target: 0 },
  { id: "p5", name: "Listrik", icon: "⚡", sub: "Token PLN", monthly_target: 500000, current_balance: 350000, order_index: 4, is_goal: false, goal_target: 0 },
  { id: "p6", name: "Online Shop", icon: "🛒", sub: "E-commerce", monthly_target: 500000, current_balance: -45000, order_index: 5, is_goal: false, goal_target: 0 },
  { id: "p7", name: "Sabun", icon: "🧴", sub: "Toiletries", monthly_target: 250000, current_balance: 200000, order_index: 6, is_goal: false, goal_target: 0 },
  { id: "p8", name: "Tagihan", icon: "📱", sub: "Internet, pulsa", monthly_target: 600000, current_balance: 120000, order_index: 7, is_goal: false, goal_target: 0 },
];
const FALLBACK_TX: Transaction[] = [];
const FALLBACK_CHILDREN: Child[] = [
  { id: "ch1", name: "Raka", icon: "👦", balance: 185000 },
  { id: "ch2", name: "Nisa", icon: "👧", balance: 92000 },
];
const FALLBACK_CHILD_TX: ChildTransaction[] = [];
const FALLBACK_DEBTS: Debt[] = [];

// ═══ Context ═══
interface AppState {
  cycles: Cycle[];
  cycleIndex: number;
  setCycleIndex: (i: number) => void;
  shiftCycle: (dir: number) => void;
  gajianDate: number;
  setGajianDate: (d: number) => void;
  posList: Pos[];
  addPos: (name: string, icon: string, sub: string, amount: number, isGoal?: boolean, goalTarget?: number) => void;
  updatePos: (id: string, name: string, icon: string, sub: string, amount: number, isGoal?: boolean, goalTarget?: number) => void;
  deletePos: (id: string) => void;
  transactions: Transaction[];
  addTransaction: (amount: number, posId: string, userRole: "suami" | "istri", description: string, type?: "income" | "expense") => void;
  deleteTransaction: (txId: string) => void;
  children: Child[];
  addChild: (name: string, icon: string, initialBalance: number) => void;
  childTransactions: ChildTransaction[];
  addChildTransaction: (childId: string, type: "in" | "out", amount: number, description: string) => void;
  cyclePosHistory: CyclePosHistory[];
  startNewCycle: (newBudgets?: Record<string, { monthly_target: number; goal_target: number }>) => void;
  // Debt management
  debts: Debt[];
  addDebt: (name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number, principalAmount?: number, tenorMonths?: number, paidMonths?: number) => void;
  updateDebt: (id: string, name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number, principalAmount?: number, tenorMonths?: number, paidMonths?: number) => void;
  deleteDebt: (id: string) => void;
  payDebt: (debtId: string, amount: number, posId: string) => void;
  logoSettings: {
    type: "emoji" | "image";
    emoji: string;
    bg: string;
    image: string;
  };
  updateLogoSettings: (settings: { type: "emoji" | "image"; emoji: string; bg: string; image: string }) => Promise<void>;
  isLoading: boolean;
  dbConnected: boolean;
  isNavigating: boolean;
  setIsNavigating: (b: boolean) => void;
  isMutating: boolean;
  setIsMutating: (b: boolean) => void;
  recalculateBalances: () => Promise<void>;
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // Global click interceptor for relative route links
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== "A") {
        target = target.parentElement;
      }

      if (target && target instanceof HTMLAnchorElement) {
        const href = target.getAttribute("href");
        if (href && href.startsWith("/") && !href.startsWith("//")) {
          try {
            const targetUrl = new URL(href, window.location.origin);
            if (
              targetUrl.pathname === window.location.pathname &&
              targetUrl.search === window.location.search &&
              targetUrl.hash === window.location.hash
            ) {
              return;
            }
            setIsNavigating(true);
          } catch {
            setIsNavigating(true);
          }
        }
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => {
      document.removeEventListener("click", handleLinkClick);
    };
  }, []);

  // Matikan loading navigasi saat path berubah
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);
  const [dbConnected, setDbConnected] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>(FALLBACK_CYCLES);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [gajianDate, setGajianDate] = useState(25);
  const [posList, setPosList] = useState<Pos[]>(FALLBACK_POS);
  const [transactions, setTransactions] = useState<Transaction[]>(FALLBACK_TX);
  const [childrenList, setChildrenList] = useState<Child[]>(FALLBACK_CHILDREN);
  const [childTransactions, setChildTransactions] = useState<ChildTransaction[]>(FALLBACK_CHILD_TX);
  const [debts, setDebts] = useState<Debt[]>(FALLBACK_DEBTS);
  const [cyclePosHistory, setCyclePosHistory] = useState<CyclePosHistory[]>([]);
  const [logoSettings, setLogoSettings] = useState<{
    type: "emoji" | "image";
    emoji: string;
    bg: string;
    image: string;
  }>(() => {
    // Pre-load from localStorage cache so loading screen shows custom logo immediately
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("logoSettings");
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return {
      type: "emoji",
      emoji: "💳",
      bg: "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
      image: "",
    };
  });

  // ── Load from Supabase on mount ──
  useEffect(() => {
    async function loadData() {
      try {
        const [posRes, cycRes, txRes, childRes, ctxRes, debtRes, histRes, settingsRes] = await Promise.all([
          supabase.from("pos").select("*").order("order_index"),
          supabase.from("cycles").select("*").order("start_date", { ascending: false }),
          supabase.from("transactions").select("*").order("created_at", { ascending: false }),
          supabase.from("children").select("*"),
          supabase.from("child_transactions").select("*").order("created_at", { ascending: false }),
          supabase.from("debts").select("*").order("created_at", { ascending: false }),
          supabase.from("cycle_pos_history").select("*"),
          supabase.from("app_settings").select("*"),
        ]);

        // If ANY query succeeds (no error), we're connected to Supabase
        const connected = !posRes.error && !cycRes.error;
        if (connected) {
          setDbConnected(true);
          // Ensure backward compatibility — fill in default values for new fields
          const posData = ((posRes.data as Pos[]) ?? []).map((p) => ({
            ...p,
            is_goal: p.is_goal ?? false,
            goal_target: p.goal_target ?? 0,
          }));
          setPosList(posData);
          // Ensure backward compatibility for transactions
          const txData = ((txRes.data as Transaction[]) ?? []).map((t) => ({
            ...t,
            type: t.type ?? "expense" as const,
          }));
          setCycles((cycRes.data as Cycle[]) ?? FALLBACK_CYCLES);
          setTransactions(txData);
          setChildrenList((childRes.data as Child[]) ?? []);
          setChildTransactions((ctxRes.data as ChildTransaction[]) ?? []);
          if (!debtRes.error) {
            const debtData = ((debtRes.data as Debt[]) ?? []).map((d) => ({
              ...d,
              principal_amount: d.principal_amount ?? 0,
              tenor_months: d.tenor_months ?? 0,
              paid_months: d.paid_months ?? 0,
            }));
            setDebts(debtData);
          }
          if (!histRes.error) {
            setCyclePosHistory(histRes.data as CyclePosHistory[]);
          }
          // Load settings
          if (!settingsRes.error && Array.isArray(settingsRes.data)) {
            const settingsMap = new Map(settingsRes.data.map((s) => [s.key, s.value]));
            const gajianVal = settingsMap.get("gajian_date");
            if (gajianVal) setGajianDate(Number(gajianVal) || 25);

            const lType = settingsMap.get("website_logo_type") as "emoji" | "image" | undefined;
            const lEmoji = settingsMap.get("website_logo_emoji");
            const lBg = settingsMap.get("website_logo_bg");
            const lImg = settingsMap.get("website_logo_image");

            const freshLogo = {
              type: lType || "emoji",
              emoji: lEmoji || "💳",
              bg: lBg || "linear-gradient(135deg, #8b72ff 0%, #ff72b8 100%)",
              image: lImg || "",
            };
            setLogoSettings(freshLogo);
            // Persist to localStorage so next load shows custom logo immediately
            try {
              localStorage.setItem("logoSettings", JSON.stringify(freshLogo));
            } catch {
              // ignore storage errors
            }
          }
        }
      } catch {
        console.log("Supabase not available, using fallback data");
      }
      setIsLoading(false);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session && pathname !== "/login") router.replace("/login");
      if (session && pathname === "/login") router.replace("/");

      // Ensure auth user exists in the `users` table (FK requirement for transactions)
      if (session?.user) {
        const u = session.user;
        const displayName = u.user_metadata?.name || u.email?.split("@")[0] || "User";
        await supabase.from("users").upsert(
          { id: u.id, name: displayName, role: "suami" },
          { onConflict: "id" }
        );
      }
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
  const addPos = useCallback(async (name: string, icon: string, sub: string, amount: number, isGoal: boolean = false, goalTarget: number = 0) => {
    setIsMutating(true);
    try {
      const newPos: Pos = { id: "p" + Date.now(), name, icon, sub, monthly_target: amount, current_balance: amount, order_index: 99, is_goal: isGoal, goal_target: goalTarget };
      setPosList((prev) => [...prev, newPos]);

      const { data } = await supabase.from("pos").insert({ name, icon, sub, monthly_target: amount, current_balance: amount, order_index: 99, is_goal: isGoal, goal_target: goalTarget }).select().single();
      if (data) setPosList((prev) => prev.map((p) => (p.id === newPos.id ? { ...data, is_goal: data.is_goal ?? false, goal_target: data.goal_target ?? 0 } as Pos : p)));
    } finally {
      setIsMutating(false);
    }
  }, []);

  const updatePos = useCallback(async (id: string, name: string, icon: string, sub: string, amount: number, isGoal: boolean = false, goalTarget: number = 0) => {
    setIsMutating(true);
    try {
      const oldPos = posList.find((p) => p.id === id);
      if (!oldPos) return;

      const diff = amount - oldPos.monthly_target;
      const newBalance = isGoal ? oldPos.current_balance : oldPos.current_balance + diff;

      setPosList((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name,
                icon,
                sub,
                monthly_target: amount,
                current_balance: newBalance,
                is_goal: isGoal,
                goal_target: goalTarget,
              }
            : p
        )
      );

      await supabase
        .from("pos")
        .update({
          name,
          icon,
          sub,
          monthly_target: amount,
          current_balance: newBalance,
          is_goal: isGoal,
          goal_target: goalTarget,
        })
        .eq("id", id);
    } finally {
      setIsMutating(false);
    }
  }, [posList]);

  const deletePos = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      setPosList((prev) => prev.filter((p) => p.id !== id));
      await supabase.from("pos").delete().eq("id", id);
    } finally {
      setIsMutating(false);
    }
  }, []);

  // ── Transaction actions (supports income & expense) ──
  const addTransaction = useCallback(
    async (amount: number, posId: string, userRole: "suami" | "istri", description: string, type: "income" | "expense" = "expense") => {
      setIsMutating(true);
      try {
        const pos = posList.find((p) => p.id === posId);
        if (!pos) return;
        const userName = userRole === "suami" ? "Suami" : "Istri";
        const authUserId = sessionUser?.id ?? "unknown";

        const newTx: Transaction = {
          id: "t" + Date.now(), amount, type, pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
          user_id: authUserId, user_name: userName, user_role: userRole,
          description: description || (type === "income" ? `Pemasukan ${pos.name}` : `Pengeluaran ${pos.name}`),
          created_at: new Date().toISOString(),
        };
        setTransactions((prev) => [newTx, ...prev]);

        // Income adds to balance, expense subtracts
        const newBalance = type === "income"
          ? pos.current_balance + amount
          : pos.current_balance - amount;
        setPosList((prev) => prev.map((p) => (p.id === posId ? { ...p, current_balance: newBalance } : p)));

        // Sync to Supabase
        const { error: txErr } = await supabase.from("transactions").insert({
          amount, type, pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
          user_id: authUserId, user_name: userName, user_role: userRole,
          description: newTx.description,
        });
        if (txErr) console.error("❌ Gagal simpan transaksi:", txErr.message, txErr.details, txErr.hint);

        const { error: posErr } = await supabase.from("pos").update({ current_balance: newBalance }).eq("id", posId);
        if (posErr) console.error("❌ Gagal update saldo pos:", posErr.message);
      } finally {
        setIsMutating(false);
      }
    },
    [posList, sessionUser]
  );

  // ── Delete Transaction ──
  const deleteTransaction = useCallback(
    async (txId: string) => {
      setIsMutating(true);
      try {
        const tx = transactions.find((t) => t.id === txId);
        if (!tx) return;

        // Restore pos balance
        const pos = posList.find((p) => p.id === tx.pos_id);
        if (pos) {
          const restoredBalance = tx.type === "income"
            ? pos.current_balance - tx.amount
            : pos.current_balance + tx.amount;
          setPosList((prev) => prev.map((p) => (p.id === tx.pos_id ? { ...p, current_balance: restoredBalance } : p)));
          await supabase.from("pos").update({ current_balance: restoredBalance }).eq("id", tx.pos_id);
        }

        // Remove transaction from state
        setTransactions((prev) => prev.filter((t) => t.id !== txId));

        // Delete from Supabase
        const { error } = await supabase.from("transactions").delete().eq("id", txId);
        if (error) console.error("❌ Gagal hapus transaksi:", error.message);
      } finally {
        setIsMutating(false);
      }
    },
    [transactions, posList]
  );

  // ── Child actions ──
  const addChild = useCallback(async (name: string, icon: string, initialBalance: number) => {
    setIsMutating(true);
    try {
      const localChild: Child = { id: "ch" + Date.now(), name, icon, balance: initialBalance };
      setChildrenList((prev) => [...prev, localChild]);

      const { data } = await supabase.from("children").insert({ name, icon, balance: initialBalance }).select().single();
      if (data) setChildrenList((prev) => prev.map((c) => (c.id === localChild.id ? { ...data } as Child : c)));
    } finally {
      setIsMutating(false);
    }
  }, []);

  const addChildTransaction = useCallback(
    async (childId: string, type: "in" | "out", amount: number, description: string) => {
      setIsMutating(true);
      try {
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
      } finally {
        setIsMutating(false);
      }
    },
    [childrenList]
  );

  // ── Debt actions ──
  const addDebt = useCallback(async (name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number, principalAmount = 0, tenorMonths = 0, paidMonths = 0) => {
    setIsMutating(true);
    try {
      const localDebt: Debt = {
        id: "d" + Date.now(), name, icon,
        total_amount: totalAmount, remaining_amount: remainingAmount,
        monthly_payment: monthlyPayment, due_date: dueDate,
        principal_amount: principalAmount, tenor_months: tenorMonths, paid_months: paidMonths,
        created_at: new Date().toISOString(),
      };
      setDebts((prev) => [...prev, localDebt]);

      const { data } = await supabase.from("debts").insert({
        name, icon, total_amount: totalAmount, remaining_amount: remainingAmount,
        monthly_payment: monthlyPayment, due_date: dueDate,
        principal_amount: principalAmount, tenor_months: tenorMonths, paid_months: paidMonths,
      }).select().single();
      if (data) setDebts((prev) => prev.map((d) => (d.id === localDebt.id ? { ...data } as Debt : d)));
    } finally {
      setIsMutating(false);
    }
  }, []);

  const updateDebt = useCallback(async (id: string, name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number, principalAmount = 0, tenorMonths = 0, paidMonths = 0) => {
    setIsMutating(true);
    try {
      setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, name, icon, total_amount: totalAmount, remaining_amount: remainingAmount, monthly_payment: monthlyPayment, due_date: dueDate, principal_amount: principalAmount, tenor_months: tenorMonths, paid_months: paidMonths } : d)));
      await supabase.from("debts").update({ name, icon, total_amount: totalAmount, remaining_amount: remainingAmount, monthly_payment: monthlyPayment, due_date: dueDate, principal_amount: principalAmount, tenor_months: tenorMonths, paid_months: paidMonths }).eq("id", id);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const deleteDebt = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      setDebts((prev) => prev.filter((d) => d.id !== id));
      await supabase.from("debts").delete().eq("id", id);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const payDebt = useCallback(async (debtId: string, amount: number, posId: string) => {
    setIsMutating(true);
    try {
      const debt = debts.find((d) => d.id === debtId);
      const pos = posList.find((p) => p.id === posId);
      if (!debt || !pos) return;

      const newRemaining = Math.max(0, debt.remaining_amount - amount);
      const newPaidMonths = (debt.paid_months || 0) + 1;
      setDebts((prev) => prev.map((d) => (d.id === debtId ? { ...d, remaining_amount: newRemaining, paid_months: newPaidMonths } : d)));

      // Deduct from pos balance
      const newBalance = pos.current_balance - amount;
      setPosList((prev) => prev.map((p) => (p.id === posId ? { ...p, current_balance: newBalance } : p)));

      // Record as expense transaction
      const authUserId = sessionUser?.id ?? "unknown";
      const newTx: Transaction = {
        id: "t" + Date.now(), amount, type: "expense",
        pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
        user_id: authUserId, user_name: "Suami", user_role: "suami",
        description: `Bayar cicilan: ${debt.name}`,
        created_at: new Date().toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);

      // Sync to Supabase
      await supabase.from("debts").update({ remaining_amount: newRemaining, paid_months: newPaidMonths }).eq("id", debtId);
      await supabase.from("pos").update({ current_balance: newBalance }).eq("id", posId);
      const { error: debtTxErr } = await supabase.from("transactions").insert({
        amount, type: "expense", pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
        user_id: authUserId, user_name: "Suami", user_role: "suami",
        description: newTx.description,
      });
      if (debtTxErr) console.error("❌ Gagal simpan transaksi cicilan:", debtTxErr.message, debtTxErr.details, debtTxErr.hint);
    } finally {
      setIsMutating(false);
    }
  }, [debts, posList, sessionUser]);

  // ── Gajian Tiba! — Start New Cycle ──
  const startNewCycle = useCallback(async (newBudgets?: Record<string, { monthly_target: number; goal_target: number }>) => {
    setIsMutating(true);
    try {
      // 0. Snapshot current pos targets for the ending cycle
      const activeCycle = cycles[0];
      if (activeCycle) {
        const snapshots: Omit<CyclePosHistory, "id" | "created_at">[] = posList.map((p) => ({
          cycle_id: activeCycle.id,
          pos_id: p.id,
          monthly_target: p.monthly_target,
          goal_target: p.goal_target,
        }));
        
        const newHistory = snapshots.map(s => ({ ...s, id: "h" + Date.now() + Math.random(), created_at: new Date().toISOString() }));
        setCyclePosHistory(prev => [...prev, ...newHistory]);
        
        const { error: snapErr } = await supabase.from("cycle_pos_history").insert(snapshots);
        if (snapErr) console.error("❌ Gagal simpan snapshot history:", snapErr.message);
      }

      // Apply new budgets if provided
      let workingPosList = [...posList];
      if (newBudgets) {
        workingPosList = workingPosList.map(p => {
          if (newBudgets[p.id]) {
            return { ...p, monthly_target: newBudgets[p.id].monthly_target, goal_target: newBudgets[p.id].goal_target };
          }
          return p;
        });
        // Sync master budgets to DB
        for (const p of workingPosList) {
          if (newBudgets[p.id]) {
            await supabase.from("pos").update({ monthly_target: p.monthly_target, goal_target: p.goal_target }).eq("id", p.id);
          }
        }
      }

      // 1. Calculate leftover from non-goal pos → sweep to Tabungan
      const tabungan = workingPosList.find((p) => p.name === "Tabungan");
      const otherPos = workingPosList.filter((p) => p.name !== "Tabungan" && !p.is_goal);
      const leftover = otherPos.reduce((sum, p) => sum + Math.max(0, p.current_balance), 0);

      // 2. Reset non-goal pos to monthly_target, add leftover to Tabungan
      // Goal pos are NOT reset — they only accumulate
      const updatedPos = workingPosList.map((p) => {
        if (p.name === "Tabungan") {
          return { ...p, current_balance: p.current_balance + leftover };
        }
        if (p.is_goal) {
          // Goal pos: do not reset, keep accumulating
          return p;
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
    } finally {
      setIsMutating(false);
    }
  }, [posList, cycles]);

  // Wrap setGajianDate to also persist to Supabase
  const updateGajianDate = useCallback(async (d: number) => {
    setIsMutating(true);
    try {
      setGajianDate(d);
      await supabase.from("app_settings").upsert(
        { key: "gajian_date", value: String(d), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    } finally {
      setIsMutating(false);
    }
  }, []);

  const updateLogoSettings = useCallback(async (newSettings: {
    type: "emoji" | "image";
    emoji: string;
    bg: string;
    image: string;
  }) => {
    setIsMutating(true);
    try {
      setLogoSettings(newSettings);
      // Immediately persist to localStorage so loading screen reflects change
      try {
        localStorage.setItem("logoSettings", JSON.stringify(newSettings));
      } catch {
        // ignore storage errors
      }
      await Promise.all([
        supabase.from("app_settings").upsert(
          { key: "website_logo_type", value: newSettings.type, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        ),
        supabase.from("app_settings").upsert(
          { key: "website_logo_emoji", value: newSettings.emoji, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        ),
        supabase.from("app_settings").upsert(
          { key: "website_logo_bg", value: newSettings.bg, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        ),
        supabase.from("app_settings").upsert(
          { key: "website_logo_image", value: newSettings.image, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        ),
      ]);
    } finally {
      setIsMutating(false);
    }
  }, []);

  // ── Recalculate all pos balances from transactions ──
  const recalculateBalances = useCallback(async () => {
    setIsMutating(true);
    try {
      const activeCycle = cycles[0];
      if (!activeCycle) return;

      const cycleStart = new Date(activeCycle.start_date + "T00:00:00");

      const updatedPos = posList.map((p) => {
        // Get all transactions for this pos in the active cycle
        const posTxs = transactions.filter((t) => {
          const d = new Date(t.created_at);
          return t.pos_id === p.id && d >= cycleStart;
        });

        const income = posTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expense = posTxs.filter((t) => t.type !== "income").reduce((s, t) => s + t.amount, 0);

        // For goal pos, we can't simply reset — we need accumulated balance
        // For regular pos, balance = monthly_target + income - expense
        const correctBalance = p.monthly_target + income - expense;

        return { ...p, current_balance: correctBalance };
      });

      setPosList(updatedPos);

      // Sync all corrected balances to Supabase
      for (const p of updatedPos) {
        const { error } = await supabase.from("pos").update({ current_balance: p.current_balance }).eq("id", p.id);
        if (error) console.error(`❌ Gagal update saldo ${p.name}:`, error.message);
      }

      console.log("✅ Semua saldo pos berhasil disinkronisasi dari data transaksi.");
    } finally {
      setIsMutating(false);
    }
  }, [posList, transactions, cycles]);

  const value: AppState = {
    cycles, cycleIndex, setCycleIndex, shiftCycle,
    gajianDate, setGajianDate: updateGajianDate,
    posList, addPos, updatePos, deletePos,
    transactions, addTransaction, deleteTransaction,
    children: childrenList, addChild,
    childTransactions, addChildTransaction,
    cyclePosHistory, startNewCycle,
    debts, addDebt, updateDebt, deleteDebt, payDebt,
    logoSettings, updateLogoSettings,
    isLoading, dbConnected,
    isNavigating, setIsNavigating,
    isMutating, setIsMutating,
    recalculateBalances,
  };

  if (authLoading) return null; // Or a loading spinner
  if (!sessionUser && pathname !== "/login") return null;

  return (
    <AppContext.Provider value={value}>
      {reactChildren}
      <GlobalLoader isNavigating={isNavigating} isMutating={isMutating} />
    </AppContext.Provider>
  );
}
