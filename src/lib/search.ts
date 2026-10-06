import type { CategoryRow, RecipeListItem } from '../features/recipes/api'

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export type Filters = { q: string; cats: string[]; authorId?: string }

/** Entre dimensiones: Y. Dentro de una misma dimensión: O. */
export function filterRecipes(recipes: RecipeListItem[], cats: CategoryRow[], f: Filters) {
  const byGroup = new Map<string, string[]>()
  for (const id of f.cats) {
    const g = cats.find((c) => c.id === id)?.group_slug
    if (g) byGroup.set(g, [...(byGroup.get(g) ?? []), id])
  }
  const words = norm(f.q).split(/\s+/).filter(Boolean)
  return recipes.filter((r) => {
    if (f.authorId && r.author_id !== f.authorId) return false
    const have = new Set(r.recipe_categories.map((c) => c.category_id))
    for (const ids of byGroup.values()) if (!ids.some((id) => have.has(id))) return false
    if (words.length) {
      const hay = norm([r.title, r.subtitle ?? '', r.author?.display_name ?? '', ...r.ingredients.map((i) => i.name)].join(' '))
      if (!words.every((w) => hay.includes(w))) return false
    }
    return true
  })
}

/** 1 a 5 toques según recetas publicadas. */
export function toques(n: number) {
  return n >= 20 ? 5 : n >= 10 ? 4 : n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0
}
