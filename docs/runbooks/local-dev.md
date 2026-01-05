# Runbook: desarrollo local

## Requisitos

- Node + pnpm
- Expo Go (movil)

## Comandos

- App: `pnpm dev:app`
- API: `pnpm dev:api`
- Admin: `pnpm dev:admin`
- Reset: `pnpm db:reset`

## Backend local desde el movil

- Usa la IP local de tu maquina (ej. `http://192.168.1.209:3001`) en la configuracion de la app.
- Comprueba que el movil y el ordenador estan en la misma red.

## Debug

- Flipper: logs + network
- Dev screens: DB Viewer / Outbox / Packs / Export
