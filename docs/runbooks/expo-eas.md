# Runbook: Expo + EAS

## Estado

- Proyecto enlazado a EAS.
- `apps/mobile/app.json` contiene `extra.eas.projectId` y `owner`.

## Como se enlazo el proyecto

Desde la raiz del repo:

```bash
npx eas-cli@latest init --id b8ac149c-79a4-48f5-96d2-0afd8133acb6
```

## Notas

- El `projectId` no es secreto; es metadato publico del proyecto.
- Para builds en la nube, usa `eas build` cuando lo necesites.
