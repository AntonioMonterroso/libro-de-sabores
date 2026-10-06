/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

self.skipWaiting()
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Recetas ya vistas: sin red siguen disponibles
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/rest/v1/') && url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({ cacheName: 'libro-api', networkTimeoutSeconds: 4, plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 14 * 24 * 3600 })] }),
)

// Fotos: la URL firmada cambia en cada visita, así que se guarda por ruta (sin el token)
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/sign/'),
  new CacheFirst({
    cacheName: 'libro-fotos',
    plugins: [
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 3600, purgeOnQuotaError: true }),
      { cacheKeyWillBeUsed: async ({ request }) => { const u = new URL(request.url); u.search = ''; return u.href } },
    ],
  }),
)

type PushPayload = { title: string; body?: string; url?: string; tag?: string }

self.addEventListener('push', (event) => {
  let data: PushPayload = { title: 'Libro de Sabores' }
  try { data = { ...data, ...(event.data?.json() as PushPayload) } } catch { /* sin datos */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url ?? './' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data?.url as string) ?? './', self.registration.scope).href
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of wins) {
        if (w.url.startsWith(self.registration.scope)) {
          await w.focus()
          await w.navigate(target)
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
