/**
 * Haptic Feedback Utility for Mobile Web & PWA
 * Uses the Web Vibration API with safe fallbacks.
 */

export type HapticType = "light" | "medium" | "heavy" | "warning" | "success";

export interface HapticOptions {
  enableFallback?: boolean;
}

export function triggerHaptic(type: HapticType = "light", options?: HapticOptions): void {
  void options;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }

  if (!("vibrate" in navigator) || typeof navigator.vibrate !== "function") {
    return;
  }

  try {
    switch (type) {
      case "light":
        navigator.vibrate(12);
        break;
      case "medium":
        navigator.vibrate(28);
        break;
      case "heavy":
        navigator.vibrate(45);
        break;
      case "warning":
        navigator.vibrate([40, 50, 40]);
        break;
      case "success":
        navigator.vibrate([15, 40, 25]);
        break;
      default:
        navigator.vibrate(12);
    }
  } catch {
    // Graceful fallback if device permissions restrict vibration
  }
}

