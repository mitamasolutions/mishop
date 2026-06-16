#!/usr/bin/env node
// Rewrite cross-feature imports from '@mitama/<sibling>' to relative paths
// within features/src. Keeps @mitama/core|contracts|db|config|payment_* intact.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const FEATURES = new Set([
  'activity-log','auth','cart','catalog','customers','giftcards','inventory',
  'orders','payments','promotions','reference-data','reviews','scheduled-tasks',
  'settings','shipping','stores','taxes',
]);

const root = path.resolve('features/src');
const files = execSync(`find ${root} -type f -name '*.ts'`).toString().trim().split('\n');

const importRe = /from\s+['"]@mitama\/([a-z-]+)['"]/g;

let total = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = path.relative(root, file); // e.g. orders/foo/bar.ts
  const myFeature = rel.split('/')[0];
  let changed = false;
  const out = src.replace(importRe, (match, name) => {
    if (!FEATURES.has(name)) return match; // core/contracts/db/etc stay
    if (name === myFeature) return match;  // shouldn't happen
    // Compute relative path from file's dir to features/src/<name>
    const target = path.join(root, name);
    let r = path.relative(path.dirname(file), target);
    if (!r.startsWith('.')) r = './' + r;
    changed = true;
    return `from '${r}'`;
  });
  if (changed) { writeFileSync(file, out); total++; }
}
console.log(`Rewrote imports in ${total} files`);
