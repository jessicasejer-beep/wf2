// Construit le classeur Excel avec macros (.xlsm) à partir du modèle et du code VBA de excel/vba/.
// Usage : (cd tools && npm install) puis node tools/build-xlsm.mjs
//
// Le projet VBA (xl/vbaProject.bin) est écrit selon la spécification [MS-OVBA] :
// fichier composé (CFB) contenant PROJECT, PROJECTwm, VBA/_VBA_PROJECT, VBA/dir et un flux par module
// (code source compressé). _VBA_PROJECT ne contient pas de code compilé : Excel recompile le code
// à l'ouverture.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const CFB = require('cfb');
const JSZip = require('jszip');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const VBA_DIR = join(root, 'excel/vba');
const TEMPLATE = join(root, 'ref/Modele_Fichier-de-travail-import-WF_JL0926.xlsx');
// --tests <fichier> : variante de test (ajoute excel/vba-tests/TestsAuto.bas), pour tests/test_xlsm.py
const testsIdx = process.argv.indexOf('--tests');
const WITH_TESTS = testsIdx > 0;
const OUT = WITH_TESTS ? process.argv[testsIdx + 1] : join(root, 'Fichier-de-travail-import-WF.xlsm');

/* ---------- Encodage Windows-1252 ---------- */
const CP1252_HIGH = [0x20AC, null, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, null, 0x017D, null,
  null, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, null, 0x017E, 0x0178];
function cp1252(str, where) {
  const out = [];
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c < 0x80 || (c >= 0xA0 && c <= 0xFF)) out.push(c);
    else {
      const i = CP1252_HIGH.indexOf(c);
      if (i < 0) throw new Error(`${where} : caractère « ${ch} » (U+${c.toString(16)}) impossible en Windows-1252`);
      out.push(0x80 + i);
    }
  }
  return Buffer.from(out);
}
const utf16 = s => Buffer.from(s, 'utf16le');

/* ---------- Compression MS-OVBA 2.4.1 ---------- */
function compressChunk(data) {
  const out = [];
  let cur = 0;
  const heads = new Map();
  const key = i => data[i] | (data[i + 1] << 8) | (data[i + 2] << 16);
  const remember = i => { if (i + 2 < data.length) { const k = key(i); let l = heads.get(k); if (!l) heads.set(k, l = []); l.push(i); } };
  while (cur < data.length) {
    const flagPos = out.length; out.push(0);
    let flags = 0;
    for (let bit = 0; bit < 8 && cur < data.length; bit++) {
      let bitCount = 4;
      while ((1 << bitCount) < cur) bitCount++;
      const maxLen = (0xFFFF >> bitCount) + 3;
      let bestLen = 0, bestPos = -1;
      if (cur + 2 < data.length) {
        const cands = heads.get(key(cur)) || [];
        for (let j = cands.length - 1; j >= 0; j--) {
          const p = cands[j];
          let len = 0;
          while (len < maxLen && cur + len < data.length && data[p + len] === data[cur + len]) len++;
          if (len > bestLen) { bestLen = len; bestPos = p; if (len === maxLen) break; }
        }
      }
      if (bestLen >= 3) {
        const offset = cur - bestPos;
        const token = ((offset - 1) << (16 - bitCount)) | (bestLen - 3);
        out.push(token & 0xFF, token >> 8);
        flags |= 1 << bit;
        for (let k = 0; k < bestLen; k++) remember(cur + k);
        cur += bestLen;
      } else {
        out.push(data[cur]);
        remember(cur);
        cur++;
      }
    }
    out[flagPos] = flags;
  }
  return Buffer.from(out);
}
function compress(data) {
  const parts = [Buffer.from([0x01])];
  for (let start = 0; start < data.length; start += 4096) {
    const chunk = data.subarray(start, start + 4096);
    const comp = compressChunk(chunk);
    if (comp.length > 4096 && chunk.length === 4096) {
      parts.push(Buffer.from([0xFF, 0x3F]), chunk);           // bloc non compressé
    } else {
      const header = ((comp.length + 2 - 3) & 0x0FFF) | (0b011 << 12) | 0x8000;
      parts.push(Buffer.from([header & 0xFF, header >> 8]), comp);
    }
  }
  return Buffer.concat(parts);
}
function decompress(buf) {
  if (buf[0] !== 1) throw new Error('signature');
  const out = [];
  let p = 1;
  while (p < buf.length) {
    const header = buf[p] | (buf[p + 1] << 8); p += 2;
    const size = (header & 0x0FFF) + 3, isComp = header & 0x8000;
    const end = p - 2 + size;
    const chunkStart = out.length;
    if (!isComp) { for (let i = 0; i < 4096; i++) out.push(buf[p + i]); p += 4096; continue; }
    while (p < end) {
      const flags = buf[p++];
      for (let bit = 0; bit < 8 && p < end; bit++) {
        if (!(flags & (1 << bit))) { out.push(buf[p++]); continue; }
        const token = buf[p] | (buf[p + 1] << 8); p += 2;
        const diff = out.length - chunkStart;
        let bitCount = 4; while ((1 << bitCount) < diff) bitCount++;
        const lengthMask = 0xFFFF >> bitCount;
        const len = (token & lengthMask) + 3, off = (token >> (16 - bitCount)) + 1;
        for (let i = 0; i < len; i++) out.push(out[out.length - off]);
      }
    }
  }
  return Buffer.from(out);
}

