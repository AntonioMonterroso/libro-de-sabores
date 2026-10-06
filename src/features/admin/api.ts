import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export type Invite = { code: string; role: 'admin' | 'member'; max_uses: number; uses: number; expires_at: string | null; created_at: string }
export type Member = { id: string; display_name: string; avatar_url: string | null; role: 'admin' | 'member'; active: boolean; created_at: string }

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function makeCode(prefix = 'FAM') {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return `${prefix}-${[...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')}`
}

export function useInvites() {
  return useQuery({
    queryKey: ['admin-invites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invites').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Invite[]
    },
  })
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

export function useAdminActions(userId: string) {
  const qc = useQueryClient()
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['admin-invites'] }), qc.invalidateQueries({ queryKey: ['admin-members'] }), qc.invalidateQueries({ queryKey: ['profiles'] })])
  return {
    createInvite: useMutation({
      mutationFn: async (o: { role: 'admin' | 'member'; max_uses: number; days: number | null }) => {
        const code = makeCode(o.role === 'admin' ? 'ADMIN' : 'FAM')
        const { error } = await supabase.from('invites').insert({ code, role: o.role, max_uses: o.max_uses, expires_at: o.days ? new Date(Date.now() + o.days * 86400_000).toISOString() : null, created_by: userId })
        if (error) throw error
        return code
      },
      onSuccess: refresh,
    }),
    deleteInvite: useMutation({
      mutationFn: async (code: string) => { const { error } = await supabase.from('invites').delete().eq('code', code); if (error) throw error },
      onSuccess: refresh,
    }),
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
