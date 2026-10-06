import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { softPing, startAlarm, stopAlarm, unlockAudio } from './alarm'

export type Timer = {
  id: string
  label: string
  durationMs: number
  /** Hora absoluta de fin mientras corre; null en pausa. */
  endsAt: number | null
  remainingMs: number
  state: 'running' | 'paused' | 'done'
}

type Api = {
  timers: Timer[]
  now: number
  start: (id: string, label: string, seconds: number) => void
  pause: (id: string) => void
  resume: (id: string) => void
  addMinutes: (id: string, minutes: number) => void
  restart: (id: string) => void
  remove: (id: string) => void
}

const KEY = 'libro:timers'
const Ctx = createContext<Api | null>(null)

function load(): Timer[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Timer[]
    const now = Date.now()
    return raw.map((t) => (t.state === 'running' && t.endsAt && t.endsAt <= now ? { ...t, state: 'done' as const, remainingMs: 0, endsAt: null } : t))
  } catch {
    return []
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>(load)
  const [now, setNow] = useState(() => Date.now())
  const announced = useRef(new Set<string>())

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(timers)) } catch { /* sin almacenamiento */ }
  }, [timers])

  const anyRunning = timers.some((t) => t.state === 'running')
  useEffect(() => {
    if (!anyRunning) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [anyRunning])

  // Pasa a "done" los que llegaron a cero
  useEffect(() => {
    if (!anyRunning) return
    const finished = timers.filter((t) => t.state === 'running' && t.endsAt != null && t.endsAt <= now)
    if (!finished.length) return
    setTimers((ts) => ts.map((t) => (finished.some((f) => f.id === t.id) ? { ...t, state: 'done', remainingMs: 0, endsAt: null } : t)))
  }, [now, timers, anyRunning])

  // Alarma mientras haya alguno terminado sin descartar
  const doneIds = timers.filter((t) => t.state === 'done').map((t) => t.id).join(',')
  useEffect(() => {
    const done = timers.filter((t) => t.state === 'done')
    if (done.length) {
      startAlarm()
      for (const t of done) {
        if (!announced.current.has(t.id) && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Temporizador listo', { body: t.label })
        }
        announced.current.add(t.id)
      }
    } else stopAlarm()
    return () => {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneIds])

  const start = useCallback((id: string, label: string, seconds: number) => {
    unlockAudio()
    softPing()
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    const ms = seconds * 1000
    announced.current.delete(id)
    setNow(Date.now())
    setTimers((ts) => [...ts.filter((t) => t.id !== id), { id, label, durationMs: ms, endsAt: Date.now() + ms, remainingMs: ms, state: 'running' }])
  }, [])

  const patch = (id: string, fn: (t: Timer) => Timer) => setTimers((ts) => ts.map((t) => (t.id === id ? fn(t) : t)))

  const api = useMemo<Api>(
    () => ({
      timers,
      now,
      start,
      pause: (id) => patch(id, (t) => (t.state === 'running' ? { ...t, state: 'paused', remainingMs: Math.max(0, (t.endsAt ?? Date.now()) - Date.now()), endsAt: null } : t)),
      resume: (id) => { setNow(Date.now()); patch(id, (t) => (t.state === 'paused' ? { ...t, state: 'running', endsAt: Date.now() + t.remainingMs } : t)) },
      addMinutes: (id, m) => {
        setNow(Date.now())
        announced.current.delete(id)
        patch(id, (t) => {
          const add = m * 60_000
          if (t.state === 'done') return { ...t, state: 'running', durationMs: add, remainingMs: add, endsAt: Date.now() + add }
          if (t.state === 'running') return { ...t, durationMs: t.durationMs + add, endsAt: (t.endsAt ?? Date.now()) + add }
          return { ...t, durationMs: t.durationMs + add, remainingMs: t.remainingMs + add }
        })
      },
      restart: (id) => { setNow(Date.now()); announced.current.delete(id); patch(id, (t) => ({ ...t, state: 'running', remainingMs: t.durationMs, endsAt: Date.now() + t.durationMs })) },
      remove: (id) => setTimers((ts) => ts.filter((t) => t.id !== id)),
    }),
    [timers, now, start],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useTimers() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTimers fuera de TimerProvider')
  return v
}

export function remainingOf(t: Timer, now: number) {
  return t.state === 'running' && t.endsAt ? Math.max(0, t.endsAt - now) : t.state === 'done' ? 0 : t.remainingMs
}

export function fmt(ms: number) {
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
