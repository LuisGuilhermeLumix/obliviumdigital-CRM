import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFilters } from "@/hooks/useFilters";
import type { ProductOption } from "@/hooks/useProducts";

/** A partir de quantos produtos o campo de busca aparece. */
const SEARCH_THRESHOLD = 8;

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function buttonLabel(selected: string[]): string {
  if (selected.length === 0) return "Todos";
  if (selected.length <= 2) return selected.join(", ");
  return `${selected.length} selecionados`;
}

interface ProductFilterProps {
  products: ProductOption[];
  loading?: boolean;
}

export function ProductFilter({ products, loading = false }: ProductFilterProps) {
  const selectedProducts = useFilters((s) => s.selectedProducts);
  const toggleProduct = useFilters((s) => s.toggleProduct);
  const clearProducts = useFilters((s) => s.clearProducts);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fecha ao clicar fora ou com Esc. Clicar num item NÃO fecha.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Rótulo segue a ordem da lista (e não a ordem dos cliques).
  const orderedSelection = useMemo(() => {
    const inList = products.map((p) => p.product).filter((p) => selectedProducts.includes(p));
    const notInList = selectedProducts.filter((p) => !inList.includes(p));
    return [...inList, ...notInList];
  }, [products, selectedProducts]);

  const showSearch = products.length > SEARCH_THRESHOLD;
  const visible = useMemo(() => {
    const q = normalize(query);
    if (!q) return products;
    return products.filter((p) => normalize(p.product).includes(q));
  }, [products, query]);
  const firstInactiveIndex = visible.findIndex((p) => p.inactive);

  const allSelected = selectedProducts.length === 0;
  const highlighted = open || !allSelected;

  return (
    <div ref={containerRef} className="relative w-full md:w-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title={allSelected ? undefined : orderedSelection.join(", ")}
        className={[
          "h-9 w-full md:w-auto flex items-center gap-2 px-3.5 rounded-lg bg-[#111] border text-[#ccc] text-sm transition-colors",
          highlighted ? "border-[#80d7f8]" : "border-[#222] hover:border-[#2a2a2a]",
        ].join(" ")}
      >
        <span className="text-[#666] text-xs">Produto:</span>
        <span className="text-xs truncate min-w-0 flex-1 md:flex-none text-left md:max-w-[180px]">
          {buttonLabel(orderedSelection)}
        </span>
        {open ? (
          <ChevronUp size={12} className="text-[#666] shrink-0" />
        ) : (
          <ChevronDown size={12} className="text-[#666] shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 md:left-auto md:w-64 mt-1.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] shadow-lg z-50 overflow-hidden">
          {showSearch && (
            <div className="relative p-2 border-b border-[#1e1e1e]">
              <Search
                size={13}
                className="absolute left-[18px] top-1/2 -translate-y-1/2 text-[#444] pointer-events-none"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto..."
                aria-label="Buscar produto"
                className="w-full h-9 md:h-8 rounded-md bg-[#0a0a0a] border border-[#1e1e1e] pl-8 pr-3 text-base md:text-xs text-[#ccc] placeholder-[#444] outline-none focus:border-[#80d7f8] transition-colors"
              />
            </div>
          )}

          <div role="group" aria-label="Filtrar por produto">
            <OptionRow label="Todos" checked={allSelected} onToggle={clearProducts} />
            <div className="border-t border-[#1e1e1e]" />

            <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
              {loading && products.length === 0 && (
                <p className="px-3 py-2 text-xs text-[#555]">Carregando produtos...</p>
              )}
              {!loading && visible.length === 0 && (
                <p className="px-3 py-2 text-xs text-[#555]">Nenhum produto encontrado</p>
              )}
              {visible.map((p, i) => (
                <div key={p.product}>
                  {i === firstInactiveIndex && (
                    <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[#444]">
                      Sem eventos nos últimos 30 dias
                    </p>
                  )}
                  <OptionRow
                    label={p.product}
                    checked={selectedProducts.includes(p.product)}
                    dimmed={p.inactive}
                    onToggle={() => toggleProduct(p.product)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[#1e1e1e]">
            <span className="text-[11px] text-[#555]">
              {allSelected
                ? "Todos os produtos"
                : selectedProducts.length === 1
                  ? "1 selecionado"
                  : `${selectedProducts.length} selecionados`}
            </span>
            <button
              type="button"
              onClick={clearProducts}
              disabled={allSelected}
              className="text-xs font-medium text-[#80d7f8] hover:underline disabled:text-[#444] disabled:no-underline disabled:cursor-default"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionRow({
  label,
  checked,
  dimmed = false,
  onToggle,
}: {
  label: string;
  checked: boolean;
  dimmed?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 px-3 py-2 md:py-1.5 text-sm text-left hover:bg-[#161616] transition-colors"
    >
      <span
        className={[
          "h-4 w-4 shrink-0 rounded-[4px] border flex items-center justify-center transition-colors",
          checked ? "bg-[#80d7f8] border-[#80d7f8] text-black" : "border-[#3a3a3a]",
        ].join(" ")}
      >
        {checked && <Check size={11} strokeWidth={3.5} />}
      </span>
      <span className={["truncate", dimmed ? "text-[#555]" : "text-[#ccc]"].join(" ")}>
        {label}
      </span>
    </button>
  );
}
