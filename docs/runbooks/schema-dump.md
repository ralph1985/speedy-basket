# Runbook: regenerar schema de Supabase

## Objetivo

Generar un dump de esquema (solo DDL) para versionarlo en git sin datos.

## Opcion A (recomendada): pg_dump directo

1. Consigue la "Direct connection string" en Supabase:
   Project Settings -> Database -> Connection string -> Direct.
   Usa puerto 5432 y `sslmode=require`.

2. Exporta la variable de entorno (o usa `.env` en la raiz):

```bash
export SUPABASE_DB_URL="<CONNECTION_URI>"
```

3. Ejecuta:

```bash
pnpm db:schema-dump
```

Alternativa directa:

```bash
pg_dump --dbname "$SUPABASE_DB_URL" --schema-only --file docs/db/supabase_schema.sql
```

Notas:

- Si el password tiene caracteres especiales, aplica URL-encoding.
- Esto no necesita Docker.

## Opcion B: supabase CLI (requiere Docker)

```bash
supabase db dump --db-url "<CONNECTION_URI_ENCODED>" --file supabase_schema.sql
```

Notas:

- La URI debe ir percent-encoded.
- Asegurate de tener Docker Desktop en marcha.

## Verificacion rapida

- Revisa el diff de `docs/db/supabase_schema.sql` antes de commitear.
- No subas dumps con datos.
