import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { ChevronDown } from "lucide-react";
import { getProductColor } from "@/lib/colors";
import { EVENT_CONFIG, EVENT_KEYS, EventKey, getEventLabel } from "@/lib/eventLabels";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/statusLabels";
import { useFilters } from "@/hooks/useFilters";
import { startOfDayUTC, endOfDayUTC } from "@/lib/dates";
import { fetchAll } from "@/lib/fetchAll";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Lumix - Oblivium Digital" },
      { name: "description", content: "Pipeline de leads no período." },
    ],
  }),
  component: PipelinePage,
});

const TABLE = "obliviumdigital_nutra_br_CRM";

interface PipelineLead {
  id: number;
  name: string | null;
  number: string | null;
  product: string | null;
  status: string;
  Event: string | null;
  created_at: string;
}

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatCreatedAt(iso: string): string {
  try {
    return dateTimeFmt.format(new Date(iso));
  } catch {
    return iso;
  }
}

function PipelinePage() {
  const { dateFrom, dateTo } = useFilters();
  const [eventFilter, setEventFilter] = useState<EventKey | "all">("all");
  const [eventOpen, setEventOpen] = useState(false);
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fromIso = startOfDayUTC(dateFrom);
    const toIso = endOfDayUTC(dateTo);
    const currentEventFilter = eventFilter;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchAll<PipelineLead>(() => {
          let q = supabase
            .from(TABLE)
            .select('id, name, number, product, status, "Event", created_at')
            .not("status", "is", null)
            .neq("status", "")
            .neq("Event", "order_paid")
            .gte("created_at", fromIso)
            .lte("created_at", toIso)
            .order("created_at", { ascending: false });
          if (currentEventFilter !== "all") {
            q = q.eq("Event", currentEventFilter);
          }
          return q;
        });
        if (cancelled) return;
        setLeads(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setLeads([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel("pipeline-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          if (!row) return;

          setLeads((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((l) => l.id !== row.id);
            }
            const next = prev.filter((l) => l.id !== row.id);
            if (!row.status) return next;
            if (row.Event === "order_paid") return next;
            if (currentEventFilter !== "all" && row.Event !== currentEventFilter) return next;
            if (row.created_at < fromIso || row.created_at > toIso) return next;
            const updated: PipelineLead = {
              id: row.id,
              name: row.name ?? null,
              number: row.number ?? null,
              product: row.product ?? null,
              status: row.status,
              Event: row.Event ?? null,
              created_at: row.created_at,
            };
            next.unshift(updated);
            return next.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [dateFrom, dateTo, eventFilter]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lead of leads) {
      counts[lead.status] = (counts[lead.status] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([status, value]) => ({
        status,
        name: STATUS_LABELS[status] ?? status,
        value,
        color: STATUS_COLORS[status] ?? "#888888",
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  const currentEventLabel =
    eventFilter === "all" ? "Todos" : EVENT_CONFIG[eventFilter].label;

  return (
    <AppLayout title="Pipeline (Leads)" showProductFilter={false}>
      <div className="mb-4 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setEventOpen((v) => !v)}
            className="h-9 flex items-center gap-2 px-3.5 rounded-lg bg-[#111] border border-[#222] text-[#ccc] text-sm hover:border-[#2a2a2a] transition-colors"
          >
            <span className="text-[#666] text-xs">Evento:</span>
            <span className="text-xs">{currentEventLabel}</span>
            <ChevronDown size={12} className="text-[#666]" />
          </button>
          {eventOpen && (
            <div className="absolute left-0 mt-1.5 w-56 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] py-1 shadow-lg z-50">
              <button
                onClick={() => {
                  setEventFilter("all");
                  setEventOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-[#ccc] hover:bg-[#161616] transition-colors"
              >
                Todos
              </button>
              {EVENT_KEYS.map((key) => {
                const cfg = EVENT_CONFIG[key];
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setEventFilter(key);
                      setEventOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-[#ccc] hover:bg-[#161616] transition-colors flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="-mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STATUS_ORDER.map((statusKey) => {
            const colLeads = leads.filter((l) => l.status === statusKey);
            const color = STATUS_COLORS[statusKey] ?? "#888888";
            const label = STATUS_LABELS[statusKey] ?? statusKey;
            return (
              <div
                key={statusKey}
                className="w-[280px] flex-shrink-0 rounded-xl bg-[#0a0a0a] border border-[#141414] flex flex-col max-h-[calc(100vh-180px)]"
              >
                <div className="px-4 py-3 border-b border-[#141414] flex items-center justify-between gap-2 sticky top-0 bg-[#0a0a0a] rounded-t-xl">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: color + "22",
                      color,
                      border: `1px solid ${color}44`,
                    }}
                  >
                    {label}
                  </span>
                  <span className="text-xs font-semibold text-[#666]">
                    ({colLeads.length})
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {loading && colLeads.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 rounded-lg bg-white/[0.03] animate-pulse"
                      />
                    ))
                  ) : colLeads.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-[#444]">
                      Sem leads
                    </div>
                  ) : (
                    colLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <StatusDistribution data={pieData} loading={loading} />
    </AppLayout>
  );
}

interface StatusDatum {
  status: string;
  name: string;
  value: number;
  color: string;
}

function StatusTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0].payload;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="font-medium text-white">{name}</p>
      <p className="text-gray-400">
        {value} leads · {((percent ?? 0) * 100).toFixed(1)}%
      </p>
    </div>
  );
}

function StatusDistribution({ data, loading }: { data: StatusDatum[]; loading: boolean }) {
  const totalLeads = data.reduce((acc, d) => acc + d.value, 0);
  const enriched = data.map((d) => ({
    ...d,
    percent: totalLeads ? d.value / totalLeads : 0,
  }));

  return (
    <div className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Distribuição por Status</h2>
        <p className="text-sm text-gray-400">Percentual de leads em cada coluna do pipeline</p>
      </div>

      {loading ? (
        <div className="h-[300px] w-full rounded animate-pulse bg-white/[0.03]" />
      ) : enriched.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-[#444]">
          Nenhum lead no período
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-full lg:w-[340px] h-[300px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enriched}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#0a0a0a"
                  strokeWidth={2}
                >
                  {enriched.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<StatusTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 w-full">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
              {totalLeads} leads no total
            </p>

            <div className="space-y-2">
              {enriched.map((item) => (
                <div key={item.status} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-300 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.percent * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium w-8 text-right">
                      {item.value}
                    </span>
                    <span className="text-xs text-gray-400 w-12 text-right">
                      {(item.percent * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: PipelineLead }) {
  const ev = getEventLabel(lead.Event);
  return (
    <div className="rounded-lg bg-[#101010] border border-[#1a1a1a] p-3 hover:border-[#2a2a2a] transition-colors space-y-1.5">
      <div className="text-sm font-semibold text-white truncate">
        {lead.name || "—"}
      </div>
      <div className="text-xs text-[#888] font-mono truncate">
        {lead.number || "—"}
      </div>
      <div className="text-[10px] text-[#555]">
        {formatCreatedAt(lead.created_at)}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span
          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: ev.color + "22",
            color: ev.color,
            border: `1px solid ${ev.color}44`,
          }}
        >
          {ev.label}
        </span>
        {lead.product && (
          <span
            className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate max-w-full"
            style={(() => {
              const c = getProductColor(lead.product);
              return { backgroundColor: c.bg, color: c.text };
            })()}
          >
            {lead.product}
          </span>
        )}
      </div>
    </div>
  );
}
