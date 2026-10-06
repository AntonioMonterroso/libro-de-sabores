// Envía Web Push solo a las personas indicadas (invitados de un evento). Lo llama la base de datos.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type Sub = { id: string; endpoint: string; p256dh: string; auth: string }

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 })
  const { user_ids, title, body, url, tag } = await req.json()
  if (!Array.isArray(user_ids) || user_ids.length === 0) return Response.json({ sent: 0 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
  const { data: subs } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id', user_ids)

  const payload = JSON.stringify({ title, body, url, tag })
  let sent = 0
  const dead: string[] = []
  await Promise.all(
    ((subs ?? []) as Sub[]).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 })
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.push(s.id)
      }
    }),
  )
  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead)
  return Response.json({ sent, removed: dead.length })
})
