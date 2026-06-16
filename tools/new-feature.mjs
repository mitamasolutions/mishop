#!/usr/bin/env node
/**
 * Generador de features: `yarn new:feature <nombre>`.
 * Crea features/src/<nombre>/ con las capas hexagonales completas,
 * un caso de uso de ejemplo y su test in-memory. La feature vive dentro
 * del paquete consolidado `@mitama/features`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const name = process.argv[2];
if (!name || !KEBAB_CASE.test(name)) {
  console.error('Uso: yarn new:feature <nombre>');
  console.error('El nombre debe ir en kebab-case: pagos, gift-cards, envios...');
  process.exit(1);
}

const pascal = name
  .split('-')
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join('');
const constName = name.replaceAll('-', '_').toUpperCase();

const templateDir = path.join(scriptDir, 'templates', 'feature');
const repoRoot = path.join(scriptDir, '..');
const targetDir = path.join(repoRoot, 'features', 'src', name);
const featuresIndex = path.join(repoRoot, 'features', 'src', 'index.ts');

if (fs.existsSync(targetDir)) {
  console.error(`La feature "${name}" ya existe en features/src/${name}`);
  process.exit(1);
}

const replaceTokens = (text) =>
  text.replaceAll('__name__', name).replaceAll('__Name__', pascal).replaceAll('__CONST__', constName);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, replaceTokens(entry.name));
    if (entry.isDirectory()) copyDir(from, to);
    else fs.writeFileSync(to, replaceTokens(fs.readFileSync(from, 'utf8')));
  }
}

copyDir(templateDir, targetDir);

console.log(`✔ Feature ${name} creada en features/src/${name}`);
console.log('');
console.log('Siguientes pasos:');
console.log(`  1. Re-exporta el módulo desde features/src/index.ts:`);
console.log(`       export { ${pascal}Module } from './${name}';`);
console.log(`  2. Registra ${pascal}Module en apps/api/src/app.module.ts`);
console.log(`  3. Si necesita persistencia: crea lib/db/prisma/schema/${name}.prisma y corre yarn db:migrate`);
console.log('  4. Reemplaza el adapter in-memory por uno de Prisma en infra/');
console.log('');
console.log(`Index del barrel ya disponible en: ${path.relative(repoRoot, featuresIndex)}`);
console.log('Tests: yarn workspace @mitama/features test');
