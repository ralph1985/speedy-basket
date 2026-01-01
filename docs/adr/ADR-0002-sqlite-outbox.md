# ADR-0002: SQLite + Outbox events

## Decision
SQLite local como fuente de UX; sync por outbox de eventos + deltas.

## Motivo
- Offline-first real
- Evita conflictos complejos

## Consecuencias
- Hay que implementar pack versioning y procesos de consolidacion en backend
