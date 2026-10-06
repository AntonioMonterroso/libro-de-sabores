import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { formatQuantity, parseQuantity } from '../../lib/fractions'
import { emptyDraft, uid, type Draft, type IngredientKind, type ScaleMode, type TipType } from './types'

const num = (s: string) => (s.trim() === '' ? null : Math.max(0, Math.round(Number(s))) || null)

export async function saveRecipe(d: Draft, authorId: string, status: 'draft' | 'published'): Promise<string> {
  const row = {
    author_id: authorId,
    title: d.title.trim(),
    subtitle: d.subtitle.trim() || null,
    story: d.story.trim() || null,
    lineage: d.lineage.trim() || null,
    cover_url: d.cover_path,
    servings_base: d.servings_base,
    servings_label: d.servings_label,
    prep_min: num(d.prep_min),
    cook_min: num(d.cook_min),
    rest_min: num(d.rest_min),
    difficulty: d.difficulty,
    equipment: d.equipment.split(',').map((s) => s.trim()).filter(Boolean),
    allergens: d.allergens,
    storage_note: d.storage_note.trim() || null,
    status,
  }

  let id = d.id
  if (id) {
    const { error } = await supabase.from('recipes').update(row).eq('id', id)
    if (error) throw error
    await Promise.all([
      supabase.from('ingredient_groups').delete().eq('recipe_id', id),
      supabase.from('steps').delete().eq('recipe_id', id),
      supabase.from('tips').delete().eq('recipe_id', id),
      supabase.from('recipe_categories').delete().eq('recipe_id', id),
    ])
  } else {
    const { data, error } = await supabase.from('recipes').insert(row).select('id').single()
    if (error) throw error
    id = data.id as string
  }

  const groups = d.groups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.name.trim()) }))
    .filter((g) => g.items.length)
  if (groups.length) {
    const groupRows = groups.map((g, i) => ({ id: crypto.randomUUID(), recipe_id: id, name: g.name.trim(), sort: i }))
    const { error: ge } = await supabase.from('ingredient_groups').insert(groupRows)
    if (ge) throw ge
    const items = groups.flatMap((g, gi) =>
      g.items.map((it, ii) => ({
        group_id: groupRows[gi].id,
        recipe_id: id,
        kind: it.kind,
        name: it.name.trim(),
        quantity: it.scale_mode === 'to_taste' ? null : parseQuantity(it.quantity),
        unit: it.unit || null,
        prep: it.prep.trim() || null,
        scale_mode: it.scale_mode,
        sort: ii,
      })),
    )
    const { error: ie } = await supabase.from('ingredients').insert(items)
    if (ie) throw ie
  }

  const steps = d.steps.filter((s) => s.body.trim())
  if (steps.length) {
    const { error } = await supabase.from('steps').insert(
      steps.map((s, i) => ({
        recipe_id: id,
        position: i,
        title: s.title.trim() || null,
        body: s.body.trim(),
        timer_seconds: num(s.timer_minutes) ? num(s.timer_minutes)! * 60 : null,
        temperature_c: num(s.temperature_c),
        doneness_cue: s.doneness_cue.trim() || null,
      })),
    )
    if (error) throw error
  }

  const tips = d.tips.filter((t) => t.body.trim())
  if (tips.length) {
    const { error } = await supabase.from('tips').insert(tips.map((t, i) => ({ recipe_id: id, type: t.type, body: t.body.trim(), sort: i })))
    if (error) throw error
  }

  if (d.categoryIds.length) {
    const { error } = await supabase.from('recipe_categories').insert(d.categoryIds.map((category_id) => ({ recipe_id: id, category_id })))
    if (error) throw error
  }
  return id as string
}

export async function uploadPhoto(file: Blob, userId: string, bucket: 'recipe-photos' | 'avatars' = 'recipe-photos'): Promise<string> {
  const path = `${userId}/${uid()}${uid()}.webp`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: 'image/webp' })
  if (error) throw error
  return path
}

export function useSignedUrl(path: string | null | undefined, bucket: 'recipe-photos' | 'avatars' = 'recipe-photos') {
  return useQuery({
    queryKey: ['signed', bucket, path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, 3600)
      if (error) throw error
      return data.signedUrl
    },
  }).data
}

