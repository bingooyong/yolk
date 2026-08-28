export function haptic(kind: "light" | "medium" = "light") {
  try {
    navigator.vibrate?.(kind === "medium" ? 18 : 8);
  } catch {
    /* unsupported on most iOS Safari versions */
  }
}
