# ADR — Convención de nombres de migración Prisma

> **Tipo:** Decisión técnica permanente (Architecture Decision Record).
> **Ámbito:** `lib/data/prisma/schema/migrations/`.
> **Estado:** vigente.
> **Spec del refactor inicial:** [`docs/specs/sprint1_refactor_f2.md`](../specs/sprint1_refactor_f2.md).

## 1. Decisión

Toda migración Prisma del repositorio se nombra siguiendo el formato:

```
<YYYYMMDDHHMM>_sprint<N>_<entidad>
```

- `<YYYYMMDDHHMM>` — 12 dígitos, fecha UTC hasta minutos. **Sin segundos.**
- `sprint<N>` — sprint del ROADMAP (`docs/ROADMAP.md`) al que pertenece la
  migración (`sprint1`, `sprint2`, …). Se determina por la fecha de creación
  frente a la ventana del sprint.
- `<entidad>` — identificador en `snake_case` de la **tabla o agregado
  principal** afectado (p. ej. `orders`, `outbox_events`, `scheduled_tasks`,
  `baseline`, `webhooks`).

El nombre aplica al **directorio** que Prisma crea bajo
`lib/data/prisma/schema/migrations/`. Dentro de ese directorio vive **exactamente
un archivo `migration.sql`**: ese filename es fijo en Prisma y no se renombra
ni se acompaña de SQL hermanos. La convención no introduce ficheros sueltos al
margen de la carpeta.

## 2. Contexto

Históricamente las migraciones usaron el formato largo
`<timestamp14>_sprint<N>_f<fase>_r<requisito>_<descripcion>`, heredado del
plan de endurecimiento del Sprint 1. Los campos `f<fase>` y `r<requisito>`
duplican información que ya vive en:

- El header SQL de cada `migration.sql` (`-- Sprint N · F<fase> · r<req> — …`).
- Los commits del PR que introdujo la migración.
- La spec correspondiente en `docs/specs/sprint<N>_r<req>_*.md`.

Mantener esa duplicación en el nombre del archivo añade ruido visual sin
aportar trazabilidad adicional. Los segundos del timestamp tampoco son
informativos (siempre `00` en el Sprint 1).

## 3. Reglas de uso

1. **Una sola entidad en el nombre.** Si la migración toca varias tablas,
   se elige la principal (el agregado dueño del cambio). Las secundarias se
   listan en el header SQL, no en el nombre.
2. **No incluir** `f<fase>` ni `r<requisito>` en el nombre. Esa
   trazabilidad va en el header SQL y en la spec.
3. **Desempate por minuto.** Si dos migraciones nuevas caen en el mismo
   minuto (escenario raro en la práctica), la segunda incrementa su minuto
   en `+1` para preservar el orden lexicográfico estricto que Prisma usa
   para aplicar.
4. **Inmutabilidad post-deploy.** Una migración ya aplicada en cualquier
   entorno **no se renombra** salvo por una operación masiva acompañada de
   la actualización de `_prisma_migrations` (ver §5).
5. **`snake_case`** para `<entidad>`: minúsculas, separación con `_`, sin
   acentos ni guiones. Máximo ~3 palabras.
6. **Una carpeta = una migración = un único `migration.sql`.** No se crean
   ficheros SQL hermanos dentro del directorio ni subdirectorios. Si el
   cambio es grande, se parte en migraciones independientes, cada una con
   su propio directorio y timestamp.

## 4. Header SQL obligatorio

Cada `migration.sql` mantiene su bloque de comentarios; la trazabilidad
fina vive ahí, **no** en el nombre del archivo:

```sql
-- Sprint <N> · F<fase> · r<requisito> — <título corto>
-- Spec: docs/specs/sprint<N>_r<requisito>_<slug>.md
-- Sprint <N> (<nombre>) — <estado>. Ver docs/ROADMAP.md.
```

## 5. Cambios en migraciones ya aplicadas

Renombrar el directorio de una migración rompe `_prisma_migrations`. Cuando
sea inevitable hacerlo (p. ej. refactor de convención):

1. Renombrar la carpeta en `lib/data/prisma/schema/migrations/`.
2. Crear/actualizar un script idempotente en `lib/data/scripts/` con los
   `UPDATE _prisma_migrations SET migration_name = …` correspondientes.
3. Ejecutar ese script **antes** del próximo `prisma migrate deploy` en
   cada entorno desplegado (documentar el paso en `docs/DEPLOY.md` y en el
   runbook del PR).

## 6. Flujo recomendado para crear una migración

1. Editar el schema en `lib/data/prisma/schema/<feature>.prisma`.
2. `yarn db:migrate --name <entidad>` (Prisma genera carpeta con
   timestamp de 14 dígitos).
3. Ejecutar `node tools/rename-last-migration.mjs --entity <entidad>` para
   normalizar el nombre al formato corto **antes de commitear**.
   - Verifica que la migración no esté aplicada en producción.
   - Calcula `sprint<N>` a partir de la fecha y la ventana declarada en
     `docs/ROADMAP.md`.
4. Añadir el header SQL del §4.
5. Commitear carpeta renombrada + cualquier ajuste de schema.

> El renombrado **no se hace automáticamente** tras `db:migrate` para no
> entorpecer flujos exploratorios. Es responsabilidad del autor del PR
> dejarlo normalizado.

## 7. Ejemplos válidos

Cada celda es el nombre de la **carpeta** bajo
`lib/data/prisma/schema/migrations/`; el SQL aplicado vive en
`<carpeta>/migration.sql`.

| Carpeta | Por qué |
|---------|---------|
| `202606140000_sprint1_baseline` | Baseline inicial; entidad = `baseline`. |
| `202606140003_sprint1_outbox_events` | Tabla nueva `outbox_events`. |
| `202607010000_sprint2_storefront_sessions` | Sesiones del storefront público. |
| `202611150000_sprint3_pos_terminals` | Registro de terminales POS. |

## 8. Ejemplos inválidos

| Carpeta | Razón del rechazo |
|---------|-------------------|
| `20260614000000_sprint1_baseline` | Timestamp de 14 dígitos (con segundos). |
| `202606140000_sprint1_f0_r20_baseline` | Incluye `fN` y `rN`. |
| `202606140000_sprint1_orders_and_payments` | Más de una entidad encadenada. |
| `202606140000_sprint1_Orders` | No es `snake_case`. |
| `2026-06-14-0000_sprint1_baseline` | Separadores fuera de norma. |

## 9. Relación con otras decisiones

- ROADMAP de sprints: `docs/ROADMAP.md` (fuente de verdad de la ventana
  temporal de cada sprint).
- Specs por requisito: `docs/specs/sprint<N>_r<req>_*.md`.
- Refactor que originó esta convención:
  `docs/specs/sprint1_refactor_f2.md`.
