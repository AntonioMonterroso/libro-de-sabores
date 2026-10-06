import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export function useFavorite(recipeId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  const key = ['favorite', recipeId]
  const { data: active = false } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabase.from('favorites').select('recipe_id').eq('recipe_id', recipeId).maybeSingle()
      return !!data
    },
  })
  const toggle = useMutation({
    mutationFn: async () => {
      if (active) await supabase.from('favorites').delete().eq('recipe_id', recipeId).eq('user_id', session!.user.id)
      else await supabase.from('favorites').insert({ recipe_id: recipeId, user_id: session!.user.id })
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData(key, !active)
    },
    onSettled: () => { void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ['favorite-ids'] }) },
  })
  return { active, toggle: () => toggle.mutate() }
}
