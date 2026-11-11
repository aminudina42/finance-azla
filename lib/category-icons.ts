import React from "react";
import {
  UtensilsCrossed,
  ShoppingCart,
  Landmark,
  Zap,
  Home,
  Car,
  Bike,
  Fuel,
  HeartPulse,
  Pill,
  Smartphone,
  Wifi,
  GraduationCap,
  BookOpen,
  Gamepad2,
  Film,
  Gift,
  HandHeart,
  Baby,
  User,
  Shirt,
  Sparkles,
  Dumbbell,
  Plane,
  Dog,
  Wrench,
  WalletCards,
  Coins,
  Receipt,
  Store,
  Coffee,
  type LucideIcon,
} from "lucide-react";

export type IconColorTheme =
  | "amber"
  | "blue"
  | "emerald"
  | "rose"
  | "purple"
  | "cyan"
  | "orange"
  | "slate"
  | "teal";

export interface CategoryIconPreset {
  slug: string;
  label: string;
  icon: LucideIcon;
  defaultTheme: IconColorTheme;
}

export interface IconStyleClasses {
  bg: string;
  border: string;
  text: string;
}

export const ICON_COLOR_STYLES: Record<IconColorTheme, IconStyleClasses> = {
  amber: {
    bg: "bg-[#fff0d6]",
    border: "border-[#fed7aa]",
    text: "text-[#d97706]",
  },
  blue: {
    bg: "bg-[#e5edff]",
    border: "border-[#bfdbfe]",
    text: "text-[#2563eb]",
  },
  emerald: {
    bg: "bg-[#e2f9f3]",
    border: "border-[#a7f3d0]",
    text: "text-[#059669]",
  },
  rose: {
    bg: "bg-[#ffe0e7]",
    border: "border-[#fecdd3]",
    text: "text-[#e11d48]",
  },
  purple: {
    bg: "bg-[#f1ebff]",
    border: "border-[#ddd6fe]",
    text: "text-[#7c3aed]",
  },
  cyan: {
    bg: "bg-[#e1f8fd]",
    border: "border-[#bae6fd]",
    text: "text-[#0284c7]",
  },
  orange: {
    bg: "bg-[#fff3e0]",
    border: "border-[#fed7aa]",
    text: "text-[#ea580c]",
  },
  slate: {
    bg: "bg-[#f1f8fd]",
    border: "border-[#d8eaf8]",
    text: "text-[#17375f]",
  },
  teal: {
    bg: "bg-[#d9f7f2]",
    border: "border-[#99f6e4]",
    text: "text-[#0d9488]",
  },
};

/**
 * Curated preset icons for financial categories and pocket wallets.
 */
export const CATEGORY_ICON_PRESETS: CategoryIconPreset[] = [
  { slug: "utensils", label: "Makan & Dapur", icon: UtensilsCrossed, defaultTheme: "amber" },
  { slug: "coffee", label: "Kopi & Kafe", icon: Coffee, defaultTheme: "amber" },
  { slug: "cart", label: "Belanja & Pasar", icon: ShoppingCart, defaultTheme: "blue" },
  { slug: "store", label: "Minimarket", icon: Store, defaultTheme: "cyan" },
  { slug: "bank", label: "Tabungan & Bank", icon: Landmark, defaultTheme: "emerald" },
  { slug: "wallet", label: "Dompet & Kas", icon: WalletCards, defaultTheme: "emerald" },
  { slug: "coins", label: "Investasi", icon: Coins, defaultTheme: "amber" },
  { slug: "bolt", label: "Listrik & Utilitas", icon: Zap, defaultTheme: "orange" },
  { slug: "home", label: "Rumah & Kos", icon: Home, defaultTheme: "blue" },
  { slug: "car", label: "Mobil & Angkutan", icon: Car, defaultTheme: "blue" },
  { slug: "bike", label: "Motor & Sepeda", icon: Bike, defaultTheme: "teal" },
  { slug: "fuel", label: "Bahan Bakar (BBM)", icon: Fuel, defaultTheme: "orange" },
  { slug: "wrench", label: "Servis & Perbaikan", icon: Wrench, defaultTheme: "slate" },
  { slug: "health", label: "Kesehatan & RS", icon: HeartPulse, defaultTheme: "rose" },
  { slug: "pill", label: "Obat & Farmasi", icon: Pill, defaultTheme: "rose" },
  { slug: "phone", label: "Pulsa & Paket Data", icon: Smartphone, defaultTheme: "purple" },
  { slug: "wifi", label: "Internet & Langganan", icon: Wifi, defaultTheme: "purple" },
  { slug: "receipt", label: "Tagihan Bulanan", icon: Receipt, defaultTheme: "slate" },
  { slug: "education", label: "Pendidikan & Kuliah", icon: GraduationCap, defaultTheme: "blue" },
  { slug: "book", label: "Buku & Kursus", icon: BookOpen, defaultTheme: "teal" },
  { slug: "baby", label: "Kebutuhan Anak", icon: Baby, defaultTheme: "cyan" },
  { slug: "user", label: "Pribadi / Saku", icon: User, defaultTheme: "slate" },
  { slug: "shirt", label: "Pakaian & Laundry", icon: Shirt, defaultTheme: "teal" },
  { slug: "sparkles", label: "Perawatan & Skincare", icon: Sparkles, defaultTheme: "purple" },
  { slug: "game", label: "Game & Hobi", icon: Gamepad2, defaultTheme: "purple" },
  { slug: "film", label: "Hiburan & Bioskop", icon: Film, defaultTheme: "rose" },
  { slug: "plane", label: "Wisata & Perjalanan", icon: Plane, defaultTheme: "cyan" },
  { slug: "gift", label: "Kado & Traktir", icon: Gift, defaultTheme: "rose" },
  { slug: "heart", label: "Zakat & Sedekah", icon: HandHeart, defaultTheme: "emerald" },
  { slug: "dumbbell", label: "Olahraga & Gym", icon: Dumbbell, defaultTheme: "orange" },
  { slug: "dog", label: "Hewan Peliharaan", icon: Dog, defaultTheme: "amber" },
];

