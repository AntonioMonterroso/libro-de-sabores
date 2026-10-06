import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { ChevronLeft, ChevronRight, Check, Droplets, ListChecks, Minus, Plus, Thermometer, Timer as TimerIcon, X } from 'lucide-react'
import { ChefHat } from '../../components/brand/ChefHat'
import { useWakeLock } from '../../hooks/useWakeLock'
import { displayAmount, scaleAmount } from '../../lib/scale'
import { Ring } from '../timers/TimerDock'
import { fmt, useTimers } from '../timers/TimerProvider'
import type { ScaleMode } from '../recipes/types'

const ease = [0.23, 1, 0.32, 1] as const

export function CookingMode({ r, servings }: { r: any; servings?: number }) {
  const nav = useNavigate()
  const { timers, start } = useTimers()
  const steps: any[] = useMemo(() => [...r.steps].sort((a: any, b: any) => a.position - b.position), [r])
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState(1)
  const [sheet, setSheet] = useState(false)
  const [finished, setFinished] = useState(false)
  const [mins, setMins] = useState<Record<string, number>>({})
  useWakeLock(!finished)

  const base = Number(r.servings_base)
  const factor = (servings ?? base) / base
  const step = steps[idx]
  const last = idx === steps.length - 1

  const go = useCallback((n: number) => {
    if (n < 0) return
    if (n >= steps.length) return setFinished(true)
    setDir(n > idx ? 1 : -1)
    setIdx(n)
  }, [idx, steps.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(idx + 1)
      if (e.key === 'ArrowLeft') go(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx])

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -70 || info.velocity.x < -500) go(idx + 1)
    else if (info.offset.x > 70 || info.velocity.x > 500) go(idx - 1)
  }

  if (!step) {
    return <div className="grid min-h-dvh place-items-center p-8 text-center text-cocoa-soft">Esta receta aún no tiene pasos.<button className="mt-4 text-sage-deep" onClick={() => nav(-1)}>Volver</button></div>
  }

  const timerId = `${r.id}:${step.id}`
  const running = timers.find((t) => t.id === timerId)
  const stepMins = mins[step.id] ?? Math.max(1, Math.round((step.timer_seconds ?? 60) / 60))
  const bump = (d: number) => setMins((m) => ({ ...m, [step.id]: Math.max(1, Math.min(600, stepMins + d)) }))

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-ivory pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <header className="flex items-center gap-3 px-4 pt-3">
        <button type="button" onClick={() => nav(-1)} aria-label="Salir del modo cocina" className="grid size-11 place-items-center rounded-full bg-pearl transition-transform duration-150 active:scale-[0.94]"><X size={20} /></button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate font-display text-xl leading-tight">{r.title}</p>
          <div className="mt-1.5 flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={idx + 1} aria-label="Progreso">
            {steps.map((s, i) => <span key={s.id} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= idx ? 'bg-champagne' : 'bg-hairline'}`} />)}
          </div>
        </div>
        <div className="w-[7.5rem] shrink-0" aria-hidden="true" />
      </header>

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-8 sm:px-10">
        <div className="mx-auto h-full w-full max-w-2xl">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.article
              key={step.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
              initial={{ opacity: 0, transform: `translateX(${dir * 48}px)` }}
              animate={{ opacity: 1, transform: 'translateX(0px)' }}
              exit={{ opacity: 0, transform: `translateX(${dir * -36}px)`, transition: { duration: 0.18 } }}
              transition={{ duration: 0.42, ease }}
              className="touch-pan-y"
            >
              <div className="flex items-center gap-4">
                <div className="relative grid place-items-center">
                  <Ring pct={(idx + 1) / steps.length} size={72} stroke={4} />
                  <span className="absolute font-display text-3xl">{idx + 1}</span>
                </div>
                <p className="text-sm uppercase tracking-[0.2em] text-cocoa-soft">Paso {idx + 1} de {steps.length}</p>
              </div>
              {step.title && <h1 className="mt-6 font-display text-5xl font-medium leading-[1.05] sm:text-6xl">{step.title}</h1>}
              <p className={`mt-5 text-2xl leading-relaxed sm:text-[1.7rem] ${step.title ? 'text-cocoa/90' : 'font-display text-4xl'}`}>{step.body}</p>

              {(step.temperature_c || step.doneness_cue) && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {step.temperature_c && <span className="inline-flex items-center gap-2 rounded-full bg-rose px-4 py-2 text-lg"><Thermometer size={18} />{step.temperature_c} °C</span>}
                  {step.doneness_cue && <span className="inline-flex items-center rounded-full bg-sage/70 px-4 py-2 text-lg">{step.doneness_cue}</span>}
                </div>
              )}

              {step.timer_seconds && (
                <div className="mt-8">
                  {running ? (
                    <div className="flex items-center gap-3 rounded-[22px] border border-champagne/50 bg-pearl px-5 py-4 text-cocoa-soft">
                      <TimerIcon size={20} className="text-champagne" />
                      <span>Temporizador en marcha, lo ves arriba a la derecha. Sigue con lo demás.</span>
                    </div>
                  ) : (
                    <motion.div layoutId={`timer-${timerId}`} transition={{ duration: 0.65, ease }} className="rounded-[26px] border border-hairline bg-white/80 p-5 shadow-soft">
                      <p className="flex items-center gap-2 text-sm font-medium text-cocoa-soft"><TimerIcon size={16} />El autor sugiere {Math.round(step.timer_seconds / 60)} min. Ajusta si lo necesitas.</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button type="button" aria-label="Quitar 5 minutos" onClick={() => bump(-5)} className="min-h-11 rounded-full bg-pearl px-3 text-sm font-medium">−5</button>
                        <button type="button" aria-label="Quitar 1 minuto" onClick={() => bump(-1)} className="grid size-11 place-items-center rounded-full bg-pearl"><Minus size={18} /></button>
                        <span className="min-w-28 text-center font-display text-5xl tabular-nums">{fmt(stepMins * 60_000)}</span>
                        <button type="button" aria-label="Agregar 1 minuto" onClick={() => bump(1)} className="grid size-11 place-items-center rounded-full bg-pearl"><Plus size={18} /></button>
                        <button type="button" aria-label="Agregar 5 minutos" onClick={() => bump(5)} className="min-h-11 rounded-full bg-pearl px-3 text-sm font-medium">+5</button>
                      </div>
                      <button type="button" onClick={() => start(timerId, step.title || r.title, stepMins * 60)} className="mt-4 min-h-14 w-full rounded-2xl bg-sage-deep text-lg font-medium text-white transition-transform duration-150 active:scale-[0.97]">Iniciar temporizador</button>
                    </motion.div>
                  )}
                </div>
              )}
              {step.tip && <p className="mt-8 rounded-[22px] bg-pearl px-5 py-4 font-hand text-2xl">{step.tip}</p>}
            </motion.article>
          </AnimatePresence>
        </div>
      </div>

      <footer className="flex items-center gap-3 border-t border-hairline/70 bg-ivory/95 px-4 pb-4 pt-3">
        <button type="button" onClick={() => setSheet(true)} className="flex min-h-14 items-center gap-2 rounded-2xl bg-pearl px-4 font-medium transition-transform duration-150 active:scale-[0.97]"><ListChecks size={20} /><span className="hidden sm:inline">Ingredientes</span></button>
        <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Paso anterior" className="grid size-14 place-items-center rounded-2xl bg-pearl transition-[opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-35"><ChevronLeft size={24} /></button>
        <button type="button" onClick={() => go(idx + 1)} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-sage-deep text-lg font-medium text-white transition-transform duration-150 active:scale-[0.97]">
          {last ? <><Check size={20} />Terminar</> : <>Siguiente<ChevronRight size={22} /></>}
        </button>
      </footer>

      <IngredientSheet r={r} factor={factor} open={sheet} onClose={() => setSheet(false)} />

      <AnimatePresence>
        {finished && (
          <motion.div className="absolute inset-0 z-50 grid place-items-center bg-ivory px-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease }}>
            <div className="relative grid place-items-center">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} aria-hidden="true" className="absolute size-56 rounded-full border border-champagne" initial={{ opacity: 0.6, transform: 'scale(0.8)' }} animate={{ opacity: 0, transform: 'scale(2.2)' }} transition={{ duration: 2.4, delay: 0.3 + i * 0.5, ease, repeat: Infinity, repeatDelay: 0.4 }} />
              ))}
              <motion.div className="relative grid size-44 place-items-center rounded-full bg-rose ring-1 ring-champagne" initial={{ opacity: 0, transform: 'scale(0.95) translateY(12px)' }} animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }} transition={{ duration: 0.8, delay: 0.2, ease }}>
                <ChefHat size={84} />
              </motion.div>
            </div>
            <motion.div className="mt-10" initial={{ opacity: 0, transform: 'translateY(14px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: 0.8, delay: 0.55, ease }}>
              <h2 className="font-display text-6xl font-medium">¡Buen provecho!</h2>
              <p className="mt-3 text-lg text-cocoa-soft">{r.title}</p>
              <button type="button" onClick={() => nav(-1)} className="mt-8 min-h-14 rounded-2xl bg-sage-deep px-8 text-lg font-medium text-white transition-transform duration-150 active:scale-[0.97]">Volver a la receta</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function IngredientSheet({ r, factor, open, onClose }: { r: any; factor: number; open: boolean; onClose: () => void }) {
  const storeKey = `libro:checks:${r.id}`
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  useEffect(() => {
    if (!open) return
    try { setChecked(JSON.parse(localStorage.getItem(storeKey) ?? '{}')) } catch { setChecked({}) }
  }, [open, storeKey])
  const flip = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch { /* sin almacenamiento */ }
  }
  const groups = [...r.ingredient_groups].sort((a: any, b: any) => a.sort - b.sort)

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-50">
          <motion.div className="absolute inset-0 bg-cocoa/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
          <motion.div role="dialog" aria-label="Ingredientes" className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[82dvh] max-w-lg flex-col rounded-t-[28px] bg-ivory px-5 pt-3 shadow-soft" initial={{ transform: 'translateY(100%)' }} animate={{ transform: 'translateY(0%)' }} exit={{ transform: 'translateY(100%)' }} transition={{ duration: 0.38, ease }}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-hairline" />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl font-medium">Ingredientes</h2>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-11 place-items-center rounded-full bg-pearl"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
              {groups.map((g: any) => (
                <div key={g.id} className="mt-3">
                  {g.name && <h3 className="mb-1 px-1 text-xs font-medium uppercase tracking-[0.2em] text-champagne">{g.name}</h3>}
                  <ul className="divide-y divide-hairline rounded-[20px] border border-hairline bg-white/75">
                    {[...g.ingredients].sort((a: any, b: any) => a.sort - b.sort).map((i: any) => (
                      <li key={i.id}>
                        <button type="button" onClick={() => flip(i.id)} aria-pressed={!!checked[i.id]} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                          <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${checked[i.id] ? 'border-sage-deep bg-sage-deep text-white' : 'border-champagne/70'}`}>{checked[i.id] && <Check size={14} strokeWidth={3} />}</span>
                          <span className={`flex-1 ${checked[i.id] ? 'text-cocoa-soft line-through' : ''}`}>{i.kind === 'liquid' && <Droplets size={14} className="mr-1 inline" />}{i.name}{i.prep ? <span className="text-cocoa-soft">, {i.prep}</span> : null}</span>
                          <span className="shrink-0 font-medium tabular-nums">{displayAmount(scaleAmount(i.quantity, factor, i.scale_mode as ScaleMode), i.unit, i.scale_mode as ScaleMode)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
