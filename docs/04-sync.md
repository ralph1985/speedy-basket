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

Incluye:

- products (genericos)
- product_translations (nombre por locale)
- product_variants (marca + ean)

## API (write)

- POST /products (auth requerida): crea producto generico (name, category?).
  - tambien crea la traduccion en el locale enviado.
- POST /lists (auth requerida): crea cesta (name, storeId?).
- POST /lists/:id/items (auth requerida): agrega item (productId? o label).
- PATCH /lists/:id/items/:itemId (auth requerida): marca comprado (checked).
- POST /lists/:id/members (auth requerida): comparte con otro usuario (userId, role).

## API (read)

- GET /categories?lang=es|en (auth requerida): lista categorias base + del usuario.
- GET /lists (auth requerida): lista cestas del usuario.
- GET /lists/:id/items?lang=es|en (auth requerida): items con nombre traducido.

## Offline-first (app)

- Productos y cestas se crean en SQLite con ids locales negativos.
- En Sync:
  - Se envian productos locales y se remapean ids en SQLite.
  - Se envian cestas e items pendientes cuando ya existe el id remoto.
- La UI muestra "pendiente de sync" para productos locales.

## Conflictos

- Se resuelven en backend:
  - recencia + cantidad de confirmaciones
  - confidence decay por tiempo
