import { parseCurrencyValue } from './utils'
import { EVENT_KEYS, EventKey, getEventFromUtmSource } from './eventLabels'

export const COMMISSION_RATE = 0.10

export interface CRMRow {
  created_at?: string
  name?: string | null
  number?: string | null
  email?: string | null
  product?: string | null
  Event?: string | null
  amount?: string | number | null
  utm_source?: string | null
  '($)'?: string | number | null
  status?: string | null
}

export function calcAbandonedCarts(rows: CRMRow[]): number {
  return rows.filter((r) => r.Event === 'abandoned_cart').length
}

export function calcResponseRate(rows: CRMRow[]): number {
  const disparos = rows.filter(
    (r) => r.Event === 'abandoned_cart' && r.status !== null && r.status !== '' && r.status !== undefined,
  )
  if (!disparos.length) return 0
  const responderam = disparos.filter((r) => r.status !== 'primeiro_contato')
  return (responderam.length / disparos.length) * 100
}

export function calcRecoveredSales(rows: CRMRow[]): number {
  return rows.filter((r) => r.Event === 'order_paid' && (r.utm_source?.toUpperCase().includes('WPP') ?? false)).length
}

export function calcConversionRate(recoveredSales: number, abandonedCarts: number): number {
  if (!abandonedCarts) return 0
  return (recoveredSales / abandonedCarts) * 100
}

export function calcTicketMedio(rows: CRMRow[]): number {
  const wppSales = rows.filter((r) => r.Event === 'order_paid' && (r.utm_source?.toUpperCase().includes('WPP') ?? false))
  if (!wppSales.length) return 0
  const total = wppSales.reduce((acc, r) => acc + parseCurrencyValue(r['($)']), 0)
  return total / wppSales.length
}

export function calcValorRecuperado(rows: CRMRow[]): number {
  return rows
    .filter((r) => r.Event === 'order_paid' && (r.utm_source?.toUpperCase().includes('WPP') ?? false))
    .reduce((acc, r) => acc + parseCurrencyValue(r['($)']), 0)
}

export function calcComissaoLumix(valorRecuperado: number): number {
  return valorRecuperado * COMMISSION_RATE
}

export function calcFaturamentoFront(rows: CRMRow[]): number {
  return rows
    .filter(
      (r) =>
        r.Event === 'order_paid' &&
        !(r.utm_source?.toUpperCase().includes('WPP') ?? false),
    )
    .reduce((acc, r) => acc + parseCurrencyValue(r['($)']), 0)
}

export function calcFaturamentoSobFront(valorRecuperado: number, faturamentoFront: number): number {
  const total = valorRecuperado + faturamentoFront
  if (!total) return 0
  return (valorRecuperado / total) * 100
}

// ───────── Breakdowns por evento ─────────

function emptyByEvent(): Record<EventKey, number> {
  return EVENT_KEYS.reduce((acc, k) => {
    acc[k] = 0
    return acc
  }, {} as Record<EventKey, number>)
}

export function calcLeadsByEvent(rows: CRMRow[]): Record<EventKey, number> {
  const out = emptyByEvent()
  for (const key of EVENT_KEYS) {
    out[key] = rows.filter((r) => r.Event === key).length
  }
  return out
}

export function calcResponseRateByEvent(rows: CRMRow[]): Record<EventKey, number> {
  const out = emptyByEvent()
  for (const key of EVENT_KEYS) {
    const disparos = rows.filter(
      (r) => r.Event === key && r.status !== null && r.status !== '' && r.status !== undefined,
    )
    if (!disparos.length) {
      out[key] = 0
      continue
    }
    const responderam = disparos.filter((r) => r.status !== 'primeiro_contato')
    out[key] = (responderam.length / disparos.length) * 100
  }
  return out
}

export function calcRecoveredSalesByEvent(rows: CRMRow[]): Record<EventKey, number> {
  const out = emptyByEvent()
  for (const r of rows) {
    if (r.Event !== 'order_paid') continue
    const key = getEventFromUtmSource(r.utm_source)
    if (key) out[key]++
  }
  return out
}

export function calcConversionRateByEvent(
  recoveredByEvent: Record<EventKey, number>,
  leadsByEvent: Record<EventKey, number>,
): Record<EventKey, number> {
  const out = emptyByEvent()
  for (const key of EVENT_KEYS) {
    out[key] = leadsByEvent[key]
      ? (recoveredByEvent[key] / leadsByEvent[key]) * 100
      : 0
  }
  return out
}

export function calcTicketMedioByEvent(rows: CRMRow[]): Record<EventKey, number> {
  const sumByEvent = emptyByEvent()
  const countByEvent = emptyByEvent()
  for (const r of rows) {
    if (r.Event !== 'order_paid') continue
    const key = getEventFromUtmSource(r.utm_source)
    if (!key) continue
    sumByEvent[key] += parseCurrencyValue(r['($)'])
    countByEvent[key]++
  }
  const out = emptyByEvent()
  for (const key of EVENT_KEYS) {
    out[key] = countByEvent[key] ? sumByEvent[key] / countByEvent[key] : 0
  }
  return out
}

export function calcValorRecuperadoByEvent(rows: CRMRow[]): Record<EventKey, number> {
  const out = emptyByEvent()
  for (const r of rows) {
    if (r.Event !== 'order_paid') continue
    const key = getEventFromUtmSource(r.utm_source)
    if (!key) continue
    out[key] += parseCurrencyValue(r['($)'])
  }
  return out
}

export function calcFaturamentoSobFrontByEvent(
  valorByEvent: Record<EventKey, number>,
  faturamentoFront: number,
): Record<EventKey, number> {
  const out = emptyByEvent()
  const totalValor = EVENT_KEYS.reduce((s, k) => s + valorByEvent[k], 0)
  const total = totalValor + faturamentoFront
  if (!total) return out
  for (const key of EVENT_KEYS) {
    out[key] = (valorByEvent[key] / total) * 100
  }
  return out
}
