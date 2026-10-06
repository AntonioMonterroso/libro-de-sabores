import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Search, X } from 'lucide-react'
import { useCategories, useRecipes } from '../features/recipes/api'
import { filterRecipes } from '../lib/search'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { RecipeCard } from '../components/ui/RecipeCard'

const GROUP_NAME: Record<string, string> = { ritmo: 'Según tu tiempo', formalidad: 'Qué tan formal', momento: 'Momento del día', plato: 'Tipo de plato', ocasion: 'Fechas especiales', dieta: 'Dieta y salud', dificultad: 'Dificultad', origen: 'Origen', tecnica: 'Técnica', temporada: 'Temporada' }
const ease = [0.23, 1, 0.32, 1] as const

export function Explore() {
  const [params] = useSearchParams()
  const { data: cats = [] } = useCategories()
  const { data: recipes = [], isLoading } = useRecipes()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [seeded, setSeeded] = useState(false)

  // ?cat=rapidas desde los atajos del inicio
  if (!seeded && cats.length) {
    setSeeded(true)
    const slug = params.get('cat')
    const hit = cats.find((c) => c.slug === slug)
    if (hit) setSelected([hit.id])
  }

  const groups = useMemo(() => {
    const m = new Map<string, typeof cats>()
    cats.forEach((c) => m.set(c.group_slug, [...(m.get(c.group_slug) ?? []), c]))
    return [...m.entries()]
  }, [cats])
  const results = useMemo(() => filterRecipes(recipes, cats, { q, cats: selected }), [recipes, cats, q, selected])
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const active = cats.filter((c) => selected.includes(c.id))
  let n = 0

  return (
    <main className="mx-auto w-full max-w-5xl pb-32">
      <div className="sticky top-0 z-20 border-b border-hairline/60 bg-ivory/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md">
        <h1 className="font-display text-4xl font-medium">Explorar</h1>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-pearl px-3 focus-within:shadow-[0_0_0_3px_rgb(184_151_90/0.25)]">
          <Search size={18} className="text-cocoa-soft" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Receta, ingrediente o cocinero" aria-label="Buscar" className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-cocoa-soft/60" />
          {q && <button type="button" aria-label="Borrar búsqueda" onClick={() => setQ('')} className="grid size-8 place-items-center rounded-full text-cocoa-soft"><X size={16} /></button>}
        </div>
        <AnimatePresence initial={false}>
          {active.length > 0 && (
            <motion.div className="flex flex-wrap items-center gap-2 overflow-hidden pt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}>
              {active.map((c) => (
                <motion.button key={c.id} type="button" onClick={() => toggle(c.id)} aria-label={`Quitar ${c.name}`} initial={{ opacity: 0, transform: 'scale(0.95)' }} animate={{ opacity: 1, transform: 'scale(1)' }} exit={{ opacity: 0, transform: 'scale(0.95)' }} transition={{ duration: 0.22, ease }} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-champagne px-3 text-sm" style={{ backgroundColor: c.color }}>
                  {c.name}<X size={14} />
                </motion.button>
              ))}
              <button type="button" onClick={() => setSelected([])} className="min-h-9 px-2 text-sm text-cocoa-soft">Limpiar</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-7 pt-6">
        {groups.map(([g, items]) => (
          <section key={g} aria-label={GROUP_NAME[g] ?? g}>
            <h2 className="px-4 font-display text-2xl font-medium">{GROUP_NAME[g] ?? g}</h2>
            <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none]">
              {items.map((c) => {
                const on = selected.includes(c.id)
                const delay = 60 * Math.min(n++, 10)
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(c.id)} className={`cat-tile relative grid h-[104px] w-[104px] shrink-0 snap-start content-between rounded-[22px] border p-3 text-left transition-[border-color,box-shadow,transform] duration-200 [transition-timing-function:var(--ease-out)] active:scale-[0.97] ${on ? 'border-champagne shadow-[0_0_0_2px_rgb(184_151_90/0.5)]' : 'border-transparent'}`} style={{ backgroundColor: c.color }}>
                    <CategoryIcon icon={c.icon} anim={c.animation_key} delay={delay} />
                    <span className="text-[13px] font-medium leading-tight">{c.name}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="px-4 pt-8" aria-live="polite">
        <h2 className="font-display text-3xl font-medium">{q || selected.length ? 'Resultados' : 'Todas las recetas'}</h2>
        <p className="mt-1 text-sm text-cocoa-soft">{isLoading ? 'Buscando…' : `${results.length} ${results.length === 1 ? 'receta' : 'recetas'}`}</p>
        {!isLoading && results.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-champagne bg-white/50 p-10 text-center">
            <p className="font-display text-2xl">Nada con esa combinación.</p>
            <p className="mt-1 text-cocoa-soft">Prueba quitando algún filtro.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.map((r, i) => <RecipeCard key={r.id} r={r} i={i} />)}</div>
        )}
      </section>
    </main>
  )
}
