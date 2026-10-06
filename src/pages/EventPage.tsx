import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BellOff, CalendarPlus, ChevronLeft, Lock, MapPin, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/AuthProvider'
import { useSignedUrl } from '../features/recipes/api'
import { REMINDER_OPTIONS, downloadIcs, fmtDate, fmtTime, useEvent, type Rsvp } from '../features/events/api'
import { Avatar } from '../components/ui/Avatar'
import { Segmented } from '../components/ui/layout'

const RSVP_LABEL: Record<Rsvp, string> = { pending: 'Sin responder', yes: 'Va', maybe: 'Quizá', no: 'No va' }

export function EventPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { session } = useAuth()
  const { data: e, isLoading, error } = useEvent(id)
  const cover = useSignedUrl(e?.cover_url)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const me = session?.user.id

  const update = useMutation({
    mutationFn: async (p: { rsvp?: Rsvp; muted?: boolean }) => { const { error } = await supabase.from('event_invitees').update(p).eq('event_id', id!).eq('user_id', me!); if (error) throw error },
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['event', id] }), qc.invalidateQueries({ queryKey: ['events'] })]),
  })
  const remove = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('events').delete().eq('id', id!); if (error) throw error },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['events'] }); nav('/eventos', { replace: true }) },
  })

  if (isLoading) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">Cargando…</div>
  if (error || !e) return <div className="grid min-h-dvh place-items-center px-6 text-center text-cocoa-soft">No encontramos este evento, o no estás invitado.</div>

  const mine = e.event_invitees.find((i) => i.user_id === me)
  const isCreator = e.creator_id === me
  const counts = (['yes', 'maybe', 'no', 'pending'] as Rsvp[]).map((r) => [r, e.event_invitees.filter((i) => i.rsvp === r).length] as const)
  const dishes = [...e.event_dishes].sort((a, b) => a.sort - b.sort)
  const rems = REMINDER_OPTIONS.filter((o) => e.event_reminders.some((r) => r.minutes_before === o.m))

  return (
    <main className="mx-auto w-full max-w-2xl pb-32">
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => nav('/eventos')} className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm text-cocoa-soft"><ChevronLeft size={18} />Eventos</button>
        {isCreator && <Link to={`/evento/${e.id}/editar`} className="flex min-h-11 items-center gap-1 px-3 text-sm font-medium text-sage-deep"><Pencil size={15} />Editar</Link>}
      </div>
      {cover && <img src={cover} alt="" className="mx-auto mt-2 aspect-[16/9] w-full object-cover sm:rounded-[28px]" />}
      <div className="px-5 pt-6">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-champagne"><Lock size={13} />Privado · solo invitados</p>
        <h1 className="mt-2 font-display text-5xl font-medium leading-[1.05]">{e.title}</h1>
        <p className="mt-3 text-lg first-letter:uppercase">{fmtDate(e.starts_at)}</p>
        <p className="font-display text-4xl">{fmtTime(e.starts_at)}</p>
        {e.location && <p className="mt-3 flex items-center gap-2 text-cocoa-soft"><MapPin size={17} className="shrink-0" />{e.map_url ? <a href={e.map_url} target="_blank" rel="noopener noreferrer" className="underline decoration-champagne underline-offset-4">{e.location}</a> : e.location}</p>}
        {e.description && <p className="mt-5 whitespace-pre-wrap text-[17px] leading-relaxed">{e.description}</p>}
        <p className="mt-3 text-sm text-cocoa-soft">Organiza {isCreator ? 'tú' : e.creator?.display_name}</p>

        {mine && (
          <div className="mt-8 rounded-[24px] border border-hairline bg-white/75 p-5 shadow-soft">
            <p className="mb-3 font-medium">¿Vas a ir?</p>
            <Segmented label="Asistencia" value={mine.rsvp === 'pending' ? ('' as Rsvp) : mine.rsvp} onChange={(v) => update.mutate({ rsvp: v })} options={[{ value: 'yes', label: 'Voy' }, { value: 'maybe', label: 'Quizá' }, { value: 'no', label: 'No voy' }]} />
            <button type="button" onClick={() => update.mutate({ muted: !mine.muted })} className="mt-4 flex min-h-11 items-center gap-2 text-sm text-cocoa-soft"><BellOff size={16} />{mine.muted ? 'Recordatorios silenciados. Tocar para activarlos' : 'Silenciar recordatorios de este evento'}</button>
          </div>
        )}

        <button type="button" onClick={() => downloadIcs(e)} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-pearl font-medium transition-transform duration-150 active:scale-[0.98]"><CalendarPlus size={18} />Agregar a mi calendario</button>
        {rems.length > 0 && <p className="mt-3 text-center text-sm text-cocoa-soft">Avisos: {rems.map((r) => r.label.toLowerCase()).join(', ')}</p>}

        {dishes.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-3xl font-medium">Menú</h2>
            <ul className="mt-4 divide-y divide-hairline rounded-[22px] border border-hairline bg-white/75">
              {dishes.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  {x.recipe ? <Link to={`/receta/${x.recipe.id}`} className="font-medium underline decoration-champagne underline-offset-4">{x.recipe.title}</Link> : <span className="font-medium">{x.custom_name}</span>}
                  <span className="shrink-0 text-sm text-cocoa-soft">{x.assignee ? `Lo lleva ${x.assigned_to === me ? 'tú' : x.assignee.display_name}` : 'Sin asignar'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-3xl font-medium">Invitados</h2>
          <p className="mt-1 text-sm text-cocoa-soft">{counts.filter(([, n]) => n).map(([r, n]) => `${n} ${RSVP_LABEL[r].toLowerCase()}`).join(' · ')}</p>
          <ul className="mt-4 grid gap-3">
            {e.event_invitees.map((i) => (
              <li key={i.user_id} className="flex items-center gap-3">
                <Avatar path={i.profile?.avatar_url} name={i.profile?.display_name} size={40} />
                <span className="flex-1">{i.profile?.display_name}{i.user_id === e.creator_id && <span className="text-cocoa-soft"> · organiza</span>}</span>
                <span className={`rounded-full px-3 py-1 text-sm ${i.rsvp === 'yes' ? 'bg-sage/70' : i.rsvp === 'no' ? 'bg-rose' : 'bg-pearl text-cocoa-soft'}`}>{RSVP_LABEL[i.rsvp]}</span>
              </li>
            ))}
          </ul>
        </section>

        {isCreator && (
          <div className="mt-14 border-t border-hairline pt-6">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-cocoa-soft">Se borra para todos los invitados.</p>
                <button type="button" onClick={() => remove.mutate()} className="min-h-11 rounded-full bg-[#9B3B3B] px-5 font-medium text-white">Sí, eliminar</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 px-3 text-cocoa-soft">Cancelar</button>
              </div>
            ) : <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 text-sm text-[#9B3B3B]">Eliminar evento</button>}
          </div>
        )}
      </div>
    </main>
  )
}
