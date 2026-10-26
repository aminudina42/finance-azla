"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "./supabase";
import type { Pos, PosConfigItem, Child, ChildTransaction, Transaction, Cycle, Debt, DebtPayment, CyclePosHistory, SakuTxType, Keluarga, Member, StatusKeluarga, DeveloperSettings, MenuIconOverrides } from "./types";
import GlobalLoader from "@/components/GlobalLoader";

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  { id: "ch1", name: "Raka", icon: "👦", balance: 185000, type: "standalone" },
  { id: "ch2", name: "Nisa", icon: "👧", balance: 92000, type: "standalone" },
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
  addTransaction: (amount: number, posId: string, userRole?: StatusKeluarga, description?: string, type?: "income" | "expense", userName?: string) => Promise<void> | void;
  deleteTransaction: (txId: string) => void;
  children: Child[];
  addSaku: (name: string, icon: string, initialBalance: number, type: "standalone" | "linked", linkedPosId?: string | null) => void;
  updateSaku: (id: string, name: string, icon: string, type: "standalone" | "linked", linkedPosId?: string | null) => void;
  deleteSaku: (id: string) => void;
  childTransactions: ChildTransaction[];
  addChildTransaction: (childId: string, type: SakuTxType, amount: number, description: string, refCycleId?: string | null, refTransactionId?: string | null) => void;
  addSakuBorrowTransaction: (amount: number, posId: string, userRole?: StatusKeluarga, description?: string, sakuId?: string, sakuWithdrawAmount?: number, userName?: string) => Promise<void>;
  addSakuReturnTransaction: (sakuId: string, amount: number, description: string) => Promise<void>;
  cyclePosHistory: CyclePosHistory[];
  startNewCycle: (posConfigs?: PosConfigItem[], deletedPosIds?: string[]) => Promise<void>;
  // Debt management
  debts: Debt[];
  debtPayments: DebtPayment[];
  addDebt: (name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number, principalAmount?: number, tenorMonths?: number, paidMonths?: number, creditorName?: string, accountNumber?: string, notes?: string) => Promise<void>;
  updateDebt: (id: string, name: string, icon: string, totalAmount: number, remainingAmount: number, monthlyPayment: number, dueDate: number, principalAmount?: number, tenorMonths?: number, paidMonths?: number, creditorName?: string, accountNumber?: string, notes?: string) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  payDebt: (debtId: string, amount: number, posId: string, notes?: string, paymentDate?: string) => Promise<void>;
  rollbackDebtPayment: (paymentId: string) => Promise<void>;
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
  refreshData: () => Promise<void>;
  currentKeluarga: Keluarga | null;
  currentMember: Member | null;
  sessionUser: any;
  logout: () => Promise<void>;
  updateMember: (memberId: string, displayName: string, role: "admin" | "member", statusKeluarga?: StatusKeluarga) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  leaveFamily: () => Promise<{ success: boolean; error?: string }>;
  refreshMember: () => Promise<void>;
  // First cycle setup
  needsFirstCycleSetup: boolean;
  isWaitingForPayday: boolean;
  createFirstCycle: (mode: "now" | "wait", availableBudget?: number, targetGajianDate?: number, targetPosId?: string) => Promise<void>;
  // Quick Menu customization
  quickMenuItems: string[];
  updateQuickMenuItems: (items: string[]) => Promise<void>;
  // Superadmin
  isSuperadmin: boolean;
  developerSettings: DeveloperSettings;
  menuIconOverrides: MenuIconOverrides;
  updateDeveloperSettings: (settings: Partial<DeveloperSettings>) => Promise<void>;
  updateMenuIconOverride: (menuId: string, iconUrl: string) => Promise<void>;
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
  const [currentKeluarga, setCurrentKeluarga] = useState<Keluarga | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const isMutatingCycleRef = useRef(false);

  // Global click interceptor for relative route links (Perpindahan halaman)
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Tangkap elemen <a> bahkan jika klik terjadi pada icon, svg, atau nested span
      const anchor = (e.target as Element | null)?.closest?.("a");

      if (anchor instanceof HTMLAnchorElement) {
        const href = anchor.getAttribute("href");
        if (
          href &&
          href.startsWith("/") &&
          !href.startsWith("//") &&
          anchor.target !== "_blank" &&
          !anchor.hasAttribute("download")
        ) {
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

    const handlePopState = () => {
      setIsNavigating(true);
    };

    document.addEventListener("click", handleLinkClick, { capture: true });
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Matikan loading navigasi saat path berubah
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Safety timeout agar loading tidak pernah macet
  useEffect(() => {
    if (isNavigating) {
      const timer = setTimeout(() => setIsNavigating(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [isNavigating]);

  // Safety timeout agar dashboard/initial loading tidak pernah macet
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  const [dbConnected, setDbConnected] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [gajianDate, setGajianDate] = useState(25);
  const [posList, setPosList] = useState<Pos[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [childTransactions, setChildTransactions] = useState<ChildTransaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [cyclePosHistory, setCyclePosHistory] = useState<CyclePosHistory[]>([]);
  const [firstSetupComplete, setFirstSetupComplete] = useState(false);
  const [firstSetupMode, setFirstSetupMode] = useState<"now" | "wait" | "completed" | null>(null);
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

  const [quickMenuItems, setQuickMenuItems] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("quickMenuItems");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return ["saku", "struk", "hutang", "dompet"];
  });

  // ── Superadmin & Global Developer Settings ──
  const DEFAULT_DEV_SETTINGS: DeveloperSettings = {
    show_qris: false,
    qris_url: "",
    qris_name: "Developer CatatKeluarga",
    banks: [
      { enabled: false, name: "BCA", account: "", holder: "" },
      { enabled: false, name: "GoPay / OVO", account: "", holder: "" },
      { enabled: false, name: "BNI", account: "", holder: "" },
    ],
    message: "Terima kasih sudah menggunakan CatatKeluarga! ❤️",
  };
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [developerSettings, setDeveloperSettings] = useState<DeveloperSettings>(DEFAULT_DEV_SETTINGS);
  const [menuIconOverrides, setMenuIconOverrides] = useState<MenuIconOverrides>({});

  // ── Load from Supabase callback ──
  const loadData = useCallback(async () => {
    try {
      const queryPromise = Promise.all([
        supabase.from("pos").select("*").order("order_index"),
        supabase.from("cycles").select("*").order("start_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("children").select("*"),
        supabase.from("child_transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("debts").select("*").order("created_at", { ascending: false }),
        supabase.from("cycle_pos_history").select("*"),
        supabase.from("app_settings").select("*"),
        supabase.from("debt_payments").select("*").order("payment_date", { ascending: false }),
        // Global settings (Traktir Dev + Menu Icon Overrides)
        supabase.from("global_settings").select("key, value"),
        // Superadmin check — will fail gracefully if not superadmin
        supabase.from("superadmins").select("user_id").maybeSingle(),
      ]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase query timeout")), 3000)
      );

      const [posRes, cycRes, txRes, childRes, ctxRes, debtRes, histRes, settingsRes, debtPayRes,
             globalSettingsRes, superadminRes] =
        await Promise.race([queryPromise, timeoutPromise]) as any;

      // ── Load Superadmin status ──
      if (!superadminRes?.error && superadminRes?.data) {
        setIsSuperadmin(true);
      } else {
        setIsSuperadmin(false);
      }

      // ── Load Global Settings (Traktir Dev & Menu Icon Overrides) ──
      if (!globalSettingsRes?.error && Array.isArray(globalSettingsRes?.data)) {
        const gMap = new Map<string, string>(
          globalSettingsRes.data.map((s: { key: string; value: string }) => [s.key, s.value])
        );
        const parsedDev: DeveloperSettings = {
          show_qris: gMap.get("dev_show_qris") === "true",
          qris_url: gMap.get("dev_qris_url") || "",
          qris_name: gMap.get("dev_qris_name") || "Developer CatatKeluarga",
          banks: [
            {
              enabled: gMap.get("dev_bank_1_enabled") === "true",
              name: gMap.get("dev_bank_1_name") || "BCA",
              account: gMap.get("dev_bank_1_account") || "",
              holder: gMap.get("dev_bank_1_holder") || "",
            },
            {
              enabled: gMap.get("dev_bank_2_enabled") === "true",
              name: gMap.get("dev_bank_2_name") || "GoPay / OVO",
              account: gMap.get("dev_bank_2_account") || "",
              holder: gMap.get("dev_bank_2_holder") || "",
            },
            {
              enabled: gMap.get("dev_bank_3_enabled") === "true",
              name: gMap.get("dev_bank_3_name") || "BNI",
              account: gMap.get("dev_bank_3_account") || "",
              holder: gMap.get("dev_bank_3_holder") || "",
            },
          ],
          message: gMap.get("dev_message") || "Terima kasih sudah menggunakan CatatKeluarga! ❤️",
        };
        setDeveloperSettings(parsedDev);

        const overrides: MenuIconOverrides = {};
        for (const [key, value] of gMap.entries()) {
          if (key.startsWith("menu_icon_") && value.trim() !== "") {
            overrides[key.replace("menu_icon_", "")] = value;
          }
        }
        setMenuIconOverrides(overrides);
      }

      // If ANY query succeeds (no error), we are connected to Supabase
      const connected = !posRes?.error && !cycRes?.error;
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
          saku_id: t.saku_id ?? null,
          saku_withdraw_amount: t.saku_withdraw_amount ?? null,
        }));
        setTransactions(txData);

        if (cycRes.data && Array.isArray(cycRes.data)) {
          const sortedCycles = [...(cycRes.data as Cycle[])].sort((a, b) => {
            if (a.is_active && !b.is_active) return -1;
            if (!a.is_active && b.is_active) return 1;
            if (b.start_date !== a.start_date) return b.start_date.localeCompare(a.start_date);
            return (b.created_at || "").localeCompare(a.created_at || "");
          });
          setCycles(sortedCycles);
        }

        // Backward compat for children — add type field if missing
        const childData = ((childRes.data as Child[]) ?? []).map((c) => ({
          ...c,
          type: (c.type ?? "standalone") as "standalone" | "linked",
          linked_pos_id: c.linked_pos_id ?? null,
        }));
        setChildrenList(childData);

        if (ctxRes.data && Array.isArray(ctxRes.data)) {
          setChildTransactions(ctxRes.data.map((ct: any) => ({
            ...ct,
            ref_cycle_id: ct.ref_cycle_id ?? null,
            ref_transaction_id: ct.ref_transaction_id ?? null,
          })));
        }

        if (!debtRes?.error && Array.isArray(debtRes?.data)) {
          const debtData = debtRes.data.map((d: any) => ({
            ...d,
            principal_amount: d.principal_amount ?? 0,
            tenor_months: d.tenor_months ?? 0,
            paid_months: d.paid_months ?? 0,
            creditor_name: d.creditor_name ?? "",
            account_number: d.account_number ?? "",
            notes: d.notes ?? "",
          }));
          setDebts(debtData);
        }

        if (!debtPayRes?.error && Array.isArray(debtPayRes?.data)) {
          const payments = (debtPayRes.data as any[]).map((p) => {
            const matchedPos = posData.find((posItem: Pos) => posItem.id === p.pos_id);
            return {
              ...p,
              pos_name: p.pos_name || matchedPos?.name || "Pos",
            } as DebtPayment;
          });
          setDebtPayments(payments);
        }

        if (!histRes?.error && Array.isArray(histRes?.data) && histRes.data.length > 0) {
          setCyclePosHistory(histRes.data as CyclePosHistory[]);
        }

        // Load settings
        if (!settingsRes?.error && Array.isArray(settingsRes?.data)) {
          const settingsMap = new Map<string, string>(settingsRes.data.map((s: any) => [String(s.key), String(s.value ?? "")]));
          const gajianVal = settingsMap.get("gajian_date");
          if (gajianVal) setGajianDate(Number(gajianVal) || 25);

          const setupDone = settingsMap.get("first_setup_complete");
          if (setupDone === "true") setFirstSetupComplete(true);

          const setupMode = settingsMap.get("first_setup_mode");
          if (setupMode === "wait" || setupMode === "now" || setupMode === "completed") {
            setFirstSetupMode(setupMode);
          }

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

          const qmVal = settingsMap.get("quick_menu_items");
          if (qmVal) {
            try {
              const parsed = JSON.parse(qmVal);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setQuickMenuItems(parsed);
                try {
                  localStorage.setItem("quickMenuItems", JSON.stringify(parsed));
                } catch {
                  // ignore
                }
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase query timeout or error, using fallback data:", err);
      setPosList(FALLBACK_POS);
      setCycles(FALLBACK_CYCLES);
      setChildrenList(FALLBACK_CHILDREN);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Load from Supabase on mount ──
  useEffect(() => {

    // Check session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setSessionUser(u);
      setAuthLoading(false);

      if (!u) {
        setIsLoading(false);
        if (pathname !== "/login") router.replace("/login");
        return;
      }

      if (pathname === "/login") router.replace("/");

      // User session is ready, load data
      loadData();

      // Ensure auth user exists in the `users` table & sync member profile
      const displayName = u.user_metadata?.name || u.email?.split("@")[0] || "User";
      try {
        await supabase.from("users").upsert(
          { id: u.id, name: displayName, role: "suami" },
          { onConflict: "id" }
        );
      } catch (err) {
        console.warn("Could not upsert user:", err);
      }

      try {
        const { data: memberData } = await supabase
          .from("members")
          .select("*, keluarga:keluarga(*)")
          .eq("id", u.id)
          .maybeSingle();

        if (memberData) {
          setCurrentMember(memberData as unknown as Member);
          if (memberData.keluarga) {
            setCurrentKeluarga(memberData.keluarga as unknown as Keluarga);
          }
          if (pathname === "/onboarding" || pathname === "/login") {
            router.replace("/");
          }
        } else {
          // User baru (Google/Email) yang belum punya keluarga diarahkan ke onboarding
          if (pathname !== "/onboarding" && pathname !== "/login") {
            router.replace("/onboarding");
          }
        }
      } catch (err) {
        console.warn("Could not load member/keluarga info:", err);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setSessionUser(u);
      if (!u) {
        setCurrentMember(null);
        setCurrentKeluarga(null);
        setIsLoading(false);
        if (pathname !== "/login") router.replace("/login");
      } else {
        if (pathname === "/login") router.replace("/");
        loadData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── Route guard on auth state / navigation ──
  useEffect(() => {
    if (authLoading) return;
    if (!sessionUser && pathname !== "/login") {
      router.replace("/login");
    } else if (sessionUser && pathname === "/login") {
      router.replace("/");
    }
  }, [authLoading, sessionUser, pathname, router]);

  // ── Realtime member changes channel (e.g. kicked from family, promoted/demoted) ──
  useEffect(() => {
    if (!sessionUser?.id) return;

    let isMounted = true;
    const channelName = `member-live-${sessionUser.id}-${Date.now()}`;
    const memberChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members",
          filter: `id=eq.${sessionUser.id}`,
        },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === "DELETE") {
            setCurrentMember(null);
            setCurrentKeluarga(null);
            if (window.location.pathname !== "/onboarding" && window.location.pathname !== "/login") {
              router.replace("/onboarding?reason=removed");
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Member;
            setCurrentMember((prev) => (prev ? { ...prev, ...updated } : updated));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(memberChannel);
    };
  }, [sessionUser?.id, router]);

  const shiftCycle = useCallback(
    (dir: number) => setCycleIndex((prev) => Math.max(0, Math.min(cycles.length - 1, prev + dir))),
    [cycles.length]
  );

  // ── Pos actions ──
  const addPos = useCallback(async (name: string, icon: string, sub: string, amount: number, isGoal: boolean = false, goalTarget: number = 0) => {
    setIsMutating(true);
    try {
      const kId = currentKeluarga?.id;
      const newPos: Pos = { id: "p" + Date.now(), name, icon, sub, monthly_target: amount, current_balance: amount, order_index: 99, is_goal: isGoal, goal_target: goalTarget, keluarga_id: kId };
      setPosList((prev) => [...prev, newPos]);

      const { data } = await supabase.from("pos").insert({ name, icon, sub, monthly_target: amount, current_balance: amount, order_index: 99, is_goal: isGoal, goal_target: goalTarget, keluarga_id: kId }).select().single();
      if (data) setPosList((prev) => prev.map((p) => (p.id === newPos.id ? { ...data, is_goal: data.is_goal ?? false, goal_target: data.goal_target ?? 0 } as Pos : p)));
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [currentKeluarga?.id]);

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
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [posList]);

  const deletePos = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      setPosList((prev) => prev.filter((p) => p.id !== id));
      await supabase.from("pos").delete().eq("id", id);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, []);

  // ── Transaction actions (supports income & expense) ──
  const addTransaction = useCallback(
    async (
      amount: number,
      posId: string,
      userRole?: StatusKeluarga,
      description?: string,
      type: "income" | "expense" = "expense",
      userName?: string
    ) => {
      setIsMutating(true);
      try {
        const pos = posList.find((p) => p.id === posId);
        if (!pos) return;
        const effectiveRole: StatusKeluarga = userRole || currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri");
        const effectiveName = userName || currentMember?.display_name || (effectiveRole === "suami" ? "Suami" : effectiveRole === "istri" ? "Istri" : "Anak");
        const authUserId = sessionUser?.id ?? "unknown";

        const newTx: Transaction = {
          id: "t" + Date.now(), amount, type, pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
          user_id: authUserId, user_name: effectiveName, user_role: effectiveRole,
          description: description || (type === "income" ? `Pemasukan ${pos.name}` : `Pengeluaran ${pos.name}`),
          created_at: new Date().toISOString(),
          keluarga_id: currentKeluarga?.id,
        };
        setTransactions((prev) => [newTx, ...prev]);

        // Income adds to balance, expense subtracts
        const newBalance = type === "income"
          ? pos.current_balance + amount
          : pos.current_balance - amount;
        setPosList((prev) => prev.map((p) => (p.id === posId ? { ...p, current_balance: newBalance } : p)));

        // Sync to Supabase
        const { data: insertedTx, error: txErr } = await supabase.from("transactions").insert({
          amount, type, pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
          user_id: authUserId, user_name: effectiveName, user_role: effectiveRole,
          description: newTx.description,
          keluarga_id: currentKeluarga?.id,
        }).select().single();
        if (txErr) {
          console.error("❌ Gagal simpan transaksi:", txErr.message, txErr.details, txErr.hint);
          throw new Error(txErr.message || "Gagal menyimpan transaksi ke database.");
        } else if (insertedTx) {
          setTransactions((prev) => prev.map((t) => (t.id === newTx.id ? (insertedTx as Transaction) : t)));
        }

        const { error: posErr } = await supabase.from("pos").update({ current_balance: newBalance }).eq("id", posId);
        if (posErr) {
          console.error("❌ Gagal update saldo pos:", posErr.message);
          throw new Error(posErr.message || "Gagal memperbarui saldo pos.");
        }
      } finally {
        setIsMutating(false);
      }
    },
    [posList, sessionUser, currentMember, currentKeluarga]
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

        // Also clean up any linked fuel logs to prevent orphan records / double refund
        await supabase.from("vehicle_fuel_logs").delete().eq("finance_transaction_id", txId);
      } finally {
        setIsMutating(false);
      }
    },
    [transactions, posList]
  );

  // ── Saku actions (replaces child actions) ──
  const addSaku = useCallback(async (name: string, icon: string, initialBalance: number, type: "standalone" | "linked" = "standalone", linkedPosId: string | null = null) => {
    setIsMutating(true);
    try {
      const localChild: Child = { id: "ch" + Date.now(), name, icon, balance: initialBalance, type, linked_pos_id: linkedPosId };
      setChildrenList((prev) => [...prev, localChild]);

      const { data } = await supabase.from("children").insert({ name, icon, balance: initialBalance, type, linked_pos_id: linkedPosId }).select().single();
      if (data) setChildrenList((prev) => prev.map((c) => (c.id === localChild.id ? { ...data, type: data.type ?? "standalone", linked_pos_id: data.linked_pos_id ?? null } as Child : c)));
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, []);

  const updateSaku = useCallback(async (id: string, name: string, icon: string, type: "standalone" | "linked", linkedPosId: string | null = null) => {
    setIsMutating(true);
    try {
      setChildrenList((prev) => prev.map((c) => c.id === id ? { ...c, name, icon, type, linked_pos_id: linkedPosId } : c));
      await supabase.from("children").update({ name, icon, type, linked_pos_id: linkedPosId }).eq("id", id);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, []);

  const deleteSaku = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      setChildrenList((prev) => prev.filter((c) => c.id !== id));
      await supabase.from("children").delete().eq("id", id);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, []);

  const addChildTransaction = useCallback(
    async (childId: string, type: SakuTxType, amount: number, description: string, refCycleId: string | null = null, refTransactionId: string | null = null) => {
      setIsMutating(true);
      try {
        const iconMap: Record<SakuTxType, string[]> = {
          in: ["💰", "🎁", "💸", "🏦"],
          out: ["🍦", "🍔", "🖊️", "🛍️", "🎮"],
          cycle_surplus: ["🔄"],
          cycle_deficit: ["📉"],
          withdraw_for_pos: ["🏧"],
          return_to_saku: ["↩️"],
        };
        const iconList = iconMap[type] ?? ["💰"];
        const icon = iconList[Math.floor(Math.random() * iconList.length)];
        const desc = description || (type === "in" ? "Pemasukan" : "Pengeluaran");

        const localTx: ChildTransaction = {
          id: "ct" + Date.now(), child_id: childId, type, amount, description: desc, icon,
          created_at: new Date().toISOString(),
          ref_cycle_id: refCycleId,
          ref_transaction_id: refTransactionId,
        };
        setChildTransactions((prev) => [localTx, ...prev]);

        const child = childrenList.find((c) => c.id === childId);
        // Positive types add to balance, negative types subtract
        const isPositive = type === "in" || type === "cycle_surplus" || type === "return_to_saku";
        const newBal = (child?.balance ?? 0) + (isPositive ? amount : -amount);
        setChildrenList((prev) => prev.map((c) => (c.id === childId ? { ...c, balance: newBal } : c)));

        // Sync to Supabase
        await supabase.from("child_transactions").insert({ child_id: childId, type, amount, description: desc, icon, ref_cycle_id: refCycleId, ref_transaction_id: refTransactionId });
        await supabase.from("children").update({ balance: newBal }).eq("id", childId);
      } finally {
        setIsMutating(false);
      }
    },
    [childrenList]
  );

  // ── Saku Borrow: deduct from Saku AND record Pos transaction ──
  const addSakuBorrowTransaction = useCallback(
    async (
      amount: number,
      posId: string,
      userRole?: StatusKeluarga,
      description?: string,
      sakuId?: string,
      sakuWithdrawAmount?: number,
      userName?: string
    ) => {
      setIsMutating(true);
      try {
        const pos = posList.find((p) => p.id === posId);
        const saku = childrenList.find((c) => c.id === sakuId);
        if (!pos || !saku || !sakuId || sakuWithdrawAmount === undefined) return;

        const effectiveRole: StatusKeluarga = userRole || currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri");
        const effectiveName = userName || currentMember?.display_name || (effectiveRole === "suami" ? "Suami" : effectiveRole === "istri" ? "Istri" : "Anak");
        const authUserId = sessionUser?.id ?? "unknown";

        // 1. Update Pos balance (only deduct portion not covered by Saku to prevent double deduction)
        const posDeduction = Math.max(0, amount - sakuWithdrawAmount);
        const newPosBalance = pos.current_balance - posDeduction;
        setPosList((prev) => prev.map((p) => (p.id === posId ? { ...p, current_balance: newPosBalance } : p)));

        // 2. Deduct from Saku
        const newSakuBalance = saku.balance - sakuWithdrawAmount;
        setChildrenList((prev) => prev.map((c) => (c.id === sakuId ? { ...c, balance: newSakuBalance } : c)));

        // 3. Record Pos transaction (with saku reference)
        const newTx: Transaction = {
          id: "t" + Date.now(), amount, type: "expense",
          pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
          user_id: authUserId, user_name: effectiveName, user_role: effectiveRole,
          description: description || `Pengeluaran ${pos.name} (tarik Saku)`,
          created_at: new Date().toISOString(),
          saku_id: sakuId,
          saku_withdraw_amount: sakuWithdrawAmount,
          keluarga_id: currentKeluarga?.id,
        };
        setTransactions((prev) => [newTx, ...prev]);

        // 4. Record Saku transaction
        const sakuIcon = "🏧";
        const sakuTx: ChildTransaction = {
          id: "ct" + Date.now() + 1, child_id: sakuId, type: "withdraw_for_pos",
          amount: sakuWithdrawAmount, description: `Pinjam untuk Pos ${pos.name}`,
          icon: sakuIcon, created_at: new Date().toISOString(),
          ref_cycle_id: null, ref_transaction_id: newTx.id,
          keluarga_id: currentKeluarga?.id,
        };
        setChildTransactions((prev) => [sakuTx, ...prev]);

        // Sync to Supabase
        const { data: txData } = await supabase.from("transactions").insert({
          amount, type: "expense", pos_id: posId, pos_name: pos.name, pos_icon: pos.icon,
          user_id: authUserId, user_name: effectiveName, user_role: effectiveRole,
          description: newTx.description, saku_id: sakuId, saku_withdraw_amount: sakuWithdrawAmount,
          keluarga_id: currentKeluarga?.id,
        }).select().single();
        if (txData) {
          setTransactions((prev) => prev.map((t) => (t.id === newTx.id ? (txData as Transaction) : t)));
        }
        await supabase.from("pos").update({ current_balance: newPosBalance }).eq("id", posId);
        await supabase.from("child_transactions").insert({
          child_id: sakuId, type: "withdraw_for_pos", amount: sakuWithdrawAmount,
          description: `Pinjam untuk Pos ${pos.name}`, icon: sakuIcon,
          ref_transaction_id: txData?.id ?? null,
          keluarga_id: currentKeluarga?.id,
        });
        await supabase.from("children").update({ balance: newSakuBalance }).eq("id", sakuId);
      } finally {
        setIsMutating(false);
      }
    },
    [posList, childrenList, sessionUser, currentMember, currentKeluarga]
  );

  // ── Saku Return: add money back to Saku ("bayar balik") ──
  const addSakuReturnTransaction = useCallback(
    async (sakuId: string, amount: number, description: string) => {
      setIsMutating(true);
      try {
        const saku = childrenList.find((c) => c.id === sakuId);
        if (!saku) return;

        const newSakuBalance = saku.balance + amount;
        setChildrenList((prev) => prev.map((c) => (c.id === sakuId ? { ...c, balance: newSakuBalance } : c)));

        const sakuTx: ChildTransaction = {
          id: "ct" + Date.now(), child_id: sakuId, type: "return_to_saku",
          amount, description: description || "Bayar balik ke Saku",
          icon: "↩️", created_at: new Date().toISOString(),
          ref_cycle_id: null, ref_transaction_id: null,
        };
        setChildTransactions((prev) => [sakuTx, ...prev]);

        await supabase.from("child_transactions").insert({
          child_id: sakuId, type: "return_to_saku", amount,
          description: sakuTx.description, icon: "↩️",
        });
        await supabase.from("children").update({ balance: newSakuBalance }).eq("id", sakuId);
      } finally {
        setIsMutating(false);
      }
    },
    [childrenList]
  );

  // ── Debt actions ──
  const addDebt = useCallback(async (
    name: string,
    icon: string,
    totalAmount: number,
    remainingAmount: number,
    monthlyPayment: number,
    dueDate: number,
    principalAmount = 0,
    tenorMonths = 0,
    paidMonths = 0,
    creditorName = "",
    accountNumber = "",
    notes = ""
  ) => {
    setIsMutating(true);
    try {
      const localDebt: Debt = {
        id: "d" + Date.now(),
        name,
        icon,
        total_amount: totalAmount,
        remaining_amount: remainingAmount,
        monthly_payment: monthlyPayment,
        due_date: dueDate,
        principal_amount: principalAmount,
        tenor_months: tenorMonths,
        paid_months: paidMonths,
        creditor_name: creditorName,
        account_number: accountNumber,
        notes,
        created_at: new Date().toISOString(),
        keluarga_id: currentKeluarga?.id,
      };
      setDebts((prev) => [...prev, localDebt]);

      const { data } = await supabase.from("debts").insert({
        name,
        icon,
        total_amount: totalAmount,
        remaining_amount: remainingAmount,
        monthly_payment: monthlyPayment,
        due_date: dueDate,
        principal_amount: principalAmount,
        tenor_months: tenorMonths,
        paid_months: paidMonths,
        creditor_name: creditorName,
        account_number: accountNumber,
        notes,
        keluarga_id: currentKeluarga?.id,
      }).select().single();
      if (data) setDebts((prev) => prev.map((d) => (d.id === localDebt.id ? { ...data } as Debt : d)));
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [currentKeluarga?.id]);

  const updateDebt = useCallback(async (
    id: string,
    name: string,
    icon: string,
    totalAmount: number,
    remainingAmount: number,
    monthlyPayment: number,
    dueDate: number,
    principalAmount = 0,
    tenorMonths = 0,
    paidMonths = 0,
    creditorName = "",
    accountNumber = "",
    notes = ""
  ) => {
    setIsMutating(true);
    try {
      setDebts((prev) => prev.map((d) => (d.id === id ? {
        ...d,
        name,
        icon,
        total_amount: totalAmount,
        remaining_amount: remainingAmount,
        monthly_payment: monthlyPayment,
        due_date: dueDate,
        principal_amount: principalAmount,
        tenor_months: tenorMonths,
        paid_months: paidMonths,
        creditor_name: creditorName,
        account_number: accountNumber,
        notes,
      } : d)));
      await supabase.from("debts").update({
        name,
        icon,
        total_amount: totalAmount,
        remaining_amount: remainingAmount,
        monthly_payment: monthlyPayment,
        due_date: dueDate,
        principal_amount: principalAmount,
        tenor_months: tenorMonths,
        paid_months: paidMonths,
        creditor_name: creditorName,
        account_number: accountNumber,
        notes,
      }).eq("id", id);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, []);

  const deleteDebt = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      setDebts((prev) => prev.filter((d) => d.id !== id));
      setDebtPayments((prev) => prev.filter((p) => p.debt_id !== id));
      await supabase.from("debts").delete().eq("id", id);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, []);

  const payDebt = useCallback(async (
    debtId: string,
    amount: number,
    posId: string,
    paymentNotes = "",
    customPaymentDate?: string
  ) => {
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
      const effectiveRole: StatusKeluarga = currentMember?.status_keluarga || (currentMember?.role === "admin" ? "suami" : "istri");
      const effectiveName = currentMember?.display_name || (effectiveRole === "suami" ? "Suami" : effectiveRole === "istri" ? "Istri" : "Anak");

      const paymentDateIso = customPaymentDate
        ? new Date(customPaymentDate).toISOString()
        : new Date().toISOString();

      const txDesc = `Bayar cicilan ke-${newPaidMonths}: ${debt.name}${paymentNotes ? ` (${paymentNotes})` : ""}`;
      const tempTxId = "t" + Date.now();
      const newTx: Transaction = {
        id: tempTxId,
        amount,
        type: "expense",
        pos_id: posId,
        pos_name: pos.name,
        pos_icon: pos.icon,
        user_id: authUserId,
        user_name: effectiveName,
        user_role: effectiveRole,
        description: txDesc,
        created_at: paymentDateIso,
        keluarga_id: currentKeluarga?.id,
      };
      setTransactions((prev) => [newTx, ...prev]);

      const tempPaymentId = "dp" + Date.now();
      const newPayment: DebtPayment = {
        id: tempPaymentId,
        debt_id: debtId,
        pos_id: posId,
        pos_name: pos.name,
        transaction_id: tempTxId,
        payment_number: newPaidMonths,
        amount,
        payment_date: paymentDateIso,
        notes: paymentNotes || null,
        created_by: authUserId,
        user_name: effectiveName,
        created_at: new Date().toISOString(),
        keluarga_id: currentKeluarga?.id,
      };
      setDebtPayments((prev) => [newPayment, ...prev]);

      // Sync to Supabase
      await supabase.from("debts").update({ remaining_amount: newRemaining, paid_months: newPaidMonths }).eq("id", debtId);
      await supabase.from("pos").update({ current_balance: newBalance }).eq("id", posId);

      const { data: insertedTx, error: debtTxErr } = await supabase.from("transactions").insert({
        amount,
        type: "expense",
        pos_id: posId,
        pos_name: pos.name,
        pos_icon: pos.icon,
        user_id: authUserId,
        user_name: effectiveName,
        user_role: effectiveRole,
        description: newTx.description,
        created_at: paymentDateIso,
        keluarga_id: currentKeluarga?.id,
      }).select().single();

      if (debtTxErr) {
        console.error("❌ Gagal simpan transaksi cicilan:", debtTxErr.message);
      }

      const realTxId = insertedTx?.id || tempTxId;
      if (insertedTx) {
        setTransactions((prev) => prev.map((t) => (t.id === tempTxId ? { ...t, id: realTxId } : t)));
      }

      const { data: insertedPay, error: payErr } = await supabase.from("debt_payments").insert({
        debt_id: debtId,
        pos_id: posId,
        transaction_id: realTxId,
        payment_number: newPaidMonths,
        amount,
        payment_date: paymentDateIso,
        notes: paymentNotes || null,
        created_by: authUserId,
        keluarga_id: currentKeluarga?.id,
      }).select().single();

      if (payErr) {
        console.error("❌ Gagal simpan riwayat angsuran:", payErr.message);
      } else if (insertedPay) {
        setDebtPayments((prev) => prev.map((p) => (p.id === tempPaymentId ? { ...insertedPay, pos_name: pos.name, user_name: effectiveName } : p)));
      }
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [debts, posList, sessionUser, currentMember, currentKeluarga]);

  const rollbackDebtPayment = useCallback(async (paymentId: string) => {
    setIsMutating(true);
    try {
      const payment = debtPayments.find((p) => p.id === paymentId);
      if (!payment) return;

      const debt = debts.find((d) => d.id === payment.debt_id);
      const pos = payment.pos_id ? posList.find((p) => p.id === payment.pos_id) : null;

      // 1. Restore debt remaining_amount and decrement paid_months
      const newRemaining = debt ? debt.remaining_amount + payment.amount : payment.amount;
      const newPaidMonths = debt ? Math.max(0, (debt.paid_months || 0) - 1) : 0;

      if (debt) {
        setDebts((prev) => prev.map((d) => (d.id === debt.id ? { ...d, remaining_amount: newRemaining, paid_months: newPaidMonths } : d)));
        await supabase.from("debts").update({ remaining_amount: newRemaining, paid_months: newPaidMonths }).eq("id", debt.id);
      }

      // 2. Restore pos balance
      if (pos) {
        const newBalance = pos.current_balance + payment.amount;
        setPosList((prev) => prev.map((p) => (p.id === pos.id ? { ...p, current_balance: newBalance } : p)));
        await supabase.from("pos").update({ current_balance: newBalance }).eq("id", pos.id);
      }

      // 3. Remove transaction if linked
      if (payment.transaction_id) {
        setTransactions((prev) => prev.filter((t) => t.id !== payment.transaction_id));
        await supabase.from("transactions").delete().eq("id", payment.transaction_id);
      }

      // 4. Remove debt_payment
      setDebtPayments((prev) => prev.filter((p) => p.id !== paymentId));
      await supabase.from("debt_payments").delete().eq("id", paymentId);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [debtPayments, debts, posList]);

  // ── Helper to persist settings per family ──
  const upsertSetting = useCallback(async (key: string, value: string, targetKeluargaId?: string) => {
    const kId = targetKeluargaId || currentKeluarga?.id || currentMember?.keluarga_id;
    if (kId) {
      const { error } = await supabase.from("app_settings").upsert(
        {
          keluarga_id: kId,
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "keluarga_id,key" }
      );
      if (error) console.error(`❌ Gagal update app_settings [${key}]:`, error.message);
    } else {
      // Fallback if keluarga_id is not yet established: check existing by key where keluarga_id is null
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", key)
        .is("keluarga_id", null)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) console.error(`❌ Gagal update app_settings [${key}]:`, error.message);
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({ key, value, updated_at: new Date().toISOString() });
        if (error) console.error(`❌ Gagal insert app_settings [${key}]:`, error.message);
      }
    }
  }, [currentKeluarga?.id, currentMember?.keluarga_id]);

  // ── Gajian Tiba! — Start New Cycle ──
  const startNewCycle = useCallback(async (
    posConfigs?: PosConfigItem[],
    deletedPosIds?: string[]
  ) => {
    if (isMutatingCycleRef.current) return;
    isMutatingCycleRef.current = true;
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

      // 0b. Calculate Saku transfers from OLD cycle remaining balance (BEFORE resetting budgets)
      const sakuTransfers: { sakuId: string; delta: number; cycleId: string }[] = [];
      const linkedPosIds = new Set<string>();
      for (const saku of childrenList) {
        if (saku.type !== "linked" || !saku.linked_pos_id) continue;
        const linkedPos = posList.find((p) => p.id === saku.linked_pos_id);
        if (!linkedPos) continue;
        linkedPosIds.add(linkedPos.id);
        const delta = linkedPos.current_balance;
        if (delta !== 0) {
          sakuTransfers.push({ sakuId: saku.id, delta, cycleId: activeCycle?.id ?? "" });
        }
      }

      // 1. Calculate leftover from non-goal pos (INCLUDING pos to be deleted, EXCLUDING pos linked to saku) -> sweep to Tabungan
      const otherPos = posList.filter((p) => p.name !== "Tabungan" && !p.is_goal && !linkedPosIds.has(p.id));
      const leftover = otherPos.reduce((sum, p) => sum + Math.max(0, p.current_balance), 0);

      // 1b. Handle deleted pos
      let workingPosList = [...posList];
      if (deletedPosIds && deletedPosIds.length > 0) {
        await supabase.from("pos").delete().in("id", deletedPosIds);
        workingPosList = workingPosList.filter(p => !deletedPosIds.includes(p.id));
      }

      // 1c. Apply posConfigs (name, icon, monthly_target) or insert new ones
      if (posConfigs && posConfigs.length > 0) {
        const updatedList: Pos[] = [];
        for (const cfg of posConfigs) {
          if (cfg.id && !cfg.id.startsWith("new_")) {
            const existing = workingPosList.find(p => p.id === cfg.id);
            const isTabungan = existing?.name === "Tabungan";
            const isGoalNonTabungan = existing?.is_goal && !isTabungan;
            const updated: Pos = {
              ...(existing || {} as Pos),
              id: cfg.id,
              name: cfg.name.trim() || existing?.name || "Pos",
              icon: cfg.icon || existing?.icon || "📦",
              monthly_target: cfg.monthly_target,
              current_balance: isTabungan
                ? (existing?.current_balance ?? 0) + leftover
                : isGoalNonTabungan
                  ? (existing?.current_balance ?? 0)
                  : cfg.monthly_target,
              is_goal: existing?.is_goal ?? false,
              goal_target: existing?.goal_target ?? 0,
              order_index: existing?.order_index ?? 0,
            };
            updatedList.push(updated);
            await supabase.from("pos").update({
              name: updated.name,
              icon: updated.icon,
              monthly_target: updated.monthly_target,
              current_balance: updated.current_balance,
            }).eq("id", cfg.id);
          } else {
            // New pos created by user
            const { data: created } = await supabase.from("pos").insert({
              name: cfg.name.trim() || "Pos Baru",
              icon: cfg.icon || "📦",
              sub: "",
              monthly_target: cfg.monthly_target,
              current_balance: cfg.monthly_target,
              order_index: 99,
              is_goal: false,
              goal_target: 0,
              keluarga_id: currentKeluarga?.id,
            }).select().single();
            if (created) {
              updatedList.push(created as Pos);
            }
          }
        }
        workingPosList = updatedList;
      } else {
        // Fallback: reset non-goal pos to monthly_target, add leftover to Tabungan only
        workingPosList = workingPosList.map((p) => {
          if (p.name === "Tabungan") {
            return { ...p, current_balance: p.current_balance + leftover };
          }
          if (p.is_goal) {
            return p;
          }
          return { ...p, current_balance: p.monthly_target };
        });
        for (const p of workingPosList) {
          await supabase.from("pos").update({ current_balance: p.current_balance }).eq("id", p.id);
        }
      }

      setPosList(workingPosList);

      // Apply Saku balance changes
      const updatedChildren = childrenList.map((saku) => {
        const transfer = sakuTransfers.find((t) => t.sakuId === saku.id);
        if (!transfer) return saku;
        return { ...saku, balance: saku.balance + transfer.delta };
      });
      if (sakuTransfers.length > 0) {
        setChildrenList(updatedChildren);
      }

      // 3. Create new cycle with month-overflow protection (e.g. 31 Jan -> 28 Feb)
      const today = new Date();
      const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
      const nextMonth = (today.getMonth() + 1) % 12;
      const lastDayOfNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
      const targetDay = Math.min(today.getDate(), lastDayOfNextMonth);
      const endDate = new Date(nextMonthYear, nextMonth, targetDay);
      endDate.setDate(endDate.getDate() - 1);
      const newCycle: Cycle = {
        id: "cyc" + Date.now(),
        start_date: formatLocalDate(today),
        end_date: formatLocalDate(endDate),
        is_active: true,
        label: `${today.getDate()} ${today.toLocaleDateString("id-ID", { month: "short" })} – ${endDate.getDate()} ${endDate.toLocaleDateString("id-ID", { month: "short" })} ${endDate.getFullYear()}`,
        keluarga_id: currentKeluarga?.id,
      };

      // Deactivate old cycles, add new one
      const updatedCycles = [newCycle, ...cycles.map((c) => ({ ...c, is_active: false }))];
      setCycles(updatedCycles);
      setCycleIndex(0);

      // 4. Sync to Supabase
      await supabase.from("cycles").update({ is_active: false }).neq("id", "none");
      const { data: newCycleData } = await supabase.from("cycles").insert({
        start_date: newCycle.start_date,
        end_date: newCycle.end_date,
        is_active: true,
        label: newCycle.label,
        keluarga_id: currentKeluarga?.id,
      }).select().single();

      if (newCycleData) {
        setCycles([newCycleData as Cycle, ...cycles.map((c) => ({ ...c, is_active: false }))]);
      }

      // Ensure first setup is marked completed on normal cycle start
      setFirstSetupComplete(true);
      setFirstSetupMode("completed");
      await upsertSetting("first_setup_complete", "true");
      await upsertSetting("first_setup_mode", "completed");

      // Sync Saku balance changes and create Saku transactions
      for (const transfer of sakuTransfers) {
        const updatedSaku = updatedChildren.find((c) => c.id === transfer.sakuId);
        if (!updatedSaku) continue;
        await supabase.from("children").update({ balance: updatedSaku.balance }).eq("id", transfer.sakuId);
        const txType: SakuTxType = transfer.delta > 0 ? "cycle_surplus" : "cycle_deficit";
        const absAmount = Math.abs(transfer.delta);
        const refCycleId = newCycleData?.id ?? transfer.cycleId;
        const desc = transfer.delta > 0
          ? `Surplus siklus otomatis: +Rp ${absAmount.toLocaleString("id-ID")}`
          : `Defisit siklus otomatis: -Rp ${absAmount.toLocaleString("id-ID")}`;
        await supabase.from("child_transactions").insert({
          child_id: transfer.sakuId, type: txType,
          amount: absAmount, description: desc,
          icon: transfer.delta > 0 ? "🔄" : "📉",
          ref_cycle_id: refCycleId,
        });
      }
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [posList, cycles, childrenList, currentKeluarga, upsertSetting]);

  // ── First Cycle Setup (user baru) ──
  const createFirstCycle = useCallback(async (
    mode: "now" | "wait",
    availableBudget?: number,
    targetGajianDate?: number,
    targetPosId?: string
  ) => {
    setIsMutating(true);
    try {
      // 1. Determine effective gajian date
      const gd = Math.max(1, Math.min(28, targetGajianDate ?? gajianDate));
      setGajianDate(gd);

      let effectiveKeluargaId = currentKeluarga?.id;
      if (!effectiveKeluargaId && sessionUser?.id) {
        const { data: m } = await supabase
          .from("members")
          .select("keluarga_id")
          .eq("id", sessionUser.id)
          .maybeSingle();
        if (m?.keluarga_id) effectiveKeluargaId = m.keluarga_id;
      }

      // Persist gajian date
      await upsertSetting("gajian_date", String(gd), effectiveKeluargaId);

      // Clean up any initial dummy cycles created by onboarding
      if (effectiveKeluargaId) {
        await supabase.from("cycles").delete().eq("keluarga_id", effectiveKeluargaId);
      } else {
        await supabase.from("cycles").delete().neq("id", "none");
      }

      if (mode === "wait") {
        // Clear active cycles and set pos balances to 0 while waiting for payday
        setCycles([]);
        setCycleIndex(0);
        const updatedPos = posList.map((p) => ({ ...p, current_balance: 0 }));
        setPosList(updatedPos);

        for (const p of updatedPos) {
          await supabase.from("pos").update({ current_balance: 0 }).eq("id", p.id);
        }

        setFirstSetupComplete(true);
        setFirstSetupMode("wait");
        await upsertSetting("first_setup_complete", "true", effectiveKeluargaId);
        await upsertSetting("first_setup_mode", "wait", effectiveKeluargaId);
        return;
      }

      // Mode "now" — create partial cycle from today to (day before next gajian date)
      const today = new Date();
      let endDate: Date;
      if (today.getDate() < gd) {
        // Gajian is later this month (e.g. today 22, gd 25 -> end date 24)
        endDate = new Date(today.getFullYear(), today.getMonth(), gd - 1);
      } else {
        // Gajian already passed this month or is today — target next month
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, gd - 1);
      }

      const label = `${today.getDate()} ${today.toLocaleDateString("id-ID", { month: "short" })} – ${endDate.getDate()} ${endDate.toLocaleDateString("id-ID", { month: "short" })} ${endDate.getFullYear()}`;

      const newCycle: Cycle = {
        id: "cyc" + Date.now(),
        start_date: formatLocalDate(today),
        end_date: formatLocalDate(endDate),
        is_active: true,
        label,
        keluarga_id: effectiveKeluargaId,
      };

      // Set pos balances based on available budget (Level 2 Opsi B: Masukkan semua ke 1 pos)
      let updatedPos = [...posList];
      const nonGoalPos = updatedPos.filter(p => !p.is_goal);
      const chosenPosId = targetPosId || nonGoalPos[0]?.id;

      if (availableBudget !== undefined && availableBudget > 0) {
        updatedPos = updatedPos.map(p => {
          if (p.id === chosenPosId) {
            return { ...p, current_balance: availableBudget };
          }
          return { ...p, current_balance: 0 };
        });
      } else {
        // No budget specified — set all to 0
        updatedPos = updatedPos.map(p => ({ ...p, current_balance: 0 }));
      }

      setPosList(updatedPos);
      setCycles([newCycle]);
      setCycleIndex(0);

      for (const p of updatedPos) {
        await supabase.from("pos").update({ current_balance: p.current_balance }).eq("id", p.id);
      }

      const { data: newCycleData, error: cycErr } = await supabase.from("cycles").insert({
        start_date: newCycle.start_date,
        end_date: newCycle.end_date,
        is_active: true,
        label: newCycle.label,
        keluarga_id: effectiveKeluargaId,
      }).select().single();

      if (cycErr) {
        console.error("❌ Gagal simpan cycle baru:", cycErr.message);
      }

      // Update local cycle with DB id
      if (newCycleData) {
        setCycles([{ ...newCycleData } as Cycle]);
      }

      // Mark setup complete
      setFirstSetupComplete(true);
      setFirstSetupMode("now");
      await upsertSetting("first_setup_complete", "true", effectiveKeluargaId);
      await upsertSetting("first_setup_mode", "now", effectiveKeluargaId);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [posList, gajianDate, currentKeluarga, sessionUser, upsertSetting]);

  // Wrap setGajianDate to also persist to Supabase
  const updateGajianDate = useCallback(async (d: number) => {
    setIsMutating(true);
    try {
      const validDate = isNaN(d) || !d ? 25 : Math.max(1, Math.min(28, d));
      setGajianDate(validDate);
      await upsertSetting("gajian_date", String(validDate));
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [upsertSetting]);

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
        upsertSetting("website_logo_type", newSettings.type),
        upsertSetting("website_logo_emoji", newSettings.emoji),
        upsertSetting("website_logo_bg", newSettings.bg),
        upsertSetting("website_logo_image", newSettings.image),
      ]);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [upsertSetting]);

  const updateQuickMenuItems = useCallback(async (items: string[]) => {
    setIsMutating(true);
    try {
      const validItems = items.slice(0, 4);
      setQuickMenuItems(validItems);
      try {
        localStorage.setItem("quickMenuItems", JSON.stringify(validItems));
      } catch {
        // ignore
      }
      await upsertSetting("quick_menu_items", JSON.stringify(validItems));
    } catch (err) {
      console.error("Gagal simpan quick_menu_items:", err);
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [upsertSetting]);

  // ── Superadmin: Update Developer Settings via RPC ──
  const updateDeveloperSettings = useCallback(async (partial: Partial<DeveloperSettings>) => {
    setIsMutating(true);
    try {
      const merged: DeveloperSettings = { ...developerSettings, ...partial };
      // banks override
      if (partial.banks) merged.banks = partial.banks;
      setDeveloperSettings(merged);

      const batch: Record<string, string> = {
        dev_show_qris: merged.show_qris ? "true" : "false",
        dev_qris_url: merged.qris_url,
        dev_qris_name: merged.qris_name,
        dev_message: merged.message,
        dev_bank_1_enabled: merged.banks[0].enabled ? "true" : "false",
        dev_bank_1_name: merged.banks[0].name,
        dev_bank_1_account: merged.banks[0].account,
        dev_bank_1_holder: merged.banks[0].holder,
        dev_bank_2_enabled: merged.banks[1].enabled ? "true" : "false",
        dev_bank_2_name: merged.banks[1].name,
        dev_bank_2_account: merged.banks[1].account,
        dev_bank_2_holder: merged.banks[1].holder,
        dev_bank_3_enabled: merged.banks[2].enabled ? "true" : "false",
        dev_bank_3_name: merged.banks[2].name,
        dev_bank_3_account: merged.banks[2].account,
        dev_bank_3_holder: merged.banks[2].holder,
      };

      const { error } = await supabase.rpc("upsert_global_settings_batch", {
        p_settings: batch,
      });
      if (error) {
        console.error("❌ Gagal update developer settings:", error.message);
        throw new Error(error.message);
      }
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [developerSettings]);

  // ── Superadmin: Update single Menu Icon Override via RPC ──
  const updateMenuIconOverride = useCallback(async (menuId: string, iconUrl: string) => {
    setIsMutating(true);
    try {
      setMenuIconOverrides((prev) => ({ ...prev, [menuId]: iconUrl }));
      const { error } = await supabase.rpc("upsert_global_setting", {
        p_key: `menu_icon_${menuId}`,
        p_value: iconUrl,
      });
      if (error) {
        console.error(`❌ Gagal update menu icon [${menuId}]:`, error.message);
        throw new Error(error.message);
      }
    } finally {
      isMutatingCycleRef.current = false;
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
        // For goal and tabungan pos, we cannot simply reset to monthly_target — their balances accumulate across cycles
        if (p.is_goal || p.name === "Tabungan") {
          return p;
        }

        // Get all transactions for this pos in the active cycle
        const posTxs = transactions.filter((t) => {
          const d = new Date(t.created_at);
          return t.pos_id === p.id && d >= cycleStart;
        });

        const income = posTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expense = posTxs.filter((t) => t.type !== "income").reduce((s, t) => s + t.amount, 0);

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
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [posList, transactions, cycles]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setSessionUser(null);
      setCurrentMember(null);
      setCurrentKeluarga(null);
      window.location.href = "/login";
    } catch (err) {
      console.error("Gagal logout:", err);
      window.location.href = "/login";
    }
  }, []);

  const refreshMember = useCallback(async () => {
    if (!sessionUser?.id) return;
    try {
      const { data: memberData } = await supabase
        .from("members")
        .select("*, keluarga:keluarga(*)")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (memberData) {
        setCurrentMember(memberData as unknown as Member);
        if (memberData.keluarga) {
          setCurrentKeluarga(memberData.keluarga as unknown as Keluarga);
        }
      } else {
        setCurrentMember(null);
        setCurrentKeluarga(null);
        if (pathname !== "/onboarding" && pathname !== "/login") {
          router.replace("/onboarding?reason=removed");
        }
      }
    } catch (err) {
      console.error("Gagal refresh member:", err);
    }
  }, [sessionUser?.id, pathname, router]);

  const updateMember = useCallback(async (
    memberId: string,
    displayName: string,
    role: "admin" | "member",
    statusKeluarga?: StatusKeluarga
  ): Promise<{ success: boolean; error?: string }> => {
    setIsMutating(true);
    try {
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        return { success: false, error: "Nama panggilan tidak boleh kosong." };
      }

      const finalStatus = statusKeluarga || "suami";

      // Check sole admin rule if demoting an admin to member
      if (role === "member") {
        const { data: adminList } = await supabase
          .from("members")
          .select("id")
          .eq("keluarga_id", currentKeluarga?.id)
          .eq("role", "admin");

        const targetIsAdmin = adminList?.some((a) => a.id === memberId);
        if (targetIsAdmin && (adminList?.length || 0) <= 1) {
          return {
            success: false,
            error: "Keluarga harus memiliki minimal satu Admin. Tunjuk anggota lain sebagai Admin terlebih dahulu.",
          };
        }
      }

      // Try RPC first
      const { error: rpcError } = await supabase.rpc("update_family_member", {
        p_member_id: memberId,
        p_display_name: trimmedName,
        p_role: role,
        p_status_keluarga: finalStatus,
      });

      if (rpcError) {
        console.warn("RPC update_family_member fallback to direct update:", rpcError.message);
        const { error: directError } = await supabase
          .from("members")
          .update({
            display_name: trimmedName,
            role,
            status_keluarga: finalStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", memberId);

        if (directError) {
          return { success: false, error: directError.message };
        }
      }

      // Update users table for legacy backward compatibility
      await supabase
        .from("users")
        .update({
          name: trimmedName,
          role: finalStatus === "istri" ? "istri" : "suami",
        })
        .eq("id", memberId);

      // Update currentMember in state if updating self
      if (currentMember?.id === memberId) {
        setCurrentMember((prev) =>
          prev ? { ...prev, display_name: trimmedName, role, status_keluarga: finalStatus } : null
        );
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Gagal memperbarui anggota." };
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [currentKeluarga?.id, currentMember?.id]);

  const removeMember = useCallback(async (
    memberId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsMutating(true);
    try {
      if (sessionUser?.id === memberId) {
        return {
          success: false,
          error: "Untuk meninggalkan keluarga sendiri, silakan gunakan tombol 'Keluar dari Keluarga'.",
        };
      }

      // Check if target is sole admin
      const { data: memberData } = await supabase
        .from("members")
        .select("role, keluarga_id")
        .eq("id", memberId)
        .maybeSingle();

      if (memberData?.role === "admin") {
        const { data: adminList } = await supabase
          .from("members")
          .select("id")
          .eq("keluarga_id", memberData.keluarga_id)
          .eq("role", "admin");

        if ((adminList?.length || 0) <= 1) {
          return {
            success: false,
            error: "Tidak dapat mengeluarkan satu-satunya Admin keluarga. Tunjuk anggota lain sebagai Admin terlebih dahulu.",
          };
        }
      }

      // Try RPC first
      const { error: rpcError } = await supabase.rpc("remove_family_member", {
        p_member_id: memberId,
      });

      if (rpcError) {
        console.warn("RPC remove_family_member fallback to direct delete:", rpcError.message);
        const { error: directError } = await supabase
          .from("members")
          .delete()
          .eq("id", memberId);

        if (directError) {
          return { success: false, error: directError.message };
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Gagal mengeluarkan anggota." };
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [sessionUser?.id]);

  const leaveFamily = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!sessionUser?.id || !currentKeluarga?.id) {
      return { success: false, error: "Sesi tidak valid." };
    }

    setIsMutating(true);
    try {
      // Check if current user is admin and if there are other members
      if (currentMember?.role === "admin") {
        const { data: membersInFamily } = await supabase
          .from("members")
          .select("id, role")
          .eq("keluarga_id", currentKeluarga.id);

        const totalCount = membersInFamily?.length || 0;
        const adminCount = membersInFamily?.filter((m) => m.role === "admin").length || 0;

        if (totalCount > 1 && adminCount <= 1) {
          return {
            success: false,
            error: "Anda adalah satu-satunya Admin. Tunjuk anggota lain sebagai Admin terlebih dahulu sebelum keluar dari keluarga.",
          };
        }
      }

      // Try RPC first
      const { error: rpcError } = await supabase.rpc("leave_family");

      if (rpcError) {
        console.warn("RPC leave_family fallback to direct delete:", rpcError.message);
        const { error: directError } = await supabase
          .from("members")
          .delete()
          .eq("id", sessionUser.id);

        if (directError) {
          return { success: false, error: directError.message };
        }
      }

      // Clear family state & redirect to onboarding
      setCurrentMember(null);
      setCurrentKeluarga(null);
      router.replace("/onboarding?reason=left");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Gagal keluar dari keluarga." };
    } finally {
      isMutatingCycleRef.current = false;
      setIsMutating(false);
    }
  }, [sessionUser?.id, currentKeluarga?.id, currentMember?.role, router]);

  // ── First Cycle Setup computed values ──
  const needsFirstCycleSetup =
    dbConnected &&
    !isLoading &&
    !authLoading &&
    Boolean(currentKeluarga?.id) &&
    !firstSetupComplete &&
    transactions.length === 0 &&
    cycles.length <= 1;

  const isWaitingForPayday =
    dbConnected &&
    !isLoading &&
    firstSetupComplete &&
    firstSetupMode === "wait";

  const value: AppState = {
    cycles, cycleIndex, setCycleIndex, shiftCycle,
    gajianDate, setGajianDate: updateGajianDate,
    posList, addPos, updatePos, deletePos,
    transactions, addTransaction, deleteTransaction,
    children: childrenList, addSaku, updateSaku, deleteSaku,
    childTransactions, addChildTransaction,
    addSakuBorrowTransaction, addSakuReturnTransaction,
    cyclePosHistory, startNewCycle,
    debts, debtPayments, addDebt, updateDebt, deleteDebt, payDebt, rollbackDebtPayment,
    logoSettings, updateLogoSettings,
    isLoading, dbConnected,
    isNavigating, setIsNavigating,
    isMutating, setIsMutating,
    recalculateBalances,
    refreshData: loadData,
    currentKeluarga, currentMember,
    sessionUser, logout,
    updateMember, removeMember, leaveFamily, refreshMember,
    needsFirstCycleSetup, isWaitingForPayday, createFirstCycle,
    quickMenuItems, updateQuickMenuItems,
    isSuperadmin, developerSettings, menuIconOverrides,
    updateDeveloperSettings, updateMenuIconOverride,
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
