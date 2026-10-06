import { useQueryClient } from '@tanstack/react-query'
import { Explore } from '../pages/Explore'
import { TabBar } from '../components/TabBar'

const c = (id: string, group_slug: string, name: string, icon: string, color: string, animation_key: string, sort: number) => ({ id, group_slug, slug: id, name, icon, color, animation_key, sort })
const cats = [
  c('rapidas', 'ritmo', 'Rápidas (≤30 min)', 'zap', '#F6E3C8', 'fast', 1), c('express', 'ritmo', 'Express (≤15 min)', 'zap', '#F6E3C8', 'fast', 2), c('lenta', 'ritmo', 'Cocción lenta', 'zap', '#F6E3C8', 'fast', 3),
  c('formales', 'formalidad', 'Formales', 'wine', '#E9DCC3', 'gala', 4), c('informales', 'formalidad', 'Informales', 'wine', '#E9DCC3', 'gala', 5),
  c('desayuno', 'momento', 'Desayuno', 'sunrise', '#F4DDD2', 'sun', 6), c('cena', 'momento', 'Cena', 'sunrise', '#F4DDD2', 'sun', 7),
  c('postres', 'plato', 'Postres', 'utensils', '#EFD5D0', 'soft', 8), c('sopas', 'plato', 'Sopas y cremas', 'utensils', '#EFD5D0', 'soft', 9), c('carnes', 'plato', 'Carnes', 'flame', '#F1D9CB', 'sizzle', 10),
  c('navidad', 'ocasion', 'Navidad', 'party-popper', '#E3D6EA', 'twinkle', 11), c('veganas', 'dieta', 'Veganas', 'leaf', '#CBD9C8', 'sprout', 12),
]
const author = { id: 'a', display_name: 'Tía Marta', avatar_url: null }
const rec = (id: string, title: string, catIds: string[], ing: string[], min: number) => ({ id, title, subtitle: 'Receta de la familia', cover_url: null, status: 'published', prep_min: min, cook_min: 0, rest_min: 0, difficulty: 1, created_at: '', author_id: 'a', author, recipe_categories: catIds.map((category_id) => ({ category_id })), ingredients: ing.map((name) => ({ name })) })
const recipes = [
  rec('1', 'Pan de masa madre', ['formales', 'desayuno'], ['harina', 'sal'], 600),
  rec('2', 'Sopa de lentejas', ['rapidas', 'informales', 'cena', 'sopas'], ['lentejas', 'cebolla'], 25),
  rec('3', 'Pavo navideño', ['formales', 'navidad', 'carnes'], ['pavo'], 240),
]

export default function DemoExplore() {
  const qc = useQueryClient()
  qc.setQueryData(['categories'], cats)
  qc.setQueryData(['recipes'], recipes)
  return <><Explore /><TabBar /></>
}
