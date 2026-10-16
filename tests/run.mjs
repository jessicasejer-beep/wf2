// Tests de bout en bout (Playwright + Chromium).
// Usage : node tests/run.mjs   (après node tools/build.mjs)
// Les bibliothèques cdnjs sont servies depuis tests/vendor/ (voir README).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = pw;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Page servie en HTTP local (le presse-papiers n'est pas autorisé en file://)
const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(readFileSync(join(root, 'generateur-import-csv.html')));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const page_url = origin + '/generateur-import-csv.html';
const work = process.env.WF_TEST_DIR || mkdtempSync(join(tmpdir(), 'wf-import-'));
mkdirSync(work, { recursive: true });
const FX = join(work, 'fx');
execFileSync('python3', ['-I', join(root, 'tests/make_fixtures.py'), FX]);
const exampleCsv = readFileSync(join(root, 'ref/import.csv'));

let pass = 0, fail = 0;
const failures = [];
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; failures.push(label); console.log('  ✗ ' + label + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 400) : '')); }
}
async function section(name, fn) {
  console.log('\n■ ' + name);
  try { await fn(); } catch (e) { fail++; failures.push(name + ' (exception)'); console.log('  ✗ exception : ' + (e.stack || e)); }
}

// Copies locales des bibliothèques cdnjs (téléchargées une fois)
const vendor = join(root, 'tests/vendor');
mkdirSync(vendor, { recursive: true });
for (const [f, u] of [['xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'], ['jszip.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js']]) {
  if (!existsSync(join(vendor, f))) writeFileSync(join(vendor, f), Buffer.from(await (await fetch(u)).arrayBuffer()));
}

const browser = await chromium.launch();
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: opts.viewport || { width: 1366, height: 860 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
  await ctx.route('https://cdnjs.cloudflare.com/**', route => {
    const u = route.request().url();
    if (opts.blockLibs) return route.abort();
    const f = u.includes('xlsx') ? 'xlsx.full.min.js' : 'jszip.min.js';
    return route.fulfill({ path: join(root, 'tests/vendor', f), contentType: 'application/javascript' });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(page_url);
  if (!opts.blockLibs) await page.waitForFunction(() => window.__libs.xlsx === 'ok' && window.__libs.jszip === 'ok');
  return { ctx, page, errors };
}
const rowsOf = page => page.evaluate(() => window.__wf.S.rows.filter(r => r.some(v => v !== '')).map(r => r.slice()));
const val = page => page.evaluate(() => { const v = window.__wf.S.val; return { errors: v.errors.map(e => ({ r: e.r, c: e.c, kind: e.kind, msg: e.msg, lvl: e.lvl })), warnings: v.warnings.map(e => ({ r: e.r, c: e.c, kind: e.kind, msg: e.msg })), nonEmpty: v.nonEmpty }; });
async function importFile(page, path, accept = true) {
  await page.setInputFiles('#inImport', path);
  await page.waitForTimeout(200);
  if (await page.isVisible('#confirmDlg')) await page.click(accept ? '#confirmOk' : '#confirmNo');
  await page.waitForTimeout(200);
}async function downloadCsv(page) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bCsv')]);
  ok(dl.suggestedFilename() === 'import.csv', 'nom du fichier téléchargé = import.csv', dl.suggestedFilename());
  const p = join(work, 'dl-' + Date.now() + '.csv'); await dl.saveAs(p);
  return readFileSync(p);
}
const fullRow = (over = {}) => {
  const r = ['f.pdf', 'Titre', '', '', 'Niveau 1', '', '', 'Cat', '', 'image', 'ELE', '1', '', '', '', 'FR', '0', '0', '', '', '', '', ''];
  for (const [k, v] of Object.entries(over)) r[+k] = v;
  return r;
};
async function setRows(page, rows) {
  await page.evaluate(rows => { const S = window.__wf.S; S.rows = rows.map(r => r.slice()); window.__wf.refreshAll(true); }, rows);
}

/* ---------------------------------------------------------------- */
await section('Chargement de la page', async () => {
  const { page, errors, ctx } = await newPage();
  ok(await page.title() === 'Générateur import.csv', 'titre de la page');
  ok((await page.textContent('header')).includes('Aucun envoi de données'), "mention « aucun envoi » dans l'en-tête");
  ok(await page.locator('#cardA button, #cardA label.btn').count() === 1, 'carte « zéro » : un seul bouton');
  ok((await page.textContent('#cardA')).includes('Choisir un dossier'), 'bouton « Choisir un dossier »');
  ok((await page.textContent('#cardB')).includes('Importer un fichier Excel ou CSV') && (await page.textContent('#cardB')).includes('Facultatif : choisir aussi le dossier des fichiers'), 'carte « vérifier » : deux boutons');
  ok(await page.locator('#headRow th').count() === 24, '23 colonnes + numéro de ligne dans l\'en-tête');
  const reqHead = await page.$$eval('#headRow th.req', ths => ths.map(t => +t.dataset.c));
  ok(JSON.stringify(reqHead) === JSON.stringify([0, 1, 4, 7, 9, 10, 11, 15, 16, 17]), 'colonnes obligatoires en bleu (1,2,5,8,10,11,12,16,17,18)', reqHead);
  const hdr = await page.evaluate(() => window.__wf.CSV_HEADER.join('¤'));
  ok(Buffer.from(hdr, 'latin1').equals(exampleCsv.subarray(0, exampleCsv.indexOf(0x0d))), "en-tête CSV identique à l'exemple (octets)");
  ok(await page.evaluate(() => window.__wf.PICTOS.length) === 46, '46 pictos');
  ok(await page.isDisabled('#bCsv'), 'bouton import.csv désactivé quand le tableau est vide');
  const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  ok(noHScroll, 'pas de défilement horizontal de la page (1366 px)');
  const fits = await page.evaluate(() => { const w = document.getElementById('gridWrap'); return w.scrollWidth <= w.clientWidth + 1; });
  ok(fits, 'tableau sans défilement horizontal (1366 px)');
  const empties = await page.evaluate(() => window.__wf.S.rows.every(r => r.every(v => v === '')));
  ok(empties, 'aucune cellule pré-remplie');
  ok(errors.length === 0, 'aucune erreur JavaScript', errors);
  await ctx.close();
});

await section('Écran 13" (1280 × 720) et thème sombre', async () => {
  const { page, ctx } = await newPage({ viewport: { width: 1280, height: 720 } });
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'pas de défilement horizontal de page à 1280 px');
  ok(await page.evaluate(() => { const w = document.getElementById('gridWrap'); return w.scrollWidth <= w.clientWidth + 1; }), 'tableau sans défilement horizontal à 1280 px');
  const minW = await page.$$eval('#cols col', cs => Math.min(...cs.slice(1).map(c => parseInt(c.style.width))));
  ok(minW >= 44, 'largeur minimale de colonne ≥ 44 px', minW);
  const bg1 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#themeBtn');
  const bg2 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(bg1 !== bg2, 'bascule de thème clair / sombre', [bg1, bg2]);
  await ctx.close();
});

