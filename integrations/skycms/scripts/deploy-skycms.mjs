import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const coreDist = resolve(__dirname, '../../../packages/core/dist');
const targetDir = resolve(__dirname, '../../../../../SkyCMS/Editor/wwwroot/lib/grapesjs');
const integrationDist = resolve(__dirname, '../dist');

const files = [
  ['grapes.min.js', 'grapes.min.js'],
  ['grapes.min.js.map', 'grapes.min.js.map'],
  ['grapes.mjs', 'grapes.mjs'],
  ['grapes.mjs.map', 'grapes.mjs.map'],
  ['css/grapes.min.css', 'css/grapes.min.css'],
];

const integrationFiles = [['skycms-grapes-plugins.iife.js', 'skycms-grapes-plugins.js']];

mkdirSync(resolve(targetDir, 'css'), { recursive: true });

for (const [sourceRelPath, destRelPath] of files) {
  const src = resolve(coreDist, sourceRelPath);
  const dest = resolve(targetDir, destRelPath);

  if (!existsSync(src)) {
    console.error(`Missing build artifact: ${src}`);
    console.error('Run "pnpm -C integrations/skycms build:stock" first.');
    process.exit(1);
  }

  copyFileSync(src, dest);
  console.log(`Deployed: ${dest}`);
}

for (const [sourceRelPath, destRelPath] of integrationFiles) {
  const src = resolve(integrationDist, sourceRelPath);
  const dest = resolve(targetDir, destRelPath);

  if (!existsSync(src)) {
    console.error(`Missing integration artifact: ${src}`);
    console.error('Run "pnpm -C integrations/skycms build:lib" first.');
    process.exit(1);
  }

  copyFileSync(src, dest);
  console.log(`Deployed: ${dest}`);
}
