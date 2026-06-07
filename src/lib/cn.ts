import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind sınıflarını birleştirmek için yardımcı.
 * Çakışan utility'leri otomatik çözer.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