await section('Lecture d\'un dossier de 30 fichiers (« Je commence de zéro »)', async () => {
  const { page, ctx, errors } = await newPage();
  await page.setInputFiles('#inFolderA', join(FX, 'folder30'));
  await page.waitForTimeout(300);
  const rows = await rowsOf(page);
  ok(rows.length === 30, '30 lignes créées, une par fichier', rows.length);
  const names = rows.map(r => r[0]);
  ok(names.includes('annexe.pdf'), 'fichier du sous-dossier gardé par son nom seul');
  ok(!names.some(n => /DS_Store|Thumbs|desktop\.ini|^~\$|^\.|import\.csv|^\._/.test(n)), 'fichiers système, cachés, ~$ et import.csv ignorés', names);
  ok(names.indexOf('doc2.pdf') < names.indexOf('doc10.pdf'), 'ordre naturel (doc2 avant doc10)');
  ok(names.includes('Élève fiche.docx') && names.includes('Vidéo intro.mp4'), 'noms accentués conservés');
  ok(rows.every(r => r.slice(1).every(v => v === '')), 'seule la colonne « Nom du fichier » est remplie');
  const box = await page.textContent('#boxA');
  ok(/sous-dossier/.test(box) && /racine de l'archive/.test(box), 'avertissement sous-dossiers visible', box);
  ok(/ignoré/.test(box), 'fichiers ignorés signalés');
  ok(await page.getAttribute('#boxA', 'class') === 'box ok', 'encadré vert (tous les noms existent)', await page.getAttribute('#boxA', 'class'));
  const v = await val(page);
  ok(v.errors.some(e => e.kind === 'req1'), 'colonnes obligatoires vides signalées');
  ok(errors.length === 0, 'aucune erreur JavaScript', errors);
  await ctx.close();
});

await section('Lecture d\'archives .zip (classique, zip64, CP437)', async () => {
  const { page, ctx } = await newPage();
  for (const [file, expect] of [['archive.zip', ['a2.pdf', 'a10.pdf', 'été.mp4']], ['archive64.zip', ['z1.pdf', 'z2.pdf', 'z10.pdf']], ['cp437.zip', ['fiche_élève.pdf']]]) {
    const b64 = readFileSync(join(FX, file)).toString('base64');
    const names = await page.evaluate(async ([b64, file]) => {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const f = new File([bin], file);
      return window.__wf.processPaths(await window.__wf.readZipNames(f)).names;
    }, [b64, file]);
    ok(JSON.stringify(names) === JSON.stringify(expect), `${file} → ${expect.join(', ')}`, names);
  }
  await ctx.close();
});

await section("Aller-retour sur l'exemple import.csv (octets identiques)", async () => {
  const { page, ctx } = await newPage();
  await importFile(page, join(root, 'ref/import.csv'));
  const rows = await rowsOf(page);
  ok(rows.length === 5, '5 ressources importées', rows.length);
  ok((await page.textContent('#boxImport')).includes('¤'), 'séparateur ¤ détecté');
  const v = await val(page);
  ok(v.errors.length === 0, "l'exemple ne contient aucune erreur bloquante", v.errors);
  ok(await page.isEnabled('#bCsv'), 'bouton import.csv actif');
  const bytes = await downloadCsv(page);
  ok(bytes.equals(exampleCsv), 'octets identiques à l\'exemple', { got: bytes.length, exp: exampleCsv.length });
  ok(bytes.includes(Buffer.from([0xe9])) && !bytes.includes(Buffer.from([0xc3, 0xa9])), 'encodage Latin-1 (é = 0xE9, pas de UTF-8)');
  const lines = bytes.toString('latin1').split('\r\n');
  ok(lines[lines.length - 1] === '' && !bytes.toString('latin1').replace(/\r\n/g, '').includes('\n'), 'fins de ligne CRLF uniquement');
  ok(lines.slice(0, -1).every(l => l !== '' && l.split('¤').length === 23), '23 colonnes par ligne, aucune ligne vide');
  await ctx.close();
});

await section('Import CSV point-virgule (UTF-8, guillemets, uuid ignoré)', async () => {
  const { page, ctx } = await newPage();
  await importFile(page, join(FX, 'semicolon.csv'));
  const rows = await rowsOf(page);
  ok(rows.length === 2, '2 ressources (ligne vide ignorée)', rows.length);
  ok(rows[0][1] === 'Fiche « un » ; avec point-virgule' && rows[1][1] === 'Titre "cité"', 'guillemets et ; dans une cellule', rows.map(r => r[1]));
  ok(rows.every(r => r[22] === ''), 'uuid vidé');
  const box = await page.textContent('#boxImport');
  ok(/point-virgule/.test(box) && /uuid ignorée/.test(box), 'séparateur et uuid ignoré annoncés', box);
  await ctx.close();
});

await section('Import Excel (choix de l\'onglet A1 = « Nom du fichier »)', async () => {
  const { page, ctx } = await newPage();
  await importFile(page, join(FX, 'travail.xlsx'));
  await page.waitForTimeout(300);
  const rows = await rowsOf(page);
  ok(rows.length === 2, '2 ressources depuis l\'onglet « Travail »', rows);
  ok(rows[0][11] === '1' && rows[0][18] === '12' && rows[0][21] === '800/600', 'nombres lus comme texte', rows[0]);
  ok(rows[0][22] === '', 'uuid ignoré');
  const v = await val(page);
  const o = v.errors.find(e => e.r === 1 && e.c === 17);
  ok(o && /lettre O/.test(o.msg), 'lettre « O » au lieu de 0 signalée comme erreur', o);
  ok((await page.textContent('#boxImport')).includes('Travail'), 'onglet utilisé annoncé');
  await ctx.close();
});

await section('Contrôles : chaque type d\'erreur', async () => {
  const { page, ctx } = await newPage();
  await setRows(page, [
    fullRow(),                                                      // 0 valide
    fullRow({ 0: 'g.pdf', 9: 'imgae', 10: 'eleve', 15: 'fr', 20: 'Extrait' }), // 1 hors liste
    fullRow({ 0: 'f.pdf' }),                                        // 2 doublon fichier (avec 0)
    fullRow({ 0: 'h.pdf', 1: 'Titre' }),                            // 3 doublon titre
    fullRow({ 0: 'sansextension' }),                                // 4 extension
    fullRow({ 0: 'http://exemple.fr/x' }),                          // 5 http
    fullRow({ 0: 'https://exemple.fr/ressource', 1: 'Lien' }),      // 6 URL valide
    fullRow({ 0: 'i.pdf', 1: 'Titre ✓ coché' }),                    // 7 latin-1
    fullRow({ 0: 'j.pdf', 1: "L’intégrale du livre du professeur", 4: '' }), // 8 exception colonne 5
    fullRow({ 0: 'k.pdf', 1: 'Autre', 4: '' }),                     // 9 colonne 5 manquante
    fullRow({ 0: 'l.pdf', 1: 'L2', 12: 'audio.wav', 21: '800x600' }), // 10 extension compagnon + iFrame
    fullRow({ 0: 'm.pdf', 1: 'M', 11: 'O', 3: '2' }),               // 11 0/1
    fullRow({ 0: 'dossier/n.pdf', 1: 'N' }),                        // 12 chemin
    fullRow({ 0: 'o.pdf', 1: 'O', 9: 'Image' }),                    // 13 casse
  ]);
  const v = await val(page);
  const has = (r, c, kind, re) => v.errors.some(e => e.r === r && e.c === c && (!kind || e.kind === kind) && (!re || re.test(e.msg)));
  const hasW = (r, c, re) => v.warnings.some(e => e.r === r && e.c === c && (!re || re.test(e.msg)));
  ok(!v.errors.some(e => e.r === 0 && e.kind !== 'dup'), 'ligne valide sans autre erreur');
  ok(has(1, 9, 'list', /Vouliez-vous dire « image »/), 'picto hors liste + suggestion');
  ok(has(1, 10, 'list') && has(1, 15, 'list', /« FR »/) && has(1, 20, 'list', /« extrait »/), 'profil / langue / watermark hors liste');
  ok(has(0, 0, 'dup') && has(2, 0, 'dup'), 'doublon de nom de fichier bloquant (orange)');
  ok(v.errors.find(e => e.r === 2 && e.c === 0).lvl === 'dup', 'niveau « doublon » (orange)');
  ok(hasW(0, 1, /Titre identique/) && hasW(3, 1), 'doublon de titre = avertissement');
  ok(has(4, 0, 'format', /extension/), 'extension manquante');
  ok(has(5, 0, 'format', /https/), 'adresse http:// refusée');
  ok(!v.errors.some(e => e.r === 6), 'adresse https:// acceptée');
  ok(has(7, 1, 'latin1', /U\+2713/), 'caractère hors Latin-1 bloquant');
  ok(!has(8, 4), "colonne 5 non exigée pour « L'intégrale du livre du professeur » (apostrophe typographique)");
  ok(has(9, 4, 'req4'), 'colonne 5 exigée sinon');
  ok(hasW(10, 12, /\.mp3/) && hasW(10, 21, /800\/600/), 'extension compagnon et format iFrame = avertissements');
  ok(has(11, 11, 'list', /lettre O/) && has(11, 3, 'list'), 'O et 2 refusés dans les colonnes 0/1');
  ok(has(12, 0, 'format', /racine/), 'chemin dans le nom refusé');
  ok(has(13, 9, 'list', /exactement « image »/), 'majuscules / minuscules signalées');
  ok(await page.isDisabled('#bCsv'), 'téléchargement bloqué tant qu\'il reste des erreurs');
  const alertTxt = await page.textContent('#alertBox');
  ok(/erreurs bloquantes/.test(alertTxt) && await page.getAttribute('#alertBox', 'role') === 'alert', 'bandeau rouge role="alert"');
  ok(await page.locator('#alertBox .chip').count() > 0, 'pastilles de synthèse');
  ok(await page.locator('#body td.c-dup').count() === 2 && await page.locator('#body td.c-err').count() > 0 && await page.locator('#body td.c-warn').count() > 0, 'couleurs rouge / orange / jaune dans le tableau');
  // Erreur suivante
  await page.click('#alertBox [data-act="next"]');
  const s1 = await page.evaluate(() => ({ ...window.__wf.S.sel }));
  await page.click('#alertBox [data-act="next"]');
  const s2 = await page.evaluate(() => ({ ...window.__wf.S.sel }));
  ok(JSON.stringify(s1) !== JSON.stringify(s2), '« Erreur suivante » avance', [s1, s2]);
  // Filtre lignes à corriger
  await page.check('#onlyErr');
  const shown = await page.locator('#body tr').count();
  ok(shown < 14 && shown > 0, 'case « Seulement les lignes à corriger »', shown);
  await page.uncheck('#onlyErr');
  await ctx.close();
});

await section('Contrôle par rapport au dossier (vérifier un travail)', async () => {
  const { page, ctx } = await newPage();
  await setRows(page, [fullRow({ 0: 'doc1.pdf', 1: 'A' }), fullRow({ 0: 'doc01.pdf', 1: 'B' }), fullRow({ 0: 'DOC2.PDF', 1: 'C' }), fullRow({ 0: 'doc3.pdf', 1: 'D', 12: 'audio_ch1.mp3', 13: 'absent.vtt' })]);
  await page.setInputFiles('#inFolderB', join(FX, 'folder30'));
  await page.waitForTimeout(300);
  const v = await val(page);
  const miss = v.errors.filter(e => e.kind === 'missing');
  ok(miss.some(e => e.r === 1 && /Vouliez-vous dire « doc1\.pdf »/.test(e.msg)), 'nom introuvable + suggestion (Levenshtein)', miss);
  ok(miss.some(e => e.r === 2 && /majuscules/.test(e.msg)), 'différence de majuscules signalée');
  ok(miss.some(e => e.r === 3 && e.c === 13) && !miss.some(e => e.r === 3 && e.c === 12), 'fichiers compagnons vérifiés');
  ok(await page.getAttribute('#boxB', 'class') === 'box bad', 'encadré rouge');
  ok(/3\s+noms introuvables/.test(await page.textContent('#boxB')), 'nombre de noms introuvables', await page.textContent('#boxB'));
  // Ajouter les fichiers absents
  await setRows(page, [fullRow({ 0: 'doc1.pdf', 1: 'A' })]);
  const cls = await page.getAttribute('#boxB', 'class');
  ok(cls === 'box mid', 'encadré jaune : fichiers du dossier absents du tableau', cls);
  await page.click('#boxB [data-act="addExtra"]');
  const rows = await rowsOf(page);
  ok(rows.length === 30 && rows.filter(r => r[0] === 'doc1.pdf').length === 1, 'bouton « Ajouter ces N fichiers au tableau »', rows.length);
  ok(await page.getAttribute('#boxB', 'class') === 'box ok', 'encadré vert ensuite');
  await ctx.close();
});

await section('Saisie au clavier, collage depuis Excel, Ctrl+D, Suppr, annuler', async () => {
  const { page, ctx } = await newPage();
  await page.setInputFiles('#inFolderA', join(FX, 'folder30'));
  await page.waitForTimeout(200);
  // Collage multi-cellules (TSV Excel) en B1
  await page.click('#c0_1');
  const tsv = 'Titre A\tAlt A\r\nTitre B\tAlt B\r\n"Titre ""C""\nsur deux lignes"\tAlt C\r\n';
  await page.evaluate(t => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.getElementById('gridWrap').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); }, tsv);
  let rows = await page.evaluate(() => window.__wf.S.rows.slice(0, 3).map(r => [r[1], r[2]]));
  ok(JSON.stringify(rows) === JSON.stringify([['Titre A', 'Alt A'], ['Titre B', 'Alt B'], ['Titre "C"\nsur deux lignes', 'Alt C']]), 'collage d\'un bloc 3×2', rows);
  // Ctrl+V réel (presse-papiers système)
  await page.evaluate(() => navigator.clipboard.writeText('X1\tX2\nY1\tY2'));
  await page.click('#c5_5');
  await page.keyboard.press('Control+V');
  rows = await page.evaluate(() => window.__wf.S.rows.slice(5, 7).map(r => [r[5], r[6]]));
  ok(JSON.stringify(rows) === JSON.stringify([['X1', 'X2'], ['Y1', 'Y2']]), 'Ctrl+V depuis le presse-papiers', rows);
  // Une valeur collée sur une sélection multiple
  await page.click('#c0_7'); await page.click('#c9_7', { modifiers: ['Shift'] });
  await page.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/plain', 'Exercices\r\n'); document.getElementById('gridWrap').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); });
  rows = await page.evaluate(() => window.__wf.S.rows.slice(0, 11).map(r => r[7]));
  ok(rows.slice(0, 10).every(x => x === 'Exercices') && rows[10] === '', 'valeur unique recopiée dans chaque cellule sélectionnée', rows);
  // Copier vers Excel
  await page.click('#c0_1'); await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Control+C');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok(clip === 'Titre A\tAlt A\r\nTitre B\tAlt B', 'Ctrl+C produit du TSV', clip);
  // Saisie directe + Entrée
  await page.click('#c3_4');
  await page.keyboard.type('Chapitre 1');
  await page.keyboard.press('Enter');
  ok(await page.evaluate(() => window.__wf.S.rows[3][4]) === 'Chapitre 1', 'saisie directe');
  ok(await page.evaluate(() => window.__wf.S.sel.fr) === 4, 'Entrée descend');
  // Ctrl+D depuis la ligne du dessus
  await page.keyboard.press('Control+D');
  ok(await page.evaluate(() => window.__wf.S.rows[4][4]) === 'Chapitre 1', 'Ctrl+D recopie vers le bas');
  // Sélection de colonne + Ctrl+D (première ligne de la sélection)
  await page.click('#c3_4'); await page.click('#c8_4', { modifiers: ['Shift'] });
  await page.keyboard.press('Control+D');
  ok(await page.evaluate(() => window.__wf.S.rows.slice(3, 9).every(r => r[4] === 'Chapitre 1')), 'Ctrl+D sur une plage');
  // Suppr
  await page.keyboard.press('Delete');
  ok(await page.evaluate(() => window.__wf.S.rows.slice(3, 9).every(r => r[4] === '')), 'Suppr efface la sélection');
  await page.keyboard.press('Control+Z');
  ok(await page.evaluate(() => window.__wf.S.rows[8][4]) === 'Chapitre 1', 'Ctrl+Z annule');
  await page.keyboard.press('Control+Y');
  ok(await page.evaluate(() => window.__wf.S.rows[8][4]) === '', 'Ctrl+Y rétablit');
  // Menu déroulant picto
  await page.click('#c0_9');
  await page.keyboard.press('Alt+ArrowDown');
  ok(await page.isVisible('#popup'), 'liste déroulante (Alt+↓)');
  ok(await page.locator('#popup .opt').count() === 46, '46 pictos dans la liste');
  await page.waitForTimeout(400);
  ok(await page.locator('#popup .opt img').count() > 40, 'icônes des pictos (onglet « pictos » du modèle)', await page.locator('#popup .opt img').count());
  await page.keyboard.type('vid');
  await page.keyboard.press('Enter');
  ok(await page.evaluate(() => window.__wf.S.rows[0][9]) === 'video', 'filtrage + Entrée choisit « video »');
  await page.click('#c1_9');
  await page.click('#c1_9 .dd-arrow');
  await page.click('#popup .opt:has-text("audio_classe")');
  ok(await page.evaluate(() => window.__wf.S.rows[1][9]) === 'audio_classe', 'flèche ▾ + clic sur une option');
  // Suggestions de valeurs déjà saisies
  await page.click('#c12_7');
  await page.keyboard.type('Exer');
  ok(await page.isVisible('#popup') && (await page.textContent('#popup')).includes('Exercices'), 'suggestions sur Catégorie');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  ok(await page.evaluate(() => window.__wf.S.rows[12][7]) === '', 'Échap annule la saisie');
  // uuid non modifiable
  await page.click('#c0_22'); await page.keyboard.type('abc');
  ok(await page.evaluate(() => window.__wf.S.rows[0][22]) === '', 'uuid non modifiable');
  // Lignes : insérer / monter / supprimer
  const before = await page.evaluate(() => window.__wf.S.rows.length);
  await page.click('#c1_1'); await page.click('#bInsert');
  ok(await page.evaluate(() => window.__wf.S.rows.length) === before + 1 && await page.evaluate(() => window.__wf.S.rows[2].every(v => v === '')), 'insérer une ligne');
  await page.click('#bDelete');
  ok(await page.evaluate(() => window.__wf.S.rows.length) === before, 'supprimer la ligne');
  await page.click('#c1_1'); await page.click('#bUp');
  ok(await page.evaluate(() => window.__wf.S.rows[0][1]) === 'Titre B', 'monter une ligne');
  await page.click('#bDown');
  ok(await page.evaluate(() => window.__wf.S.rows[1][1]) === 'Titre B', 'descendre une ligne');
  await ctx.close();
});

