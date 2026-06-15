# Sprint 1 · r5 — Activity log (activity-log)

> Estado: 🟡 parcial · Origen: `f1-auth-stores-settings-activity-log` · Hito: F1
> Módulo: `packages/modules/activity-log`

## Resumen

Registro inmutable de todas las mutaciones de la API admin (quién, qué, entidad,
cuándo, IP, diff), consultable con filtros y paginación. Las lecturas no se
registran. Equivale a Activity Log de nopCommerce.

## Historia de usuario

> Como super admin, quiero un registro inmutable de todas las mutaciones con su
> autor, entidad y diff, para auditar la operación de cada tienda con
> trazabilidad completa.

## Alcance

**Dentro:**
- Registro automático de mutaciones (create/update/delete) con diff resumido.
- Log inmutable (sin API de edición/borrado).
- Consulta con filtros (usuario, entidad, acción, tienda, rango de fechas),
  paginada.
- Admin: vista de solo lectura del activity log con filtros.

**Fuera:**
- Registro de lecturas.

## Requisitos funcionales

1. Toda mutación (create/update/delete) de la API admin registra: **usuario,
   acción, tipo de entidad, id de entidad, tienda, IP, timestamp** y un **diff
   resumido** de los cambios. Las lecturas **no** se registran.
2. El log es **inmutable**: no existe API para editarlo ni borrarlo.
3. Consulta del log con filtros por usuario, tipo de entidad, acción, tienda y
   rango de fechas, **paginada**.

## Reglas de negocio

- Fallo al escribir el activity log durante una mutación → la mutación falla (el
  log es parte de la transacción); no hay mutaciones sin rastro.
- Las lecturas nunca generan entradas.

## Asunciones

- Activity log automático de mutaciones con diff resumido; inmutable; lecturas no
  logueadas.
- El registro de incidentes de seguridad (p. ej. reuso de refresh rotado) también
  pasa por aquí — ver [[sprint1_r1_auth]].

## Criterios de aceptación

- [ ] Cada mutación de la API admin genera exactamente una entrada con usuario,
      acción, entidad, tienda, IP y timestamp; las lecturas no generan entradas.
- [ ] El log no expone API de edición ni borrado.
- [ ] La consulta filtra por usuario y tienda y pagina correctamente.

## Estado

**Entregado:** entidad `ActivityLogEntry`, adapter Prisma, hook de registro en
los handlers de mutación (auth.login, auth.login_failed, etc.).

**Pendiente:**
- Casos de uso explícitos de consulta/filtros más completos.
- Pantalla admin de auditoría con **filtros y export** (hoy vista básica sin
  filtros) — ver [[sprint1_r23_admin_operativo]].
- Taxonomía de eventos más amplia.
