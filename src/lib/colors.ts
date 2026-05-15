const PRODUCT_COLORS = [
  { bg: '#1e3a5f', text: '#80d7f8' },
  { bg: '#3b1f5e', text: '#c084fc' },
  { bg: '#1a4731', text: '#4ade80' },
  { bg: '#4a1f1f', text: '#f87171' },
  { bg: '#3d2e0a', text: '#fbbf24' },
  { bg: '#1a3d4a', text: '#22d3ee' },
  { bg: '#3d1a3d', text: '#f472b6' },
  { bg: '#2d3d1a', text: '#a3e635' },
]

export function getProductColor(product: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < product.length; i++) {
    hash = product.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PRODUCT_COLORS[Math.abs(hash) % PRODUCT_COLORS.length]
}
