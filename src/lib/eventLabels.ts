export const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  abandoned_cart: { label: 'Carrinho Abandonado', color: '#f59e0b' },
  refused_card:   { label: 'Cartão Recusado',     color: '#ef4444' },
  generated_pix:  { label: 'Pix Gerado',          color: '#22c55e' },
}

export function getEventLabel(event: string | null | undefined) {
  if (!event) return { label: '—', color: '#888888' }
  return EVENT_LABELS[event] ?? { label: event, color: '#888888' }
}
