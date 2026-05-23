import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilters } from './useFilters'
import { startOfDayUTC, endOfDayUTC, utcToLocalDateStr, getDaysInRange } from '@/lib/dates'
import { parseCurrencyValue } from '@/lib/utils'

const TABLE = 'obliviumdigital_nutra_br_CRM'

export interface ChartPoint {
  date: string
  sales: number
  value: number
}

export function useChartData() {
  const { dateFrom, dateTo, product } = useFilters()
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        let q = supabase
          .from(TABLE)
          .select('created_at, "($)"')
          .gte('created_at', startOfDayUTC(dateFrom))
          .lte('created_at', endOfDayUTC(dateTo))
          .eq('Event', 'order_paid')
          .ilike('utm_source', '%WPP%')

        if (product && product !== 'Todos') q = q.eq('product', product)

        const { data: rows, error } = await q
        if (error) throw error

        const map: Record<string, { sales: number; value: number }> = {}
        for (const day of getDaysInRange(dateFrom, dateTo)) {
          map[day] = { sales: 0, value: 0 }
        }
        ;((rows ?? []) as any[]).forEach((r) => {
          const day = utcToLocalDateStr(r.created_at)
          if (!map[day]) map[day] = { sales: 0, value: 0 }
          map[day].sales++
          map[day].value += parseCurrencyValue(r['($)'])
        })

        const points: ChartPoint[] = Object.entries(map)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, vals]) => ({ date, ...vals }))

        setData(points)
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateFrom, dateTo, product])

  return { data, loading }
}
