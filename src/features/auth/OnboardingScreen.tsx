import { useState, type FormEvent } from 'react'
import { Camera } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { compressImage } from '../../lib/image-compress'
import { useAuth } from './AuthProvider'
import { LogoMark } from '../../components/brand/Logo'
import { Button, ErrorText, Field, GhostButton } from '../../components/ui/controls'

export function OnboardingScreen() {
  const { session, refreshProfile, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function pick(f: File | undefined) {
    if (!f) return
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setBusy(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('redeem_invite', {
      p_code: code.trim().toUpperCase(),
      p_display_name: name.trim(),
    })
    if (rpcError) {
      setBusy(false)
      return setError(/inv[aá]lido|vencido/i.test(rpcError.message) ? 'Ese código no es válido o ya venció.' : 'No pudimos crear tu perfil. Inténtalo de nuevo.')
    }
    if (photo) {
      try {
        const blob = await compressImage(photo, 512)
        const path = `${session.user.id}/avatar.webp`
        const up = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/webp' })
        if (!up.error) await supabase.from('profiles').update({ avatar_url: path }).eq('id', session.user.id)
      } catch {
        /* la foto es opcional; se puede subir luego */
      }
    }
    await refreshProfile()
    setBusy(false)
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-8 px-6 py-12">
      <div className="rise text-center">
        <h1 className="font-display text-4xl font-medium">Bienvenido a la mesa</h1>
        <p className="mt-2 text-cocoa-soft">Con tu código de invitación y tu nombre, ya eres parte del libro.</p>
      </div>

      <form onSubmit={submit} className="grid gap-4">
        <label className="mx-auto grid size-28 cursor-pointer place-items-center overflow-hidden rounded-full border border-champagne bg-rose transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97]">
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          {preview ? (
            <img src={preview} alt="Tu foto" className="size-full object-cover" />
          ) : (
            <span className="grid justify-items-center gap-1 text-cocoa-soft">
              <Camera size={22} aria-hidden="true" />
              <span className="text-xs">Tu foto</span>
            </span>
          )}
        </label>
        <Field label="Tu nombre" autoComplete="name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tía Marta" hint="Así te verán en tus recetas." />
        <Field label="Código de invitación" required autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ADMIN-XXXXXXXX" />
        <ErrorText>{error}</ErrorText>
        <Button disabled={busy || name.trim().length < 2 || code.trim().length < 6}>{busy ? 'Entrando…' : 'Entrar al libro'}</Button>
        <GhostButton type="button" onClick={signOut}>Salir</GhostButton>
      </form>
      <div className="flex justify-center opacity-60"><LogoMark size={28} /></div>
    </main>
  )
}
