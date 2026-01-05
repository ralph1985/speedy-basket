# Runbook: Admin web

## Objetivo

Consultar la fuente de la verdad (Supabase) de forma agil desde escritorio.

## Arranque

```bash
pnpm dev:api
pnpm dev:admin
```

## Flujo

- La web admin consulta a la API (no a Supabase directo) para mantener seguridad.
- Usa el selector de tienda para cargar el pack con `/pack?storeId=...`.
- El selector se alimenta con `/stores`.
- Necesitas un access token en el campo "Auth token" para autenticar las llamadas.

## Notas

- Si cambia el API base, recarga los stores automaticamente.
- CORS habilitado para `localhost:5173/5174`.
