import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getPlatform } from '../../lib/platform'
import { onAlarm } from '../timers/alarm'
import * as api from './spotifyApi'
import { SPOTIFY_CLIENT_ID, isLinked, startLogin, takeFlash, unlink } from './spotifyAuth'

type MusicState = {
  configured: boolean
  linked: boolean
  premium: boolean | null
  /** 'web': el navegador es el reproductor (escritorio). 'remote': controla la app de Spotify del teléfono. */
  mode: 'web' | 'remote'
  ready: boolean
  playing: boolean
  track: api.Track | null
  volume: number
  devices: api.Device[]
  deviceId: string | null
  message: string | null
  flash: string | null
}

type Ctx = MusicState & {
  link: () => Promise<void>
  unlinkAccount: () => void
  playPlaylist: (uri: string) => Promise<void>
  toggle: () => Promise<void>
  skip: (dir: 1 | -1) => Promise<void>
  changeVolume: (pct: number) => Promise<void>
  refreshDevices: () => Promise<void>
  chooseDevice: (id: string) => void
  clearMessage: () => void
}

const C = createContext<Ctx | null>(null)
const msgFor = (e: unknown, mode: 'web' | 'remote') => {
  const k = e instanceof api.SpotifyError ? e.kind : 'other'
  if (k === 'no-device') return mode === 'remote' ? 'Abre la app de Spotify en tu teléfono, pon cualquier canción un momento y vuelve aquí.' : 'El reproductor aún no está listo. Espera un segundo e inténtalo de nuevo.'
  if (k === 'premium') return 'Spotify solo permite controlar la música con una cuenta Premium.'
  if (k === 'forbidden') return 'Tu cuenta de Spotify aún no está autorizada para esta app. Pídele al administrador que te agregue.'
  if (k === 'unlinked') return 'Se cerró la conexión con Spotify. Vincúlala de nuevo.'
  return 'Spotify no respondió. Inténtalo de nuevo.'
}

