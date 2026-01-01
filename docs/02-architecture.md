# Arquitectura

## Componentes
- App (RN/Expo) + SQLite local
- API (REST)
- Postgres (central)
- Generacion de packs (versionado/deltas)

## Flujo offline-first
1) App usa SQLite siempre.
2) Acciones -> outbox_events
3) Con red: POST /events (batch)
4) App descarga delta: GET /pack?since=V

## Principios
- El movil NO escribe "estado final" central.
- Solo manda eventos; el backend consolida.
