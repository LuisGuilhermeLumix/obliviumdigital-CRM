import { create } from "zustand";
import { todayStr, daysAgoStr, firstOfMonthStr } from "@/lib/dates";

export type RangeKey = "hoje" | "ontem" | "7d" | "mes" | "custom";

const PRODUCTS_STORAGE_KEY = "oblivium_crm_selected_products";

function loadSelectedProducts(): string[] {
  try {
    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(parsed.filter((p): p is string => typeof p === "string" && p !== "")),
    );
  } catch {
    return [];
  }
}

function saveSelectedProducts(products: string[]) {
  try {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  } catch {
    // localStorage indisponível (aba privada, quota etc.) — segue só em memória
  }
}

interface FiltersState {
  dateFrom: string;
  dateTo: string;
  /** Produtos selecionados no filtro. Array vazio = "Todos" (sem filtro de produto). */
  selectedProducts: string[];
  activeRange: RangeKey;
  setSelectedProducts: (v: string[]) => void;
  toggleProduct: (product: string) => void;
  clearProducts: () => void;
  setRange: (key: Exclude<RangeKey, "custom">) => void;
  applyCustom: (from: string, to: string) => void;
}

export const useFilters = create<FiltersState>((set, get) => ({
  dateFrom: firstOfMonthStr(),
  dateTo: todayStr(),
  selectedProducts: loadSelectedProducts(),
  activeRange: "mes",

  setSelectedProducts: (v) => {
    const next = Array.from(new Set(v));
    saveSelectedProducts(next);
    set({ selectedProducts: next });
  },

  toggleProduct: (product) => {
    const current = get().selectedProducts;
    const next = current.includes(product)
      ? current.filter((p) => p !== product)
      : [...current, product];
    saveSelectedProducts(next);
    set({ selectedProducts: next });
  },

  clearProducts: () => {
    if (get().selectedProducts.length === 0) return;
    saveSelectedProducts([]);
    set({ selectedProducts: [] });
  },

  applyCustom: (from, to) =>
    set({
      dateFrom: from,
      dateTo: to,
      activeRange: "custom",
    }),

  setRange: (key) => {
    let from: string;
    let to: string = todayStr();

    if (key === "hoje") {
      from = todayStr();
    } else if (key === "ontem") {
      from = daysAgoStr(1);
      to = daysAgoStr(1);
    } else if (key === "7d") {
      from = daysAgoStr(6);
    } else {
      from = firstOfMonthStr();
    }

    set({ dateFrom: from, dateTo: to, activeRange: key });
  },
}));
