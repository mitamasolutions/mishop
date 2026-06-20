# Migraciones de base de datos

Todas las migraciones actuales pertenecen al **Sprint 1 (MVP API + Admin)** del
ROADMAP — ver `docs/ROADMAP.md`. El Sprint 1 está **cerrado**: el esquema queda
fijado por estas 7 migraciones y cualquier cambio futuro debe llegar como una
migración nueva siguiendo la convención de nombres descrita abajo.

## Convención de nombres

```
<timestamp>_sprint<N>_f<fase>_r<requisito>_<descripcion_corta>
```

- `<timestamp>` lo genera Prisma (`prisma migrate dev --name ...`). El orden
  lexicográfico determina el orden de aplicación.
- `sprint<N>` indica el sprint del ROADMAP al que pertenece (`sprint1`, `sprint2`, ...).
- `f<fase>` es la fase dentro del sprint (`f0`..`f9`). Las fases del Sprint 1
  están en `docs/ROADMAP.md`.
- `r<requisito>` enlaza con la spec `docs/specs/sprint<N>_r<requisito>_*.md`.
- `<descripcion_corta>` en `snake_case`, máximo ~6 palabras.

Cada `migration.sql` arranca con un bloque de comentarios:

```sql
-- Sprint <N> · F<fase> · r<requisito> — <título corto>
-- Spec: docs/specs/sprint<N>_r<requisito>_<slug>.md
-- Sprint <N> (<nombre>) — <estado>. Ver docs/ROADMAP.md.
```

## Cronología del Sprint 1

| # | Timestamp | Fase | Req. | Carpeta | Spec | Propósito |
|---|-----------|------|------|---------|------|-----------|
| 1 | `20260614000000` | F0 | r20 | `sprint1_f0_r20_baseline` | [sprint1_r20_db_baseline_constraints](../../../../docs/specs/sprint1_r20_db_baseline_constraints.md) | Baseline limpio: enums, tablas y FKs críticas de las 17 features |
| 2 | `20260614010000` | F0 | r20 | `sprint1_f0_r20_check_constraints_amounts` | [sprint1_r20_db_baseline_constraints](../../../../docs/specs/sprint1_r20_db_baseline_constraints.md) | CHECK constraints de montos y cantidades no negativas |
| 3 | `20260614020000` | F0 | r20 | `sprint1_f0_r20_state_checks_and_partial_unique` | [sprint1_r20_db_baseline_constraints](../../../../docs/specs/sprint1_r20_db_baseline_constraints.md) | CHECK de estados cerrados + índices únicos parciales (NULL = global) |
| 4 | `20260614030000` | F2 | r13 | `sprint1_f2_r13_outbox_events` | [sprint1_r13_orders_module](../../../../docs/specs/sprint1_r13_orders_module.md) | Tabla `outbox_events` para despacho transaccional (claim-then-publish) |
| 5 | `20260614040000` | F0 | r20 | `sprint1_f0_r20_constraints_followup` | [sprint1_r20_db_baseline_constraints](../../../../docs/specs/sprint1_r20_db_baseline_constraints.md) | Cierre diferido: unique parcial de handle/SKU, `store_id` transitorio en webhooks, `TaxRule.rate >= 0` |
| 6 | `20260614050000` | F3 | r14 | `sprint1_f3_r14_webhook_store_id_close` | [sprint1_r14_payments](../../../../docs/specs/sprint1_r14_payments.md) | Cierre del modelo webhook: `store_id` NOT NULL y drop del unique legado |
| 7 | `20260614060000` | F4 | r24 | `sprint1_f4_r24_scheduled_tasks` | [sprint1_r24_outbox_worker_observability](../../../../docs/specs/sprint1_r24_outbox_worker_observability.md) | Tabla `scheduled_tasks` y seeds de los 3 jobs por defecto |

## Comandos

```bash
yarn workspace @mitama/db db:migrate   # dev: crea migración a partir del schema
yarn workspace @mitama/db db:deploy    # CI/prod: aplica migraciones pendientes
yarn workspace @mitama/db db:reset     # dev: resetea DB y reaplica todo + seed
yarn workspace @mitama/db db:seed      # carga datos de referencia + tienda demo
```

El seed vive en `lib/db/prisma/seed.ts` (orquestador) + `lib/db/prisma/seed/`
(módulos por dominio).

## Notas operativas

- **No editar** una migración ya aplicada en cualquier entorno; siempre se
  añade una migración nueva con su propio timestamp.
- El archivo `migration_lock.toml` debe permanecer en git; bloquea el provider
  (`postgresql`).
- Las CHECK constraints viven en SQL crudo porque Prisma no las expresa en el
  schema. Mantenerlas sincronizadas con `@@map`/`@map` cuando se renombren
  columnas.
