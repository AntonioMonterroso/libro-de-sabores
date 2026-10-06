import { Heart } from 'lucide-react'
import { useFavoriteIds, useRecipes } from '../features/recipes/api'
import { RecipeCard } from '../components/ui/RecipeCard'

export function Favorites() {
  const { data: recipes = [] } = useRecipes()
  const { data: ids } = useFavoriteIds()
  const list = recipes.filter((r) => ids?.has(r.id))
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-5xl font-medium">Tus favoritas</h1>
      <p className="mt-2 text-lg text-cocoa-soft">Las que quieres tener siempre a mano.</p>
      {list.length === 0 ? (
        <div className="mt-10 rounded-[24px] border border-dashed border-champagne bg-white/50 p-10 text-center">
          <Heart className="mx-auto text-champagne" size={28} />
          <p className="mt-3 font-display text-2xl">Todavía no guardas ninguna.</p>
          <p className="mt-1 text-cocoa-soft">Toca “Guardar” en una receta y aparecerá aquí.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((r, i) => <RecipeCard key={r.id} r={r} i={i} />)}</div>
      )}
    </main>
  )
}
