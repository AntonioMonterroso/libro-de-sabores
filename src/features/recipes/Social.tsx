import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, ChefHat as HatIcon, Send, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { supabase } from '../../lib/supabase'
import { compressImage } from '../../lib/image-compress'
import { ago } from '../../lib/time'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../../components/ui/Avatar'
import { uploadPhoto, useSignedUrl } from './api'

type Who = { display_name: string; avatar_url: string | null } | null
type Log = { id: string; user_id: string; photo_url: string | null; note: string | null; created_at: string; user: Who }
type Comment = { id: string; user_id: string; body: string; created_at: string; user: Who }

const ease = [0.23, 1, 0.32, 1] as const

function useLogs(recipeId: string) {
  return useQuery({
    queryKey: ['cook-logs', recipeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('cook_logs').select('id,user_id,photo_url,note,created_at,user:profiles!user_id(display_name,avatar_url)').eq('recipe_id', recipeId).order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Log[]
    },
  })
}

function LogPhoto({ path }: { path: string }) {
  const url = useSignedUrl(path)
  return url ? <img src={url} alt="Foto de quien la cocinó" loading="lazy" className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover" /> : <div className="mt-3 aspect-[4/3] w-full rounded-2xl bg-rose/40" />
}

export function CookLogs({ recipeId }: { recipeId: string }) {
  const { session, profile } = useAuth()
  const qc = useQueryClient()
  const { data: logs = [] } = useLogs(recipeId)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const save = useMutation({
    mutationFn: async () => {
      let path: string | null = null
      if (photo) path = await uploadPhoto(await compressImage(photo), session!.user.id)
      const { error } = await supabase.from('cook_logs').insert({ recipe_id: recipeId, user_id: session!.user.id, note: note.trim() || null, photo_url: path })
      if (error) throw error
    },
    onSuccess: () => { setOpen(false); setNote(''); setPhoto(null); setPreview(null); void qc.invalidateQueries({ queryKey: ['cook-logs', recipeId] }) },
    onError: () => setErr('No se pudo guardar. Inténtalo de nuevo.'),
  })
  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from('cook_logs').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cook-logs', recipeId] }),
  })

  return (
    <section className="mt-14 print:hidden">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-display text-4xl font-medium">La han cocinado</h2>
        <span className="h-px flex-1 bg-champagne/50" />
      </div>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-champagne bg-rose/50 text-lg font-medium transition-transform duration-150 active:scale-[0.98]">
        <HatIcon size={20} />¡Yo la hice!
      </button>
      {logs.length > 0 && <p className="mt-3 text-sm text-cocoa-soft">{logs.length === 1 ? '1 vez cocinada' : `${logs.length} veces cocinada`} por la familia</p>}
      <ul className="mt-4 grid gap-4">
        {logs.map((l) => (
          <li key={l.id} className="rounded-[22px] border border-hairline bg-white/75 p-4">
            <div className="flex items-center gap-3">
              <Avatar path={l.user?.avatar_url} name={l.user?.display_name} size={36} />
              <div className="min-w-0 flex-1 leading-tight"><p className="font-medium">{l.user?.display_name}</p><p className="text-xs text-cocoa-soft">{ago(l.created_at)}</p></div>
              {(l.user_id === session?.user.id || profile?.role === 'admin') && <button type="button" aria-label="Quitar" onClick={() => remove.mutate(l.id)} className="grid size-11 place-items-center rounded-full text-cocoa-soft hover:bg-pearl"><Trash2 size={16} /></button>}
            </div>
            {l.note && <p className="mt-3 text-[17px]">{l.note}</p>}
            {l.photo_url && <LogPhoto path={l.photo_url} />}
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70]">
            <motion.div className="absolute inset-0 bg-cocoa/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOpen(false)} />
            <motion.form
              onSubmit={(e: FormEvent) => { e.preventDefault(); setErr(''); save.mutate() }}
              role="dialog"
              aria-label="Yo la hice"
              className="absolute inset-x-0 bottom-0 mx-auto grid max-w-lg gap-4 rounded-t-[28px] bg-ivory px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-soft"
              initial={{ transform: 'translateY(100%)' }}
              animate={{ transform: 'translateY(0%)' }}
              exit={{ transform: 'translateY(100%)' }}
              transition={{ duration: 0.38, ease }}
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-hairline" />
              <div className="flex items-center justify-between"><h3 className="font-display text-3xl font-medium">¡Qué rico!</h3><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full bg-pearl"><X size={18} /></button></div>
              <label className="grid aspect-[16/9] cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-champagne bg-rose/30">
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)) } }} />
                {preview ? <img src={preview} alt="Tu plato" className="size-full object-cover" /> : <span className="grid justify-items-center gap-1 text-cocoa-soft"><Camera size={24} />Foto de tu plato (opcional)</span>}
              </label>
              <textarea aria-label="Cómo te quedó" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="Cómo te quedó, qué le cambiaste…" className="w-full resize-none rounded-2xl border border-hairline bg-white/80 px-4 py-3 outline-none focus:border-champagne" />
              {err && <p role="alert" className="text-sm text-[#9B3B3B]">{err}</p>}
              <button disabled={save.isPending} className="min-h-14 rounded-2xl bg-sage-deep text-lg font-medium text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-50">{save.isPending ? 'Guardando…' : 'Compartir con la familia'}</button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}

