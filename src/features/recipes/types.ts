export type IngredientKind = 'ingredient' | 'seasoning' | 'aromatic' | 'liquid' | 'fat' | 'garnish'
export type ScaleMode = 'linear' | 'sublinear' | 'fixed' | 'to_taste'
export type TipType = 'consejo' | 'truco' | 'sustitucion' | 'advertencia'

export const KIND_LABEL: Record<IngredientKind, string> = {
  ingredient: 'Ingrediente',
  seasoning: 'Condimento',
  aromatic: 'Aromático',
  liquid: 'Líquido',
  fat: 'Grasa',
  garnish: 'Para decorar',
}
export const TIP_LABELS: { value: TipType; label: string }[] = [
  { value: 'consejo', label: 'Consejo' },
  { value: 'truco', label: 'Truco' },
  { value: 'sustitucion', label: 'Sustitución' },
  { value: 'advertencia', label: 'Cuidado' },
]
export const UNITS = ['g', 'kg', 'ml', 'l', 'taza', 'cda', 'cdta', 'pizca', 'pieza', 'diente', 'rebanada', 'lata', 'paquete', 'ramita', 'hoja']
export const ALLERGENS = ['Gluten', 'Lácteos', 'Huevo', 'Frutos secos', 'Cacahuate', 'Mariscos', 'Pescado', 'Soya', 'Ajonjolí']

export type DraftIngredient = {
  key: string
  kind: IngredientKind
  name: string
  quantity: string
  unit: string
  prep: string
  scale_mode: ScaleMode
}
export type DraftGroup = { key: string; name: string; items: DraftIngredient[] }
export type DraftStep = { key: string; title: string; body: string; timer_minutes: string; temperature_c: string; doneness_cue: string }
export type DraftTip = { key: string; type: TipType; body: string }

export type Draft = {
  id?: string
  title: string
  subtitle: string
  story: string
  lineage: string
  servings_base: number
  servings_label: string
  prep_min: string
  cook_min: string
  rest_min: string
  difficulty: 1 | 2 | 3
  cover_path: string | null
  categoryIds: string[]
  groups: DraftGroup[]
  steps: DraftStep[]
  tips: DraftTip[]
  equipment: string
  allergens: string[]
  storage_note: string
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export const newIngredient = (): DraftIngredient => ({ key: uid(), kind: 'ingredient', name: '', quantity: '', unit: '', prep: '', scale_mode: 'linear' })
export const newStep = (): DraftStep => ({ key: uid(), title: '', body: '', timer_minutes: '', temperature_c: '', doneness_cue: '' })

export const emptyDraft = (): Draft => ({
  title: '',
  subtitle: '',
  story: '',
  lineage: '',
  servings_base: 4,
  servings_label: 'personas',
  prep_min: '',
  cook_min: '',
  rest_min: '',
  difficulty: 1,
  cover_path: null,
  categoryIds: [],
  groups: [{ key: uid(), name: '', items: [newIngredient()] }],
  steps: [newStep()],
  tips: [],
  equipment: '',
  allergens: [],
  storage_note: '',
})
