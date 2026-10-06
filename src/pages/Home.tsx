import { Link } from 'react-router-dom'
import { Bell, Plus, Search } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { useCategories, useRecipes } from '../features/recipes/api'
import { LogoMark } from '../components/brand/Logo'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { RecipeCard } from '../components/ui/RecipeCard'
import { Avatar } from '../components/ui/Avatar'
import { useNotifications } from '../features/notifications/hooks'

const SHORTCUTS = ['rapidas', 'formales', 'informales', 'postres', 'cena', 'navidad']

export function Home() {
  const { profile } = useAuth()
  const { data: notes = [] } = useNotifications()
  const unreadCount = notes.filter((n) => !n.read_at).length
  const { data: recipes = [], isLoading } = useRecipes()
  const { data: cats = [] } = useCategories()
  const shortcuts = SHORTCUTS.map((s) => cats.find((c) => c.slug === s)).filter(Boolean) as typeof cats
  const mine = recipes.filter((r) => r.author_id === profile?.id && r.status === 'draft')
  const recent = recipes.filter((r) => r.status === 'published')

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={22} />
          <span className="font-display text-2xl font-medium">Libro de Sabores</span>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/avisos" aria-label={unreadCount ? `Avisos, ${unreadCount} sin leer` : 'Avisos'} className="relative grid size-11 place-items-center rounded-full text-cocoa-soft">
            <Bell size={22} strokeWidth={1.7} />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-champagne px-1 text-[10px] font-medium leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </Link>
          <Link to="/ajustes" aria-label="Ajustes" className="grid size-11 place-items-center"><Avatar path={profile?.avatar_url} name={profile?.display_name} size={32} /></Link>
        </div>
      </header>
      <h1 className="rise mt-10 font-display text-5xl font-medium leading-tight">Hola, {profile?.display_name.split(' ')[0]}</h1>
      <p className="mt-2 text-lg text-cocoa-soft">¿Qué se cocina hoy?</p>

      <Link to="/explorar" className="mt-6 flex min-h-12 items-center gap-2 rounded-2xl bg-pearl px-4 text-cocoa-soft"><Search size={18} />Buscar receta, ingrediente o cocinero</Link>

      {shortcuts.length > 0 && (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {shortcuts.map((c, i) => (
            <Link key={c.id} to={`/explorar?cat=${c.slug}`} className="cat-tile flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-transform duration-150 active:scale-[0.97]" style={{ backgroundColor: c.color }}>
              <CategoryIcon icon={c.icon} anim={c.animation_key} delay={i * 70} size={18} />{c.name.replace(/ \(.*\)/, '')}
            </Link>
          ))}
        </div>
      )}

      {mine.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-3xl font-medium">Tus borradores</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{mine.map((r, i) => <RecipeCard key={r.id} r={r} i={i} />)}</div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-3xl font-medium">Recién agregadas</h2>
        {isLoading ? null : recent.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-champagne bg-white/50 p-10 text-center">
            <p className="font-display text-2xl">Aquí vivirá la primera receta.</p>
            <p className="mt-1 text-cocoa-soft">Escribe la que más se pide en casa.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{recent.map((r, i) => <RecipeCard key={r.id} r={r} i={i} />)}</div>
        )}
      </section>

      <Link to="/nueva" className="fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5rem)] right-5 z-30 flex min-h-14 items-center gap-2 rounded-full bg-sage-deep px-6 font-medium text-white shadow-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97]">
        <Plus size={20} /> Nueva receta
      </Link>
    </main>
  )
}
