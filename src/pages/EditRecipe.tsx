import { useParams } from 'react-router-dom'
import { RecipeWizard } from '../features/recipes/RecipeWizard'
import { recipeToDraft, useRecipe } from '../features/recipes/api'

export function EditRecipe() {
  const { id } = useParams()
  const { data, isLoading } = useRecipe(id)
  if (isLoading || !data) return <div className="grid min-h-dvh place-items-center text-cocoa-soft">Cargando…</div>
  return <RecipeWizard key={data.id} initial={recipeToDraft(data)} />
}
