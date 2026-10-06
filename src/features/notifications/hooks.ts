import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getPushState, type PushState } from './push'

export function usePushState() {
  const [state, setState] = useState<PushState | null>(null)
  useEffect(() => { void getPushState().then(setState) }, [])
  return [state, setState] as const
}

export type AppNotification = { id: string; kind: string; recipe_id: string | null; event_id: string | null; title: string | null; body: string | null; read_at: string | null; created_at: string }

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('id,kind,recipe_id,event_id,title,body,read_at,created_at').order('created_at', { ascending: false }).limit(60)
      if (error) throw error
      return data as AppNotification[]
    },
  })
}
