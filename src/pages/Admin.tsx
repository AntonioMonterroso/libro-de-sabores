import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, Copy, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { useAdminActions, useInvites, useMembers, type Invite } from '../features/admin/api'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/controls'
import { Row, Section, Segmented, Select } from '../components/ui/layout'
import { site } from '../lib/site'

const APP_URL = 'https://antoniomonterroso.github.io/libro-de-sabores/'

function status(i: Invite) {
  if (i.expires_at && new Date(i.expires_at) < new Date()) return 'Vencido'
  if (i.uses >= i.max_uses) return 'Usado'
  return 'Activo'
}

function CopyButton({ code }: { code: string }) {
  const [ok, setOk] = useState(false)
  async function copy() {
    const text = `Te invito a ${site.name}, el recetario de la familia.\n1. Abre ${APP_URL}\n2. Entra con tu correo\n3. Cuando te lo pida, escribe este código: ${code}`
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) } catch { /* sin portapapeles */ }
  }
  return (
    <button type="button" onClick={copy} aria-label="Copiar invitación" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-pearl px-3 text-sm font-medium transition-transform duration-150 active:scale-[0.97]">
      {ok ? <Check size={15} className="text-sage-deep" /> : <Copy size={15} />}{ok ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export function Admin() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [tab, setTab] = useState<'inv' | 'mem'>('inv')
  const { data: invites = [] } = useInvites()
  const { data: members = [] } = useMembers()
  const actions = useAdminActions(profile?.id ?? '')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [uses, setUses] = useState(1)
  const [days, setDays] = useState<number | null>(14)
  const [fresh, setFresh] = useState<string | null>(null)

  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" onClick={() => nav(-1)} className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm text-cocoa-soft"><ChevronLeft size={18} />Atrás</button>
      <h1 className="mt-2 font-display text-5xl font-medium">Administración</h1>
      <div className="mt-6"><Segmented label="Sección" value={tab} onChange={setTab} options={[{ value: 'inv', label: 'Invitaciones' }, { value: 'mem', label: `Miembros (${members.filter((m) => m.active).length})` }]} /></div>

      {tab === 'inv' ? (
        <div className="mt-6 grid gap-7">
          <Section title="Nueva invitación" footer="Cada código se canjea una sola vez por persona. Compártelo por WhatsApp junto con el enlace.">
            <Row label="Para"><Segmented label="Rol" value={role} onChange={setRole} options={[{ value: 'member', label: 'Familiar' }, { value: 'admin', label: 'Admin' }]} /></Row>
            <Row label="Personas que pueden usarlo" htmlFor="uses"><Select id="uses" value={uses} onChange={(e) => setUses(Number(e.target.value))}>{[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Row>
            <Row label="Vence en" htmlFor="days"><Select id="days" value={days ?? 0} onChange={(e) => setDays(Number(e.target.value) || null)}><option value={7}>7 días</option><option value={14}>14 días</option><option value={30}>30 días</option><option value={0}>Nunca</option></Select></Row>
            <div className="p-3"><Button disabled={actions.createInvite.isPending} onClick={async () => setFresh(await actions.createInvite.mutateAsync({ role, max_uses: uses, days }))}><Plus size={18} className="mr-1 inline" />Crear código</Button></div>
          </Section>
          {fresh && (
            <div className="rise flex items-center justify-between gap-3 rounded-[22px] border border-champagne bg-rose/50 p-4">
              <div><p className="text-xs uppercase tracking-wider text-cocoa-soft">Código nuevo</p><p className="font-display text-3xl tracking-wide">{fresh}</p></div>
              <CopyButton code={fresh} />
            </div>
          )}
          <Section title="Códigos">
            {invites.length === 0 && <p className="px-4 py-4 text-cocoa-soft">Aún no hay códigos.</p>}
            {invites.map((i) => (
              <div key={i.code} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium tracking-wide">{i.code}</p>
                  <p className="text-sm text-cocoa-soft">{status(i)} · {i.uses}/{i.max_uses} usos{i.role === 'admin' ? ' · Admin' : ''}{i.expires_at ? ` · vence ${new Date(i.expires_at).toLocaleDateString('es')}` : ''}</p>
                </div>
                {status(i) === 'Activo' && <CopyButton code={i.code} />}
                <button type="button" aria-label={`Revocar ${i.code}`} onClick={() => actions.deleteInvite.mutate(i.code)} className="grid size-11 place-items-center rounded-full text-cocoa-soft hover:bg-pearl"><Trash2 size={17} /></button>
              </div>
            ))}
          </Section>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          <p className="text-cocoa-soft">Quitar el acceso no borra sus recetas, y puedes devolverlo cuando quieras.</p>
          <Section>
            {members.map((m) => (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${m.active ? '' : 'opacity-55'}`}>
                <Avatar path={m.avatar_url} name={m.display_name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.display_name}{m.id === profile?.id && <span className="text-cocoa-soft"> (tú)</span>}</p>
                  <p className="text-sm text-cocoa-soft">{m.role === 'admin' ? 'Administrador' : 'Familiar'}{m.active ? '' : ' · sin acceso'}</p>
                </div>
                {m.id !== profile?.id && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => actions.setRole.mutate({ id: m.id, role: m.role === 'admin' ? 'member' : 'admin' })} className="min-h-11 rounded-full bg-pearl px-3 text-sm">{m.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}</button>
                    <button type="button" onClick={() => actions.setActive.mutate({ id: m.id, active: !m.active })} className={`min-h-11 rounded-full px-3 text-sm ${m.active ? 'text-[#9B3B3B]' : 'bg-sage-deep text-white'}`}>{m.active ? 'Quitar acceso' : 'Devolver'}</button>
                  </div>
                )}
              </div>
            ))}
          </Section>
        </div>
      )}
    </main>
  )
}
