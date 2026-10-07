// Crea cuentas de familiares y restablece contraseñas. Solo puede usarla un administrador activo.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, '')
  const { data: u } = await admin.auth.getUser(jwt)
  if (!u.user) return json({ error: 'No autenticado' }, 401)
  const { data: me } = await admin.from('profiles').select('role, active').eq('id', u.user.id).maybeSingle()
  if (!me || me.role !== 'admin' || !me.active) return json({ error: 'Solo el administrador puede hacer esto' }, 403)

  const body = await req.json().catch(() => null)
  if (!body || typeof body.action !== 'string') return json({ error: 'Petición inválida' }, 400)

  if (body.action === 'create') {
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const name = String(body.display_name ?? '').trim()
    const role = body.role === 'admin' ? 'admin' : 'member'
    if (!EMAIL.test(email)) return json({ error: 'Ese correo no parece válido' }, 400)
    if (password.length < 8 || password.length > 72) return json({ error: 'La contraseña debe tener entre 8 y 72 caracteres' }, 400)
    if (name.length < 2 || name.length > 60) return json({ error: 'El nombre debe tener entre 2 y 60 letras' }, 400)

    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } })
    if (error || !created.user) {
      const dup = /already|registered|exists/i.test(error?.message ?? '')
      return json({ error: dup ? 'Ese correo ya tiene una cuenta' : 'No se pudo crear la cuenta' }, dup ? 409 : 400)
    }
    const { error: pe } = await admin.from('profiles').insert({ id: created.user.id, display_name: name, role })
    if (pe) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: 'No se pudo crear el perfil' }, 500)
    }
    return json({ ok: true, id: created.user.id })
  }

  if (body.action === 'reset_password') {
    const id = String(body.user_id ?? '')
    const password = String(body.password ?? '')
    if (password.length < 8 || password.length > 72) return json({ error: 'La contraseña debe tener entre 8 y 72 caracteres' }, 400)
    const { data: target } = await admin.from('profiles').select('id').eq('id', id).maybeSingle()
    if (!target) return json({ error: 'No existe ese miembro' }, 404)
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return json({ error: 'No se pudo cambiar la contraseña' }, 400)
    return json({ ok: true })
  }

  return json({ error: 'Acción desconocida' }, 400)
})
