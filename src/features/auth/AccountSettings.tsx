import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { compressImage } from '../../lib/image-compress'
import { uploadPhoto } from '../recipes/api'
import { useAuth } from './AuthProvider'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/controls'
import { Section } from '../../components/ui/layout'

const field = 'block w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-cocoa-soft/50'

export function ProfileCard() {
  const { profile, session, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [branch, setBranch] = useState(profile?.branch ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function changePhoto(f?: File) {
    if (!f || !session || !profile) return
    setBusy(true)
    setMsg('')
    try {
      const old = profile.avatar_url
      const path = await uploadPhoto(await compressImage(f, 512), session.user.id, 'avatars')
      const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', session.user.id)
      if (error) throw error
      if (old) await supabase.storage.from('avatars').remove([old])
      await refreshProfile()
      void qc.invalidateQueries({ queryKey: ['profiles'] })
    } catch { setMsg('No se pudo subir la foto.') }
    setBusy(false)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setBusy(true)
    setMsg('')
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), bio: bio.trim() || null, branch: branch.trim() || null }).eq('id', session.user.id)
    if (error) setMsg('No se pudo guardar.')
    else { await refreshProfile(); void qc.invalidateQueries({ queryKey: ['profiles'] }); setMsg('Guardado') }
    setBusy(false)
  }

  return (
    <form onSubmit={save} className="grid gap-3">
      <Section>
        <div className="flex items-center gap-4 px-4 py-4">
          <label className="relative cursor-pointer">
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void changePhoto(e.target.files?.[0])} />
            <Avatar path={profile?.avatar_url} name={profile?.display_name} size={72} />
            <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-sage-deep text-white ring-2 ring-ivory"><Camera size={15} /></span>
          </label>
          <div className="min-w-0"><p className="truncate text-sm text-cocoa-soft">{session?.user.email}</p><p className="text-sm text-cocoa-soft">{profile?.role === 'admin' ? 'Administrador' : 'Miembro de la familia'}</p></div>
        </div>
        <input aria-label="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} placeholder="Tu nombre" className={field} />
        <input aria-label="Rama de la familia" value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={40} placeholder="Rama de la familia (opcional)" className={field} />
        <textarea aria-label="Sobre ti" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} maxLength={280} placeholder="Una frase sobre ti y tu cocina (opcional)" className={`${field} resize-none`} />
      </Section>
      {msg && <p role="status" className={`px-1 text-sm ${msg === 'Guardado' ? 'text-sage-deep' : 'text-[#9B3B3B]'}`}>{msg}</p>}
      <Button disabled={busy || name.trim().length < 2}>{busy ? 'Guardando…' : 'Guardar perfil'}</Button>
    </form>
  )
}

export function PasswordCard() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const ok = pw.length >= 8 && pw === pw2

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setMsg(/same|different/i.test(error.message) ? 'Elige una contraseña distinta a la actual.' : 'No se pudo cambiar la contraseña.')
    setPw(''); setPw2(''); setMsg('Contraseña cambiada')
  }

  return (
    <form onSubmit={save} className="grid gap-3">
      <h2 className="px-4 text-xs font-medium uppercase tracking-wider text-cocoa-soft">Contraseña</h2>
      <Section footer="Mínimo 8 caracteres. La próxima vez entras con tu correo y esta contraseña.">
        <div className="flex items-center">
          <input aria-label="Contraseña nueva" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} maxLength={72} placeholder="Contraseña nueva" className={field} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar' : 'Mostrar'} className="mr-2 grid size-11 shrink-0 place-items-center rounded-full text-cocoa-soft">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        <input aria-label="Repite la contraseña" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repítela" className={field} />
      </Section>
      {pw2 && pw !== pw2 && <p className="px-1 text-sm text-[#9B3B3B]">Las contraseñas no coinciden.</p>}
      {msg && <p role="status" className={`px-1 text-sm ${msg === 'Contraseña cambiada' ? 'text-sage-deep' : 'text-[#9B3B3B]'}`}>{msg}</p>}
      <Button disabled={busy || !ok}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</Button>
    </form>
  )
}
