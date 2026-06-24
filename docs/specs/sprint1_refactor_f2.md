# sprint1_refactor_f2 — Convención corta de nombres de migración

> **Tipo:** Refactor de convención (no cambia el schema, no añade SQL).
> **Alcance:** `lib/data/prisma/schema/migrations/` y tabla `_prisma_migrations`
> en entornos ya desplegados.
> **Estado:** implementado.

## 1. Resumen ejecutivo

La convención actual de nombres de migración
(`<timestamp14>_sprint<N>_f<fase>_r<requisito>_<descripcion>`) es larga y
ruidosa. La trazabilidad a fase (`f<fase>`) y requisito (`r<requisito>`) ya
existe en commits, `migration.sql` y `docs/specs/`, por lo que duplicarla en
el nombre del archivo solo añade fricción.

Esta spec define una convención más corta y legible:

```
<YYYYMMDDHHMM>_sprint<N>_<entidad>
```

y describe el renombrado atómico de las 7 migraciones del Sprint 1, la
actualización idempotente de la tabla `_prisma_migrations` en entornos
existentes y el hook que mantendrá la convención para migraciones futuras.

## 2. Contexto y motivación

- Las 7 carpetas actuales bajo `lib/data/prisma/schema/migrations/` tienen entre
  35 y 55 caracteres, con segmentos redundantes (`f0_r20`, `f0_r20`,
  `f0_r20`…) que aportan poco al revisar diffs y árboles de archivos.
- El campo `fN` se refiere a fases del Sprint 1 que ya están cerradas; el
  campo `rN` enlaza a una spec que también se referencia explícitamente en el
  encabezado SQL de cada migración.
- El timestamp de Prisma es de 14 dígitos (`YYYYMMDDHHMMSS`); el de segundos
  no aporta orden real (las migraciones del Sprint 1 se crearon todas con
  segundos en `00`) y solo agrega 2 dígitos por carpeta.

## 3. Objetivos y no-objetivos

**Objetivos**

- Reducir el nombre de cada migración al mínimo informativo:
  fecha-hasta-minutos + sprint + entidad afectada.
- Preservar el orden lexicográfico/cronológico de aplicación.
- Mantener `prisma migrate deploy` funcional en entornos ya desplegados sin
  re-aplicar migraciones.
- Documentar la convención en una única ubicación bajo `docs/specs/`.

**No-objetivos**

- No modificar el contenido SQL de ninguna migración existente.
- No tocar `AGENTS.md` ni el `README.md` raíz; la convención permanente
  vive en `docs/arch/migration_naming_convention.md` (ver §11).
- No backportar el cambio a tags publicados.
- No introducir un sistema de versionado paralelo al de Prisma.

## 4. Convención nueva

### 4.1 Formato

```
<YYYYMMDDHHMM>_sprint<N>_<entidad>
```

- `<YYYYMMDDHHMM>` — 12 dígitos, fecha UTC hasta minutos. Sin segundos.
- `sprint<N>` — sprint del ROADMAP en el que se creó la migración
  (`sprint1`, `sprint2`, …). Se determina por la fecha de creación de la
  migración frente a la ventana del sprint declarada en `docs/ROADMAP.md`.
- `<entidad>` — identificador en `snake_case` de la **tabla o agregado
  principal** afectado (p. ej. `orders`, `outbox_events`, `scheduled_tasks`,
  `baseline`).

El nombre aplica al **directorio** que Prisma genera bajo
`lib/data/prisma/schema/migrations/`. Dentro vive exactamente un
`migration.sql` (filename fijo en Prisma); no se introducen ficheros SQL
sueltos al margen de la carpeta.

### 4.2 Reglas

1. **Una sola entidad en el nombre.** Si la migración toca varias tablas, se
   elige la principal (el agregado dueño del cambio); las secundarias quedan
   documentadas solo en el header SQL y en la spec referenciada. No se
   encadenan entidades con guiones.
2. **Sin fase ni requisito en el nombre.** Los campos `fN` y `rN` se
   eliminan del nombre del archivo; siguen viviendo en el header del
   `migration.sql` y en commits/spec.
3. **Desempate por minuto.** Si dos migraciones nuevas cayeran en el mismo
   minuto, la segunda incrementa su minuto en `+1` para preservar el orden
   lexicográfico estricto.
4. **Inmutabilidad post-deploy.** Una migración ya aplicada en cualquier
   entorno no se renombra fuera del proceso de renombrado masivo descrito
   en §6: el renombrado se acompaña siempre de la actualización de
   `_prisma_migrations`.

### 4.3 Ejemplos

| Antes | Después |
|-------|---------|
| `20260614000000_sprint1_f0_r20_baseline` | `202606140000_sprint1_baseline` |
| `20260614010000_sprint1_f0_r20_check_constraints_amounts` | `202606140001_sprint1_amounts` |
| `20260614020000_sprint1_f0_r20_state_checks_and_partial_unique` | `202606140002_sprint1_state_constraints` |
| `20260614030000_sprint1_f2_r13_outbox_events` | `202606140003_sprint1_outbox_events` |
| `20260614040000_sprint1_f0_r20_constraints_followup` | `202606140004_sprint1_constraints_followup` |
| `20260614050000_sprint1_f3_r14_webhook_store_id_close` | `202606140005_sprint1_webhooks` |
| `20260614060000_sprint1_f4_r24_scheduled_tasks` | `202606140006_sprint1_scheduled_tasks` |

> Nota: los minutos se incrementan `+1` por cada migración para preservar el
> orden, dado que todas las originales compartían `HH:00:SS`.

## 5. Header SQL (sin cambios)

Cada `migration.sql` mantiene su bloque de comentarios actual con `Sprint`,
`F<fase>`, `r<requisito>` y `Spec:`. La trazabilidad fina vive ahí, no en el
nombre del archivo.

