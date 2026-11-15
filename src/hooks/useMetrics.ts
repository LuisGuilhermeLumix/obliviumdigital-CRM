import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters } from './useFilters'
import { startOfDayUTC, endOfDayUTC } from '@/lib/dates'
import { fetchAll } from '@/lib/fetchAll'
import {
  calcAbandonedCarts,
  calcResponseRate,
  calcRecoveredSales,
  calcRecoveredUpsells,
  calcConversionRate,
  calcTicketMedio,
  calcValorRecuperado,
  calcComissaoLumix,
  calcFaturamentoFront,
  calcFaturamentoSobFront,
  calcLeadsByEvent,
  calcResponseRateByEvent,
  calcRecoveredSalesByEvent,
  calcConversionRateByEvent,
  calcTicketMedioByEvent,
  calcValorRecuperadoByEvent,
  calcFaturamentoSobFrontByEvent,
  CRMRow,
} from '@/lib/metrics'
import { EventKey, EVENT_KEYS } from '@/lib/eventLabels'

const TABLE = 'obliviumdigital_nutra_br_CRM'

type ByEvent = Record<EventKey, number>

export interface DashboardMetrics {
  carrinhosAbandonados: number
  taxaResposta: number
  vendasRecuperadas: number
  vendasRecuperadasUpsell: number
  taxaConversao: number
  ticketMedio: number
  valorRecuperado: number
  faturamentoFront: number
  comissaoLumix: number
  faturamentoSobFrontPct: number
  leadsByEvent: ByEvent
  responseRateByEvent: ByEvent
  recoveredByEvent: ByEvent
  conversionByEvent: ByEvent
  ticketByEvent: ByEvent
  valorByEvent: ByEvent
  frontByEvent: ByEvent
}

const zeroByEvent: ByEvent = EVENT_KEYS.reduce((acc, k) => {
  acc[k] = 0
  return acc
}, {} as ByEvent)

const zero: DashboardMetrics = {
  carrinhosAbandonados: 0,
  taxaResposta: 0,
  vendasRecuperadas: 0,
  vendasRecuperadasUpsell: 0,
  taxaConversao: 0,
  ticketMedio: 0,
  valorRecuperado: 0,
  faturamentoFront: 0,
  comissaoLumix: 0,
  faturamentoSobFrontPct: 0,
  leadsByEvent: { ...zeroByEvent },
  responseRateByEvent: { ...zeroByEvent },
  recoveredByEvent: { ...zeroByEvent },
  conversionByEvent: { ...zeroByEvent },
  ticketByEvent: { ...zeroByEvent },
  valorByEvent: { ...zeroByEvent },
  frontByEvent: { ...zeroByEvent },
}

export function useMetrics() {
  const { dateFrom, dateTo, selectedProducts } = useFilters()
  const [metrics, setMetrics] = useState<DashboardMetrics>(zero)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const from = startOfDayUTC(dateFrom)
        const to = endOfDayUTC(dateTo)

        const rows = await fetchAll<CRMRow>(() => {
          let q = supabase
            .from(TABLE)
            .select('"Event", utm_source, status, upsell, "($)"')
            .gte('created_at', from)
            .lte('created_at', to)
          // Array vazio = "Todos": sem filtro de produto
          if (selectedProducts.length > 0) q = q.in('product', selectedProducts)
          return q
        })

        if (cancelled) return

        const carrinhosAbandonados = calcAbandonedCarts(rows)
        const taxaResposta = calcResponseRate(rows)
        const vendasRecuperadas = calcRecoveredSales(rows)
        const vendasRecuperadasUpsell = calcRecoveredUpsells(rows)
        const taxaConversao = calcConversionRate(vendasRecuperadas, carrinhosAbandonados)
        const ticketMedio = calcTicketMedio(rows)
        const valorRecuperado = calcValorRecuperado(rows)
        const faturamentoFront = calcFaturamentoFront(rows)
        const comissaoLumix = calcComissaoLumix(valorRecuperado)
        const faturamentoSobFrontPct = calcFaturamentoSobFront(valorRecuperado, faturamentoFront)

        const leadsByEvent = calcLeadsByEvent(rows)
        const responseRateByEvent = calcResponseRateByEvent(rows)
        const recoveredByEvent = calcRecoveredSalesByEvent(rows)
        const conversionByEvent = calcConversionRateByEvent(recoveredByEvent, leadsByEvent)
        const ticketByEvent = calcTicketMedioByEvent(rows)
        const valorByEvent = calcValorRecuperadoByEvent(rows)
        const frontByEvent = calcFaturamentoSobFrontByEvent(valorByEvent, faturamentoFront)

        setMetrics({
          carrinhosAbandonados,
          taxaResposta,
          vendasRecuperadas,
          vendasRecuperadasUpsell,
          taxaConversao,
          ticketMedio,
          valorRecuperado,
          faturamentoFront,
          comissaoLumix,
          faturamentoSobFrontPct,
          leadsByEvent,
          responseRateByEvent,
          recoveredByEvent,
          conversionByEvent,
          ticketByEvent,
          valorByEvent,
          frontByEvent,
        })
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Erro ao buscar dados')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [dateFrom, dateTo, selectedProducts])

  return { metrics, loading, error }
}
