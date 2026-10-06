import { getToken } from './spotifyAuth'

type ErrorKind = 'unlinked' | 'forbidden' | 'no-device' | 'premium' | 'other'

export class SpotifyError extends Error {
  kind: ErrorKind
  constructor(kind: ErrorKind, msg: string = kind) {
    super(msg)
    this.kind = kind
  }
}

async function sp<T = unknown>(path: string, init: RequestInit = {}, attempt = 0): Promise<T | null> {
  const token = await getToken()
  if (!token) throw new SpotifyError('unlinked')
  const res = await fetch(`https://api.spotify.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } })
  if (res.status === 429 && attempt < 2) {
    // Respeta Retry-After con tope de 8 s y espera creciente
    const wait = Math.min(8, Number(res.headers.get('Retry-After')) || 2) * 1000 * (attempt + 1)
    await new Promise((r) => setTimeout(r, wait))
    return sp<T>(path, init, attempt + 1)
  }
  if (res.status === 204 || res.status === 202) return null
  if (res.status === 401) throw new SpotifyError('unlinked')
  if (res.status === 403) {
    const j = await res.json().catch(() => ({}))
    throw new SpotifyError(/premium/i.test(JSON.stringify(j)) ? 'premium' : 'forbidden')
  }
  if (res.status === 404) throw new SpotifyError('no-device')
  if (!res.ok) throw new SpotifyError('other', String(res.status))
  return (await res.json()) as T
}

export type Playlist = { id: string; uri: string; name: string; image: string | null; owner: string }
export type Device = { id: string; name: string; type: string; is_active: boolean; volume_percent: number | null }
export type Track = { name: string; artists: string; image: string | null }
export type Me = { id: string; display_name: string | null; product: string }

const toPlaylist = (p: any): Playlist => ({ id: p.id, uri: p.uri, name: p.name, image: p.images?.[0]?.url ?? null, owner: p.owner?.display_name ?? '' })

export const getMe = () => sp<Me>('/me')
export async function myPlaylists(): Promise<Playlist[]> {
  const j = await sp<any>('/me/playlists?limit=50')
  return (j?.items ?? []).filter(Boolean).map(toPlaylist)
}
export async function searchPlaylists(q: string): Promise<Playlist[]> {
  const j = await sp<any>(`/search?type=playlist&limit=10&q=${encodeURIComponent(q)}`)
  return (j?.playlists?.items ?? []).filter(Boolean).map(toPlaylist)
}
export async function devices(): Promise<Device[]> {
  const j = await sp<any>('/me/player/devices')
  return j?.devices ?? []
}
export async function playback(): Promise<{ playing: boolean; track: Track | null; deviceId: string | null; volume: number | null } | null> {
  const j = await sp<any>('/me/player')
  if (!j) return null
  const t = j.item
  return { playing: !!j.is_playing, deviceId: j.device?.id ?? null, volume: j.device?.volume_percent ?? null, track: t ? { name: t.name, artists: (t.artists ?? []).map((a: any) => a.name).join(', '), image: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? null } : null }
}
const dev = (id?: string | null) => (id ? `?device_id=${id}` : '')
export const playContext = (uri: string, deviceId?: string | null) => sp(`/me/player/play${dev(deviceId)}`, { method: 'PUT', body: JSON.stringify({ context_uri: uri }) })
export const resume = (deviceId?: string | null) => sp(`/me/player/play${dev(deviceId)}`, { method: 'PUT' })
export const pause = (deviceId?: string | null) => sp(`/me/player/pause${dev(deviceId)}`, { method: 'PUT' })
export const next = (deviceId?: string | null) => sp(`/me/player/next${dev(deviceId)}`, { method: 'POST' })
export const previous = (deviceId?: string | null) => sp(`/me/player/previous${dev(deviceId)}`, { method: 'POST' })
export const setVolume = (pct: number, deviceId?: string | null) => sp(`/me/player/volume?volume_percent=${Math.round(pct)}${deviceId ? `&device_id=${deviceId}` : ''}`, { method: 'PUT' })
export const transfer = (deviceId: string, play = true) => sp('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [deviceId], play }) })