export type CategoryRow = { id: string; group_slug: string; slug: string; name: string; icon: string; color: string; animation_key: string; sort: number }

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort')
      if (error) throw error
      return data as CategoryRow[]
    },
  })
}

export type RecipeListItem = {
  id: string
  title: string
  subtitle: string | null
  cover_url: string | null
  status: 'draft' | 'published'
  prep_min: number | null
  cook_min: number | null
  rest_min: number | null
  difficulty: number
  created_at: string
  author_id: string
  author: { id: string; display_name: string; avatar_url: string | null } | null
  recipe_categories: { category_id: string }[]
  ingredients: { name: string }[]
}

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id,title,subtitle,cover_url,status,prep_min,cook_min,rest_min,difficulty,created_at,author_id,author:profiles!author_id(id,display_name,avatar_url),recipe_categories(category_id),ingredients(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as RecipeListItem[]
    },
  })
}

export type CookProfile = { id: string; display_name: string; avatar_url: string | null; bio: string | null; branch: string | null }

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id,display_name,avatar_url,bio,branch').eq('active', true).order('display_name')
      if (error) throw error
      return data as CookProfile[]
    },
  })
}

export function useFavoriteIds() {
  return useQuery({
    queryKey: ['favorite-ids'],
    queryFn: async () => {
      const { data, error } = await supabase.from('favorites').select('recipe_id')
      if (error) throw error
      return new Set((data ?? []).map((f) => f.recipe_id as string))
    },
  })
}

export type FullRecipe = Awaited<ReturnType<typeof fetchRecipe>>

export async function fetchRecipe(id: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, author:profiles!author_id(id,display_name,avatar_url), ingredient_groups(*, ingredients(*)), steps(*), tips(*), recipe_categories(category_id)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as any
}

export function useRecipe(id: string | undefined) {
  return useQuery({ queryKey: ['recipe', id], enabled: !!id, queryFn: () => fetchRecipe(id!) })
}

/** Convierte una receta cargada de la base en un borrador editable. */
export function recipeToDraft(r: any): Draft {
  const base = emptyDraft()
  const groups = [...(r.ingredient_groups ?? [])].sort((a, b) => a.sort - b.sort)
  return {
    ...base,
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? '',
    story: r.story ?? '',
    lineage: r.lineage ?? '',
    servings_base: Number(r.servings_base),
    servings_label: r.servings_label,
    prep_min: r.prep_min?.toString() ?? '',
    cook_min: r.cook_min?.toString() ?? '',
    rest_min: r.rest_min?.toString() ?? '',
    difficulty: r.difficulty,
    cover_path: r.cover_url,
    categoryIds: (r.recipe_categories ?? []).map((c: any) => c.category_id),
    groups: groups.length
      ? groups.map((g: any) => ({
          key: uid(),
          name: g.name,
          items: [...g.ingredients].sort((a: any, b: any) => a.sort - b.sort).map((i: any) => ({
            key: uid(),
            kind: i.kind as IngredientKind,
            name: i.name,
            quantity: formatQuantity(i.quantity),
            unit: i.unit ?? '',
            prep: i.prep ?? '',
            scale_mode: i.scale_mode as ScaleMode,
          })),
        }))
      : base.groups,
    steps: [...(r.steps ?? [])].sort((a, b) => a.position - b.position).map((s: any) => ({
      key: uid(),
      title: s.title ?? '',
      body: s.body,
      timer_minutes: s.timer_seconds ? String(Math.round(s.timer_seconds / 60)) : '',
      temperature_c: s.temperature_c?.toString() ?? '',
      doneness_cue: s.doneness_cue ?? '',
    })),
    tips: [...(r.tips ?? [])].sort((a, b) => a.sort - b.sort).map((t: any) => ({ key: uid(), type: t.type as TipType, body: t.body })),
    equipment: (r.equipment ?? []).join(', '),
    allergens: r.allergens ?? [],
    storage_note: r.storage_note ?? '',
  }
}
