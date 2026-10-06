import { useEffect } from 'react'

/** Mantiene la pantalla encendida mientras `active` sea true (y se recupera al volver a la pestaña). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) void l.release()
        else lock = l
      } catch { /* sin permiso o sin batería: se ignora */ }
    }
    void request()
    const onVisible = () => { if (document.visibilityState === 'visible') void request() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
