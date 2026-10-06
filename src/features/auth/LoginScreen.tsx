import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../../lib/supabase'
import { LogoMark } from '../../components/brand/Logo'
import { Button, ErrorText, Field, GhostButton } from '../../components/ui/controls'
import { site } from '../../lib/site'

const ease = [0.23, 1, 0.32, 1] as const

export function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) return setError(friendly(error.message))
    setStep('code')
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError('Ese código no es válido o ya venció. Pide uno nuevo.')
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-8 px-6 py-12">
      <div className="rise flex flex-col items-center text-center">
        <LogoMark size={56} />
        <h1 className="mt-6 font-display text-4xl font-medium">{site.name}</h1>
        <p className="mt-1 text-cocoa-soft">{site.tagline}</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 'email' ? (
          <motion.form
            key="email"
            onSubmit={sendCode}
            className="grid gap-4"
            initial={{ opacity: 0, transform: 'translateX(16px)' }}
            animate={{ opacity: 1, transform: 'translateX(0px)' }}
            exit={{ opacity: 0, transform: 'translateX(-16px)' }}
            transition={{ duration: 0.3, ease }}
          >
            <Field label="Tu correo" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
            <ErrorText>{error}</ErrorText>
            <Button disabled={busy || !email}>{busy ? 'Enviando…' : 'Enviarme un código'}</Button>
            <p className="text-center text-sm text-cocoa-soft">Sin contraseñas. Te llega un código a tu correo.</p>
          </motion.form>
        ) : (
          <motion.form
            key="code"
            onSubmit={verify}
            className="grid gap-4"
            initial={{ opacity: 0, transform: 'translateX(16px)' }}
            animate={{ opacity: 1, transform: 'translateX(0px)' }}
            exit={{ opacity: 0, transform: 'translateX(-16px)' }}
            transition={{ duration: 0.3, ease }}
          >
            <p className="text-center text-cocoa-soft">
              Escribe el código que enviamos a <span className="font-medium text-cocoa">{email}</span>
            </p>
            <Field label="Código" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="tracking-[0.4em]" />
            <ErrorText>{error}</ErrorText>
            <Button disabled={busy || code.length < 6}>{busy ? 'Verificando…' : 'Entrar'}</Button>
            <GhostButton type="button" onClick={() => { setStep('email'); setCode(''); setError('') }}>
              Usar otro correo
            </GhostButton>
          </motion.form>
        )}
      </AnimatePresence>
    </main>
  )
}

function friendly(msg: string) {
  if (/rate limit|too many|seconds/i.test(msg)) return 'Se enviaron muchos códigos seguidos. Espera un momento e inténtalo de nuevo.'
  if (/invalid/i.test(msg)) return 'Revisa que el correo esté bien escrito.'
  return 'No pudimos enviar el código. Inténtalo de nuevo.'
}
