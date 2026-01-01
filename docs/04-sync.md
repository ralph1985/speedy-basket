# Sync

## Eventos (movil -> backend)
Tipos:
- FOUND(productId, storeId, zoneId?)
- NOT_FOUND(productId, storeId)
- SCANNED_EAN(ean, storeId, zoneId?)

Reglas:
- Idempotencia: event.id unico
- Batch: hasta N eventos por request

## Packs (backend -> movil)
- GET /stores/:id/pack?since=version
Respuesta:
- version
- delta: upserts/deletes por tabla logica
- checksum/hash

## Conflictos
- Se resuelven en backend:
  - recencia + cantidad de confirmaciones
  - confidence decay por tiempo
