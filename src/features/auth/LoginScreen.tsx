import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LogoMark } from '../../components/brand/Logo'
import { Button, ErrorText, Field, GhostButton } from '../../components/ui/controls'
import { site } from '../../lib/site'

const ease = [0.23, 1, 0.32, 1] as const
type Mode = 'password' | 'email' | 'code'

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const go = (m: Mode) => { setMode(m); setError(''); setCode('') }

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setBusy(false)
    if (error) setError(/invalid login|credentials/i.test(error.message) ? 'Correo o contraseña incorrectos.' : 'No pudimos iniciar sesión. Inténtalo de nuevo.')
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } })
    setBusy(false)
    if (error) return setError(/rate limit|too many|seconds/i.test(error.message) ? 'Se enviaron muchos códigos seguidos. Espera un momento.' : 'No pudimos enviar el código. Revisa el correo o pídele ayuda al administrador.')
    go('code')
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError('Ese código no es válido o ya venció. Pide uno nuevo.')
  }

  const slide = { initial: { opacity: 0, transform: 'translateX(16px)' }, animate: { opacity: 1, transform: 'translateX(0px)' }, exit: { opacity: 0, transform: 'translateX(-16px)' }, transition: { duration: 0.28, ease } }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-8 px-6 py-12">
      <div className="rise flex flex-col items-center text-center">
        <LogoMark size={56} />
        <h1 className="mt-6 font-display text-4xl font-medium">{site.name}</h1>
        <p className="mt-1 text-cocoa-soft">{site.tagline}</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'password' && (
          <motion.form key="password" onSubmit={signIn} className="grid gap-4" {...slide}>
            <Field label="Correo" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
            <div className="relative">
              <Field label="Contraseña" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-cocoa-soft">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <ErrorText>{error}</ErrorText>
            <Button disabled={busy || !email || !password}>{busy ? 'Entrando…' : 'Entrar'}</Button>
            <GhostButton type="button" onClick={() => go('email')}>Olvidé mi contraseña</GhostButton>
            <p className="text-center text-sm text-cocoa-soft">Tu acceso te lo da quien administra el libro.</p>
          </motion.form>
        )}
        {mode === 'email' && (
          <motion.form key="email" onSubmit={sendCode} className="grid gap-4" {...slide}>
            <p className="text-center text-cocoa-soft">Te enviamos un código a tu correo para entrar. Después podrás poner una contraseña nueva en Ajustes.</p>
            <Field label="Tu correo" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
            <ErrorText>{error}</ErrorText>
            <Button disabled={busy || !email}>{busy ? 'Enviando…' : 'Enviarme un código'}</Button>
            <GhostButton type="button" onClick={() => go('password')}>Volver</GhostButton>
          </motion.form>
        )}
        {mode === 'code' && (
          <motion.form key="code" onSubmit={verify} className="grid gap-4" {...slide}>
            <p className="text-center text-cocoa-soft">Escribe el código que enviamos a <span className="font-medium text-cocoa">{email}</span></p>
            <Field label="Código" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="tracking-[0.4em]" />
            <ErrorText>{error}</ErrorText>
            <Button disabled={busy || code.length < 6}>{busy ? 'Verificando…' : 'Entrar'}</Button>
            <GhostButton type="button" onClick={() => go('password')}>Volver</GhostButton>
          </motion.form>
        )}
      </AnimatePresence>
    </main>
  )
}
