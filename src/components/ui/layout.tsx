import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Minus, Plus } from 'lucide-react'

/** Sección agrupada e inset, como Ajustes de iOS. */
export function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      {title && <h2 className="px-4 text-xs font-medium uppercase tracking-wider text-cocoa-soft">{title}</h2>}
      <div className="divide-y divide-hairline overflow-hidden rounded-[20px] border border-hairline bg-white/75 shadow-soft">{children}</div>
      {footer && <p className="px-4 text-xs text-cocoa-soft">{footer}</p>}
    </section>
  )
}

export function Row({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-2">
      <label htmlFor={htmlFor} className="shrink-0 text-[15px]">{label}</label>
      <div className="min-w-0 flex-1 text-right text-cocoa-soft">{children}</div>
    </div>
  )
}

export const inputBare = 'w-full min-w-0 bg-transparent text-right text-[15px] text-cocoa outline-none placeholder:text-cocoa-soft/50'

export function TextArea({ className = '', ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`block w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-cocoa outline-none placeholder:text-cocoa-soft/50 ${className}`} />
}

export function Select({ className = '', children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={`min-h-9 max-w-full cursor-pointer rounded-lg bg-transparent text-right text-[15px] text-cocoa outline-none ${className}`}>
      {children}
    </select>
  )
}

export function Stepper({ value, onChange, min = 1, max = 99, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  const btn = 'grid size-9 place-items-center rounded-full bg-pearl text-cocoa transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.94] disabled:opacity-40'
  return (
    <div className="inline-flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label="Menos" disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={16} /></button>
      <span className="w-8 text-center text-lg font-medium tabular-nums text-cocoa">{value}</span>
      <button type="button" className={btn} aria-label="Más" disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={16} /></button>
    </div>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-pearl p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-[10px] px-3 text-sm transition-[background-color,box-shadow] duration-150 ${o.value === value ? 'bg-white font-medium text-cocoa shadow-sm' : 'text-cocoa-soft'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, color, children, onClick }: { active: boolean; color?: string; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={active ? { backgroundColor: color ?? '#EFD5D0' } : undefined}
      className={`min-h-9 rounded-full border px-3.5 text-sm transition-[background-color,border-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] ${active ? 'border-champagne text-cocoa' : 'border-hairline bg-white/60 text-cocoa-soft'}`}
    >
      {children}
    </button>
  )
}
