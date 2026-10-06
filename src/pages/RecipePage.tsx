import { useParams } from 'react-router-dom'
import { useRecipe } from '../features/recipes/api'
import { RecipeView } from '../features/recipes/RecipeView'

export function RecipePage() {
  const { id } = useParams()
  const { data: r, isLoading, error } = useRecipe(id)
  if (isLoading) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">Cargando…</div>
  if (error || !r) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">No encontramos esta receta.</div>
  return <RecipeView r={r} />
}
