-- Mantenimiento idempotente: renombra las entradas de `_prisma_migrations`
-- para alinearse con la convención corta definida en
-- `docs/arch/migration_naming_convention.md` (refactor: docs/specs/sprint1_refactor_f2.md).
--
-- Ejecutar UNA vez por entorno desplegado **antes** del próximo
-- `prisma migrate deploy` posterior al merge del refactor.
-- Re-ejecutable: el WHERE filtra por el nombre antiguo, así que tras la
-- primera corrida los UPDATE siguientes no afectan filas.
--
-- Uso:
--   psql "$DATABASE_URL" -f lib/db/scripts/rename-migrations.sql

BEGIN;

UPDATE _prisma_migrations
SET migration_name = '202606140000_sprint1_baseline'
WHERE migration_name = '20260614000000_sprint1_f0_r20_baseline';

UPDATE _prisma_migrations
SET migration_name = '202606140001_sprint1_amounts'
WHERE migration_name = '20260614010000_sprint1_f0_r20_check_constraints_amounts';

UPDATE _prisma_migrations
SET migration_name = '202606140002_sprint1_state_constraints'
WHERE migration_name = '20260614020000_sprint1_f0_r20_state_checks_and_partial_unique';

UPDATE _prisma_migrations
SET migration_name = '202606140003_sprint1_outbox_events'
WHERE migration_name = '20260614030000_sprint1_f2_r13_outbox_events';

UPDATE _prisma_migrations
SET migration_name = '202606140004_sprint1_constraints_followup'
WHERE migration_name = '20260614040000_sprint1_f0_r20_constraints_followup';

UPDATE _prisma_migrations
SET migration_name = '202606140005_sprint1_webhooks'
WHERE migration_name = '20260614050000_sprint1_f3_r14_webhook_store_id_close';

UPDATE _prisma_migrations
SET migration_name = '202606140006_sprint1_scheduled_tasks'
WHERE migration_name = '20260614060000_sprint1_f4_r24_scheduled_tasks';

COMMIT;