export function Comments({ recipeId }: { recipeId: string }) {
  const { session, profile } = useAuth()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const { data: list = [] } = useQuery({
    queryKey: ['comments', recipeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('comments').select('id,user_id,body,created_at,user:profiles!user_id(display_name,avatar_url)').eq('recipe_id', recipeId).order('created_at')
      if (error) throw error
      return data as unknown as Comment[]
    },
  })
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('comments').insert({ recipe_id: recipeId, user_id: session!.user.id, body: text.trim() }); if (error) throw error },
    onSuccess: () => { setText(''); void qc.invalidateQueries({ queryKey: ['comments', recipeId] }) },
  })
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from('comments').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', recipeId] }),
  })

  return (
    <section className="mt-14 print:hidden">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-display text-4xl font-medium">Comentarios</h2>
        <span className="h-px flex-1 bg-champagne/50" />
      </div>
      {list.length === 0 && <p className="mb-4 text-cocoa-soft">Sé quien rompa el hielo: ¿algún truco, un cambio, un recuerdo?</p>}
      <ul className="grid gap-4">
        {list.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar path={c.user?.avatar_url} name={c.user?.display_name} size={36} />
            <div className="min-w-0 flex-1 rounded-[20px] bg-white/75 px-4 py-3 ring-1 ring-hairline">
              <p className="text-sm"><span className="font-medium">{c.user?.display_name}</span><span className="text-cocoa-soft"> · {ago(c.created_at)}</span></p>
              <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
            </div>
            {(c.user_id === session?.user.id || profile?.role === 'admin') && <button type="button" aria-label="Borrar comentario" onClick={() => del.mutate(c.id)} className="grid size-11 shrink-0 place-items-center rounded-full text-cocoa-soft hover:bg-pearl"><Trash2 size={15} /></button>}
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate() }} className="mt-5 flex items-end gap-2">
        <textarea aria-label="Escribe un comentario" value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={1000} placeholder="Escribe un comentario…" className="min-h-12 flex-1 resize-none rounded-2xl border border-hairline bg-white/80 px-4 py-3 outline-none focus:border-champagne" />
        <button disabled={!text.trim() || add.isPending} aria-label="Enviar" className="grid size-12 shrink-0 place-items-center rounded-full bg-sage-deep text-white transition-transform duration-150 active:scale-[0.94] disabled:opacity-40"><Send size={18} /></button>
      </form>
    </section>
  )
}
