// Construit les pages finales à partir de src/ : insère le modèle Excel (base64).
//  - generateur-import-csv.html : fichier autonome à ouvrir dans un navigateur ;
//  - dist/artifact.html : même page sans <html>/<head>/<body>, pour la publication sur claude.ai.
// Usage : node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/generateur.src.html'), 'utf8');
const tpl = readFileSync(join(root, 'ref/Modele_Fichier-de-travail-import-WF_JL0926.xlsx'));
const marker = '/*__TEMPLATE_B64__*/""';
if (!src.includes(marker)) throw new Error('marqueur du modèle introuvable');
const out = src.replace(marker, () => JSON.stringify(tpl.toString('base64')));
writeFileSync(join(root, 'generateur-import-csv.html'), out);

const artifact = out
  .replace(/^<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/, '')
  .replace(/<\/head>\s*<body>\s*/, '\n')
  .replace(/\s*<\/body>\s*<\/html>\s*$/, '\n');
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/artifact.html'), artifact);
console.log(`generateur-import-csv.html : ${(out.length / 1024).toFixed(0)} Ko ; dist/artifact.html`);
