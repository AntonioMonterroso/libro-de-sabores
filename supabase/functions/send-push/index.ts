// Envía Web Push a la familia cuando se publica una receta.
// Lo dispara un trigger de la base de datos (ver 0003_push_trigger.sql) con un secreto compartido.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type Sub = { id: string; endpoint: string; p256dh: string; auth: string }

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 })
  }
  const { record } = await req.json()
  if (!record?.id || record.status !== 'published') return Response.json({ sent: 0, skipped: 'no publicada' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

  const { data: author } = await admin.from('profiles').select('display_name').eq('id', record.author_id).maybeSingle()
  const { data: subs } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').neq('user_id', record.author_id)

  const payload = JSON.stringify({
    title: 'Nueva receta en el libro',
    body: `${author?.display_name ?? 'Alguien'} compartió: ${record.title}`,
    url: `#/receta/${record.id}`,
    tag: `receta-${record.id}`,
  })

  let sent = 0
  const dead: string[] = []
  await Promise.all(
    ((subs ?? []) as Sub[]).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 })
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
