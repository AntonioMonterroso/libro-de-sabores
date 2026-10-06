import { Route, Routes } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Events } from '../pages/Events'
import { EventPage } from '../pages/EventPage'
import { EventForm } from '../pages/EventForm'

const who = (n: string) => ({ display_name: n, avatar_url: null })
const inv = (user_id: string, n: string, rsvp: string) => ({ user_id, rsvp, muted: false, profile: who(n) })
const start = new Date(Date.now() + 3 * 86400_000); start.setHours(19, 30, 0, 0)
const ev = {
  id: 'demo', creator_id: 'me', title: 'Cena de cumpleaños de la abuela', description: 'Llegamos a las 7. Cada quien trae un plato; el pastel va por cuenta de Marta.', location: 'Casa de la abuela Rosa', map_url: 'https://maps.example.com', cover_url: null,
  starts_at: start.toISOString(), creator: who('Tú'),
  event_invitees: [inv('me', 'Tú', 'yes'), inv('a', 'Tía Marta', 'yes'), inv('b', 'Tío Luis', 'maybe'), inv('c', 'Prima Ana', 'pending'), inv('d', 'Abuela Rosa', 'no')],
  event_dishes: [{ id: '1', recipe_id: 'r1', custom_name: null, assigned_to: 'a', sort: 0, recipe: { id: 'r1', title: 'Pan de masa madre', cover_url: null }, assignee: who('Tía Marta') }, { id: '2', recipe_id: null, custom_name: 'Ensalada de la casa', assigned_to: 'me', sort: 1, recipe: null, assignee: who('Tú') }],
  event_reminders: [{ id: 'x', minutes_before: 1440, sent_at: null }, { id: 'y', minutes_before: 60, sent_at: null }, { id: 'z', minutes_before: 0, sent_at: null }],
}

export default function DemoEvents({ view }: { view: 'list' | 'event' | 'form' }) {
  const qc = useQueryClient()
  qc.setQueryData(['events'], [ev])
  qc.setQueryData(['event', 'demo'], ev)
  qc.setQueryData(['profiles'], [{ id: 'a', display_name: 'Tía Marta', avatar_url: null, bio: null, branch: null }, { id: 'b', display_name: 'Tío Luis', avatar_url: null, bio: null, branch: null }])
  qc.setQueryData(['recipes'], [])
  const path = view === 'list' ? '/eventos' : view === 'event' ? '/evento/demo' : '/eventos/nuevo'
  return (
    <>
      <Routes location={{ pathname: path }}>
        <Route path="/eventos" element={<Events />} />
        <Route path="/eventos/nuevo" element={<EventForm />} />
        <Route path="/evento/:id" element={<EventPage />} />
      </Routes>
    </>
  )
}