const PRESETS_BY_SLUG = new Map<string, CategoryIconPreset>(
  CATEGORY_ICON_PRESETS.map((p) => [p.slug, p])
);

/**
 * Mapping legacy unicode emojis to modern curated vector slugs.
 */
const EMOJI_TO_SLUG_MAP: Record<string, string> = {
  "🍚": "utensils",
  "🍔": "utensils",
  "🍕": "utensils",
  "☕": "coffee",
  "🛒": "cart",
  "🛍️": "cart",
  "🛍": "cart",
  "🏪": "store",
  "🏦": "bank",
  "💰": "wallet",
  "💳": "wallet",
  "💵": "wallet",
  "🪙": "coins",
  "⚡": "bolt",
  "💡": "bolt",
  "🏠": "home",
  "🚗": "car",
  "🚘": "car",
  "🏍️": "bike",
  "🏍": "bike",
  "🛵": "bike",
  "🚲": "bike",
  "⛽": "fuel",
  "🔧": "wrench",
  "🛠️": "wrench",
  "🏥": "health",
  "❤️": "health",
  "💊": "pill",
  "📱": "phone",
  "📶": "wifi",
  "🧾": "receipt",
  "🎓": "education",
  "📚": "book",
  "📖": "book",
  "👶": "baby",
  "👦": "user",
  "👧": "user",
  "👨": "user",
  "👩": "user",
  "👨‍💼": "user",
  "👗": "shirt",
  "👕": "shirt",
  "🧴": "sparkles",
  "✨": "sparkles",
  "🎮": "game",
  "🎬": "film",
  "✈️": "plane",
  "✈": "plane",
  "🎁": "gift",
  "🤲": "heart",
  "💪": "dumbbell",
  "🐕": "dog",
  "🐈": "dog",
  "🎨": "sparkles",
  "🧸": "baby",
};

/**
 * Keywords for category name auto-fallback when icon is not explicitly specified.
 */
const KEYWORD_MAP: Array<{ regex: RegExp; slug: string }> = [
  { regex: /makan|dapur|kuliner|restoran|food|lunch|dinner|snack/i, slug: "utensils" },
  { regex: /kopi|kafe|coffee/i, slug: "coffee" },
  { regex: /belanja|online\s*shop|market|pasar|tokopedia|shopee|supermarket/i, slug: "cart" },
  { regex: /tabung|bank|dana\s*darurat|investasi|saham|reksa|deposito/i, slug: "bank" },
  { regex: /listrik|pln|token|pdam|air|gas/i, slug: "bolt" },
  { regex: /rumah|kos|sewa|kontrakan|apartemen/i, slug: "home" },
  { regex: /mobil|motor|kendaraan|transport|ojol|grab|gojek|parkir|tol/i, slug: "car" },
  { regex: /bensin|bbm|pertamax|pertalite|shell/i, slug: "fuel" },
  { regex: /sehat|obat|dokter|klinik|rs|medis|apotek|dental/i, slug: "health" },
  { regex: /pulsa|data|internet|wifi|telkom|indihome|paket/i, slug: "phone" },
  { regex: /sekolah|kuliah|pendidikan|les|spp|buku/i, slug: "education" },
  { regex: /anak|bayi|baby|susu|popok/i, slug: "baby" },
  { regex: /zakat|infaq|sedekah|donasi|sosial/i, slug: "heart" },
  { regex: /liburan|wisata|trip|hotel|pesawat/i, slug: "plane" },
  { regex: /sabun|skincare|kosmetik|toiletries|perawatan/i, slug: "sparkles" },
  { regex: /gaji|suami|istri|uang\s*saku|saku/i, slug: "wallet" },
];

