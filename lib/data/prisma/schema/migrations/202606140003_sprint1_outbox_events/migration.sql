-- Sprint 1 · F2 · r13 — Tabla outbox_events para despacho transaccional
-- Spec: docs/specs/sprint1_r13_orders_module.md
-- Sprint 1 (MVP API + Admin) — cerrado. Ver docs/ROADMAP.md.
--
-- Soporta el patrón outbox transaccional de orders: los eventos se
-- persisten en la misma transacción que el agregado y se despachan vía
-- claim-then-publish desde features/src/orders/infra/prisma-outbox-dispatcher.ts.

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "store_id" TEXT,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 10,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatched_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_events_dispatched_at_created_at_idx" ON "outbox_events"("dispatched_at", "created_at");