## 6. Plan de implementación

PR único y atómico:

1. **Renombrar carpetas** en `lib/data/prisma/schema/migrations/` aplicando la
   tabla del §4.3.
2. **Añadir script de mantenimiento** en
   `lib/data/scripts/rename-migrations.sql` con el `UPDATE` idempotente:
   ```sql
   UPDATE _prisma_migrations
   SET migration_name = '202606140000_sprint1_baseline'
   WHERE migration_name = '20260614000000_sprint1_f0_r20_baseline';
   -- ... una sentencia por migración renombrada
   ```
   El script debe poder ejecutarse N veces sin efecto adicional.
3. **Actualizar el README** de migraciones
   (`lib/data/prisma/schema/migrations/README.md`) con la nueva convención y
   la tabla del Sprint 1 renombrada.
4. **Crear el ADR de convención permanente** en
   `docs/arch/migration_naming_convention.md` (ver §11). El presente
   archivo (`sprint1_refactor_f2.md`) actúa como spec del refactor; la
   convención que aplica a futuras migraciones vive en `docs/arch/`.
5. **Hook de post-procesado** para futuras migraciones: ver §7.
6. **CI:** una vez mergeado el PR, el siguiente `db:deploy` en
   staging/producción debe ejecutarse **después** del script de
   mantenimiento (orden documentado en `docs/DEPLOY.md`).

## 7. Hook para migraciones futuras

`yarn db:migrate` (Prisma) seguirá generando carpetas con timestamp de 14
dígitos. Para mantener la convención:

- Añadir un script `tools/rename-last-migration.mjs` que:
  1. Lea el `migration_lock.toml` y la última carpeta creada en
     `lib/data/prisma/schema/migrations/`.
  2. Verifique que aún no está aplicada en ningún entorno (es la última
     entrada local y no figura en `_prisma_migrations` de producción).
  3. Renombre la carpeta al formato corto, pidiendo `<entidad>` de forma
     interactiva si no se pasó como flag (`--entity orders`).
- Documentar su uso en el README de migraciones y como paso opcional en
  `yarn new:feature` cuando la feature incluya schema.

> El hook **no se ejecuta automáticamente** tras `db:migrate` en esta
> iteración para evitar fricción en flujos exploratorios; se invoca a mano
> antes de commitear.

## 8. Compatibilidad y operación

- **Dev:** `yarn db:reset && yarn db:migrate` deja la DB local consistente
  con los nuevos nombres sin pasos extra.
- **Staging/Producción:** ejecutar
  `psql $DATABASE_URL -f lib/data/scripts/rename-migrations.sql` **antes** del
  primer `yarn db:deploy` posterior al merge. El script es idempotente.
- **Entornos efímeros (PR previews):** se resetea la DB, no requiere el
  script de mantenimiento.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Desplegar el PR sin correr el script de mantenimiento en prod → Prisma intenta re-aplicar las 7 migraciones | Bloquear el despliegue añadiendo el comando como **paso explícito y obligatorio** en `docs/DEPLOY.md` y en el runbook del PR. |
| Colisión de minutos al renombrar (todas las originales comparten `HH:00`) | Regla `+1 minuto` del §4.2.3; verificada manualmente en la tabla del §4.3. |
| Pérdida de trazabilidad a fase/requisito | Se conserva en el header SQL y en commits; la tabla del README mantiene columnas `Fase` y `Req.`. |
| Futuras migraciones generadas por Prisma quedan con timestamp largo | Hook §7 + revisión obligatoria en code review. |

## 10. Criterios de aceptación

- [x] Las 7 carpetas del Sprint 1 quedan renombradas al formato corto.
- [x] `lib/data/scripts/rename-migrations.sql` aplica el renombrado en
      `_prisma_migrations` de forma idempotente.
- [x] `lib/data/prisma/schema/migrations/README.md` documenta la nueva
      convención y muestra la tabla del Sprint 1 actualizada.
- [x] `docs/arch/migration_naming_convention.md` existe y describe la
      convención permanente (referenciado desde el README de migraciones).
- [x] Ningún archivo SQL de migración fue modificado en su contenido
      (sólo se ajustó una referencia cruzada en un comentario).
- [ ] `yarn db:reset && yarn db:migrate` en dev queda verde sin diffs
      (validar en entorno local).
- [ ] `yarn db:deploy` contra una DB que ya ejecutó el script de
      mantenimiento no aplica ninguna migración nueva (validar en
      staging).

## 11. Documentación

- **Esta spec** (`docs/specs/sprint1_refactor_f2.md`) describe el refactor
  puntual: qué se renombra, cómo y cuándo. Vive en `docs/specs/` porque es
  trabajo acotado del Sprint 1.
- **Convención permanente** (`docs/arch/migration_naming_convention.md`)
  es un ADR que describe el formato y las reglas para todas las migraciones
  futuras. `docs/arch/` queda establecido como la carpeta donde viven las
  decisiones técnicas transversales del proyecto.
- `AGENTS.md` y el `README.md` raíz **no se modifican**.

## 12. Alternativas consideradas

1. **Mantener el formato actual y solo eliminar `fN`/`rN`.** Rechazado:
   sigue dejando 14 dígitos de timestamp con segundos siempre `00`.
2. **Sustituir el timestamp por un contador incremental
   (`0001_sprint1_baseline`).** Rechazado: Prisma usa el prefijo
   lexicográfico para ordenar y un contador requiere coordinación manual
   en ramas paralelas.
3. **Encadenar varias entidades con guiones cuando la migración toca más
   de una tabla.** Rechazado: rompe la simplicidad buscada; el header SQL
   ya cubre ese caso.
