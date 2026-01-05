# Runbook: desarrollo local

## Requisitos

- Node + pnpm
- Expo Go (movil)

## Comandos

- App: `pnpm dev:app`
- API: `pnpm dev:api`
- Admin: `pnpm dev:admin`
- Reset: `pnpm db:reset`
- Seed: `pnpm db:seed`
- Export pack (desde Supabase): `pnpm --filter api exec tsx scripts/export-pack.ts`

## Backend local desde el movil

- Usa la IP local de tu maquina (ej. `http://192.168.1.209:3001`) en la configuracion de la app.
- Comprueba que el movil y el ordenador estan en la misma red.
- Para la web admin, usa `http://127.0.0.1:3001` o selecciona el preset Local.

## Auth (Supabase)

- Configura `SUPABASE_JWKS_URL` en el entorno del API.
- En Supabase, usa el Discovery URL y busca el campo `jwks_uri`.
- En la app, pega el access token en Dev > Auth token.
- En admin web, pega el token en el campo "Auth token".
- En mobile, define `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Obtener access token (password grant)

```bash
curl -X POST \
  'https://<project-ref>.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

## Debug

- Flipper: logs + network
- Dev screens: DB Viewer / Outbox / Packs / Export
