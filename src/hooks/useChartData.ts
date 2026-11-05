import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters } from './useFilters'
import { startOfDayUTC, endOfDayUTC, utcToLocalDateStr, getDaysInRange } from '@/lib/dates'
import { parseCurrencyValue } from '@/lib/utils'
import { fetchAll } from '@/lib/fetchAll'
import { EVENT_KEYS, EventKey, getEventFromUtmSource } from '@/lib/eventLabels'

const TABLE = 'obliviumdigital_nutra_br_CRM'

type EventValues = Record<EventKey, number>

export interface ChartPoint extends EventValues {
  date: string
  sales: number
  value: number
  // valores agregados por evento (para tooltip futuro)
  valueByEvent: EventValues
}

function emptyEventValues(): EventValues {
  return EVENT_KEYS.reduce((acc, k) => {
    acc[k] = 0
    return acc
  }, {} as EventValues)
}

export function useChartData() {
  const { dateFrom, dateTo, selectedProducts } = useFilters()
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Com múltipla seleção o usuário dispara várias buscas em sequência;
    // descarta respostas de buscas antigas para não sobrescrever a mais nova.
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const rows = await fetchAll<{
          created_at: string
          utm_source: string | null
          '($)': string | number | null
        }>(() => {
          let q = supabase
            .from(TABLE)
            .select('created_at, utm_source, "($)"')
            .gte('created_at', startOfDayUTC(dateFrom))
            .lte('created_at', endOfDayUTC(dateTo))
            .eq('Event', 'order_paid')
            .ilike('utm_source', '%WPP%')

          // Array vazio = "Todos": sem filtro de produto
          if (selectedProducts.length > 0) q = q.in('product', selectedProducts)
          return q
        })

        if (cancelled) return

        const map: Record<string, { sales: number; value: number; counts: EventValues; values: EventValues }> = {}
        for (const day of getDaysInRange(dateFrom, dateTo)) {
          map[day] = {
            sales: 0,
            value: 0,
            counts: emptyEventValues(),
            values: emptyEventValues(),
          }
        }
        rows.forEach((r) => {
          const day = utcToLocalDateStr(r.created_at)
          if (!map[day]) {
            map[day] = {
              sales: 0,
              value: 0,
              counts: emptyEventValues(),
              values: emptyEventValues(),
            }
          }
          const v = parseCurrencyValue(r['($)'])
          map[day].sales++
          map[day].value += v
          const key = getEventFromUtmSource(r.utm_source)
          if (key) {
            map[day].counts[key]++
            map[day].values[key] += v
          }
        })

        const points: ChartPoint[] = Object.entries(map)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, vals]) => ({
            date,
            sales: vals.sales,
            value: vals.value,
            ...vals.counts,
            valueByEvent: vals.values,
          }))

        setData(points)
      } catch {
        if (!cancelled) setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dateFrom, dateTo, selectedProducts])

  return { data, loading }
}
