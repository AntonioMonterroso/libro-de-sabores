import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, ChevronLeft, Lock, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { compressImage } from '../lib/image-compress'
import { uploadPhoto, useProfiles, useRecipes, useSignedUrl } from '../features/recipes/api'
import { REMINDER_OPTIONS, emptyEvent, eventToDraft, newDish, saveEvent, useEvent, type EventDraft } from '../features/events/api'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/controls'
import { Chip, Row, Section, Select, TextArea, inputBare } from '../components/ui/layout'

export function EventForm() {
  const { id } = useParams()
  const { data: existing, isLoading } = useEvent(id)
  if (id && (isLoading || !existing)) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">Cargando…</div>
  return <Form key={id ?? 'new'} initial={existing} />
}

function Form({ initial }: { initial?: NonNullable<ReturnType<typeof useEvent>['data']> }) {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { session } = useAuth()
  const me = session!.user.id
  const { data: profiles = [] } = useProfiles()
  const { data: recipes = [] } = useRecipes()
  const [d, setD] = useState<EventDraft>(() => (initial ? eventToDraft(initial, me) : emptyEvent()))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const cover = useSignedUrl(d.cover_path)
  const patch = (p: Partial<EventDraft>) => setD((x) => ({ ...x, ...p }))
  const others = profiles.filter((p) => p.id !== me)
  const published = useMemo(() => recipes.filter((r) => r.status === 'published'), [recipes])
  const people = [{ id: me, display_name: 'Yo' }, ...others.filter((p) => d.invitees.includes(p.id))]
  const valid = d.title.trim().length >= 2 && d.date && d.time

  async function pickCover(f?: File) {
    if (!f) return
    try { patch({ cover_path: await uploadPhoto(await compressImage(f), me) }) } catch { setErr('No se pudo subir la foto.') }
  }

  async function submit() {
    setBusy(true)
    setErr('')
    try {
      const eid = await saveEvent(d, me)
      await Promise.all([qc.invalidateQueries({ queryKey: ['events'] }), qc.invalidateQueries({ queryKey: ['event', eid] }), qc.invalidateQueries({ queryKey: ['notifications'] })])
      nav(`/evento/${eid}`, { replace: true })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  const toggleInv = (uid: string) => patch({ invitees: d.invitees.includes(uid) ? d.invitees.filter((x) => x !== uid) : [...d.invitees, uid] })
  const toggleRem = (m: number) => patch({ reminders: d.reminders.includes(m) ? d.reminders.filter((x) => x !== m) : [...d.reminders, m] })
  const field = 'block w-full bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-cocoa-soft/50'

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-40 pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" onClick={() => nav(-1)} className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm text-cocoa-soft"><ChevronLeft size={18} />Cancelar</button>
      <h1 className="mt-2 font-display text-5xl font-medium">{initial ? 'Editar evento' : 'Nuevo evento'}</h1>
      <p className="mt-2 flex items-center gap-2 text-cocoa-soft"><Lock size={15} />Solo lo verán las personas que invites. Nadie más, tampoco el administrador.</p>

      <div className="mt-8 grid gap-7">
        <label className="group relative grid aspect-[16/9] cursor-pointer place-items-center overflow-hidden rounded-[24px] border border-dashed border-champagne bg-rose/40">
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void pickCover(e.target.files?.[0])} />
          {cover ? <img src={cover} alt="Portada" className="size-full object-cover" /> : <span className="grid justify-items-center gap-1 text-cocoa-soft"><Camera size={24} />Foto de portada (opcional)</span>}
        </label>

        <Section>
          <input aria-label="Nombre del evento" value={d.title} onChange={(e) => patch({ title: e.target.value })} maxLength={120} placeholder="Cena de cumpleaños de la abuela" className="block w-full bg-transparent px-4 py-3.5 font-display text-2xl outline-none placeholder:text-cocoa-soft/40" />
          <TextArea aria-label="Descripción" rows={3} value={d.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Qué se celebra, qué llevar, a qué hora llegar…" />
        </Section>

        <Section title="Cuándo y dónde">
          <Row label="Fecha" htmlFor="ev-date"><input id="ev-date" type="date" value={d.date} onChange={(e) => patch({ date: e.target.value })} className={inputBare} /></Row>
          <Row label="Hora" htmlFor="ev-time"><input id="ev-time" type="time" value={d.time} onChange={(e) => patch({ time: e.target.value })} className={inputBare} /></Row>
          <input aria-label="Lugar" value={d.location} onChange={(e) => patch({ location: e.target.value })} placeholder="Lugar: casa de la abuela" className={field} />
          <input aria-label="Enlace del mapa" type="url" value={d.map_url} onChange={(e) => patch({ map_url: e.target.value })} placeholder="Enlace del mapa (opcional)" className={field} />
        </Section>

        <section className="grid gap-2">
          <div className="flex items-end justify-between px-4"><h2 className="text-xs font-medium uppercase tracking-wider text-cocoa-soft">Invitados ({d.invitees.length})</h2>{others.length > 0 && <button type="button" className="min-h-9 text-sm font-medium text-sage-deep" onClick={() => patch({ invitees: d.invitees.length === others.length ? [] : others.map((p) => p.id) })}>{d.invitees.length === others.length ? 'Quitar a todos' : 'Invitar a todos'}</button>}</div>
          <div className="divide-y divide-hairline overflow-hidden rounded-[20px] border border-hairline bg-white/75 shadow-soft">
            {others.length === 0 && <p className="px-4 py-4 text-cocoa-soft">Aún no hay otros miembros en la familia.</p>}
            {others.map((p) => {
              const on = d.invitees.includes(p.id)
              return (
                <button key={p.id} type="button" aria-pressed={on} onClick={() => toggleInv(p.id)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
                  <Avatar path={p.avatar_url} name={p.display_name} size={36} />
                  <span className="flex-1">{p.display_name}</span>
                  <span className={`grid size-6 place-items-center rounded-full border text-xs transition-colors duration-200 ${on ? 'border-sage-deep bg-sage-deep text-white' : 'border-champagne/70'}`}>{on && '✓'}</span>
                </button>
              )
            })}
          </div>
          <p className="px-4 text-xs text-cocoa-soft">Cada persona recibe un aviso solo a ella cuando la agregas.</p>
        </section>

        <section className="grid gap-2">
          <h2 className="px-4 text-xs font-medium uppercase tracking-wider text-cocoa-soft">Avisarles antes</h2>
          <div className="flex flex-wrap gap-2 px-1">{REMINDER_OPTIONS.map((o) => <Chip key={o.m} active={d.reminders.includes(o.m)} color="#F4DDD2" onClick={() => toggleRem(o.m)}>{o.label}</Chip>)}</div>
          <p className="px-4 text-xs text-cocoa-soft">Los avisos llegan solo a los invitados. Cada uno puede silenciarlos.</p>
        </section>

        <Section title="Menú" footer="Elige recetas del libro o escribe lo que se llevará, y quién lo lleva.">
          {d.dishes.map((x, i) => (
            <div key={x.key} className="grid gap-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <Select aria-label="Receta" value={x.recipe_id ?? ''} onChange={(e) => setD((s) => ({ ...s, dishes: s.dishes.map((y, j) => (j === i ? { ...y, recipe_id: e.target.value || null } : y)) }))} className="min-w-0 flex-1 !text-left font-medium">
                  <option value="">Otro plato…</option>
                  {published.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </Select>
                <button type="button" aria-label="Quitar plato" onClick={() => patch({ dishes: d.dishes.filter((_, j) => j !== i) })} className="grid size-11 place-items-center rounded-full text-cocoa-soft hover:bg-pearl"><Trash2 size={16} /></button>
              </div>
              {!x.recipe_id && <input aria-label="Nombre del plato" value={x.custom_name} onChange={(e) => setD((s) => ({ ...s, dishes: s.dishes.map((y, j) => (j === i ? { ...y, custom_name: e.target.value } : y)) }))} placeholder="Nombre del plato" className="bg-transparent text-[15px] outline-none placeholder:text-cocoa-soft/50" />}
              <Select aria-label="Quién lo lleva" value={x.assigned_to ?? ''} onChange={(e) => setD((s) => ({ ...s, dishes: s.dishes.map((y, j) => (j === i ? { ...y, assigned_to: e.target.value || null } : y)) }))} className="!text-left text-cocoa-soft">
                <option value="">Sin asignar</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.id === me ? 'Yo' : p.display_name}</option>)}
              </Select>
            </div>
          ))}
          <button type="button" className="flex min-h-12 w-full items-center gap-2 px-4 text-[15px] font-medium text-sage-deep" onClick={() => patch({ dishes: [...d.dishes, newDish()] })}><Plus size={18} />Agregar plato</button>
        </Section>

        {err && <p role="alert" className="text-sm text-[#9B3B3B]">{err}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline/70 bg-ivory/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl gap-3"><Button disabled={!valid || busy} onClick={submit}>{busy ? 'Guardando…' : initial ? 'Guardar cambios' : d.invitees.length ? `Crear y avisar a ${d.invitees.length}` : 'Crear evento'}</Button></div>
      </div>
    </main>
  )
}
