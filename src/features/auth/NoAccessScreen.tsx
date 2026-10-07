import { useAuth } from './AuthProvider'
import { LogoMark } from '../../components/brand/Logo'
import { Button, GhostButton } from '../../components/ui/controls'

export function NoAccessScreen() {
  const { session, refreshProfile, signOut } = useAuth()
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center justify-items-center gap-5 px-6 py-12 text-center">
      <LogoMark size={44} />
      <h1 className="font-display text-4xl font-medium">Casi listo</h1>
      <p className="text-cocoa-soft">La cuenta <span className="font-medium text-cocoa">{session?.user.email}</span> todavía no tiene acceso al libro. Pídele a quien lo administra que la active.</p>
      <div className="grid w-full gap-2">
        <Button onClick={() => void refreshProfile()}>Volver a revisar</Button>
        <GhostButton onClick={signOut}>Salir</GhostButton>
      </div>
    </main>
  )
}
