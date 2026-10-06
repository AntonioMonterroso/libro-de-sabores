import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { fmt, remainingOf, useTimers, type Timer } from './TimerProvider'

const ease = [0.23, 1, 0.32, 1] as const

export function Ring({ pct, size = 36, stroke = 3, done = false }: { pct: number; size?: number; stroke?: number; done?: boolean }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E4D6C8" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={done ? '#4F6B54' : '#B8975A'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 250ms linear' }} />
    </svg>
  )
}

function Pill({ t, now, onOpen }: { t: Timer; now: number; onOpen: () => void }) {
  const rem = remainingOf(t, now)
  const done = t.state === 'done'
  return (
    <motion.button
      layout
      layoutId={`timer-${t.id}`}
      type="button"
      onClick={onOpen}
      aria-label={`${t.label}: ${done ? 'terminó' : fmt(rem)}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.65, ease }}
      className={`flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1.5 pr-4 shadow-soft backdrop-blur-md ${done ? 'timer-ring border-champagne bg-champagne text-white' : 'border-hairline bg-ivory/90 text-cocoa'}`}
    >
      <span className="relative grid place-items-center">
        <Ring pct={t.durationMs ? rem / t.durationMs : 0} size={32} stroke={3} done={done} />
      </span>
      <span className="grid text-left leading-tight">
        <span className="font-medium tabular-nums">{done ? '¡Listo!' : fmt(rem)}</span>
        <span className="max-w-24 truncate text-xs opacity-75">{t.label}</span>
      </span>
    </motion.button>
  )
}

export function TimerDock() {
  const { timers, now, pause, resume, addMinutes, restart, remove } = useTimers()
  const [open, setOpen] = useState(false)
  if (!timers.length) return null
  const sorted = [...timers].sort((a, b) => remainingOf(a, now) - remainingOf(b, now))

  return (
    <>
      <div className="pointer-events-none fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex flex-col items-end gap-2">
        <AnimatePresence>
          {sorted.slice(0, 3).map((t) => (
            <div key={t.id} className="pointer-events-auto"><Pill t={t} now={now} onOpen={() => setOpen(true)} /></div>
          ))}
        </AnimatePresence>
        {sorted.length > 3 && <button type="button" onClick={() => setOpen(true)} className="pointer-events-auto rounded-full bg-ivory/90 px-3 py-1 text-xs text-cocoa-soft shadow-soft">+{sorted.length - 3} más</button>}
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70]">
            <motion.div className="absolute inset-0 bg-cocoa/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOpen(false)} />
            <motion.div
              role="dialog"
              aria-label="Temporizadores"
              className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[28px] bg-ivory px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-soft"
              initial={{ transform: 'translateY(100%)' }}
              animate={{ transform: 'translateY(0%)' }}
              exit={{ transform: 'translateY(100%)' }}
              transition={{ duration: 0.38, ease }}
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-hairline" />
              <h2 className="font-display text-3xl font-medium">Temporizadores</h2>
              <ul className="mt-4 grid gap-3">
                {sorted.map((t) => {
                  const rem = remainingOf(t, now)
                  const done = t.state === 'done'
                  return (
                    <li key={t.id} className="flex items-center gap-4 rounded-[22px] border border-hairline bg-white/75 p-4">
                      <Ring pct={t.durationMs ? rem / t.durationMs : 0} size={56} stroke={4} done={done} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-cocoa-soft">{t.label}</p>
                        <p className="font-display text-4xl leading-none tabular-nums">{done ? '¡Listo!' : fmt(rem)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {done ? (
                          <>
                            <button type="button" onClick={() => addMinutes(t.id, 5)} className="min-h-11 rounded-full bg-pearl px-3 text-sm font-medium">+5 min</button>
                            <button type="button" onClick={() => remove(t.id)} className="min-h-11 rounded-full bg-sage-deep px-4 text-sm font-medium text-white">Listo</button>
                          </>
                        ) : (
                          <>
                            <button type="button" aria-label="+1 minuto" onClick={() => addMinutes(t.id, 1)} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-pearl text-sm font-medium">+1</button>
                            <button type="button" aria-label={t.state === 'running' ? 'Pausar' : 'Reanudar'} onClick={() => (t.state === 'running' ? pause(t.id) : resume(t.id))} className="grid size-11 place-items-center rounded-full bg-pearl">{t.state === 'running' ? <Pause size={18} /> : <Play size={18} />}</button>
                            <button type="button" aria-label="Reiniciar" onClick={() => restart(t.id)} className="grid size-11 place-items-center rounded-full bg-pearl"><RotateCcw size={17} /></button>
                            <button type="button" aria-label="Cancelar" onClick={() => remove(t.id)} className="grid size-11 place-items-center rounded-full text-cocoa-soft"><X size={18} /></button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
