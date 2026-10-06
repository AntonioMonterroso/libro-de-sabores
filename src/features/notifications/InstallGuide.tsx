import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, MoreVertical, PlusSquare, Share } from 'lucide-react'
import { getPlatform, isStandalone, type Platform } from '../../lib/platform'
import { Button } from '../../components/ui/controls'

const ease = [0.23, 1, 0.32, 1] as const

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

function Pulse({ children }: { children: ReactNode }) {
  return <span className="relative inline-grid place-items-center"><span className="timer-ring absolute -inset-2 rounded-2xl border-2 border-champagne" aria-hidden="true" />{children}</span>
}

function Scene({ platform, i }: { platform: Platform; i: number }) {
  const bar = 'flex items-center justify-around rounded-2xl bg-pearl px-4 py-3 text-cocoa-soft'
  if (platform === 'ios') {
    if (i === 0) return <div className={bar}><span>‹</span><span>›</span><Pulse><Share size={22} className="text-cocoa" /></Pulse><span>▢</span><span>⋯</span></div>
    if (i === 1) return <div className="grid gap-2 rounded-2xl bg-pearl p-3 text-sm"><div className="rounded-xl bg-white/70 px-3 py-2.5 text-cocoa-soft">Copiar</div><Pulse><div className="flex w-full items-center justify-between gap-6 rounded-xl bg-white px-3 py-2.5 text-cocoa"><span>Agregar a pantalla de inicio</span><PlusSquare size={18} /></div></Pulse><div className="rounded-xl bg-white/70 px-3 py-2.5 text-cocoa-soft">Imprimir</div></div>
    return <div className="flex items-center justify-between rounded-2xl bg-pearl px-4 py-3 text-sm"><span className="text-cocoa-soft">Cancelar</span><span className="font-medium">Agregar a inicio</span><Pulse><span className="rounded-full bg-sage-deep px-3 py-1 font-medium text-white">Agregar</span></Pulse></div>
  }
  if (i === 0) return <div className="flex items-center justify-between rounded-2xl bg-pearl px-4 py-3 text-sm text-cocoa-soft"><span>libro-de-sabores</span><Pulse><MoreVertical size={22} className="text-cocoa" /></Pulse></div>
  if (i === 1) return <div className="grid gap-2 rounded-2xl bg-pearl p-3 text-sm"><div className="rounded-xl bg-white/70 px-3 py-2.5 text-cocoa-soft">Nueva pestaña</div><Pulse><div className="w-full rounded-xl bg-white px-3 py-2.5 text-cocoa">Instalar app</div></Pulse></div>
  return <div className="grid gap-3 rounded-2xl bg-pearl p-4 text-sm"><span className="font-medium">¿Instalar Libro de Sabores?</span><div className="flex justify-end gap-3"><span className="px-3 py-1 text-cocoa-soft">Cancelar</span><Pulse><span className="rounded-full bg-sage-deep px-4 py-1 font-medium text-white">Instalar</span></Pulse></div></div>
}

const COPY: Record<Platform, { title: string; text: string }[]> = {
  ios: [
    { title: 'Toca Compartir', text: 'Es el cuadro con la flecha hacia arriba, en la barra de abajo de Safari.' },
    { title: 'Busca “Agregar a pantalla de inicio”', text: 'Desliza el menú hacia arriba si no lo ves.' },
    { title: 'Toca Agregar', text: 'Arriba a la derecha. Aparecerá el gorro de chef en tu pantalla.' },
  ],
  android: [
    { title: 'Abre el menú', text: 'Los tres puntos, arriba a la derecha en Chrome.' },
    { title: 'Elige “Instalar app”', text: 'A veces dice “Agregar a pantalla de inicio”.' },
    { title: 'Confirma', text: 'Toca Instalar. Aparecerá el gorro de chef en tu pantalla.' },
  ],
  desktop: [
    { title: 'Abre el menú', text: 'Los tres puntos del navegador, arriba a la derecha.' },
    { title: 'Elige “Instalar Libro de Sabores”', text: 'También hay un icono de instalar en la barra de direcciones.' },
    { title: 'Confirma', text: 'Se abrirá como una aplicación propia.' },
  ],
}

export function InstallGuide() {
  const platform = getPlatform()
  const [installed, setInstalled] = useState(isStandalone())
  const [prompt, setPrompt] = useState<BIPEvent | null>(null)
  const [i, setI] = useState(0)
  const [hint, setHint] = useState('')
  const steps = COPY[platform]

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as BIPEvent) }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  useEffect(() => {
    if (installed) return
    const t = setInterval(() => setI((n) => (n + 1) % steps.length), 3800)
    return () => clearInterval(t)
  }, [installed, steps.length])

  if (installed) {
    return <div className="flex items-center gap-3 rounded-[22px] bg-sage/60 px-5 py-4"><span className="grid size-9 place-items-center rounded-full bg-sage-deep text-white"><Check size={18} strokeWidth={3} /></span><p>La app ya está instalada en este dispositivo.</p></div>
  }

  return (
    <div className="grid gap-4 rounded-[24px] border border-hairline bg-white/75 p-5 shadow-soft">
      <div>
        <h3 className="font-display text-2xl font-medium">Ponla en tu pantalla de inicio</h3>
        <p className="mt-1 text-sm text-cocoa-soft">Se abre como una app, funciona sin conexión y te avisa de las recetas nuevas.</p>
      </div>
      {prompt && platform !== 'ios' && <Button onClick={async () => { await prompt.prompt(); const r = await prompt.userChoice; if (r.outcome === 'accepted') setInstalled(true) }}>Instalar ahora</Button>}
      <div className="min-h-[7.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={i} initial={{ opacity: 0, transform: 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0, transform: 'translateY(-6px)' }} transition={{ duration: 0.35, ease }}>
            <Scene platform={platform} i={i} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-champagne">Paso {i + 1} de {steps.length}</p>
        <p className="mt-1 font-display text-2xl font-medium leading-tight">{steps[i].title}</p>
        <p className="mt-1 text-cocoa-soft">{steps[i].text}</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">{steps.map((_, n) => <button key={n} type="button" aria-label={`Ir al paso ${n + 1}`} onClick={() => setI(n)} className={`h-2 rounded-full transition-[width,background-color] duration-300 ${n === i ? 'w-6 bg-champagne' : 'w-2 bg-hairline'}`} />)}</div>
        <button type="button" onClick={() => { if (isStandalone()) setInstalled(true); else setHint('Cuando aparezca el gorro en tu pantalla, ábrela desde ahí y sigue con las notificaciones.') }} className="min-h-11 px-2 text-sm font-medium text-sage-deep">Ya lo hice</button>
      </div>
      {hint && <p role="status" className="rounded-2xl bg-pearl px-4 py-3 text-sm text-cocoa-soft">{hint}</p>}
    </div>
  )
}
