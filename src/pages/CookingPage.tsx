import { useParams, useSearchParams } from 'react-router-dom'
import { useRecipe } from '../features/recipes/api'
import { CookingMode } from '../features/cooking/CookingMode'

export function CookingPage() {
  const { id } = useParams()
  const [q] = useSearchParams()
  const { data: r, isLoading } = useRecipe(id)
  if (isLoading) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">Cargando…</div>
  if (!r) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">No encontramos esta receta.</div>
  const p = Number(q.get('p'))
  return <CookingMode r={r} servings={p > 0 ? p : undefined} />
}
