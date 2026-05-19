import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { getProductColor } from "@/lib/colors";
import { getEventLabel } from "@/lib/eventLabels";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/statusLabels";
import { useFilters } from "@/hooks/useFilters";
import { startOfDayUTC, endOfDayUTC } from "@/lib/dates";

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
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fromIso = startOfDayUTC(dateFrom);
    const toIso = endOfDayUTC(dateTo);

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, name, number, product, status, "Event", created_at')
        .not("status", "is", null)
        .neq("status", "")
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error(error);
        setLeads([]);
      } else {
        setLeads((data ?? []) as PipelineLead[]);
      }
      setLoading(false);
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
  }, [dateFrom, dateTo]);

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

  return (
    <AppLayout title="Pipeline (Leads)" showProductFilter={false}>
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

      <div className="mt-6 surface-panel p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">Distribuição por Status</h2>
          <p className="text-xs text-[#555] mt-1">
            Baseado nos leads exibidos no período selecionado
          </p>
        </div>

        {loading ? (
          <div className="h-[360px] w-full rounded animate-pulse bg-white/[0.03]" />
        ) : pieData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-[#444]">
            Nenhum lead no período
          </div>
        ) : (
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  dataKey="value"
                  stroke="#0a0a0a"
                  strokeWidth={2}
                  label={({ value, percent }) =>
                    `${value} (${((percent ?? 0) * 100).toFixed(1)}%)`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [String(value), String(name)]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#aaa" }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AppLayout>
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
