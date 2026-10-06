# Libro de Sabores

Recetario familiar instalable (PWA). Vite + React + TypeScript + Tailwind 4, Supabase (Postgres, Auth, Storage, Edge Functions) y GitHub Pages.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # llena con los valores de tu proyecto de Supabase
npm run dev
```

## Base de datos

```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy send-push --no-verify-jwt --use-api
```

Secretos de la función (`supabase secrets set`): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `WEBHOOK_SECRET`.
El mismo `WEBHOOK_SECRET` se guarda en la tabla `private_config` (clave `webhook_secret`); nunca en el repositorio.

## Publicación

Cada push a `main` publica en GitHub Pages. Variables del repositorio (Settings → Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