export interface ResolvedCategoryIcon {
  slug: string;
  icon: LucideIcon;
  label: string;
  theme: IconColorTheme;
  classes: IconStyleClasses;
  isEmoji?: boolean;
  rawEmoji?: string;
}

/**
 * Checks if a string contains unicode emoji characters.
 */
export function isEmoji(str?: string | null): boolean {
  if (!str) return false;
  return /\p{Extended_Pictographic}/u.test(str.trim());
}

/**
 * Curated list of popular emojis for Indonesian family budgeting pos & pockets.
 */
export const POPULAR_CATEGORY_EMOJIS: string[] = [
  "🍚", "🍔", "☕", "🛒", "🛍️", "🏪", "⚡", "💡",
  "🏠", "🚗", "🏍️", "⛽", "🔧", "🏥", "💊", "📱",
  "📶", "🧾", "🎓", "📚", "👶", "👨‍💼", "👩", "🧒",
  "👗", "✨", "🎮", "🎬", "✈️", "🎁", "🤲", "💪",
  "🐕", "🏦", "💰", "💳", "🪙", "🎯", "📦", "🎨",
];

/**
 * Safely resolves an icon identifier (slug, legacy emoji, or pos name)
 * to a standardized vector icon and color classes.
 */
export function resolveCategoryIcon(
  identifier?: string | null,
  fallbackName?: string | null,
  overrideTheme?: IconColorTheme
): ResolvedCategoryIcon {
  const cleanId = (identifier || "").trim();

  // 1. Direct match with preset slug
  if (cleanId && PRESETS_BY_SLUG.has(cleanId)) {
    const preset = PRESETS_BY_SLUG.get(cleanId)!;
    const theme = overrideTheme || preset.defaultTheme;
    return {
      slug: preset.slug,
      icon: preset.icon,
      label: preset.label,
      theme,
      classes: ICON_COLOR_STYLES[theme],
      isEmoji: false,
    };
  }

  // 2. Hybrid Mode: If identifier is an emoji, preserve and render emoji directly!
  if (cleanId && isEmoji(cleanId)) {
    let matchedTheme: IconColorTheme = overrideTheme || "slate";
    let matchedLabel = fallbackName || "Kategori";
    let fallbackIcon = WalletCards;

    if (EMOJI_TO_SLUG_MAP[cleanId]) {
      const slug = EMOJI_TO_SLUG_MAP[cleanId];
      const preset = PRESETS_BY_SLUG.get(slug);
      if (preset) {
        matchedTheme = overrideTheme || preset.defaultTheme;
        matchedLabel = preset.label;
        fallbackIcon = preset.icon;
      }
    } else if (fallbackName) {
      for (const rule of KEYWORD_MAP) {
        if (rule.regex.test(fallbackName)) {
          const preset = PRESETS_BY_SLUG.get(rule.slug);
          if (preset) {
            matchedTheme = overrideTheme || preset.defaultTheme;
            break;
          }
        }
      }
    }

    return {
      slug: cleanId,
      icon: fallbackIcon,
      label: matchedLabel,
      theme: matchedTheme,
      classes: ICON_COLOR_STYLES[matchedTheme],
      isEmoji: true,
      rawEmoji: cleanId,
    };
  }

  // 3. Fallback based on category / pos name keyword
  if (fallbackName && fallbackName.trim()) {
    const targetName = fallbackName.trim();
    for (const rule of KEYWORD_MAP) {
      if (rule.regex.test(targetName)) {
        const preset = PRESETS_BY_SLUG.get(rule.slug);
        if (preset) {
          const theme = overrideTheme || preset.defaultTheme;
          return {
            slug: preset.slug,
            icon: preset.icon,
            label: preset.label,
            theme,
            classes: ICON_COLOR_STYLES[theme],
          };
        }
      }
    }
  }

  // 4. Ultimate clean fallback: WalletCards in slate
  const defaultTheme = overrideTheme || "slate";
  return {
    slug: "wallet",
    icon: WalletCards,
    label: fallbackName || "Kategori",
    theme: defaultTheme,
    classes: ICON_COLOR_STYLES[defaultTheme],
  };
}
