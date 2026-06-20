-- Sprint 1 · F3 · r14 — Cierre del modelo de webhook por tienda
-- Spec: docs/specs/sprint1_r14_payments.md
-- Sprint 1 (MVP API + Admin) — cerrado. Ver docs/ROADMAP.md.
--
-- Cierra la deuda transitoria de F0 (r20):
-- 1. Hace `store_id` NOT NULL (debe estar poblado; en dev se asume tabla
--    vacía porque MP real aún no había emitido eventos).
-- 2. Dropea el unique legado `(provider_code, event_id)` que dejaba
--    colisionar eventos entre tiendas.
-- 3. La unicidad ya es exclusivamente `(store_id, provider_code, event_id)`
--    (índice creado en `20260614040000_sprint1_f0_r20_constraints_followup`).

-- 1. Si quedaron filas viejas sin store_id, las purgamos (eventos
--    huérfanos de provider antes de F3 sin valor operativo).
DELETE FROM "payment_webhook_events" WHERE "store_id" IS NULL;

ALTER TABLE "payment_webhook_events"
  ALTER COLUMN "store_id" SET NOT NULL;

-- 2. Drop del unique legado.
DROP INDEX IF EXISTS "payment_webhook_events_provider_code_event_id_key";
