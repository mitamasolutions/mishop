-- Sprint 1 · F0 · r20 — CHECK de estados cerrados y unicidad parcial
-- Spec: docs/specs/sprint1_r20_db_baseline_constraints.md
-- Sprint 1 (MVP API + Admin) — cerrado. Ver docs/ROADMAP.md.
--
-- CHECK constraints para estados con valores cerrados y unicidad parcial
-- para casos donde un NULL representa un valor concreto ("global").

-- Estados de órdenes
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_status_check" CHECK ("status" IN ('pending', 'confirmed', 'completed', 'cancelled')),
  ADD CONSTRAINT "orders_payment_status_check" CHECK ("payment_status" IN ('pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed', 'voided', 'cancelled')),
  ADD CONSTRAINT "orders_channel_check" CHECK ("channel" IN ('web', 'pos'));

ALTER TABLE "order_state_transitions"
  ADD CONSTRAINT "order_state_transitions_kind_check" CHECK ("kind" IN ('order', 'payment'));

-- Estados de carrito
ALTER TABLE "carts"
  ADD CONSTRAINT "carts_status_check" CHECK ("status" IN ('active', 'expired', 'ordered')),
  ADD CONSTRAINT "carts_checkout_step_check" CHECK ("checkout_step" IN ('cart', 'address', 'shipping', 'payment', 'confirmation')),
  ADD CONSTRAINT "carts_channel_check" CHECK ("channel" IN ('web', 'pos'));

-- Estados de pagos
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_status_check" CHECK ("status" IN ('pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed', 'voided', 'cancelled'));

ALTER TABLE "payment_refunds"
  ADD CONSTRAINT "payment_refunds_status_check" CHECK ("status" IN ('pending', 'succeeded', 'failed'));

ALTER TABLE "payment_webhook_events"
  ADD CONSTRAINT "payment_webhook_events_status_check" CHECK ("status" IN ('received', 'processed', 'failed'));

-- Estados de envíos
ALTER TABLE "shipments"
  ADD CONSTRAINT "shipments_status_check" CHECK ("status" IN ('pending', 'shipped', 'in_transit', 'delivered', 'cancelled'));

-- Modo de captura del método de pago
ALTER TABLE "store_payment_methods"
  ADD CONSTRAINT "store_payment_methods_capture_mode_check" CHECK ("capture_mode" IN ('automatic', 'manual'));

-- Estado de reseñas
ALTER TABLE "product_reviews"
  ADD CONSTRAINT "product_reviews_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'));

-- Unicidad parcial: NULL en composite unique permite duplicados en Postgres.
-- Garantiza un único rol global por (usuario, rol) cuando store_id IS NULL.
CREATE UNIQUE INDEX "user_store_roles_user_id_role_id_global_unique"
  ON "user_store_roles" ("user_id", "role_id")
  WHERE "store_id" IS NULL;

-- Garantiza una única definición global por clave de setting.
CREATE UNIQUE INDEX "settings_key_global_unique"
  ON "settings" ("key")
  WHERE "store_id" IS NULL;
