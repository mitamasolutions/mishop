-- Sprint 1 · F4 · r24 — Tareas programadas in-app (estilo nopCommerce)
-- Spec: docs/specs/sprint1_r24_outbox_worker_observability.md
-- Sprint 1 (MVP API + Admin) — cerrado. Ver docs/ROADMAP.md.
--
-- Modelo `scheduled_tasks` con nombre único, tipo (handler), intervalo en
-- segundos, marcas de tiempo de la última ejecución y último error. La
-- administración (habilitar/deshabilitar, editar intervalo, ejecutar ahora)
-- queda exclusiva para Super Admin (controller en F4b o F5).

CREATE TABLE "scheduled_tasks" (
  "id"               TEXT PRIMARY KEY,
  "name"             TEXT NOT NULL,
  "type"             TEXT NOT NULL,
  "seconds"          INTEGER NOT NULL,
  "enabled"          BOOLEAN NOT NULL DEFAULT TRUE,
  "stop_on_error"    BOOLEAN NOT NULL DEFAULT FALSE,
  "last_start_utc"   TIMESTAMP(3),
  "last_end_utc"     TIMESTAMP(3),
  "last_success_utc" TIMESTAMP(3),
  "last_error"       TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scheduled_tasks_seconds_positive_check" CHECK ("seconds" > 0)
);

CREATE UNIQUE INDEX "scheduled_tasks_name_key" ON "scheduled_tasks" ("name");
CREATE INDEX "scheduled_tasks_enabled_last_start_utc_idx"
  ON "scheduled_tasks" ("enabled", "last_start_utc");

-- Seeds por defecto (intervalos del plan F4):
INSERT INTO "scheduled_tasks" ("id", "name", "type", "seconds", "enabled") VALUES
  (gen_random_uuid()::text, 'Despacho de outbox', 'dispatch-outbox', 60, TRUE),
  (gen_random_uuid()::text, 'Drenado de cola de emails', 'drain-email-queue', 60, TRUE),
  (gen_random_uuid()::text, 'Liberación de reservas vencidas', 'release-expired-reservations', 300, TRUE);
