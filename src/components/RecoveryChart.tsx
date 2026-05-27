import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartData } from "@/hooks/useChartData";
import { formatDateShort, formatDateLong, formatCurrency } from "@/lib/format";
import { EVENT_CONFIG, EVENT_KEYS } from "@/lib/eventLabels";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const total = EVENT_KEYS.reduce((s, k) => s + (point[k] ?? 0), 0);

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-xs shadow-lg min-w-[220px]">
      <p className="mb-2.5 text-[#666] font-medium">{formatDateLong(label)}</p>

      {EVENT_KEYS.map((key) => {
        const cfg = EVENT_CONFIG[key];
        const sales = point[key] ?? 0;
        const value = point.valueByEvent?.[key] ?? 0;
        if (!sales && !value) return null;
        return (
          <div key={key} className="mb-1.5 last:mb-0">
            <div className="flex items-center justify-between gap-4">
              <span style={{ color: cfg.color }}>● {cfg.label}</span>
              <span className="text-white font-semibold">{sales} vendas</span>
            </div>
            <div className="flex justify-end">
              <span style={{ color: cfg.color }} className="font-medium">
                {formatCurrency(value)}
              </span>
            </div>
          </div>
        );
      })}

      {total > 0 && (
        <div className="mt-2 pt-2 border-t border-[#2a2a2a] flex items-center justify-between">
          <span className="text-[#555]">Total</span>
          <span className="text-white font-semibold">
            {formatCurrency(point.value ?? 0)}
          </span>
        </div>
      )}
    </div>
  );
}

export function RecoveryChart() {
  const { data, loading } = useChartData();

  if (loading) {
    return (
      <div className="surface-panel p-6">
        <div className="h-4 w-48 rounded animate-pulse bg-white/[0.04] mb-2" />
        <div className="h-3 w-64 rounded animate-pulse bg-white/[0.03] mb-5" />
        <div className="h-[220px] w-full rounded animate-pulse bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="surface-panel p-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Recuperações ao longo do tempo
          </h2>
          <p className="text-xs text-[#555] mt-1">
            Vendas recuperadas por dia, separadas por evento de origem
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {EVENT_KEYS.map((key) => (
            <LegendDot key={key} color={EVENT_CONFIG[key].color} label={EVENT_CONFIG[key].label} />
          ))}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: typeof window !== "undefined" && window.innerWidth < 768 ? 180 : 240,
        }}
      >
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#1a1a1a" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="#444"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatDateShort(v)}
            />
            <YAxis stroke="#444" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2a2a2a", strokeWidth: 1 }} />
            {EVENT_KEYS.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={EVENT_CONFIG[key].label}
                stroke={EVENT_CONFIG[key].color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-xs text-[#888]">{label}</span>
    </div>
  );
}
