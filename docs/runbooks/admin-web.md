# Runbook: Admin web

## Objetivo

Consultar la fuente de la verdad (Supabase) de forma agil desde escritorio.

## Arranque

```bash
pnpm dev:api
pnpm dev:admin
```

## Variables de entorno (admin)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Flujo

- La web admin consulta a la API (no a Supabase directo) para mantener seguridad.
- Usa el selector de tienda para cargar el pack con `/admin/pack?storeId=...`.
- El selector se alimenta con `/admin/stores`.
- Inicia sesion con email/password para autenticar las llamadas.
- Solo usuarios con rol `admin_god` pueden usar esta web.

## Rol admin_god

```sql
INSERT INTO user_roles (user_id, role_id, store_id, scope)
SELECT 'USER_UUID'::uuid, r.id, NULL, 'global'
FROM roles r
WHERE r.key = 'admin_god'
ON CONFLICT (user_id, role_id, store_id) DO NOTHING;
```

## Notas

- Si cambia el API base, recarga los stores automaticamente.
- CORS habilitado para `localhost:5173/5174`.
