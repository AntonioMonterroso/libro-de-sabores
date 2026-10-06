import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { uid } from '../recipes/types'

export type Rsvp = 'pending' | 'yes' | 'maybe' | 'no'
export type Who = { display_name: string; avatar_url: string | null } | null

export type EventRow = {
  id: string
  creator_id: string
  title: string
  description: string | null
  location: string | null
  map_url: string | null
  cover_url: string | null
  starts_at: string
  event_invitees: { user_id: string; rsvp: Rsvp; muted: boolean; profile: Who }[]
}

export type EventFull = EventRow & {
  creator: Who
  event_dishes: { id: string; recipe_id: string | null; custom_name: string | null; assigned_to: string | null; sort: number; recipe: { id: string; title: string; cover_url: string | null } | null; assignee: Who }[]
  event_reminders: { id: string; minutes_before: number; sent_at: string | null }[]
}

export const REMINDER_OPTIONS = [
  { m: 10080, label: '1 semana antes' },
  { m: 4320, label: '3 días antes' },
  { m: 1440, label: '1 día antes' },
  { m: 180, label: '3 horas antes' },
  { m: 60, label: '1 hora antes' },
  { m: 30, label: '30 min antes' },
  { m: 10, label: '10 min antes' },
  { m: 0, label: 'A la hora' },
]

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*, event_invitees(user_id,rsvp,muted,profile:profiles!user_id(display_name,avatar_url))').order('starts_at')
      if (error) throw error
      return data as unknown as EventRow[]
    },
  })
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, creator:profiles!creator_id(display_name,avatar_url), event_invitees(user_id,rsvp,muted,profile:profiles!user_id(display_name,avatar_url)), event_dishes(id,recipe_id,custom_name,assigned_to,sort,recipe:recipes!recipe_id(id,title,cover_url),assignee:profiles!assigned_to(display_name,avatar_url)), event_reminders(id,minutes_before,sent_at)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as EventFull
    },
  })
}

export type EventDraft = {
  id?: string
  title: string
  description: string
  date: string
  time: string
  location: string
  map_url: string
  cover_path: string | null
  invitees: string[]
  dishes: { key: string; recipe_id: string | null; custom_name: string; assigned_to: string | null }[]
  reminders: number[]
}

export const emptyEvent = (): EventDraft => ({ title: '', description: '', date: '', time: '19:00', location: '', map_url: '', cover_path: null, invitees: [], dishes: [], reminders: [1440, 60, 0] })

export const newDish = () => ({ key: uid(), recipe_id: null as string | null, custom_name: '', assigned_to: null as string | null })

const pad = (n: number) => String(n).padStart(2, '0')

export function eventToDraft(e: EventFull, myId: string): EventDraft {
  const d = new Date(e.starts_at)
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? '',
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    location: e.location ?? '',
    map_url: e.map_url ?? '',
    cover_path: e.cover_url,
    invitees: e.event_invitees.map((i) => i.user_id).filter((u) => u !== myId),
    dishes: [...e.event_dishes].sort((a, b) => a.sort - b.sort).map((x) => ({ key: uid(), recipe_id: x.recipe_id, custom_name: x.custom_name ?? '', assigned_to: x.assigned_to })),
    reminders: e.event_reminders.map((r) => r.minutes_before),
  }
}

export async function saveEvent(d: EventDraft, creatorId: string): Promise<string> {
  const startsAt = new Date(`${d.date}T${d.time}`)
  const row = {
    creator_id: creatorId,
    title: d.title.trim(),
    description: d.description.trim() || null,
    location: d.location.trim() || null,
    map_url: d.map_url.trim() || null,
    cover_url: d.cover_path,
    starts_at: startsAt.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
  let id = d.id
  if (id) {
    const { error } = await supabase.from('events').update(row).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('events').insert(row).select('id').single()
    if (error) throw error
    id = data.id as string
    const { error: ce } = await supabase.from('event_invitees').insert({ event_id: id, user_id: creatorId, rsvp: 'yes' })
    if (ce) throw ce
  }

  // Invitados: solo se avisa a quien se agrega ahora
  const { data: current } = await supabase.from('event_invitees').select('user_id').eq('event_id', id)
  const have = new Set((current ?? []).map((c) => c.user_id as string))
  const want = new Set(d.invitees)
  const toAdd = [...want].filter((u) => !have.has(u))
  const toRemove = [...have].filter((u) => u !== creatorId && !want.has(u))
  if (toAdd.length) {
    const { error } = await supabase.from('event_invitees').insert(toAdd.map((user_id) => ({ event_id: id, user_id })))
    if (error) throw error
  }
  if (toRemove.length) await supabase.from('event_invitees').delete().eq('event_id', id).in('user_id', toRemove)

  // Menú
  await supabase.from('event_dishes').delete().eq('event_id', id)
  const dishes = d.dishes.filter((x) => x.recipe_id || x.custom_name.trim())
  if (dishes.length) {
    const { error } = await supabase.from('event_dishes').insert(dishes.map((x, i) => ({ event_id: id, recipe_id: x.recipe_id, custom_name: x.recipe_id ? null : x.custom_name.trim(), assigned_to: x.assigned_to, sort: i })))
    if (error) throw error
  }

  // Recordatorios: se conservan los ya existentes (la base ajusta su hora si cambió la fecha)
  const { data: rems } = await supabase.from('event_reminders').select('minutes_before').eq('event_id', id)
  const haveR = new Set((rems ?? []).map((r) => r.minutes_before as number))
  const addR = d.reminders.filter((m) => !haveR.has(m)).map((m) => ({ event_id: id, minutes_before: m, fire_at: new Date(startsAt.getTime() - m * 60_000).toISOString() })).filter((r) => new Date(r.fire_at).getTime() > Date.now())
  if (addR.length) await supabase.from('event_reminders').insert(addR)
  const dropR = [...haveR].filter((m) => !d.reminders.includes(m))
  if (dropR.length) await supabase.from('event_reminders').delete().eq('event_id', id).in('minutes_before', dropR)
  return id as string
}

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function downloadIcs(e: EventRow) {
  const start = new Date(e.starts_at)
  const end = new Date(start.getTime() + 3 * 3600_000)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Libro de Sabores//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${e.id}@libro-de-sabores`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(e.title)}`, ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []), ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.title.replace(/[^\w\- ]+/g, '').trim() || 'evento'}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
