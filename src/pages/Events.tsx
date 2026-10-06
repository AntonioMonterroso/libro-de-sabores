import { Link } from 'react-router-dom'
import { CalendarDays, Lock, MapPin, Plus } from 'lucide-react'
import { fmtDate, fmtTime, useEvents, type EventRow } from '../features/events/api'
import { Avatar } from '../components/ui/Avatar'

function EventCard({ e, i }: { e: EventRow; i: number }) {
  const d = new Date(e.starts_at)
  const yes = e.event_invitees.filter((x) => x.rsvp === 'yes')
  return (
    <Link to={`/evento/${e.id}`} className="rise flex gap-4 rounded-[24px] border border-hairline bg-white/75 p-4 shadow-soft transition-transform duration-200 [transition-timing-function:var(--ease-out)] active:scale-[0.985]" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
      <div className="grid h-20 w-16 shrink-0 place-items-center content-center rounded-2xl bg-rose text-center">
        <span className="text-xs uppercase tracking-wider text-cocoa-soft">{d.toLocaleDateString('es', { month: 'short' }).replace('.', '')}</span>
        <span className="font-display text-4xl leading-none">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-2xl font-medium leading-tight">{e.title}</h3>
        <p className="mt-0.5 text-sm text-cocoa-soft first-letter:uppercase">{fmtDate(e.starts_at)} · {fmtTime(e.starts_at)}</p>
        {e.location && <p className="mt-1 flex items-center gap-1 text-sm text-cocoa-soft"><MapPin size={14} className="shrink-0" /><span className="truncate">{e.location}</span></p>}
        <div className="mt-3 flex items-center">
          <div className="flex -space-x-2">{yes.slice(0, 5).map((x) => <span key={x.user_id} className="rounded-full ring-2 ring-ivory"><Avatar path={x.profile?.avatar_url} name={x.profile?.display_name} size={26} /></span>)}</div>
          <span className="ml-3 text-xs text-cocoa-soft">{yes.length} de {e.event_invitees.length} confirmados</span>
        </div>
      </div>
    </Link>
  )
}

export function Events() {
  const { data: events = [], isLoading } = useEvents()
  const now = Date.now()
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now - 3 * 3600_000)
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now - 3 * 3600_000).reverse()
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-5xl font-medium">Eventos</h1>
      <p className="mt-2 flex items-center gap-2 text-cocoa-soft"><Lock size={15} />Privados: solo los ven quienes invitas.</p>

      {!isLoading && events.length === 0 ? (
        <div className="mt-10 rounded-[24px] border border-dashed border-champagne bg-white/50 p-10 text-center">
          <CalendarDays className="mx-auto text-champagne" size={30} />
          <p className="mt-3 font-display text-2xl">Aún no hay reuniones a la vista.</p>
          <p className="mt-1 text-cocoa-soft">Organiza una cena y avisa solo a quien tú quieras.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4">{upcoming.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}</div>
          {past.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-3xl font-medium text-cocoa-soft">Pasados</h2>
              <div className="mt-4 grid gap-4 opacity-70">{past.map((e, i) => <EventCard key={e.id} e={e} i={i} />)}</div>
            </section>
          )}
        </>
      )}

      <Link to="/eventos/nuevo" className="fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5rem)] right-5 z-30 flex min-h-14 items-center gap-2 rounded-full bg-sage-deep px-6 font-medium text-white shadow-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97]">
        <Plus size={20} /> Nuevo evento
      </Link>
    </main>
  )
}