await section('Remplir une colonne entière', async () => {
  const { page, ctx } = await newPage();
  await page.setInputFiles('#inFolderA', join(FX, 'folder30'));
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.__wf.S.rows[0][11] = '0'; window.__wf.refreshAll(false); });
  await page.selectOption('#fillCol', '11');
  await page.selectOption('#fillVal', '1');
  await page.click('#fillEmpty');
  let col = await page.evaluate(() => window.__wf.S.rows.filter(r => r[0]).map(r => r[11]));
  ok(col[0] === '0' && col.slice(1).every(v => v === '1'), '« Cellules vides » ne remplace pas les valeurs existantes', col.slice(0, 4));
  await page.click('#fillAll');
  col = await page.evaluate(() => window.__wf.S.rows.filter(r => r[0]).map(r => r[11]));
  ok(col.every(v => v === '1'), '« Toute la colonne »');
  ok(await page.evaluate(() => window.__wf.S.rows.filter(r => !r[0]).every(r => r[11] === '')), 'les lignes vides ne sont pas remplies');
  await page.click('#bUndo');
  col = await page.evaluate(() => window.__wf.S.rows.filter(r => r[0]).map(r => r[11]));
  ok(col[0] === '0', 'remplissage annulable');
  await page.selectOption('#fillCol', '7');
  await page.fill('#fillVal', 'Documents');
  await page.click('#fillAll');
  ok(await page.evaluate(() => window.__wf.S.rows.filter(r => r[0]).every(r => r[7] === 'Documents')), 'colonne texte remplie');
  await ctx.close();
});

