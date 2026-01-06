# Repository Guidelines

## Project Structure & Module Organization

- Monorepo con pnpm workspaces (`pnpm-workspace.yaml`).
- Apps:
  - `apps/mobile`: app Expo/React Native.
  - `apps/api`: API Fastify + Postgres.
  - `apps/admin`: panel web (Vite + Chakra).
- Paquetes compartidos en `packages/` (actualmente `packages/shared`).
- Docs y runbooks en `docs/`.

## Build, Test, and Development Commands

- `pnpm dev:app`: arranca la app móvil.
- `pnpm dev:api`: arranca la API.
- `pnpm dev:admin`: arranca el panel admin.
- `pnpm build`: build del API.
- `pnpm typecheck`: typecheck de mobile + API.
- `pnpm lint` / `pnpm format`: lint y formato.
- `pnpm db:schema-dump`: genera `docs/db/supabase_schema.sql` desde Supabase.

## Supabase Schema Sync

- Siempre que haya cambios en la base de datos de Supabase, ejecuta `pnpm db:schema-dump`
  y versiona el resultado en `docs/db/supabase_schema.sql`.
- La variable `SUPABASE_DB_URL` debe estar en `.env` o en el entorno.

## Dependency Management

- Usa versiones fijas (sin `^`) en `package.json` al añadir dependencias.

## Commit & Pull Request Guidelines

- Commits con convención `conventional-changelog` (ej. `feat:`, `fix:`, `chore:`).
- Mensajes de commit en inglés.
- Solo crear commits si el usuario lo pide explícitamente.

## Estilo y formato

- ESLint y Prettier están configurados en la raíz.
- Ejecuta `pnpm lint` y `pnpm format` según haga falta.

## Security & Configuration Tips

- No subas `.env` ni credenciales; usa `.env.example` como referencia.

## Gestión de tareas y horas

- Los ficheros viven dos niveles por encima de este repo: `../../dashboard/data/`.
- Al empezar, identifica el proyecto (nombre) y su `projectId` en `../../dashboard/data/projects.json`.
- Busca si ya existe una tarea "En curso" para ese trabajo; si existe, registra horas y notas ahí.
- Si no existe, crea una nueva con `npm run task:add` (o edita a mano manteniendo `dd/mm/aaaa` y ids incrementales).
- Las tareas viven en `../../dashboard/data/projects-tasks.json` (campos clave: `projectId`, `ownerId`, `status`, `startDate`, `endDate`).
- Las horas se registran en `../../dashboard/data/task-entries.json` (entries por tarea y fecha).
- Las notas se registran en `../../dashboard/data/task-notes.json` (notas por tarea y fecha).
- Los responsables viven en `../../dashboard/data/people.json`.
- Los to-dos por proyecto viven en `../../dashboard/data/project-todos.json` (`projectId`, `title`, `dueDate` opcional).
- TickTick puede asociarse a proyectos vía `../../dashboard/data/projects.json` (`ticktickProjectId`).
- Revisa regularmente los TODO/FIXME en el código (búsqueda de patrones `TODO`/`FIXME`) y recuerda planificar su resolución en próximas tareas.
