/**
 * HARIS v2 — UUID Helper (browser + node uyumlu)
 *
 * Sorun: crypto.randomUUID() sadece HTTPS/localhost context'te çalışır.
 * Windows'ta bazen 192.168.X.X gibi IP ile açılınca patlar.
 *
 * Çözüm: Önce crypto.randomUUID dene, yoksa RFC4122 v4 manuel üret.
 */

export function uuid(): string {
  // Modern browser + node — güvenli context'te çalışır
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // insecure context'te patlarsa fallback
    }
  }

  // Fallback: getRandomValues varsa RFC4122 v4
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Son çare: Math.random tabanlı (kriptografik değil ama unique yeter)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
