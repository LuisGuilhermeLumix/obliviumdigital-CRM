import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  Target,
  Receipt,
  DollarSign,
  Wallet,
  BadgeDollarSign,
  ShoppingCart,
  MessageCircle,
  Store,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { EventBreakdown } from "@/components/EventBreakdown";
import { RecoveryChart } from "@/components/RecoveryChart";
import { LeadsTable } from "@/components/LeadsTable";
import { useMetrics } from "@/hooks/useMetrics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Lumix - Oblivium Digital" },
      { name: "description", content: "Métricas de recuperação de vendas em tempo real." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { metrics: m, loading } = useMetrics();

  const leadsBreakdown = (
    <EventBreakdown
      items={[
        { eventKey: "abandoned_cart", value: formatNumber(m.leadsByEvent.abandoned_cart) },
        { eventKey: "generated_pix",  value: formatNumber(m.leadsByEvent.generated_pix) },
        { eventKey: "refused_card",   value: formatNumber(m.leadsByEvent.refused_card) },
      ]}
    />
  );

  const responseBreakdown = (
    <EventBreakdown
      items={[
        { eventKey: "abandoned_cart", value: formatPercent(m.responseRateByEvent.abandoned_cart, 2) },
        { eventKey: "generated_pix",  value: formatPercent(m.responseRateByEvent.generated_pix, 2) },
        { eventKey: "refused_card",   value: formatPercent(m.responseRateByEvent.refused_card, 2) },
      ]}
    />
  );

  const recoveredBreakdown = (
    <EventBreakdown
      items={[
        { eventKey: "abandoned_cart", value: formatNumber(m.recoveredByEvent.abandoned_cart) },
        { eventKey: "generated_pix",  value: formatNumber(m.recoveredByEvent.generated_pix) },
        { eventKey: "refused_card",   value: formatNumber(m.recoveredByEvent.refused_card) },
      ]}
    />
  );

  const conversionBreakdown = (
    <EventBreakdown
      items={[
        { eventKey: "abandoned_cart", value: formatPercent(m.conversionByEvent.abandoned_cart, 2) },
        { eventKey: "generated_pix",  value: formatPercent(m.conversionByEvent.generated_pix, 2) },
        { eventKey: "refused_card",   value: formatPercent(m.conversionByEvent.refused_card, 2) },
      ]}
    />
  );

  const ticketBreakdown = (
    <EventBreakdown
      items={[
        { eventKey: "abandoned_cart", value: formatCurrency(m.ticketByEvent.abandoned_cart) },
        { eventKey: "generated_pix",  value: formatCurrency(m.ticketByEvent.generated_pix) },
        { eventKey: "refused_card",   value: formatCurrency(m.ticketByEvent.refused_card) },
      ]}
    />
  );

  const valorBreakdown = (
    <EventBreakdown
      items={[
        { eventKey: "abandoned_cart", value: formatCurrency(m.valorByEvent.abandoned_cart) },
        { eventKey: "generated_pix",  value: formatCurrency(m.valorByEvent.generated_pix) },
        { eventKey: "refused_card",   value: formatCurrency(m.valorByEvent.refused_card) },
      ]}
    />
  );

  const frontBreakdown = (
    <EventBreakdown
      items={[
        { eventKey: "abandoned_cart", value: formatPercent(m.frontByEvent.abandoned_cart, 2) },
        { eventKey: "generated_pix",  value: formatPercent(m.frontByEvent.generated_pix, 2) },
        { eventKey: "refused_card",   value: formatPercent(m.frontByEvent.refused_card, 2) },
      ]}
    />
  );

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Carrinhos Abandonados"
            icon={ShoppingCart}
            loading={loading}
            value={formatNumber(m.carrinhosAbandonados)}
            breakdown={leadsBreakdown}
          />
          <MetricCard
            label="Taxa de Resposta"
            icon={MessageCircle}
            variant="brand"
            loading={loading}
            value={formatPercent(m.taxaResposta, 2)}
            breakdown={responseBreakdown}
          />
          <MetricCard
            label="Vendas Recuperadas"
            icon={TrendingUp}
            variant="success"
            loading={loading}
            value={formatNumber(m.vendasRecuperadas)}
            subInfo={`${formatNumber(m.vendasRecuperadas - m.vendasRecuperadasUpsell)} principais · ${formatNumber(m.vendasRecuperadasUpsell)} upsell`}
            breakdown={recoveredBreakdown}
          />
          <MetricCard
            label="Taxa de Conversão"
            icon={Target}
            variant="brand"
            loading={loading}
            value={formatPercent(m.taxaConversao, 2)}
            breakdown={conversionBreakdown}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <MetricCard
            label="Ticket Médio"
            icon={Receipt}
            loading={loading}
            value={formatCurrency(m.ticketMedio)}
            breakdown={ticketBreakdown}
          />
          <MetricCard
            label="Valor Recuperado"
            icon={BadgeDollarSign}
            variant="success"
            loading={loading}
            value={formatCurrency(m.valorRecuperado)}
            breakdown={valorBreakdown}
          />
          <MetricCard
            label="Faturamento Total (Front)"
            icon={Store}
            variant="brand"
            loading={loading}
            value={formatCurrency(m.faturamentoFront)}
          />
          <MetricCard
            label="Comissão Lumix"
            icon={DollarSign}
            variant="brand2"
            loading={loading}
            value={formatCurrency(m.comissaoLumix)}
            subInfo="10% sobre o valor recuperado"
          />
          <MetricCard
            label="Faturamento Sob o Front"
            icon={Wallet}
            variant="brand2"
            loading={loading}
            value={formatPercent(m.faturamentoSobFrontPct, 2)}
            subInfo="Recuperado vs. faturamento total"
            breakdown={frontBreakdown}
          />
        </div>

        <RecoveryChart />
        <LeadsTable />
      </div>
    </AppLayout>
  );
}
