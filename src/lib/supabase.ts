import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  branch: string | null
  role: 'admin' | 'member'
  created_at: string
}
