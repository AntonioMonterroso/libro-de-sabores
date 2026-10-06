import { ChefHat } from './ChefHat'
import { site } from '../../lib/site'

export function LogoMark({ size = 72 }: { size?: number }) {
  const disc = size * 1.9
  return (
    <span
      className="inline-grid place-items-center rounded-full bg-rose ring-1 ring-champagne"
      style={{ width: disc, height: disc }}
    >
      <ChefHat size={size} />
    </span>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-6">
      <LogoMark />
      <div>
        <p className="font-display text-5xl font-medium leading-none">Libro</p>
        <p className="font-display text-5xl font-medium italic leading-tight text-champagne">de Sabores</p>
        <div className="mt-3 h-px w-full bg-champagne" />
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-cocoa-soft">{site.tagline}</p>
      </div>
    </div>
  )
}