await section('Normalisation à l\'export, Latin-1 et CRLF', async () => {
  const { page, ctx } = await newPage();
  await setRows(page, [
    fullRow({ 0: '  Fiche n°1 été.pdf ', 1: '  L’œuvre  “complète” – 10 €…  ', 8: 'a¤b\tc\nd', 2: 'Œil — ‘x’' }),
    new Array(23).fill(''),
    fullRow({ 0: 'été.pdf', 1: 'Deux' }),
  ]);
  let v = await val(page);
  ok(v.errors.length === 0, 'aucune erreur', v.errors);
  const bytes = await downloadCsv(page);
  const txt = bytes.toString('latin1');
  const lines = txt.split('\r\n');
  ok(lines.length === 4 && lines[3] === '', '2 ressources + en-tête, ligne vide du milieu ignorée', lines.length);
  const c1 = lines[1].split('¤');
  ok(c1.length === 23, '23 colonnes');
  ok(c1[0] === 'Fiche n°1 été.pdf', 'nom de fichier : trim seulement', c1[0]);
  ok(c1[1] === "L'oeuvre «complète» - 10 EUR...", 'titre normalisé (’ “ ” – € … œ, espaces)', c1[1]);
  ok(c1[2] === "OEil - 'x'", 'Œ — ‘ ’ normalisés', c1[2]);
  ok(c1[8] === 'ab c d', '¤ supprimé, tabulation / retour à la ligne → espace', c1[8]);
  ok(c1[22] === '', 'uuid vide');
  ok(lines[2].split('¤')[0] === 'été.pdf', 'nom de fichier décomposé (macOS) → NFC', lines[2].split('¤')[0]);
  ok(bytes.includes(Buffer.from('été', 'latin1')), 'octets Latin-1');
  // Un caractère hors Latin-1 dans un nom de fichier n'est pas transformé : erreur bloquante
  await setRows(page, [fullRow({ 0: 'Fiche – 1.pdf' })]);
  v = await val(page);
  ok(v.errors.some(e => e.c === 0 && e.kind === 'latin1'), 'tiret long dans un nom de fichier = erreur (pas de transformation)');
  ok(await page.isDisabled('#bCsv'), 'téléchargement bloqué');
  await ctx.close();
});

