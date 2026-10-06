import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertTriangle, Check, ChevronLeft, Clock, Droplets, Flame, Heart, Lightbulb, Pencil, Printer, Repeat, Share2, Thermometer, Timer, Wrench } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { ChefHat } from '../../components/brand/ChefHat'
import { Avatar } from '../../components/ui/Avatar'
import { Stepper } from '../../components/ui/layout'
import { displayAmount, scaleAmount } from '../../lib/scale'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useCategories, useSignedUrl } from './api'
import { useFavorite } from './favorites'
import { Comments, CookLogs } from './Social'
import { KIND_LABEL, type IngredientKind, type ScaleMode } from './types'

const ease = [0.23, 1, 0.32, 1] as const

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, transform: 'translateY(16px)' }} whileInView={{ opacity: 1, transform: 'translateY(0px)' }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, ease }}>
      {children}
    </motion.div>
  )
}

function Heading({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-4xl font-medium">{children}</h2>
        <span className="h-px flex-1 bg-champagne/50" />
      </div>
      {note && <p className="mt-1 text-sm text-cocoa-soft">{note}</p>}
    </div>
  )
}

const TIP_ICON = { consejo: Lightbulb, truco: Lightbulb, sustitucion: Repeat, advertencia: AlertTriangle } as const
const TIP_NAME = { consejo: 'Consejo', truco: 'Truco', sustitucion: 'Sustitución', advertencia: 'Cuidado' } as const

