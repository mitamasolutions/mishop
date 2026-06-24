#!/usr/bin/env node
/**
 * Normaliza el nombre de la última migración generada por Prisma al formato
 * corto definido en `docs/arch/migration_naming_convention.md`:
 *
 *   <YYYYMMDDHHMM>_sprint<N>_<entidad>
 *
 * Uso:
 *   node tools/rename-last-migration.mjs --entity <entidad> [--sprint <N>] [--yes]
 *
 * Flags:
 *   --entity   snake_case de la tabla/agregado principal (obligatorio).
 *   --sprint   número del sprint del ROADMAP (sprint1, sprint2, …). Si se
 *              omite, se intenta inferir leyendo la última migración existente
 *              y se solicita confirmación interactiva.
 *   --yes      no preguntar; falla si falta información.
 *
 * Verifica:
 *   - El nombre actual NO está ya normalizado.
 *   - El timestamp largo es de 14 dígitos (formato Prisma).
 *   - El minuto resultante no colisiona con otra carpeta (regla "+1 minuto").
 *
 * No toca `_prisma_migrations`: asume que la migración aún no se aplicó en
 * ningún entorno desplegado. Para renombrar migraciones ya aplicadas, ver
 * `lib/data/scripts/rename-migrations.sql` y `docs/DEPLOY.md`.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(scriptDir, '..');
const migrationsDir = path.join(repoRoot, 'lib', 'db', 'prisma', 'schema', 'migrations');

const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const SHORT_FORMAT = /^\d{12}_sprint\d+_[a-z0-9_]+$/;
const LONG_FORMAT = /^(\d{14})_(.*)$/;

function parseArgs(argv) {
  const args = { entity: null, sprint: null, yes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--entity') args.entity = argv[++i];
    else if (a === '--sprint') args.sprint = argv[++i];
    else if (a === '--yes' || a === '-y') args.yes = true;
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Argumento desconocido: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

function printHelp() {
  console.log(
    'Uso: node tools/rename-last-migration.mjs --entity <entidad> [--sprint <N>] [--yes]',
  );
}

function listMigrationDirs() {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function findLastUnnormalized(dirs) {
  // Última (lex max) con formato largo (14 dígitos).
  for (let i = dirs.length - 1; i >= 0; i -= 1) {
    if (LONG_FORMAT.test(dirs[i]) && !SHORT_FORMAT.test(dirs[i])) return dirs[i];
  }
  return null;
}

function inferSprintFromSiblings(dirs) {
  // Lee la última carpeta ya normalizada y devuelve su número de sprint.
  for (let i = dirs.length - 1; i >= 0; i -= 1) {
    const m = dirs[i].match(/^\d{12}_sprint(\d+)_/);
    if (m) return Number(m[1]);
  }
  return null;
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function buildShortName(longTimestamp, sprintN, entity, existing) {
  // <YYYYMMDDHHMM> = primeros 12 dígitos del timestamp largo.
  let stamp = longTimestamp.slice(0, 12);
  // Desempate por minuto frente a carpetas ya existentes.
  const taken = new Set(
    existing.map((n) => {
      const m = n.match(/^(\d{12})_/);
      return m ? m[1] : null;
    }).filter(Boolean),
  );
  while (taken.has(stamp)) {
    stamp = bumpMinute(stamp);
  }
  return `${stamp}_sprint${sprintN}_${entity}`;
}

function bumpMinute(stamp) {
  // stamp = YYYYMMDDHHMM
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(4, 6)) - 1;
  const day = Number(stamp.slice(6, 8));
  const hour = Number(stamp.slice(8, 10));
  const min = Number(stamp.slice(10, 12));
  const d = new Date(Date.UTC(year, month, day, hour, min + 1));
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.entity) {
    console.error('Falta --entity <snake_case>.');
    process.exit(1);
  }
  if (!SNAKE_CASE.test(args.entity)) {
    console.error(`--entity inválido: "${args.entity}". Debe ir en snake_case.`);
    process.exit(1);
  }

  if (!fs.existsSync(migrationsDir)) {
    console.error(`No existe ${migrationsDir}`);
    process.exit(1);
  }

  const dirs = listMigrationDirs();
  const target = findLastUnnormalized(dirs);
  if (!target) {
    console.error(
      'No se encontró ninguna migración con timestamp de 14 dígitos pendiente de renombrar.',
    );
    process.exit(1);
  }

  let sprintN = args.sprint ? Number(args.sprint) : null;
  if (!Number.isFinite(sprintN) || sprintN <= 0) {
    const inferred = inferSprintFromSiblings(dirs);
    if (args.yes) {
      if (!inferred) {
        console.error('No pude inferir --sprint y --yes prohíbe preguntar.');
        process.exit(1);
      }
      sprintN = inferred;
    } else {
      const suggested = inferred ?? 1;
      const answer = await ask(
        `Número de sprint para "${target}" [${suggested}]: `,
      );
      sprintN = Number(answer || suggested);
      if (!Number.isFinite(sprintN) || sprintN <= 0) {
        console.error('Sprint inválido.');
        process.exit(1);
      }
    }
  }

  const [, longTimestamp] = target.match(LONG_FORMAT);
  const newName = buildShortName(longTimestamp, sprintN, args.entity, dirs.filter((d) => d !== target));

  const from = path.join(migrationsDir, target);
  const to = path.join(migrationsDir, newName);
  if (fs.existsSync(to)) {
    console.error(`Ya existe ${to}; revisa colisiones de minuto manualmente.`);
    process.exit(1);
  }

  fs.renameSync(from, to);
  console.log(`Renombrado:\n  ${target}\n→ ${newName}`);
  console.log(
    '\nRecuerda añadir el header SQL trazabilidad (Sprint/F<fase>/r<req>/Spec) en migration.sql.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
