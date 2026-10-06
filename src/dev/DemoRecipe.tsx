import { RecipeView } from '../features/recipes/RecipeView'

const g = (id: string, name: string, sort: number, ingredients: any[]) => ({ id, name, sort, ingredients: ingredients.map((x, i) => ({ id: `${id}-${i}`, group_id: id, sort: i, optional: false, prep: null, unit: null, quantity: null, scale_mode: 'linear', kind: 'ingredient', ...x })) })

export const demo = {
  id: 'demo', status: 'published', title: 'Pan de masa madre de la abuela', subtitle: 'Corteza crujiente, miga suave y mucha paciencia',
  story: 'Cada domingo la casa olía a este pan. La abuela decía que la masa se amasa con las manos y con cariño.', lineage: 'De la abuela Rosa, 1962',
  cover_url: null, servings_base: 4, servings_label: 'personas', prep_min: 30, cook_min: 45, rest_min: 480, difficulty: 3,
  equipment: ['Olla de hierro 5 L', 'Báscula', 'Cuchilla de panadero'], allergens: ['Gluten'], storage_note: 'Envuelto en lino dura 3 días; congelado, 1 mes.',
  author: { id: 'x', display_name: 'Tía Marta', avatar_url: null }, recipe_categories: [],
  ingredient_groups: [
    g('g1', 'Para la masa', 0, [
      { name: 'Harina de fuerza', quantity: 500, unit: 'g', prep: 'tamizada' },
      { name: 'Masa madre activa', quantity: 100, unit: 'g' },
      { name: 'Mantequilla', quantity: 30, unit: 'g', kind: 'fat', prep: 'a temperatura ambiente' },
      { name: 'Cebolla', quantity: 0.5, unit: 'pieza', kind: 'aromatic', prep: 'en brunoise' },
      { name: 'Agua tibia', quantity: 350, unit: 'ml', kind: 'liquid' },
      { name: 'Sal de mar', quantity: 10, unit: 'g', kind: 'seasoning', scale_mode: 'sublinear' },
      { name: 'Pimienta', kind: 'seasoning', scale_mode: 'to_taste' },
      { name: 'Romero', quantity: 2, unit: 'ramita', kind: 'seasoning' },
    ]),
    g('g2', 'Para decorar', 1, [{ name: 'Semillas de ajonjolí', quantity: 2, unit: 'cda', kind: 'garnish' }]),
  ],
  steps: [
    { id: 's1', position: 0, title: 'Amasar', body: 'Mezcla la harina con el agua y deja reposar. Agrega la masa madre y la sal; amasa hasta que se despegue de la mesa.', timer_seconds: 900, temperature_c: null, doneness_cue: 'hasta que sea elástica' },
    { id: 's2', position: 1, title: 'Hornear', body: 'Precalienta la olla dentro del horno. Hornea tapado y luego destapado para dorar.', timer_seconds: 2700, temperature_c: 240, doneness_cue: 'corteza dorada oscura' },
  ],
  tips: [
    { id: 't1', type: 'truco', sort: 0, body: 'Una bandeja con hielo en el horno da una corteza más crujiente.' },
    { id: 't2', type: 'advertencia', sort: 1, body: 'No cortes el pan caliente: la miga se pone gomosa.' },
  ],
}

export default function DemoRecipe() {
  return <RecipeView r={demo} />
}