declare global {
  interface Window {
    Spotify?: { Player: new (o: unknown) => any }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const mode: 'web' | 'remote' = getPlatform() === 'desktop' ? 'web' : 'remote'
  const [linked, setLinked] = useState(isLinked())
  const [premium, setPremium] = useState<boolean | null>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [track, setTrack] = useState<api.Track | null>(null)
  const [volume, setVol] = useState(60)
  const [devs, setDevs] = useState<api.Device[]>([])
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [flash] = useState<string | null>(() => takeFlash())
  const player = useRef<any>(null)
  const volRef = useRef(60)
  const duck = useRef<number | null>(null)

  const fail = useCallback((e: unknown) => {
    if (e instanceof api.SpotifyError && e.kind === 'unlinked') { unlink(); setLinked(false) }
    setMessage(msgFor(e, mode))
  }, [mode])

  // Al vincular: comprobar cuenta Premium
  useEffect(() => {
    if (!linked) { setPremium(null); return }
    api.getMe().then((me) => setPremium(me?.product === 'premium')).catch(fail)
  }, [linked, fail])

  // Escritorio: el navegador se vuelve un reproductor de Spotify
  useEffect(() => {
    if (!linked || mode !== 'web' || premium !== true) return
    let cancelled = false
    const boot = () => {
      if (cancelled || !window.Spotify || player.current) return
      const p = new window.Spotify.Player({ name: 'Libro de Sabores', volume: 0.6, getOAuthToken: (cb: (t: string) => void) => { void import('./spotifyAuth').then((m) => m.getToken()).then((t) => t && cb(t)) } })
      p.addListener('ready', ({ device_id }: { device_id: string }) => { setDeviceId(device_id); setReady(true) })
      p.addListener('not_ready', () => setReady(false))
      p.addListener('account_error', () => setMessage(msgFor(new api.SpotifyError('premium'), mode)))
      p.addListener('authentication_error', () => setMessage(msgFor(new api.SpotifyError('unlinked'), mode)))
      p.addListener('player_state_changed', (s: any) => {
        if (!s) return setPlaying(false)
        setPlaying(!s.paused)
        const t = s.track_window?.current_track
        if (t) setTrack({ name: t.name, artists: (t.artists ?? []).map((a: any) => a.name).join(', '), image: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? null })
      })
      void p.connect()
      player.current = p
    }
    if (window.Spotify) boot()
    else {
      window.onSpotifyWebPlaybackSDKReady = boot
      if (!document.getElementById('spotify-sdk')) {
        const s = document.createElement('script')
        s.id = 'spotify-sdk'
        s.src = 'https://sdk.scdn.co/spotify-player.js'
        s.async = true
        document.body.appendChild(s)
      }
    }
    return () => { cancelled = true }
  }, [linked, mode, premium])

  const refreshDevices = useCallback(async () => {
    try {
      const list = await api.devices()
      setDevs(list)
      setDeviceId((cur) => cur && list.some((d) => d.id === cur) ? cur : (list.find((d) => d.is_active) ?? list.find((d) => d.type === 'Smartphone') ?? list[0])?.id ?? null)
      setReady(list.length > 0)
    } catch (e) { fail(e) }
  }, [fail])

  // Móvil: se consulta la app de Spotify mientras suena o se ve el panel
  useEffect(() => {
    if (!linked || mode !== 'remote' || premium !== true) return
    void refreshDevices()
    const id = window.setInterval(async () => {
      try {
        const pb = await api.playback()
        if (!pb) return setPlaying(false)
        setPlaying(pb.playing)
        setTrack(pb.track)
        if (pb.volume != null) { setVol(pb.volume); volRef.current = pb.volume }
      } catch { /* se reintenta */ }
    }, 4000)
    return () => clearInterval(id)
  }, [linked, mode, premium, refreshDevices])

  const target = mode === 'web' ? deviceId : deviceId

  const playPlaylist = useCallback(async (uri: string) => {
    setMessage(null)
    try {
      if (mode === 'web') { await player.current?.activateElement?.(); if (deviceId) await api.transfer(deviceId, false).catch(() => null) }
      await api.playContext(uri, target)
      setPlaying(true)
    } catch (e) { fail(e) }
  }, [mode, deviceId, target, fail])

  const toggle = useCallback(async () => {
    try {
      if (mode === 'web' && player.current) { await player.current.togglePlay(); return }
      if (playing) { await api.pause(target); setPlaying(false) } else { await api.resume(target); setPlaying(true) }
    } catch (e) { fail(e) }
  }, [mode, playing, target, fail])

  const skip = useCallback(async (dir: 1 | -1) => {
    try { await (dir === 1 ? api.next(target) : api.previous(target)) } catch (e) { fail(e) }
  }, [target, fail])

  const changeVolume = useCallback(async (pct: number) => {
    setVol(pct); volRef.current = pct
    try { if (mode === 'web' && player.current) await player.current.setVolume(pct / 100); else await api.setVolume(pct, target) } catch { /* algunos teléfonos no permiten cambiar el volumen */ }
  }, [mode, target])

  // La música baja sola cuando suena una alarma y vuelve después
  useEffect(() => onAlarm((ringing) => {
    if (!linked) return
    const apply = (pct: number) => { if (mode === 'web' && player.current) void player.current.setVolume(pct / 100); else void api.setVolume(pct, deviceId).catch(() => null) }
    if (ringing) { duck.current = volRef.current; apply(Math.min(volRef.current, 15)) }
    else if (duck.current != null) { apply(duck.current); duck.current = null }
  }), [linked, mode, deviceId])

  const value = useMemo<Ctx>(() => ({
    configured: !!SPOTIFY_CLIENT_ID, linked, premium, mode, ready, playing, track, volume, devices: devs, deviceId, message, flash,
    link: async () => { try { await startLogin() } catch { setMessage('Spotify aún no está configurado en esta app.') } },
    unlinkAccount: () => { unlink(); player.current?.disconnect(); player.current = null; setLinked(false); setReady(false); setPlaying(false); setTrack(null); setPremium(null) },
    playPlaylist, toggle, skip, changeVolume, refreshDevices, chooseDevice: setDeviceId, clearMessage: () => setMessage(null),
  }), [linked, premium, mode, ready, playing, track, volume, devs, deviceId, message, flash, playPlaylist, toggle, skip, changeVolume, refreshDevices])

  return <C.Provider value={value}>{children}</C.Provider>
}

export function useMusic() {
  const v = useContext(C)
  if (!v) throw new Error('useMusic fuera de MusicProvider')
  return v
}
