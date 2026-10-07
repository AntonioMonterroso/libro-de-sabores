import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { ProfileCard, PasswordCard } from '../features/auth/AccountSettings'
import { Button, GhostButton } from '../components/ui/controls'
import { Row, Section } from '../components/ui/layout'
import { InstallGuide } from '../features/notifications/InstallGuide'
import { usePushState } from '../features/notifications/hooks'
import { disablePush, enablePush, sendTestNotification } from '../features/notifications/push'
import { isStandalone } from '../lib/platform'

export function Settings() {
  const nav = useNavigate()
  const { profile, session, signOut } = useAuth()
  const [state, setState] = usePushState()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function toggle(on: boolean) {
    if (!session) return
    setBusy(true)
    setErr('')
    try {
      const next = on ? await enablePush(session.user.id) : await disablePush()
      setState(next)
      if (next === 'on') await sendTestNotification()
    } catch {
      setErr('No se pudo cambiar. Inténtalo de nuevo.')
    }
    setBusy(false)
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" onClick={() => nav(-1)} className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm text-cocoa-soft"><ChevronLeft size={18} />Atrás</button>
      <h1 className="mt-2 font-display text-5xl font-medium">Ajustes</h1>

      <div className="mt-8 grid gap-7">
        <ProfileCard />

        {profile?.role === 'admin' && (
          <Section>
            <Link to="/admin" className="flex min-h-14 items-center justify-between px-4"><span>Administración: la familia y sus cuentas</span><span className="text-cocoa-soft">›</span></Link>
          </Section>
        )}

        <section className="grid gap-3">
          <h2 className="px-4 text-xs font-medium uppercase tracking-wider text-cocoa-soft">Notificaciones</h2>
          {state === null && <p className="px-4 text-cocoa-soft">Revisando…</p>}
          {state === 'on' && (
            <Section footer="Te avisaremos cada vez que alguien publique una receta.">
              <Row label="Avisos de recetas nuevas"><span className="text-sage-deep">Activados</span></Row>
              <div className="flex gap-2 p-3"><Button disabled={busy} className="!bg-pearl !text-cocoa !shadow-none" onClick={() => toggle(false)}>Desactivar</Button><Button disabled={busy} className="!bg-pearl !text-cocoa !shadow-none" onClick={() => void sendTestNotification()}>Enviar prueba</Button></div>
            </Section>
          )}
          {state === 'off' && (
            <div className="grid gap-3 rounded-[22px] border border-hairline bg-white/75 p-5 shadow-soft">
              <p>Recibe un aviso en este dispositivo cuando alguien publique una receta nueva.</p>
              <Button disabled={busy} onClick={() => toggle(true)}>{busy ? 'Activando…' : 'Activar avisos'}</Button>
            </div>
          )}
          {state === 'needs-install' && <p className="rounded-[22px] bg-pearl px-5 py-4 text-cocoa-soft">En iPhone y iPad, los avisos funcionan cuando la app está en tu pantalla de inicio. Instálala con la guía de abajo y vuelve aquí.</p>}
          {state === 'denied' && <p className="rounded-[22px] bg-rose px-5 py-4">Bloqueaste los avisos para este sitio. Puedes permitirlos desde los ajustes de tu navegador o del sistema.</p>}
          {state === 'unsupported' && <p className="rounded-[22px] bg-pearl px-5 py-4 text-cocoa-soft">Este navegador no admite avisos. Prueba con Chrome o Safari actualizados.</p>}
          {state === 'dev' && <p className="rounded-[22px] bg-pearl px-5 py-4 text-cocoa-soft">Los avisos solo funcionan en la versión publicada, no en desarrollo.</p>}
          {err && <p role="alert" className="px-4 text-sm text-[#9B3B3B]">{err}</p>}
        </section>

        <PasswordCard />

        {!isStandalone() && <InstallGuide />}

        <GhostButton onClick={signOut} className="justify-self-start">Cerrar sesión</GhostButton>
      </div>
    </main>
  )
}
