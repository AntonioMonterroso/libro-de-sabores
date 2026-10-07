import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, Copy, KeyRound, RefreshCw } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { generatePassword, useAdminActions, useMembers } from '../features/admin/api'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/controls'
import { Section, Segmented } from '../components/ui/layout'
import { site } from '../lib/site'

const APP_URL = 'https://antoniomonterroso.github.io/libro-de-sabores/'

type Creds = { name: string; email: string; password: string; reset?: boolean }

function CredsCard({ c, onClose }: { c: Creds; onClose: () => void }) {
  const [ok, setOk] = useState(false)
  async function copy() {
    const text = `Hola ${c.name}. ${c.reset ? 'Esta es tu nueva contraseña' : `Ya tienes tu acceso a ${site.name}, el recetario de la familia`}:\n\n1. Abre ${APP_URL}\n2. Correo: ${c.email}\n3. Contraseña: ${c.password}\n\nPuedes cambiarla en Ajustes. Instálala en tu pantalla de inicio para abrirla como una app.`
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2200) } catch { /* sin portapapeles */ }
  }
  return (
    <div className="rise grid gap-3 rounded-[22px] border border-champagne bg-rose/50 p-5">
      <p className="text-xs uppercase tracking-wider text-cocoa-soft">{c.reset ? 'Contraseña nueva' : 'Cuenta creada'} · {c.name}</p>
      <dl className="grid gap-1 text-[15px]"><div className="flex justify-between gap-3"><dt className="text-cocoa-soft">Correo</dt><dd className="break-all font-medium">{c.email}</dd></div><div className="flex justify-between gap-3"><dt className="text-cocoa-soft">Contraseña</dt><dd className="font-display text-2xl tracking-wide">{c.password}</dd></div></dl>
      <p className="text-sm text-cocoa-soft">Cópialo ahora y envíaselo. La contraseña no se vuelve a mostrar.</p>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-sage-deep font-medium text-white transition-transform duration-150 active:scale-[0.97]">{ok ? <Check size={17} /> : <Copy size={17} />}{ok ? 'Copiado' : 'Copiar mensaje'}</button>
        <button type="button" onClick={onClose} className="min-h-12 rounded-2xl px-4 text-cocoa-soft">Listo</button>
      </div>
    </div>
  )
}

export function Admin() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const { data: members = [] } = useMembers()
  const actions = useAdminActions()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(generatePassword)
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [creds, setCreds] = useState<Creds | null>(null)
  const [error, setError] = useState('')

  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />

  async function create(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await actions.createMember.mutateAsync({ email, password, display_name: name, role })
      setCreds({ name: name.trim(), email: email.trim().toLowerCase(), password })
      setName(''); setEmail(''); setPassword(generatePassword()); setRole('member')
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.') }
  }

  async function reset(id: string, who: string, mail?: string) {
    setError('')
    const pw = generatePassword()
    try {
      await actions.resetPassword.mutateAsync({ user_id: id, password: pw })
      setCreds({ name: who, email: mail ?? '(su correo)', password: pw, reset: true })
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.') }
  }

  const field = 'block w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-cocoa-soft/50'

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" onClick={() => nav(-1)} className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm text-cocoa-soft"><ChevronLeft size={18} />Atrás</button>
      <h1 className="mt-2 font-display text-5xl font-medium">La familia</h1>
      <p className="mt-2 text-cocoa-soft">Creas la cuenta de cada persona y le pasas su correo y contraseña.</p>

      <div className="mt-8 grid gap-7">
        {creds && <CredsCard c={creds} onClose={() => setCreds(null)} />}

        <form onSubmit={create} className="grid gap-3">
          <h2 className="px-4 text-xs font-medium uppercase tracking-wider text-cocoa-soft">Agregar familiar</h2>
          <Section>
            <input aria-label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} placeholder="Nombre (ej. Tía Marta)" className={field} />
            <input aria-label="Correo" type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Correo" className={field} />
            <div className="flex items-center">
              <input aria-label="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} className={`${field} font-display text-xl tracking-wide`} />
              <button type="button" onClick={() => setPassword(generatePassword())} aria-label="Generar otra contraseña" className="mr-2 grid size-11 shrink-0 place-items-center rounded-full text-cocoa-soft"><RefreshCw size={17} /></button>
            </div>
            <div className="flex items-center justify-between px-4 py-3"><span className="text-[15px]">Rol</span><Segmented label="Rol" value={role} onChange={setRole} options={[{ value: 'member', label: 'Familiar' }, { value: 'admin', label: 'Admin' }]} /></div>
          </Section>
          {error && <p role="alert" className="px-1 text-sm text-[#9B3B3B]">{error}</p>}
          <Button disabled={actions.createMember.isPending || !name.trim() || !email || password.length < 8}>{actions.createMember.isPending ? 'Creando…' : 'Crear cuenta'}</Button>
        </form>

        <section className="grid gap-2">
          <h2 className="px-4 text-xs font-medium uppercase tracking-wider text-cocoa-soft">Miembros ({members.filter((m) => m.active).length})</h2>
          <Section footer="Quitar el acceso no borra sus recetas, y puedes devolverlo cuando quieras.">
            {members.map((m) => (
              <div key={m.id} className={`grid gap-2 px-4 py-3 ${m.active ? '' : 'opacity-55'}`}>
                <div className="flex items-center gap-3">
                  <Avatar path={m.avatar_url} name={m.display_name} size={44} />
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.display_name}{m.id === profile?.id && <span className="text-cocoa-soft"> (tú)</span>}</p><p className="text-sm text-cocoa-soft">{m.role === 'admin' ? 'Administrador' : 'Familiar'}{m.active ? '' : ' · sin acceso'}</p></div>
                </div>
                {m.id !== profile?.id && (
                  <div className="flex flex-wrap gap-2 pl-14">
                    <button type="button" onClick={() => void reset(m.id, m.display_name)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-pearl px-3 text-sm"><KeyRound size={14} />Nueva contraseña</button>
                    <button type="button" onClick={() => actions.setRole.mutate({ id: m.id, role: m.role === 'admin' ? 'member' : 'admin' })} className="min-h-11 rounded-full bg-pearl px-3 text-sm">{m.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}</button>
                    <button type="button" onClick={() => actions.setActive.mutate({ id: m.id, active: !m.active })} className={`min-h-11 rounded-full px-3 text-sm ${m.active ? 'text-[#9B3B3B]' : 'bg-sage-deep text-white'}`}>{m.active ? 'Quitar acceso' : 'Devolver acceso'}</button>
                  </div>
                )}
              </div>
            ))}
          </Section>
        </section>
      </div>
    </main>
  )
}
