import { formatQuantity } from './fractions'
import type { ScaleMode } from '../features/recipes/types'

/** Cantidad escalada según el modo del ingrediente (reglas de cocina profesional). */
export function scaleAmount(q: number | null, factor: number, mode: ScaleMode): number | null {
  if (q == null || mode === 'to_taste') return null
  if (mode === 'fixed') return q
  if (mode === 'sublinear') return q * Math.pow(factor, 0.8)
  return q * factor
}

function roundWeight(n: number): number {
  if (n >= 500) return Math.round(n / 10) * 10
  if (n >= 100) return Math.round(n / 5) * 5
  if (n >= 20) return Math.round(n)
  return Math.round(n * 10) / 10
}

/** Texto final de cantidad + unidad: 1000 g → "1 kg", 237.5 g → "240 g", 0.75 taza → "¾ taza". */
export function displayAmount(q: number | null, unit: string | null, mode: ScaleMode): string {
  if (mode === 'to_taste' || q == null) return 'al gusto'
  if (unit === 'g' || unit === 'ml') {
    if (q >= 1000) return `${formatQuantity(Math.round(q / 10) / 100)} ${unit === 'g' ? 'kg' : 'l'}`
    return `${String(roundWeight(q)).replace('.', ',')} ${unit}`
  }
  if (unit === 'kg' || unit === 'l') return `${String(Math.round(q * 100) / 100).replace('.', ',')} ${unit}`
  const plural = unit && q > 1.001 ? pluralize(unit) : unit
  return `${formatQuantity(q)} ${plural ?? ''}`.trim()
}

function pluralize(u: string): string {
  if (['g', 'kg', 'ml', 'l', 'cda', 'cdta'].includes(u)) return u
  if (u === 'pizca' || u === 'rebanada' || u === 'hoja' || u === 'lata' || u === 'taza' || u === 'ramita') return u + 's'
  if (u === 'diente' || u === 'paquete') return u + 's'
  if (u === 'pieza') return 'piezas'
  return u
}
