import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useFilters } from "./useFilters";

const PRODUCTS_VIEW = "obliviumdigital_crm_products";
const INACTIVE_AFTER_DAYS = 30;

export interface ProductOption {
  product: string;
  totalEventos: number;
  ultimoEvento: string | null;
  /** Sem evento nos últimos 30 dias — vai pro fim da lista, com texto apagado. */
  inactive: boolean;
}

/** Usada só se a consulta à view falhar. */
const FALLBACK_PRODUCTS = [
  "Neurovex",
  "Prostavex",
  "Gelatina Redux",
  "Dermavex",
  "Memorivex",
  "NeuroCoffee",
  "Nervovex",
  "Visavex",
  "Iogurt Slim",
  "Tirzavex",
  "Flexozil",
  "Neuromel",
  "Neurogenix",
  "Erectovex",
  "Glicovex",
];

const FALLBACK_OPTIONS: ProductOption[] = FALLBACK_PRODUCTS.map((product) => ({
  product,
  totalEventos: 0,
  ultimoEvento: null,
  inactive: false,
}));

interface ProductViewRow {
  product: string | null;
  total_eventos: number | null;
  ultimo_evento: string | null;
}

function toOptions(rows: ProductViewRow[]): ProductOption[] {
  const cutoff = Date.now() - INACTIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const options: ProductOption[] = [];
  for (const r of rows) {
    if (!r.product) continue;
    const last = r.ultimo_evento ? new Date(r.ultimo_evento).getTime() : NaN;
    options.push({
      product: r.product,
      totalEventos: r.total_eventos ?? 0,
      ultimoEvento: r.ultimo_evento,
      inactive: Number.isNaN(last) || last < cutoff,
    });
  }
  // Ativos primeiro; dentro de cada grupo, mais eventos primeiro.
  return options.sort(
    (a, b) =>
      Number(a.inactive) - Number(b.inactive) ||
      b.totalEventos - a.totalEventos ||
      a.product.localeCompare(b.product),
  );
}

export function useProducts() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(PRODUCTS_VIEW)
          .select("product, total_eventos, ultimo_evento")
          .order("total_eventos", { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const options = toOptions((data ?? []) as ProductViewRow[]);
        if (!options.length) throw new Error("View de produtos retornou vazia");
        setProducts(options);

        // Descarta da seleção salva produtos que não existem mais na base.
        const known = new Set(options.map((o) => o.product));
        const { selectedProducts, setSelectedProducts } = useFilters.getState();
        if (selectedProducts.some((p) => !known.has(p))) {
          setSelectedProducts(selectedProducts.filter((p) => known.has(p)));
        }
      } catch (e) {
        console.error("Falha ao carregar produtos da view, usando lista de fallback", e);
        if (!cancelled) setProducts(FALLBACK_OPTIONS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading };
}
