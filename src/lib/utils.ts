import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte o valor da coluna "($)" de texto para número.
 * Suporta: "R$225,44" | "R$ 225,44" | "225,44" | "225.44" | 225
 */
export function parseCurrencyValue(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;

  const cleaned = String(raw)
    .replace(/R\$\s*/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
