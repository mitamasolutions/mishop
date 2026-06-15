-- Sprint 1 · F0 · r20 — Constraints de integridad
--
-- 1. Unicidad parcial de handle/SKU sobre filas activas (deleted_at IS NULL):
--    permite reutilizar el handle o SKU después de un soft-delete.
-- 2. storeId en PaymentWebhookEvent + unicidad multi-tenant: evita colisiones
--    de eventId entre tiendas. La columna se crea nullable; F3 (r14) la hará
--    NOT NULL al derivarla desde el Payment y dropeará el unique legado.
-- 3. CHECK rate >= 0 en TaxRule.

-- 1. Product.handle: unicidad parcial sobre filas activas
DROP INDEX IF EXISTS "products_handle_key";

CREATE UNIQUE INDEX "products_handle_active_unique"
  ON "products" ("handle")
  WHERE "deleted_at" IS NULL;

-- 1b. ProductVariant.sku: unicidad parcial sobre filas activas
DROP INDEX IF EXISTS "product_variants_sku_key";

CREATE UNIQUE INDEX "product_variants_sku_active_unique"
  ON "product_variants" ("sku")
  WHERE "deleted_at" IS NULL;

-- 2. PaymentWebhookEvent: añadir store_id (nullable transitorio) + unique multi-tenant
ALTER TABLE "payment_webhook_events"
  ADD COLUMN "store_id" TEXT;

CREATE UNIQUE INDEX "payment_webhook_events_store_id_provider_code_event_id_key"
  ON "payment_webhook_events" ("store_id", "provider_code", "event_id");

-- 3. TaxRule.rate >= 0
ALTER TABLE "tax_rules"
  ADD CONSTRAINT "tax_rules_rate_nonneg_check" CHECK ("rate" >= 0);