/* ---------- Chiffrement des champs CMG / DPB / GC (MS-OVBA 2.4.3) ---------- */
function encryptData(projectId, data, seed) {
  const version = 2;
  let projKey = 0;
  for (const b of cp1252(projectId, 'ID')) projKey = (projKey + b) & 0xFF;
  const out = [seed, seed ^ version, seed ^ projKey];
  let unenc1 = projKey, enc1 = seed ^ projKey, enc2 = seed ^ version;
  const push = b => { const e = b ^ ((enc2 + unenc1) & 0xFF); out.push(e); enc2 = enc1; enc1 = e; unenc1 = b; };
  const ignored = (seed & 6) / 2;
  for (let i = 0; i < ignored; i++) push(7);
  const len = data.length;
  [len & 0xFF, (len >> 8) & 0xFF, (len >> 16) & 0xFF, (len >>> 24) & 0xFF].forEach(push);
  data.forEach(push);
  return Buffer.from(out).toString('hex').toUpperCase();
}
function decryptData(projectId, hex) {
  const b = Buffer.from(hex, 'hex');
  const seed = b[0], version = b[1] ^ seed, projKey = b[2] ^ seed;
  let unenc1 = projKey, enc1 = b[2], enc2 = b[1], p = 3;
  const next = () => { const e = b[p++]; const d = e ^ ((enc2 + unenc1) & 0xFF); enc2 = enc1; enc1 = e; unenc1 = d; return d; };
  for (let i = 0; i < (seed & 6) / 2; i++) next();
  const len = next() | (next() << 8) | (next() << 16) | (next() << 24);
  const data = []; for (let i = 0; i < len; i++) data.push(next());
  return { version, data };
}

