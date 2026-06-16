#!/usr/bin/env node
/**
 * Generador de módulos: `yarn new:module <nombre>`.
 * Crea packages/modules/<nombre> con las capas hexagonales completas,
 * un caso de uso de ejemplo y su test in-memory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const name = process.argv[2];
if (!name || !KEBAB_CASE.test(name)) {
  console.error('Uso: yarn new:module <nombre>');
  console.error('El nombre debe ir en kebab-case: pagos, gift-cards, envios...');
  process.exit(1);
}

const pascal = name
  .split('-')
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join('');
const constName = name.replaceAll('-', '_').toUpperCase();

const templateDir = path.join(scriptDir, 'templates', 'module');
const targetDir = path.join(scriptDir, '..', 'packages', 'modules', name);

if (fs.existsSync(targetDir)) {
  console.error(`El módulo "${name}" ya existe en packages/modules/${name}`);
  process.exit(1);
}

const replaceTokens = (text) =>
  text.replaceAll('__name__', name).replaceAll('__Name__', pascal).replaceAll('__CONST__', constName);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, replaceTokens(entry.name));
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.writeFileSync(to, replaceTokens(fs.readFileSync(from, 'utf8')));
    }
  }
}

copyDir(templateDir, targetDir);

console.log(`✔ Módulo @mitama/${name} creado en packages/modules/${name}`);
console.log('');
console.log('Siguientes pasos:');
console.log('  1. yarn install                  # registra el workspace nuevo');
console.log(`  2. Registra ${pascal}Module en apps/api/src/app.module.ts`);
console.log(`  3. Crea su schema en packages/db/prisma/schema/${name}.prisma`);
console.log('  4. Reemplaza el adapter in-memory de infra/ por uno de Prisma cuando toque persistir');
console.log('');
console.log(`Prueba el módulo: yarn workspace @mitama/${name} test`);
