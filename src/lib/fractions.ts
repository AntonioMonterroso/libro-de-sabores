const UNICODE: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }

/** "1 1/2", "1/2", "½", "1½", "2,5" → número. Vacío o ilegible → null. */
export function parseQuantity(input: string): number | null {
  let s = input.trim().replace(',', '.')
  if (!s) return null
  let total = 0
  for (const [ch, v] of Object.entries(UNICODE)) {
    if (s.includes(ch)) {
      total += v
      s = s.replace(ch, ' ')
    }
  }
  for (const part of s.split(/\s+/).filter(Boolean)) {
    const frac = part.match(/^(\d+)\/(\d+)$/)
    if (frac) {
      if (Number(frac[2]) === 0) return null
      total += Number(frac[1]) / Number(frac[2])
    } else if (/^\d*\.?\d+$/.test(part)) total += Number(part)
    else return null
  }
  return total > 0 ? total : null
}

const GLYPHS: [number, string][] = [[0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'], [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞']]

/** 1.5 → "1½", 0.25 → "¼", 240 → "240". */
export function formatQuantity(n: number | null | undefined): string {
  if (n == null) return ''
  if (n >= 20) return String(Math.round(n))
  const whole = Math.floor(n + 1e-6)
  const rest = n - whole
  if (rest < 0.06) return String(whole || Math.round(n * 10) / 10)
  const hit = GLYPHS.find(([v]) => Math.abs(v - rest) < 0.04)
  if (hit) return `${whole || ''}${hit[1]}`
  if (rest > 0.94) return String(whole + 1)
  return String(Math.round(n * 10) / 10)
}