/* ---------- Flux « dir » (MS-OVBA 2.3.4.2) ---------- */
function rec(id, payload) {
  const h = Buffer.alloc(6); h.writeUInt16LE(id, 0); h.writeUInt32LE(payload.length, 2);
  return Buffer.concat([h, payload]);
}
const u16 = v => { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; };
const u32 = v => { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; };
function buildDir(modules) {
  const parts = [];
  parts.push(rec(0x0001, u32(3)));                 // SYSKIND : Win64
  parts.push(rec(0x0002, u32(0x0409)));            // LCID
  parts.push(rec(0x0014, u32(0x0409)));            // LCIDINVOKE
  parts.push(rec(0x0003, u16(1252)));              // CODEPAGE
  parts.push(rec(0x0004, cp1252('VBAProject', 'nom')));
  parts.push(rec(0x0005, Buffer.alloc(0)), rec(0x0040, Buffer.alloc(0)));   // DOCSTRING
  parts.push(rec(0x0006, Buffer.alloc(0)), rec(0x003D, Buffer.alloc(0)));   // HELPFILEPATH
  parts.push(rec(0x0007, u32(0)));                 // HELPCONTEXT
  parts.push(rec(0x0008, u32(0)));                 // LIBFLAGS
  const ver = Buffer.alloc(12); ver.writeUInt16LE(0x0009, 0); ver.writeUInt32LE(4, 2); ver.writeUInt32LE(1, 6); ver.writeUInt16LE(0, 10);
  parts.push(ver);                                 // VERSION
  parts.push(rec(0x000C, Buffer.alloc(0)), rec(0x003C, Buffer.alloc(0)));   // CONSTANTS
  // Référence : OLE Automation (stdole)
  const libid = cp1252('*\\G{00020430-0000-0000-C000-000000000046}#2.0#0#C:\\Windows\\System32\\stdole2.tlb#OLE Automation', 'ref');
  parts.push(rec(0x0016, cp1252('stdole', 'ref')), rec(0x003E, utf16('stdole')));
  parts.push(rec(0x000D, Buffer.concat([u32(libid.length), libid, u32(0), u16(0)])));
  // Modules
  parts.push(rec(0x000F, u16(modules.length)));
  parts.push(rec(0x0013, u16(0xFFFF)));
  for (const m of modules) {
    parts.push(rec(0x0019, cp1252(m.name, m.name)), rec(0x0047, utf16(m.name)));
    parts.push(rec(0x001A, cp1252(m.name, m.name)), rec(0x0032, utf16(m.name)));
    parts.push(rec(0x001C, Buffer.alloc(0)), rec(0x0048, Buffer.alloc(0)));
    parts.push(rec(0x0031, u32(0)));               // TextOffset : le code source commence au début du flux
    parts.push(rec(0x001E, u32(0)));
    parts.push(rec(0x002C, u16(0xFFFF)));
    parts.push(rec(m.document ? 0x0022 : 0x0021, Buffer.alloc(0)));
    parts.push(rec(0x002B, Buffer.alloc(0)));
  }
  parts.push(rec(0x0010, Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/* ---------- Variante de test : trace de la dernière ligne exécutée (TraceLigne) ---------- */
function instrument(src, name) {
  const lines = src.split('\r\n');
  const out = [];
  let inProc = false, prev = '';
  const noBefore = /^(Case\b|Else\b|ElseIf\b|End\b|Next\b|Loop\b|Wend\b|#|Dim\b|ReDim\b|Const\b|Private Const|Public Const)/i;
  lines.forEach((line, i) => {
    const t = line.trim();
    if (/^(Public |Private )?(Sub|Function) /i.test(t)) inProc = !/ErreurExec/.test(t);
    const stmt = inProc && t && !t.startsWith("'") && !/^(Public |Private )?(Sub|Function) /i.test(t) && !noBefore.test(t)
      && !/ErreurExec/.test(t) && !/\s_$/.test(prev) && !/^Select Case/i.test(prev.trim()) && !/^[A-Za-zÀ-ÿ_]+:$/.test(t);
    if (stmt) out.push(`TraceLigne = "${name}:${i + 1}"`);
    out.push(line);
    if (/^End (Sub|Function)/i.test(t)) inProc = false;
    prev = line;
  });
  // déclaration après les « Attribute » et « Option Explicit »
  const k = out.findIndex(l => /^Option Explicit/i.test(l));
  if (name === 'Regles') out.splice(k + 1, 0, 'Public TraceLigne As String');
  return out.join('\r\n');
}

/* ---------- Projet VBA ---------- */
function buildVbaProject() {
  const order = ['ThisWorkbook', 'Feuil1', 'Feuil2', 'Feuil3', 'ApiWindows', 'Outils', 'Regles', 'Actions'];
  if (WITH_TESTS) order.push('TestsAuto');
  const dirs = [VBA_DIR, join(root, 'excel/vba-tests')];
  const modules = order.map(name => {
    let file = null, dir = null;
    for (const d of dirs) { const f = readdirSync(d).find(x => x === name + '.cls' || x === name + '.bas'); if (f) { file = f; dir = d; break; } }
    if (!file) throw new Error('module manquant : ' + name);
    let src = readFileSync(join(dir, file), 'utf8').replace(/^\uFEFF/, '').replace(/\r?\n/g, '\r\n');
    if (!src.endsWith('\r\n')) src += '\r\n';
    const nameLine = /^Attribute VB_Name = "([^"]+)"/.exec(src);
    if (!nameLine || nameLine[1] !== name) throw new Error(`${file} : Attribute VB_Name doit valoir ${name}`);
    for (const [i, line] of src.split('\r\n').entries()) if (line.length > 1023) throw new Error(`${file}:${i + 1} : ligne trop longue pour VBA`);
    // Un commentaire terminé par « _ » continue sur la ligne suivante (piège VBA)
    for (const [i, line] of src.split('\r\n').entries()) if (/^\s*'.*\s_$/.test(line)) throw new Error(`${file}:${i + 1} : commentaire terminé par « _ »`);
    if (WITH_TESTS && !file.endsWith('.cls') && name !== 'ApiWindows') src = instrument(src, name);
    return { name, document: file.endsWith('.cls'), source: cp1252(src, file) };
  });

  const projectId = '{6F1C2A3B-5D4E-4F60-8A7B-9C0D1E2F3A4B}';
  const lines = [`ID="${projectId}"`];
  for (const m of modules) lines.push(m.document ? `Document=${m.name}/&H00000000` : `Module=${m.name}`);
  lines.push('Name="VBAProject"', 'HelpContextID="0"', 'VersionCompatible32="393222000"');
  lines.push(`CMG="${encryptData(projectId, [0, 0, 0, 0], 0x21)}"`);
  lines.push(`DPB="${encryptData(projectId, [0], 0x43)}"`);
  lines.push(`GC="${encryptData(projectId, [0xFF], 0x65)}"`);
  lines.push('', '[Host Extender Info]', '&H00000001={3832D640-CF90-11CF-8E43-00A0C911005A};VBE;&H00000000', '', '[Workspace]');
  for (const m of modules) lines.push(`${m.name}=0, 0, 0, 0, C`);
  const project = cp1252(lines.join('\r\n') + '\r\n', 'PROJECT');

  const wm = Buffer.concat([...modules.flatMap(m => [cp1252(m.name, m.name), Buffer.from([0]), utf16(m.name), Buffer.from([0, 0])]), Buffer.from([0, 0])]);
  const vbaProjectStream = Buffer.from([0xCC, 0x61, 0xFF, 0xFF, 0x00, 0x00, 0x00]);
  const dir = buildDir(modules);

  // Vérifications : décompression et déchiffrement redonnent les données d'origine
  if (!decompress(compress(dir)).equals(dir)) throw new Error('compression dir');
  for (const m of modules) if (!decompress(compress(m.source)).equals(m.source)) throw new Error('compression ' + m.name);
  for (const [k, expected] of [['CMG', [0, 0, 0, 0]], ['DPB', [0]], ['GC', [0xFF]]]) {
    const hex = new RegExp(`${k}="([0-9A-F]+)"`).exec(lines.join('\n'))[1];
    const d = decryptData(projectId, hex);
    if (d.version !== 2 || JSON.stringify(d.data) !== JSON.stringify(expected)) throw new Error('chiffrement ' + k);
  }

  const cfb = CFB.utils.cfb_new();
  CFB.utils.cfb_add(cfb, '/PROJECT', project);
  CFB.utils.cfb_add(cfb, '/PROJECTwm', wm);
  CFB.utils.cfb_add(cfb, '/VBA/_VBA_PROJECT', vbaProjectStream);
  CFB.utils.cfb_add(cfb, '/VBA/dir', compress(dir));
  for (const m of modules) CFB.utils.cfb_add(cfb, '/VBA/' + m.name, compress(m.source));
  // La bibliothèque ajoute d'office un flux témoin « \u0001Sh33tJ5 » : on l'en empêche.
  const find = CFB.find;
  CFB.find = (c, path) => (path === '/\u0001Sh33tJ5' ? true : find(c, path));
  try {
    CFB.utils.cfb_del(cfb, '\u0001Sh33tJ5');
    return { bin: Buffer.from(CFB.write(cfb, { type: 'buffer', fileType: 'cfb' })), modules };
  } finally { CFB.find = find; }
}

/* ---------- Ruban : onglet « Import WebFactory » ---------- */
const btn = (id, label, image, tip) => `<button id="${id}" label="${label}" size="large" imageMso="${image}" onAction="Ruban_Clic" screentip="${label}" supertip="${tip}"/>`;
const CUSTOM_UI = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<customUI xmlns="http://schemas.microsoft.com/office/2006/01/customui" onLoad="Ruban_Charge">
  <ribbon>
    <tabs>
      <tab id="tabImportWF" label="Import WebFactory" insertBeforeMso="TabHome">
        <group id="grpDepart" label="1. Point de départ">
          ${btn('btnDossier', 'Lire le dossier', 'FileOpen', "Choisir le dossier des fichiers à importer : une ligne par fichier, ou contrôle des noms si le tableau est déjà rempli.")}
          ${btn('btnImporter', 'Importer un fichier', 'ImportTextFile', "Reprendre un import.csv ou un fichier de travail Excel existant.")}
        </group>
        <group id="grpControle" label="2. Contrôle">
          ${btn('btnVerifier', 'Vérifier', 'DataValidation', "Contrôler toutes les lignes : cellules en couleur avec une note, rapport dans l'onglet Contrôle.")}
          ${btn('btnCopier', "Copier le rapport d'erreurs", 'Copy', "Copier le rapport (erreurs regroupées par type) pour le coller dans un e-mail ou un message.")}
        </group>
        <group id="grpExport" label="3. Export">
          ${btn('btnExporter', 'Exporter import.csv', 'FileSaveAs', "Enregistrer import.csv (séparateur ¤, Latin-1) s'il n'y a plus d'erreur bloquante.")}
        </group>
        <group id="grpDonnees" label="Données">
          ${btn('btnSupprimer', 'Supprimer les données', 'ClearAll', "Vider le tableau, le dossier lu et le rapport pour commencer un nouvel import.")}
        </group>
      </tab>
    </tabs>
  </ribbon>
</customUI>
`;

/* ---------- Assemblage du classeur ---------- */
const { bin, modules } = buildVbaProject();
const zip = await JSZip.loadAsync(readFileSync(TEMPLATE));

let ct = await zip.file('[Content_Types].xml').async('string');
ct = ct.replace('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml', 'application/vnd.ms-excel.sheet.macroEnabled.main+xml');
if (!ct.includes('Extension="bin"')) ct = ct.replace('<Default Extension="png"', '<Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/><Default Extension="png"');
zip.file('[Content_Types].xml', ct);

let wbRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
wbRels = wbRels.replace('</Relationships>', '<Relationship Id="rIdVBA" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/></Relationships>');
zip.file('xl/_rels/workbook.xml.rels', wbRels);
zip.file('xl/vbaProject.bin', bin);

let rels = await zip.file('_rels/.rels').async('string');
rels = rels.replace('</Relationships>', '<Relationship Id="rIdUI" Type="http://schemas.microsoft.com/office/2006/relationships/ui/extensibility" Target="customUI/customUI.xml"/></Relationships>');
zip.file('_rels/.rels', rels);
zip.file('customUI/customUI.xml', CUSTOM_UI);

// L'onglet de travail est l'onglet actif à l'ouverture
let wbx = await zip.file('xl/workbook.xml').async('string');
wbx = wbx.replace(/activeTab="\d+"/, 'activeTab="0"');
zip.file('xl/workbook.xml', wbx);
let s1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
s1 = s1.replace(/<sheetView(?=[\s>])(?![^>]*tabSelected)/, '<sheetView tabSelected="1"');
zip.file('xl/worksheets/sheet1.xml', s1);
for (const p of ['xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml']) {
  zip.file(p, (await zip.file(p).async('string')).replace(/ tabSelected="1"/g, ''));
}

const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
writeFileSync(OUT, out);
console.log(`${OUT.replace(root + '/', '')}${WITH_TESTS ? ' (variante de test)' : ''} : ${(out.length / 1024).toFixed(0)} Ko, ${modules.length} modules VBA (${modules.reduce((a, m) => a + m.source.length, 0)} octets de code)`);