export function RecipeView({ r }: { r: any }) {
  const nav = useNavigate()
  const { session, profile } = useAuth()
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const img = useSignedUrl(r.cover_url)
  const { data: cats = [] } = useCategories()
  const fav = useFavorite(r.id)
  const base = Number(r.servings_base)
  const [servings, setServings] = useState(base)
  const factor = servings / base

  const storeKey = `libro:checks:${r.id}`
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storeKey) ?? '{}') } catch { return {} }
  })
  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(checked)) } catch { /* sin almacenamiento */ } }, [checked, storeKey])
  const flip = (k: string) => setChecked((c) => ({ ...c, [k]: !c[k] }))

  const groups = useMemo(() => [...r.ingredient_groups].sort((a: any, b: any) => a.sort - b.sort), [r])
  const all: any[] = useMemo(() => groups.flatMap((g: any) => [...g.ingredients].sort((a: any, b: any) => a.sort - b.sort).map((i: any) => ({ ...i, group: g.name }))), [groups])
  const steps = useMemo(() => [...r.steps].sort((a: any, b: any) => a.position - b.position), [r])
  const seasonings = all.filter((i) => i.kind === 'seasoning')
  const liquids = all.filter((i) => i.kind === 'liquid')
  const garnish = all.filter((i) => i.kind === 'garnish')
  const mine = r.author?.id === session?.user.id
  const myCats = cats.filter((c) => (r.recipe_categories ?? []).some((rc: any) => rc.category_id === c.id))
  const total = (r.prep_min ?? 0) + (r.cook_min ?? 0) + (r.rest_min ?? 0)
  const amount = (i: any) => displayAmount(scaleAmount(i.quantity, factor, i.scale_mode as ScaleMode), i.unit, i.scale_mode as ScaleMode)

  async function remove() {
    const { error } = await supabase.from('recipes').delete().eq('id', r.id)
    if (error) return
    await qc.invalidateQueries({ queryKey: ['recipes'] })
    nav('/', { replace: true })
  }

  async function share() {
    const url = location.href
    try {
      if (navigator.share) await navigator.share({ title: r.title, text: `Mira esta receta: ${r.title}`, url })
      else window.open(`https://wa.me/?text=${encodeURIComponent(`${r.title}: ${url}`)}`, '_blank', 'noopener')
    } catch { /* cancelado */ }
  }

  const ingredientRow = (i: any) => {
    const done = checked[i.id]
    return (
      <li key={i.id}>
        <button type="button" onClick={() => flip(i.id)} aria-pressed={!!done} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-opacity duration-200">
          <span className={`grid size-6 shrink-0 place-items-center rounded-full border transition-[background-color,border-color] duration-200 ${done ? 'border-sage-deep bg-sage-deep text-white' : 'border-champagne/70'}`}>{done && <Check size={14} strokeWidth={3} />}</span>
          <span className={`flex-1 ${done ? 'text-cocoa-soft line-through decoration-champagne/60' : ''}`}>
            {i.name}
            {i.prep && <span className="text-cocoa-soft">, {i.prep}</span>}
            {i.optional && <span className="text-cocoa-soft"> (opcional)</span>}
          </span>
          <span className="shrink-0 text-[15px] font-medium tabular-nums">{amount(i)}</span>
        </button>
      </li>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl pb-28">
      <div className="relative">
        <div className="aspect-[4/3] w-full overflow-hidden bg-rose/50 sm:mt-4 sm:rounded-[32px] sm:aspect-[16/10]">
          {img && <img src={img} alt={r.title} className="size-full object-cover" />}
        </div>
        <button type="button" onClick={() => nav('/')} aria-label="Volver" className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-ivory/85 shadow-soft backdrop-blur-md transition-transform duration-150 active:scale-[0.94]"><ChevronLeft size={22} /></button>
        <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex gap-2">
          <button type="button" onClick={() => window.print()} aria-label="Imprimir" className="grid size-11 place-items-center rounded-full bg-ivory/85 shadow-soft backdrop-blur-md transition-transform duration-150 active:scale-[0.94] print:hidden"><Printer size={19} /></button>
          <button type="button" onClick={share} aria-label="Compartir" className="grid size-11 place-items-center rounded-full bg-ivory/85 shadow-soft backdrop-blur-md transition-transform duration-150 active:scale-[0.94]"><Share2 size={19} /></button>
          {mine && <Link to={`/editar/${r.id}`} aria-label="Editar" className="grid size-11 place-items-center rounded-full bg-ivory/85 shadow-soft backdrop-blur-md transition-transform duration-150 active:scale-[0.94]"><Pencil size={19} /></Link>}
        </div>
      </div>

      <div className="px-5">
        <motion.div className="-mt-8 rounded-[28px] border border-hairline bg-ivory p-6 shadow-soft sm:-mt-10" initial={{ opacity: 0, transform: 'translateY(20px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: 0.7, ease }}>
          {r.status === 'draft' && <span className="mb-3 inline-block rounded-full bg-pearl px-3 py-1 text-xs text-cocoa-soft">Borrador, solo tú lo ves</span>}
          <h1 className="font-display text-[2.75rem] font-medium leading-[1.02] sm:text-6xl">{r.title}</h1>
          {r.subtitle && <p className="mt-3 text-lg text-cocoa-soft">{r.subtitle}</p>}
          <div className="mt-5 flex items-center gap-3">
            <Avatar path={r.author?.avatar_url} name={r.author?.display_name} size={40} />
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-wider text-cocoa-soft">Receta de</p>
              <p className="font-medium">{r.author?.display_name}</p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 divide-x divide-hairline rounded-2xl bg-pearl/70 py-3 text-center">
            <div className="px-2"><dt className="flex items-center justify-center gap-1 text-xs text-cocoa-soft"><Clock size={13} />Tiempo</dt><dd className="mt-0.5 font-medium">{total ? `${total} min` : '—'}</dd></div>
            <div className="px-2"><dt className="flex items-center justify-center gap-1 text-xs text-cocoa-soft"><Flame size={13} />Dificultad</dt><dd className="mt-0.5 font-medium">{['Fácil', 'Media', 'De chef'][r.difficulty - 1]}</dd></div>
            <div className="px-2"><dt className="text-xs text-cocoa-soft">Rinde</dt><dd className="mt-0.5 font-medium">{base} {r.servings_label}</dd></div>
          </dl>
          {(r.prep_min || r.cook_min || r.rest_min) && (
            <p className="mt-3 text-center text-sm text-cocoa-soft">
              {[r.prep_min && `Preparación ${r.prep_min} min`, r.cook_min && `Cocción ${r.cook_min} min`, r.rest_min && `Reposo ${r.rest_min} min`].filter(Boolean).join(' · ')}
            </p>
          )}
          {myCats.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{myCats.map((c) => <span key={c.id} className="rounded-full px-3 py-1 text-sm" style={{ backgroundColor: c.color }}>{c.name}</span>)}</div>}
        </motion.div>

        {(r.story || r.lineage) && (
          <Reveal className="mt-10">
            {r.story && <p className="border-l-2 border-champagne pl-5 font-display text-2xl italic leading-relaxed text-cocoa/85">{r.story}</p>}
            {r.lineage && <p className="mt-3 pl-5 font-hand text-2xl text-champagne">{r.lineage}</p>}
          </Reveal>
        )}

        <div className="sticky top-0 z-10 -mx-5 mt-10 print:static border-b border-hairline/70 bg-ivory/90 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-cocoa-soft">Cocinar para</p>
              <p className="text-sm text-cocoa-soft">{servings !== base ? `Ajustado desde ${base}` : 'Receta original'}</p>
            </div>
            <div className="flex items-center gap-3">
              {servings !== base && <button type="button" onClick={() => setServings(base)} className="min-h-11 px-2 text-sm font-medium text-sage-deep">Restablecer</button>}
              <Stepper label="Porciones" value={servings} onChange={setServings} max={500} />
              <span className="hidden text-sm text-cocoa-soft sm:inline">{r.servings_label}</span>
            </div>
          </div>
        </div>

        <Reveal className="mt-10">
          <Heading note="Toca para ir marcando lo que ya tienes listo.">Mise en place</Heading>
          {groups.map((g: any) => {
            const items = all.filter((i) => i.group_id === g.id && ['ingredient', 'aromatic', 'fat'].includes(i.kind))
            if (!items.length) return null
            return (
              <div key={g.id} className="mb-5">
                {g.name && <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.2em] text-champagne">{g.name}</h3>}
                <ul className="divide-y divide-hairline rounded-[22px] border border-hairline bg-white/75 shadow-soft">{items.map(ingredientRow)}</ul>
              </div>
            )
          })}
        </Reveal>

        {liquids.length > 0 && (
          <Reveal className="mt-8">
            <div className="rounded-[24px] bg-mist/70 p-5">
              <div className="mb-3 flex items-center gap-2 font-medium"><Droplets size={18} />Líquidos</div>
              <ul className="grid gap-2">
                {liquids.map((i) => (
                  <li key={i.id}><button type="button" onClick={() => flip(i.id)} aria-pressed={!!checked[i.id]} className="flex w-full items-baseline justify-between gap-3 text-left">
                    <span className={checked[i.id] ? 'text-cocoa-soft line-through' : ''}>{i.name}{i.prep ? `, ${i.prep}` : ''}</span>
                    <span className="font-display text-3xl tabular-nums">{amount(i)}</span>
                  </button></li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        {seasonings.length > 0 && (
          <Reveal className="mt-8">
            <Heading note="Todo lo que le da carácter al plato.">Charola de condimentos</Heading>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {seasonings.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => flip(i.id)} aria-pressed={!!checked[i.id]} className={`relative h-full w-full overflow-hidden rounded-[20px] border border-sage-deep/15 bg-sage/60 p-4 text-left transition-[opacity,transform] duration-200 active:scale-[0.97] ${checked[i.id] ? 'opacity-50' : ''}`}>
                    <span className="absolute inset-x-0 top-0 h-1.5 bg-champagne/70" aria-hidden="true" />
                    <span className="mt-1 block font-display text-2xl leading-tight tabular-nums">{amount(i)}</span>
                    <span className="mt-1 block text-[15px]">{i.name}</span>
                    {i.prep && <span className="block text-xs text-cocoa-soft">{i.prep}</span>}
                    {checked[i.id] && <Check size={16} className="absolute right-3 top-4 text-sage-deep" />}
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {garnish.length > 0 && (
          <Reveal className="mt-8">
            <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.2em] text-champagne">{KIND_LABEL.garnish as IngredientKind}</h3>
            <ul className="divide-y divide-hairline rounded-[22px] border border-hairline bg-white/75">{garnish.map(ingredientRow)}</ul>
          </Reveal>
        )}

        {(r.equipment?.length > 0 || r.allergens?.length > 0) && (
          <Reveal className="mt-10 grid gap-5">
            {r.equipment?.length > 0 && <div><p className="mb-2 flex items-center gap-2 text-sm font-medium"><Wrench size={15} />Necesitarás</p><div className="flex flex-wrap gap-2">{r.equipment.map((e: string) => <span key={e} className="rounded-full border border-hairline bg-white/70 px-3 py-1 text-sm">{e}</span>)}</div></div>}
            {r.allergens?.length > 0 && <div><p className="mb-2 flex items-center gap-2 text-sm font-medium"><AlertTriangle size={15} />Contiene</p><div className="flex flex-wrap gap-2">{r.allergens.map((a: string) => <span key={a} className="rounded-full bg-rose px-3 py-1 text-sm">{a}</span>)}</div></div>}
          </Reveal>
        )}

        <Reveal className="mt-14">
          <Heading note="Toca un paso cuando lo termines.">Preparación</Heading>
        </Reveal>
        <ol className="relative grid gap-6">
          <span className="absolute bottom-6 left-[19px] top-6 w-px bg-champagne/40" aria-hidden="true" />
          {steps.map((s: any, i: number) => {
            const k = `step-${s.id}`
            const done = checked[k]
            return (
              <li key={s.id}>
                <Reveal>
                  <button type="button" onClick={() => flip(k)} aria-pressed={!!done} className="relative flex w-full gap-4 text-left">
                    <span className={`z-[1] grid size-10 shrink-0 place-items-center rounded-full font-display text-xl transition-[background-color,color] duration-300 ${done ? 'bg-sage-deep text-white' : 'bg-rose text-cocoa'}`}>{done ? <Check size={18} strokeWidth={3} /> : i + 1}</span>
                    <span className={`flex-1 pt-1 transition-opacity duration-300 ${done ? 'opacity-50' : ''}`}>
                      {s.title && <span className="block font-display text-2xl font-medium leading-tight">{s.title}</span>}
                      <span className="mt-1 block text-[17px] leading-relaxed">{s.body}</span>
                      {(s.timer_seconds || s.temperature_c || s.doneness_cue) && (
                        <span className="mt-3 flex flex-wrap gap-2">
                          {s.timer_seconds && <span className="inline-flex items-center gap-1.5 rounded-full bg-pearl px-3 py-1 text-sm"><Timer size={14} />{Math.round(s.timer_seconds / 60)} min</span>}
                          {s.temperature_c && <span className="inline-flex items-center gap-1.5 rounded-full bg-pearl px-3 py-1 text-sm"><Thermometer size={14} />{s.temperature_c} °C</span>}
                          {s.doneness_cue && <span className="inline-flex items-center rounded-full bg-sage/60 px-3 py-1 text-sm">{s.doneness_cue}</span>}
                        </span>
                      )}
                    </span>
                  </button>
                </Reveal>
              </li>
            )
          })}
        </ol>

        {r.tips.length > 0 && (
          <Reveal className="mt-14">
            <Heading>Secretos del chef</Heading>
            <ul className="grid gap-4">
              {[...r.tips].sort((a: any, b: any) => a.sort - b.sort).map((t: any) => {
                const Icon = TIP_ICON[t.type as keyof typeof TIP_ICON] ?? Lightbulb
                return (
                  <li key={t.id} className="rounded-[22px] border border-champagne/30 bg-pearl px-5 py-4">
                    <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-champagne"><Icon size={14} />{TIP_NAME[t.type as keyof typeof TIP_NAME]}</p>
                    <p className="font-hand text-[1.65rem] leading-snug">{t.body}</p>
                  </li>
                )
              })}
            </ul>
          </Reveal>
        )}

        {r.storage_note && <Reveal className="mt-10"><p className="rounded-2xl border border-hairline bg-white/60 px-5 py-4 text-cocoa-soft"><span className="font-medium text-cocoa">Conservación. </span>{r.storage_note}</p></Reveal>}
        {r.status === 'published' && <><CookLogs recipeId={r.id} /><Comments recipeId={r.id} /></>}

        {(mine || profile?.role === 'admin') && (
          <div className="mt-14 border-t border-hairline pt-6">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-cocoa-soft">Se borra para toda la familia y no se puede deshacer.</p>
                <button type="button" onClick={remove} className="min-h-11 rounded-full bg-[#9B3B3B] px-5 font-medium text-white">Sí, eliminar</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 px-3 text-cocoa-soft">Cancelar</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 text-sm text-[#9B3B3B]">Eliminar receta</button>
            )}
          </div>
        )}

      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] print:hidden">
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border border-hairline bg-ivory/90 p-1.5 shadow-soft backdrop-blur-md">
          <button type="button" onClick={fav.toggle} aria-pressed={fav.active} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 font-medium transition-[background-color,transform] duration-150 active:scale-[0.97]">
            <Heart size={19} className={fav.active ? 'fill-[#C98B8B] text-[#C98B8B]' : ''} />{fav.active ? 'En favoritas' : 'Guardar'}
          </button>
          <Link to={`/cocinar/${r.id}?p=${servings}`} className="flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-sage-deep px-5 font-medium text-white transition-transform duration-150 active:scale-[0.97]"><ChefHat size={19} />Modo cocina</Link>
        </div>
      </div>
    </main>
  )
}
