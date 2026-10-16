// Construit le fichier HTML autonome : insère le modèle Excel (base64) dans la page.
// Usage : node tools/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/generateur.src.html'), 'utf8');
const tpl = readFileSync(join(root, 'ref/Modele_Fichier-de-travail-import-WF_JL0926.xlsx'));
const marker = '/*__TEMPLATE_B64__*/""';
if (!src.includes(marker)) throw new Error('marqueur du modèle introuvable');
const out = src.replace(marker, () => JSON.stringify(tpl.toString('base64')));
writeFileSync(join(root, 'generateur-import-csv.html'), out);
console.log(`generateur-import-csv.html : ${(out.length / 1024).toFixed(0)} Ko`);
