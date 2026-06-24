# Migraciones de base de datos

Todas las migraciones actuales pertenecen al **Sprint 1 (MVP API + Admin)** del
ROADMAP — ver `docs/ROADMAP.md`. El Sprint 1 está **cerrado**: el esquema queda
fijado por estas 7 migraciones y cualquier cambio futuro debe llegar como una
migración nueva siguiendo la convención de nombres descrita abajo.

## Convención de nombres

```
<YYYYMMDDHHMM>_sprint<N>_<entidad>
```

- `<YYYYMMDDHHMM>` — 12 dígitos, fecha UTC hasta minutos. Sin segundos.
- `sprint<N>` — sprint del ROADMAP al que pertenece (`sprint1`, `sprint2`, …).
- `<entidad>` — identificador en `snake_case` de la tabla o agregado principal
  afectado (p. ej. `orders`, `outbox_events`, `webhooks`, `baseline`).

La convención completa, sus reglas (una sola entidad, desempate por minuto,
inmutabilidad post-deploy) y los ejemplos válidos/inválidos viven en
[`docs/arch/migration_naming_convention.md`](../../../../docs/arch/migration_naming_convention.md).

Cada fila de la tabla de cronología corresponde a una **carpeta** bajo este
directorio; el SQL aplicado vive siempre en `<carpeta>/migration.sql`
(filename fijo en Prisma, no se renombra ni se acompaña de SQL hermanos).

Cada `migration.sql` arranca con un bloque de comentarios que conserva la
trazabilidad fina a fase y requisito (que ya **no** viven en el nombre):

```sql
-- Sprint <N> · F<fase> · r<requisito> — <título corto>
-- Spec: docs/specs/sprint<N>_r<requisito>_<slug>.md
-- Sprint <N> (<nombre>) — <estado>. Ver docs/ROADMAP.md.
```

## Cronología del Sprint 1

| # | Carpeta | Fase | Req. | Spec | Propósito |
|---|---------|------|------|------|-----------|
| 1 | `202606140000_sprint1_baseline` | F0 | r20 | [sprint1_r20_db_baseline_constraints](../../../../docs/specs/sprint1_r20_db_baseline_constraints.md) | Baseline limpio: enums, tablas y FKs críticas de las 17 features |
| 2 | `202606140001_sprint1_amounts` | F0 | r20 | [sprint1_r20_db_baseline_constraints](../../../../docs/specs/sprint1_r20_db_baseline_constraints.md) | CHECK constraints de montos y cantidades no negativas |
| 3 | `202606140002_sprint1_state_constraints` | F0 | r20 | [sprint1_r20_db_baseline_constraints](../../../../docs/specs/sprint1_r20_db_baseline_constraints.md) | CHECK de estados cerrados + índices únicos parciales (NULL = global) |
| 4 | `202606140003_sprint1_outbox_events` | F2 | r13 | [sprint1_r13_orders_module](../../../../docs/specs/sprint1_r13_orders_module.md) | Tabla `outbox_events` para despacho transaccional (claim-then-publish) |
| 5 | `202606140004_sprint1_constraints_followup` | F0 | r20 | [sprint1_r20_db_baseline_constraints](../../../../docs/specs/sprint1_r20_db_baseline_constraints.md) | Cierre diferido: unique parcial de handle/SKU, `store_id` transitorio en webhooks, `TaxRule.rate >= 0` |
| 6 | `202606140005_sprint1_webhooks` | F3 | r14 | [sprint1_r14_payments](../../../../docs/specs/sprint1_r14_payments.md) | Cierre del modelo webhook: `store_id` NOT NULL y drop del unique legado |
| 7 | `202606140006_sprint1_scheduled_tasks` | F4 | r24 | [sprint1_r24_outbox_worker_observability](../../../../docs/specs/sprint1_r24_outbox_worker_observability.md) | Tabla `scheduled_tasks` y seeds de los 3 jobs por defecto |

## Comandos

```bash
yarn workspace @mitama/data db:migrate   # dev: crea migración a partir del schema
yarn workspace @mitama/data db:deploy    # CI/prod: aplica migraciones pendientes
yarn workspace @mitama/data db:reset     # dev: resetea DB y reaplica todo + seed
yarn workspace @mitama/data db:seed      # carga datos de referencia + tienda demo
```

El seed vive en `lib/data/prisma/seed.ts` (orquestador) + `lib/data/prisma/seed/`
(módulos por dominio).

## Crear una migración nueva

1. Editar el schema en `lib/data/prisma/schema/<feature>.prisma`.
2. `yarn workspace @mitama/data db:migrate --name <entidad>` (Prisma genera la
   carpeta con timestamp de 14 dígitos).
3. Normalizar el nombre al formato corto **antes de commitear**:
   ```bash
   node tools/rename-last-migration.mjs --entity <entidad>
   ```
4. Añadir el header SQL trazabilidad (`Sprint`, `F<fase>`, `r<req>`, `Spec`).
5. Commitear carpeta renombrada + cambios de schema.

## Mantenimiento en entornos desplegados

Si un PR renombra carpetas de migraciones ya aplicadas (caso del refactor del
Sprint 1), hay que actualizar `_prisma_migrations` **antes** del próximo
`prisma migrate deploy`. El script idempotente vive en
`lib/data/scripts/rename-migrations.sql`:

```bash
psql "$DATABASE_URL" -f lib/data/scripts/rename-migrations.sql
```

Ver `docs/DEPLOY.md` para el orden exacto del despliegue.

## Notas operativas

- **No editar** una migración ya aplicada en cualquier entorno; siempre se
  añade una migración nueva con su propio timestamp.
- El archivo `migration_lock.toml` debe permanecer en git; bloquea el provider
  (`postgresql`).
- Las CHECK constraints viven en SQL crudo porque Prisma no las expresa en el
  schema. Mantenerlas sincronizadas con `@@map`/`@map` cuando se renombren
  columnas.
