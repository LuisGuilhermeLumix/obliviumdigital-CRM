export const EVENT_CONFIG = {
  abandoned_cart: { label: 'Carr. Abandonado', color: '#f59e0b', utmPrefix: 'WPP_AC' },
  refused_card:   { label: 'Cartão Recusado',  color: '#ef4444', utmPrefix: 'WPP_RC' },
  generated_pix:  { label: 'Pix Gerado',       color: '#22c55e', utmPrefix: 'WPP_GP' },
} as const

export type EventKey = keyof typeof EVENT_CONFIG

export const EVENT_KEYS = Object.keys(EVENT_CONFIG) as EventKey[]

export function getEventFromUtmSource(utmSource: string | null | undefined): EventKey | null {
  if (!utmSource) return null
  const upper = utmSource.toUpperCase()
  for (const key of EVENT_KEYS) {
    if (upper.includes(EVENT_CONFIG[key].utmPrefix)) return key
  }
  return null
}

export function getEventLabel(event: string | null | undefined): { label: string; color: string } {
  if (!event) return { label: '—', color: '#888888' }
  const cfg = EVENT_CONFIG[event as EventKey]
  if (cfg) return { label: cfg.label, color: cfg.color }
  return { label: event, color: '#888888' }
}
