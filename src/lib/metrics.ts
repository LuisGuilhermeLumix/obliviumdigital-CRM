import { parseCurrencyValue } from './utils'

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
