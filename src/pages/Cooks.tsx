import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useProfiles, useRecipes } from '../features/recipes/api'
import { toques } from '../lib/search'
import { Avatar } from '../components/ui/Avatar'
import { ChefHat } from '../components/brand/ChefHat'
import { RecipeCard } from '../components/ui/RecipeCard'

function Toques({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} de 5 toques`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= n ? '' : 'opacity-20 grayscale'}><ChefHat size={14} /></span>)}
    </span>
  )
}

export function Cooks() {
  const { data: profiles = [] } = useProfiles()
  const { data: recipes = [] } = useRecipes()
  const count = (id: string) => recipes.filter((r) => r.author_id === id && r.status === 'published').length
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-5xl font-medium">Nuestros cocineros</h1>
      <p className="mt-2 text-lg text-cocoa-soft">Quién hizo cada receta, y cuánto ha aportado a la mesa.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {profiles.map((p, i) => {
          const n = count(p.id)
          return (
            <Link key={p.id} to={`/cocinero/${p.id}`} className="rise grid justify-items-center gap-2 rounded-[24px] border border-hairline bg-white/75 p-5 text-center shadow-soft transition-transform duration-200 [transition-timing-function:var(--ease-out)] active:scale-[0.97]" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
              <Avatar path={p.avatar_url} name={p.display_name} size={84} />
              <p className="font-display text-2xl font-medium leading-tight">{p.display_name}</p>
              {p.branch && <p className="-mt-1 text-xs text-cocoa-soft">{p.branch}</p>}
              <Toques n={toques(n)} />
              <p className="text-sm text-cocoa-soft">{n} {n === 1 ? 'receta' : 'recetas'}</p>
            </Link>
          )
        })}
      </div>
    </main>
  )
}

export function CookProfilePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: profiles = [] } = useProfiles()
  const { data: recipes = [] } = useRecipes()
  const p = profiles.find((x) => x.id === id)
  const mine = recipes.filter((r) => r.author_id === id)
  const published = mine.filter((r) => r.status === 'published').length
  if (!p) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">Cargando…</div>
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" onClick={() => nav(-1)} className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm text-cocoa-soft"><ChevronLeft size={18} />Cocineros</button>
      <header className="mt-2 flex items-center gap-5">
        <Avatar path={p.avatar_url} name={p.display_name} size={96} />
        <div>
          <h1 className="font-display text-5xl font-medium leading-tight">{p.display_name}</h1>
          {p.branch && <p className="text-cocoa-soft">{p.branch}</p>}
          <div className="mt-2 flex items-center gap-3 text-sm text-cocoa-soft"><Toques n={toques(published)} />{published} {published === 1 ? 'receta' : 'recetas'}</div>
        </div>
      </header>
      {p.bio && <p className="mt-5 max-w-xl font-display text-xl italic text-cocoa-soft">{p.bio}</p>}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{mine.map((r, i) => <RecipeCard key={r.id} r={r} i={i} />)}</div>
      {mine.length === 0 && <p className="mt-8 text-cocoa-soft">Aún no ha compartido recetas.</p>}
    </main>
  )
}
