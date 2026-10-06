import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNotifications } from '../features/notifications/hooks'

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  if (m < 1440) return `hace ${Math.round(m / 60)} h`
  return `hace ${Math.round(m / 1440)} d`
}

export function Notifications() {
  const { data = [], isLoading } = useNotifications()
  const qc = useQueryClient()
  const unread = data.filter((n) => !n.read_at)

  useEffect(() => {
    if (!unread.length) return
    const t = setTimeout(async () => {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    }, 1500)
    return () => clearTimeout(t)
  }, [unread.length, qc])

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-5xl font-medium">Avisos</h1>
      {!isLoading && data.length === 0 ? (
        <div className="mt-10 rounded-[24px] border border-dashed border-champagne bg-white/50 p-10 text-center">
          <Bell className="mx-auto text-champagne" size={28} />
          <p className="mt-3 font-display text-2xl">Todo tranquilo por ahora.</p>
          <p className="mt-1 text-cocoa-soft">Aquí verás cuando alguien comparta una receta.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {data.map((n) => (
            <li key={n.id}>
              <Link to={n.recipe_id ? `/receta/${n.recipe_id}` : '/'} className={`flex items-start gap-3 rounded-[22px] border p-4 transition-transform duration-150 active:scale-[0.985] ${n.read_at ? 'border-hairline bg-white/60' : 'border-champagne/60 bg-rose/40'}`}>
                {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-champagne" aria-label="Sin leer" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  <p className="truncate text-cocoa-soft">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-cocoa-soft">{ago(n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
