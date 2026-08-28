import { useGameStore } from "@/game/store";

export function haptic(kind: "light" | "medium" = "light") {
  try {
    if (useGameStore.getState().hapticOn === false) return;
    navigator.vibrate?.(kind === "medium" ? 18 : 8);
  } catch {
    /* unsupported on most iOS Safari versions */
  }
}
