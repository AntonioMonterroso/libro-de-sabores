// Enlace con Spotify mediante OAuth PKCE: funciona en GitHub Pages, sin servidor y sin secretos.
export const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined

const SCOPES = [
  'streaming', 'user-read-email', 'user-read-private',
  'user-read-playback-state', 'user-modify-playback-state',
  'playlist-read-private', 'playlist-read-collaborative',
].join(' ')

const K = { tokens: 'libro:spotify:tokens', verifier: 'libro:spotify:verifier', state: 'libro:spotify:state', ret: 'libro:spotify:return', flash: 'libro:spotify:flash' }

type Tokens = { access_token: string; refresh_token: string; expires_at: number }

export const redirectUri = () => location.origin + import.meta.env.BASE_URL

const b64url = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const random = (n: number) => b64url(crypto.getRandomValues(new Uint8Array(n)))

export function readTokens(): Tokens | null {
  try { return JSON.parse(localStorage.getItem(K.tokens) ?? 'null') } catch { return null }
}
export const isLinked = () => !!readTokens()
export function unlink() { localStorage.removeItem(K.tokens) }

export async function startLogin() {
  if (!SPOTIFY_CLIENT_ID) throw new Error('Spotify no está configurado')
  const verifier = random(64)
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const state = random(16)
  localStorage.setItem(K.verifier, verifier)
  localStorage.setItem(K.state, state)
  localStorage.setItem(K.ret, location.hash || '#/')
  const q = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: redirectUri(), scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge, state })
  location.assign(`https://accounts.spotify.com/authorize?${q}`)
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens | null> {
  const res = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID!, ...body }) })
  if (!res.ok) return null
  const j = await res.json()
  const prev = readTokens()
  const t: Tokens = { access_token: j.access_token, refresh_token: j.refresh_token ?? prev?.refresh_token ?? '', expires_at: Date.now() + j.expires_in * 1000 }
  localStorage.setItem(K.tokens, JSON.stringify(t))
  return t
}

/** Se ejecuta al arrancar: si volvemos de Spotify con ?code=, canjea el código y limpia la URL. */
export async function handleCallback() {
  const p = new URLSearchParams(location.search)
  if (!p.has('code') && !p.has('error')) return
  const base = location.origin + location.pathname
  const ret = localStorage.getItem(K.ret) ?? '#/'
  const verifier = localStorage.getItem(K.verifier)
  const okState = p.get('state') === localStorage.getItem(K.state)
  history.replaceState(null, '', base + ret)
  ;[K.verifier, K.state, K.ret].forEach((k) => localStorage.removeItem(k))
  if (p.get('error') || !okState || !verifier || !SPOTIFY_CLIENT_ID) return sessionStorage.setItem(K.flash, 'denied')
  const t = await tokenRequest({ grant_type: 'authorization_code', code: p.get('code')!, redirect_uri: redirectUri(), code_verifier: verifier })
  sessionStorage.setItem(K.flash, t ? 'linked' : 'error')
}

export function takeFlash(): string | null {
  const v = sessionStorage.getItem(K.flash)
  sessionStorage.removeItem(K.flash)
  return v
}

export async function getToken(): Promise<string | null> {
  const t = readTokens()
  if (!t) return null
  if (t.expires_at - 60_000 > Date.now()) return t.access_token
  if (!t.refresh_token) { unlink(); return null }
  const next = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token })
  if (!next) { unlink(); return null }
  return next.access_token
}
