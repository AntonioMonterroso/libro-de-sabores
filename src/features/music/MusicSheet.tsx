import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, Music2, Pause, Play, Search, SkipBack, SkipForward, Volume2, X } from 'lucide-react'
import { useMusic } from './MusicProvider'
import { myPlaylists, searchPlaylists, type Playlist } from './spotifyApi'

const ease = [0.23, 1, 0.32, 1] as const

export function MusicButton({ onClick }: { onClick: () => void }) {
  const { playing } = useMusic()
  return (
    <button type="button" onClick={onClick} aria-label="Música" className="grid size-14 place-items-center rounded-2xl bg-pearl transition-transform duration-150 active:scale-[0.97]">
      {playing ? (
        <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="eq-bar w-[3px] rounded-full bg-sage-deep" style={{ animationDelay: `${i * 140}ms` }} />)}</span>
      ) : <Music2 size={22} />}
    </button>
  )
}

function PlaylistGrid({ items, onPlay }: { items: Playlist[]; onPlay: (p: Playlist) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((p) => (
        <li key={p.id}>
          <button type="button" onClick={() => onPlay(p)} className="w-full overflow-hidden rounded-[18px] border border-hairline bg-white/80 text-left transition-transform duration-150 active:scale-[0.97]">
            <div className="aspect-square bg-rose/40">{p.image && <img src={p.image} alt="" loading="lazy" className="size-full object-cover" />}</div>
            <p className="line-clamp-2 px-3 py-2 text-sm font-medium leading-tight">{p.name}</p>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function MusicSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMusic()
  const [mine, setMine] = useState<Playlist[] | null>(null)
  const [found, setFound] = useState<Playlist[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open || !m.linked || m.premium !== true || mine) return
    myPlaylists().then(setMine).catch(() => setMine([]))
  }, [open, m.linked, m.premium, mine])
  useEffect(() => { if (open && m.mode === 'remote' && m.linked) void m.refreshDevices() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return setFound(null)
    setFound(await searchPlaylists(q.trim()).catch(() => []))
  }

  const play = async (p: Playlist) => { await m.playPlaylist(p.uri) }
  const list = found ?? mine

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75]">
          <motion.div className="absolute inset-0 bg-cocoa/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
          <motion.div role="dialog" aria-label="Música" className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] max-w-lg flex-col rounded-t-[28px] bg-ivory px-5 pt-3 shadow-soft" initial={{ transform: 'translateY(100%)' }} animate={{ transform: 'translateY(0%)' }} exit={{ transform: 'translateY(100%)' }} transition={{ duration: 0.38, ease }}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-hairline" />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl font-medium">Ambiente</h2>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-11 place-items-center rounded-full bg-pearl"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
              {m.flash === 'denied' && !m.linked && <p role="status" className="mb-3 rounded-2xl bg-rose px-4 py-3 text-sm">No se completó la conexión con Spotify.</p>}
              {m.message && <p role="alert" className="mb-3 rounded-2xl bg-rose px-4 py-3 text-sm">{m.message}</p>}

              {!m.configured ? (
                <p className="rounded-2xl bg-pearl px-4 py-4 text-cocoa-soft">La música de Spotify aún no está configurada en esta app.</p>
              ) : !m.linked ? (
                <div className="grid gap-4 text-center">
                  <p className="text-cocoa-soft">Vincula tu cuenta de Spotify Premium para elegir tus playlists y controlar la música sin salir de la receta.</p>
                  <button type="button" onClick={() => void m.link()} className="min-h-14 rounded-2xl bg-sage-deep text-lg font-medium text-white transition-transform duration-150 active:scale-[0.97]">Vincular Spotify</button>
                  <p className="text-xs text-cocoa-soft">Solo pueden vincularse las cuentas que el administrador autorizó.</p>
                </div>
              ) : m.premium === false ? (
                <p className="rounded-2xl bg-pearl px-4 py-4 text-cocoa-soft">Esta cuenta de Spotify no es Premium, y Spotify solo permite controlar la reproducción desde otras apps con Premium.</p>
              ) : (
                <div className="grid gap-5">
                  {m.track && (
                    <div className="flex items-center gap-4 rounded-[22px] border border-hairline bg-white/80 p-3">
                      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-rose/40">{m.track.image && <img src={m.track.image} alt="" className="size-full object-cover" />}</div>
                      <div className="min-w-0 flex-1 leading-tight"><p className="truncate font-medium">{m.track.name}</p><p className="truncate text-sm text-cocoa-soft">{m.track.artists}</p></div>
                      <div className="flex items-center">
                        <button type="button" aria-label="Anterior" onClick={() => void m.skip(-1)} className="grid size-11 place-items-center rounded-full"><SkipBack size={20} /></button>
                        <button type="button" aria-label={m.playing ? 'Pausar' : 'Reproducir'} onClick={() => void m.toggle()} className="grid size-12 place-items-center rounded-full bg-sage-deep text-white">{m.playing ? <Pause size={20} /> : <Play size={20} />}</button>
                        <button type="button" aria-label="Siguiente" onClick={() => void m.skip(1)} className="grid size-11 place-items-center rounded-full"><SkipForward size={20} /></button>
                      </div>
                    </div>
                  )}
                  {m.mode === 'web' && (
                    <label className="flex items-center gap-3 px-1 text-cocoa-soft"><Volume2 size={18} /><input type="range" min={0} max={100} value={m.volume} onChange={(e) => void m.changeVolume(Number(e.target.value))} aria-label="Volumen" className="h-2 flex-1 accent-[#4F6B54]" /></label>
                  )}
                  {m.mode === 'remote' && (
                    <div className="rounded-2xl bg-pearl px-4 py-3 text-sm text-cocoa-soft">
                      {m.devices.length === 0 ? 'Abre la app de Spotify en tu teléfono, pon una canción un momento y vuelve aquí. Así aparece como dispositivo.' : (
                        <label className="flex items-center justify-between gap-3">Suena en
                          <select value={m.deviceId ?? ''} onChange={(e) => m.chooseDevice(e.target.value)} className="rounded-lg bg-transparent text-right font-medium text-cocoa outline-none">{m.devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                        </label>
                      )}
                    </div>
                  )}
                  <form onSubmit={search} className="flex items-center gap-2 rounded-2xl bg-pearl px-3">
                    <Search size={17} className="text-cocoa-soft" aria-hidden="true" />
                    <input type="search" value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) setFound(null) }} placeholder="Buscar una playlist" aria-label="Buscar una playlist" className="min-h-12 w-full bg-transparent outline-none placeholder:text-cocoa-soft/60" />
                  </form>
                  {list === null ? <p className="text-cocoa-soft">Cargando tus playlists…</p> : list.length === 0 ? <p className="text-cocoa-soft">{found ? 'No encontré playlists con ese nombre.' : 'Aún no tienes playlists en tu cuenta.'}</p> : (
                    <div><h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-cocoa-soft">{found ? 'Resultados' : 'Tus playlists'}</h3><PlaylistGrid items={list} onPlay={(p) => void play(p)} /></div>
                  )}
                  <div className="flex items-center justify-between pt-1 text-xs text-cocoa-soft">
                    <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">Música de Spotify <ExternalLink size={12} /></a>
                    <button type="button" onClick={m.unlinkAccount} className="min-h-9 px-2 text-[#9B3B3B]">Desvincular</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
