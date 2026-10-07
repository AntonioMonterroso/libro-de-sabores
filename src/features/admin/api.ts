import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export type Member = { id: string; display_name: string; avatar_url: string | null; role: 'admin' | 'member'; active: boolean; created_at: string }

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/** Contraseña fácil de dictar por WhatsApp: Kzmh-4qWp-382 */
export function generatePassword() {
  const pick = (n: number, set = ALPHABET) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => set[b % set.length]).join('')
  return `${pick(4)}-${pick(4)}-${pick(3, '23456789')}`
}

export function useMembers() {
  return useQuery({
    queryKey: ['admin-members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id,display_name,avatar_url,role,active,created_at').order('created_at')
      if (error) throw error
      return data as Member[]
    },
  })
}

async function callAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    let msg = 'No se pudo completar. Inténtalo de nuevo.'
    if (error instanceof FunctionsHttpError) msg = (await error.context.json().catch(() => null))?.error ?? msg
    throw new Error(msg)
  }
  return data
}

export function useAdminActions() {
  const qc = useQueryClient()
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['admin-members'] }), qc.invalidateQueries({ queryKey: ['profiles'] })])
  return {
    createMember: useMutation({
      mutationFn: (v: { email: string; password: string; display_name: string; role: 'admin' | 'member' }) => callAdmin({ action: 'create', ...v }),
      onSuccess: refresh,
    }),
    resetPassword: useMutation({ mutationFn: (v: { user_id: string; password: string }) => callAdmin({ action: 'reset_password', ...v }) }),
    setActive: useMutation({
      mutationFn: async ({ id, active }: { id: string; active: boolean }) => { const { error } = await supabase.from('profiles').update({ active }).eq('id', id); if (error) throw error },
      onSuccess: refresh,
    }),
    setRole: useMutation({
      mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'member' }) => { const { error } = await supabase.from('profiles').update({ role }).eq('id', id); if (error) throw error },
      onSuccess: refresh,
    }),
  }
}