await section('Export Excel à partir du modèle (+ LibreOffice)', async () => {
  const { page, ctx } = await newPage();
  await setRows(page, [
    fullRow({ 0: 'a.pdf', 1: 'Titre & <spécial>', 3: '1', 18: '12', 21: '800/600' }),
    fullRow({ 0: 'b.pdf', 1: 'B', 17: 'O' }),
  ]);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bExcel')]);
  const name = dl.suggestedFilename();
  ok(/^Fichier-de-travail-import-WF_.*\.xlsx$/.test(name), 'nom du fichier Excel', name);
  const xp = join(work, 'export.xlsx'); await dl.saveAs(xp);
  const py = String.raw`
import sys, json, openpyxl, zipfile, re
p = sys.argv[1]
wb = openpyxl.load_workbook(p)
ws = wb.worksheets[0]
z = zipfile.ZipFile(p)
wbx = z.read('xl/workbook.xml').decode()
s3 = z.read('xl/worksheets/sheet3.xml').decode()
out = {
  'sheets': wb.sheetnames,
  'active': wb.active.title,
  'a2': ws['A2'].value, 'b2': ws['B2'].value, 'd2': ws['D2'].value, 'l2': ws['L2'].value, 'r3': ws['R3'].value,
  's2': ws['S2'].value, 'w2': ws['W2'].value, 'a4': ws['A4'].value,
  'dv': len(ws.data_validations.dataValidation),
  'cf': len(ws.conditional_formatting),
  'fill_a1': ws['A1'].fill.fgColor.rgb,
  'activeTab': re.search(r'activeTab="(\d+)"', wbx).group(1),
  'sel3': 'tabSelected' in s3,
  'media': len([n for n in z.namelist() if n.startswith('xl/media/')]),
  'comments': 'xl/comments1.xml' in z.namelist(),
}
print(json.dumps(out))
`;
  const info = JSON.parse(execFileSync('python3', ['-I', '-c', py, xp]).toString());
  ok(JSON.stringify(info.sheets) === JSON.stringify(['SC_import_modele_V1', 'pictos', 'AIDE']), 'onglets conservés', info.sheets);
  ok(info.active === 'SC_import_modele_V1' && info.activeTab === '0' && !info.sel3, "l'onglet de travail est actif à l'ouverture", info);
  ok(info.a2 === 'a.pdf' && info.b2 === 'Titre & <spécial>' && info.a4 === null, 'valeurs injectées', info);
  ok(info.d2 === 1 && info.l2 === 1 && typeof info.l2 === 'number', 'colonnes 4, 12, 17, 18 en numérique', [info.d2, info.l2]);
  ok(info.r3 === 'O', 'valeur non 0/1 conservée en texte', info.r3);
  ok(info.s2 === '12' && info.w2 === null, 'n° de page en texte, uuid vide', [info.s2, info.w2]);
  ok(info.dv === 5 && info.cf >= 7, 'listes déroulantes et mises en forme conditionnelles conservées', [info.dv, info.cf]);
  ok(info.fill_a1 === 'FF0070C0', 'en-têtes bleus conservés');
  ok(info.media === 47 && info.comments, 'images des pictos et commentaires conservés');
  // LibreOffice : ouverture et conversion sans erreur
  const loOut = join(work, 'lo'); mkdirSync(loOut, { recursive: true });
  let loOk = false, loCsv = '';
  try {
    execFileSync('soffice', ['--headless', '--norestore', `-env:UserInstallation=file://${join(work, 'lo-profile')}`, '--convert-to', 'csv:Text - txt - csv (StarCalc):59,34,76,1', '--outdir', loOut, xp], { timeout: 120000, stdio: 'pipe' });
    loCsv = readFileSync(join(loOut, 'export.csv'), 'utf8').replace(/"/g, '');
    loOk = loCsv.startsWith('Nom du fichier') && loCsv.includes('a.pdf') && loCsv.includes('b.pdf');
  } catch (e) { loCsv = String(e); }
  ok(loOk, 'export Excel rouvert par LibreOffice sans erreur', loCsv.slice(0, 300));
  // Ré-import du fichier exporté
  await importFile(page, xp);
  const rows = await rowsOf(page);
  ok(rows.length === 2 && rows[0][1] === 'Titre & <spécial>' && rows[0][3] === '1' && rows[1][17] === 'O', "ré-import de l'export Excel", rows);
  // Limite de 1999 lignes
  await page.evaluate(() => { const S = window.__wf.S; S.rows = Array.from({ length: 2000 }, (_, i) => { const r = new Array(23).fill(''); r[0] = 'f' + i + '.pdf'; return r; }); window.__wf.refreshAll(true); });
  await page.click('#bExcel');
  await page.waitForTimeout(200);
  ok(/1999/.test(await page.textContent('#excelMsg')), 'export refusé au-delà de 1999 lignes');
  await ctx.close();
});

await section('Brouillon (localStorage) et 350 lignes', async () => {
  const { page, ctx } = await newPage();
  await page.evaluate(() => { const S = window.__wf.S; S.rows = Array.from({ length: 350 }, (_, i) => { const r = new Array(23).fill(''); r[0] = 'f' + i + '.pdf'; r[1] = 'T' + i; return r; }); window.__wf.refreshAll(true); });
  ok(await page.locator('#body tr').count() >= 350, '350 lignes affichées sans pagination');
  await page.click('#c10_4'); await page.keyboard.type('Niveau'); await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForFunction(() => window.__libs.xlsx === 'ok');
  const rows = await rowsOf(page);
  ok(rows.length === 350 && rows[10][4] === 'Niveau', 'brouillon restauré après rechargement', rows.length);
  ok(/Brouillon restauré/.test(await page.textContent('#draftLine')), 'message de restauration');
  // localStorage indisponible : l'outil fonctionne
  await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqué'); } }); });
  const p2 = await ctx.newPage();
  const errs = []; p2.on('pageerror', e => errs.push(String(e)));
  await p2.goto(page_url);
  await p2.waitForTimeout(300);
  await p2.evaluate(() => { const S = window.__wf.S; S.rows = [['x.pdf', 'X', '', '', 'N', '', '', 'C', '', 'image', 'ELE', '1', '', '', '', 'FR', '0', '0', '', '', '', '', '']]; window.__wf.refreshAll(true); });
  await p2.waitForTimeout(600);
  ok(errs.length === 0 && await p2.isEnabled('#bCsv'), 'fonctionne sans localStorage', errs);
  ok(/indisponible/.test(await p2.textContent('#saveState')), 'sauvegarde indisponible signalée');
  await ctx.close();
});

await section('Bibliothèques cdnjs indisponibles', async () => {
  const { page, ctx, errors } = await newPage({ blockLibs: true });
  await page.waitForFunction(() => window.__libs.xlsx === 'error' && window.__libs.jszip === 'error');
  ok(await page.isVisible('#libMsg'), 'message clair affiché');
  await importFile(page, join(FX, 'travail.xlsx'));
  ok(/SheetJS/.test(await page.textContent('#boxImport')), 'import Excel : explication');
  await importFile(page, join(root, 'ref/import.csv'));
  ok((await rowsOf(page)).length === 5, 'import CSV toujours possible');
  await page.click('#bExcel');
  ok(/JSZip/.test(await page.textContent('#excelMsg')), 'export Excel : explication');
  const bytes = await downloadCsv(page);
  ok(bytes.equals(exampleCsv), 'import.csv toujours téléchargeable');
  ok(errors.filter(e => !/ERR_FAILED|net::/.test(e)).length === 0, 'aucune erreur JavaScript', errors);
  await ctx.close();
});

await browser.close();
server.close();
console.log(`\n${pass} réussis, ${fail} échoués`);
if (fail) { console.log('Échecs :\n - ' + failures.join('\n - ')); process.exit(1); }
