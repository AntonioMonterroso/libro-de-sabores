import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Button({ className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`min-h-12 w-full rounded-2xl bg-sage-deep px-6 text-base font-medium text-white shadow-soft transition-[opacity,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  )
}

export function GhostButton({ className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`min-h-11 rounded-xl px-4 text-sm font-medium text-cocoa-soft transition-colors duration-150 hover:text-cocoa focus-visible:outline-2 focus-visible:outline-champagne ${className}`}
    />
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }

/** Campo estilo lista agrupada de iOS: etiqueta arriba, valor grande. */
export function Field({ label, hint, id, className = '', ...p }: FieldProps) {
  const fid = id ?? `f-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="rounded-2xl border border-hairline bg-white/70 px-4 pb-2.5 pt-2 transition-[border-color,box-shadow] duration-150 focus-within:border-champagne focus-within:shadow-[0_0_0_3px_rgb(184_151_90/0.18)]">
      <label htmlFor={fid} className="block text-xs font-medium uppercase tracking-wider text-cocoa-soft">
        {label}
      </label>
      <input
        id={fid}
        {...p}
        className={`mt-0.5 w-full bg-transparent text-lg text-cocoa outline-none placeholder:text-cocoa-soft/50 ${className}`}
      />
      {hint && <p className="mt-1 text-xs text-cocoa-soft">{hint}</p>}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-[#9B3B3B]">
      {children}
    </p>
  )
}
