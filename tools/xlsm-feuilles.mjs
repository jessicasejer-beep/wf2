// Mise en forme du classeur avec macros : styles ajoutés, onglet de travail (colonne R automatique),
// onglet « AIDE » (colonnes, listes, pictos avec images) et onglet « READ ME » (mode d'emploi).
// Utilisé par tools/build-xlsm.mjs.

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- Styles ---------- */
// Ajoute polices, remplissages et formats de cellule ; renvoie les numéros de style à utiliser.
export function ajouterStyles(xml) {
  const fonts = [
    '<font><b/><sz val="18"/><color rgb="FF1F3864"/><name val="Arial"/><family val="2"/></font>',   // titre
    '<font><b/><sz val="12"/><color rgb="FF0070C0"/><name val="Arial"/><family val="2"/></font>',   // section
    '<font><sz val="10"/><color rgb="FF595959"/><name val="Arial"/><family val="2"/></font>',       // texte discret
    '<font><b/><sz val="11"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>',   // libellé
  ];
  const fills = ['FFFF9999', 'FFFFA500', 'FFFFFF00', 'FFDDEBF7', 'FFF2F2F2']
    .map(c => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`);
  const nbFonts = +/<fonts count="(\d+)"/.exec(xml)[1];
  const nbFills = +/<fills count="(\d+)"/.exec(xml)[1];
  const nbXfs = +/<cellXfs count="(\d+)"/.exec(xml)[1];
  const F = { titre: nbFonts, section: nbFonts + 1, discret: nbFonts + 2, libelle: nbFonts + 3, normal: 3, gras: 2, blancGras: 1 };
  const P = { aucun: 0, bleu: 2, gris: 3, rouge: nbFills, orange: nbFills + 1, jaune: nbFills + 2, bleuClair: nbFills + 3, grisClair: nbFills + 4 };
  const al = (h, v, wrap) => `<alignment${h ? ` horizontal="${h}"` : ''} vertical="${v || 'top'}"${wrap ? ' wrapText="1"' : ''}/>`;
  const xf = (font, fill, border, align, num = 0) =>
    `<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${num ? ' applyNumberFormat="1"' : ''}>${align}</xf>`;
  const defs = {
    auto: xf(F.normal, P.gris, 2, al('center', 'center')),               // colonne R du tableau
    titre: xf(F.titre, P.aucun, 0, al(null, 'center')),
    section: xf(F.section, P.aucun, 0, al(null, 'bottom')),
    texte: xf(F.normal, P.aucun, 0, al(null, 'top', true)),
    discret: xf(F.discret, P.aucun, 0, al(null, 'top', true)),
    entete: xf(F.gras, P.gris, 2, al(null, 'center', true)),
    cellule: xf(F.normal, P.aucun, 2, al(null, 'top', true)),
    celluleGras: xf(F.gras, P.aucun, 2, al(null, 'top', true)),
    celluleCentre: xf(F.normal, P.aucun, 2, al('center', 'center', true)),
    code: xf(F.libelle, P.grisClair, 2, al('center', 'center')),
    rouge: xf(F.gras, P.rouge, 2, al('center', 'center', true)),
    orange: xf(F.gras, P.orange, 2, al('center', 'center', true)),
    jaune: xf(F.gras, P.jaune, 2, al('center', 'center', true)),
    gris: xf(F.gras, P.gris, 2, al('center', 'center', true)),
    bleu: xf(F.blancGras, P.bleu, 2, al('center', 'center', true)),
    encadre: xf(F.normal, P.bleuClair, 2, al(null, 'center', true)),
    pictoNom: xf(F.libelle, P.aucun, 2, al(null, 'center')),
    pictoImage: xf(F.normal, P.aucun, 2, al('center', 'center')),
  };
  const S = {};
  Object.keys(defs).forEach((k, i) => { S[k] = nbXfs + i; });
  xml = xml.replace(/<fonts count="\d+"([^>]*)>([\s\S]*?)<\/fonts>/, (m, a, inner) => `<fonts count="${nbFonts + fonts.length}"${a}>${inner}${fonts.join('')}</fonts>`);
  xml = xml.replace(/<fills count="\d+">([\s\S]*?)<\/fills>/, (m, inner) => `<fills count="${nbFills + fills.length}">${inner}${fills.join('')}</fills>`);
  xml = xml.replace(/<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/, (m, inner) => `<cellXfs count="${nbXfs + Object.keys(defs).length}">${inner}${Object.values(defs).join('')}</cellXfs>`);
  return { xml, S };
}

/* ---------- Petite fabrique de feuilles ---------- */
const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function feuille({ codeName, largeurs, lignes, fusions = [], drawing = false, onglet, selection = false, grille = false }) {
  const rows = lignes.filter(Boolean).map(l => {
    const cells = l.cellules.map(([col, v, s]) => {
      const ref = col + l.r;
      if (v === null || v === undefined || v === '') return `<c r="${ref}" s="${s}"/>`;
      if (typeof v === 'number') return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
      return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${l.r}"${l.ht ? ` ht="${l.ht}" customHeight="1"` : ''}>${cells}</row>`;
  }).join('');
  const cols = largeurs.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr codeName="${codeName}">${onglet ? `<tabColor rgb="${onglet}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView${selection ? ' tabSelected="1"' : ''}${grille ? '' : ' showGridLines="0"'} workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rows}</sheetData>${fusions.length ? `<mergeCells count="${fusions.length}">${fusions.map(f => `<mergeCell ref="${f}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>${drawing ? '<drawing r:id="rId1"/>' : ''}</worksheet>`;
}

/* ---------- Contenu commun ---------- */
export const PICTOS = ['123', 'aide', 'anime_int', 'audio', 'audio_classe', 'bibliographie', 'biographie', 'BO', 'calculatrice_1',
  'calculatrice_2', 'carte', 'carte_int', 'correction', 'dictee', 'DYS', 'eleve', 'espace', 'evaluation', 'expérience',
  'figure', 'frise', 'graphique', 'image', 'impression', 'jeux', 'karaoke', 'livre', 'microscope', 'molecule', 'musique',
  'orchestre', 'organigram', 'outils', 'outils_2', 'Peinture', 'photocopie', 'pouce', 'prof', 'site', 'tableau', 'test',
  'texte', 'texte_lu', 'theatre', 'tice', 'video', 'video_classe'];

const COLONNES = [
  ['A', 'Nom du fichier (extension comprise)', 'Oui', "Le nom exact du fichier, avec son extension. Rempli par « Sélectionner un dossier de ressources ». Ou une adresse web commençant par https://", 'chap1_fiche_eleve.pdf'],
  ['B', 'Titre de la ressource', 'Oui', 'Texte libre. Un même titre sur plusieurs lignes est accepté mais signalé en jaune.', 'Fiche élève : les fractions'],
  ['C', 'Titre alternatif', 'Non', 'Texte libre.', ''],
  ['D', 'Applet', 'Non', '0 (non) ou 1 (oui).', '0'],
  ['E', 'Niveau principal (matière, chapitre, unité)', 'Oui (*)', "Texte libre. (*) Peut rester vide si le titre est « L'intégrale du guide pédagogique », « L'intégrale du livre du professeur » ou « livre du professeur ».", 'Chapitre 1'],
  ['F', 'Sous-niveau', 'Non', 'Texte libre.', 'Leçon 2'],
  ['G', 'Sous-sous-niveau', 'Non', 'Texte libre.', ''],
  ['H', 'Catégorie', 'Oui', 'Texte libre.', 'Exercices'],
  ['I', 'Description de la ressource', 'Non', 'Texte libre.', ''],
  ['J', 'Picto', 'Oui', 'Un nom de la liste des pictos (partie 3), écrit exactement, majuscules comprises.', 'image'],
  ['K', 'Profil', 'Oui', 'Un code de la liste « Profil » (partie 2).', 'ELE'],
  ['L', 'Téléchargement autorisé', 'Oui', '0 (non) ou 1 (oui) : le chiffre zéro, pas la lettre O. Toujours 1 pour un fichier .ppsx (à 0, il ne peut être ni visualisé ni téléchargé).', '1'],
  ['M', 'Fichier audio description', 'Non', 'Nom d’un fichier .mp3 du dossier.', 'chap1_audio.mp3'],
  ['N', 'Fichier sous-titre', 'Non', 'Nom d’un fichier .vtt du dossier.', 'chap1_video.vtt'],
  ['O', 'Transcription', 'Non', 'Nom d’un fichier .pdf ou .doc du dossier.', 'chap1_transcription.pdf'],
  ['P', 'Langue', 'Oui', 'Un code de la liste « Langue » (partie 2).', 'FR'],
  ['Q', 'Intégrale du livre du professeur', 'Oui', '0 (non) ou 1 (oui).', '0'],
  ['R', 'Fichier lié à la présentation de la méthode', 'Automatique', 'Rien à saisir : 0 ajouté automatiquement dès que la ligne contient des données (colonne grise, non modifiable).', '0'],
  ['S', 'N° de page', 'Non', 'Numéro de page.', '12'],
  ['T', 'Miniature vidéo', 'Non', 'Nom d’un fichier .jpg du dossier, 310 × 220 pixels.', 'chap1_video.jpg'],
  ['U', 'Watermark', 'Non', 'Une valeur de la liste « Watermark » (partie 2).', 'nouveau'],
  ['V', 'Largeur/Hauteur de l’iFrame', 'Non', 'Largeur/hauteur en pixels, séparées par une barre oblique.', '800/600'],
  ['W', 'uuid', 'Non', 'Ne rien saisir : cette colonne reste toujours vide.', ''],
];

/* ---------- Onglet AIDE ---------- */
// Positions des listes (plages nommées utilisées par les listes déroulantes du tableau)
export const LISTES_AIDE = { profil: [32, 36], langue: [39, 46], zeroun: [49, 50], watermark: [53, 54], picto: [59, 105] };
export const PREMIERE_LIGNE_PICTO = LISTES_AIDE.picto[0];

export function feuilleAide(S) {
  const L = [];
  L.push({ r: 1, ht: 30, cellules: [['B', 'AIDE : colonnes, valeurs autorisées et pictos', S.titre]] });
  L.push({ r: 2, ht: 30, cellules: [['B', "Les listes déroulantes du tableau viennent de cet onglet : ne modifiez pas les valeurs de la colonne B. Pour savoir comment utiliser le classeur, voir l'onglet « READ ME ».", S.discret]] });
  L.push({ r: 4, ht: 22, cellules: [['B', '1. Les colonnes du tableau', S.section]] });
  L.push({ r: 5, ht: 20, cellules: [['B', 'Colonne', S.entete], ['C', 'Nom', S.entete], ['D', 'Obligatoire', S.entete], ['E', "Ce qu'il faut saisir", S.entete], ['F', 'Exemple', S.entete]] });
  COLONNES.forEach(([col, nom, obl, quoi, ex], i) => {
    const sObl = obl === 'Automatique' ? S.gris : obl.startsWith('Oui') ? S.bleu : S.celluleCentre;
    L.push({ r: 6 + i, ht: quoi.length > 90 ? 44 : quoi.length > 50 ? 30 : 18, cellules: [['B', col, S.code], ['C', nom, S.celluleGras], ['D', obl, sObl], ['E', quoi, S.cellule], ['F', ex, S.cellule]] });
  });
  L.push({ r: 30, ht: 22, cellules: [['B', '2. Valeurs autorisées dans les listes', S.section]] });
  const liste = (r, titre, valeurs) => {
    L.push({ r: r - 1, ht: 18, cellules: [['B', titre, S.entete], ['C', 'Signification', S.entete]] });
    valeurs.forEach(([v, sens], i) => L.push({ r: r + i, cellules: [['B', v, S.code], ['C', sens, S.cellule]] }));
  };
  liste(LISTES_AIDE.profil[0], 'Profil (col. K)', [['ANONYME', 'Accès libre, sans connexion'], ['ENS', 'Enseignant'], ['PRESCRIPT', 'Prescripteur'], ['ELE', 'Élève'], ['ETU', 'Étudiant']]);
  liste(LISTES_AIDE.langue[0], 'Langue (col. P)', [['DE', 'Allemand'], ['EN', 'Anglais'], ['ES', 'Espagnol'], ['FR', 'Français'], ['IT', 'Italien'], ['LA', 'Latin'], ['PT', 'Portugais'], ['RU', 'Russe']]);
  liste(LISTES_AIDE.zeroun[0], '0 / 1 (col. D, L, Q)', [[0, 'Non'], [1, 'Oui']]);
  liste(LISTES_AIDE.watermark[0], 'Watermark (col. U)', [['extrait', 'Mention « extrait » sur la ressource'], ['nouveau', 'Mention « nouveau » sur la ressource']]);
  const p0 = LISTES_AIDE.picto[0];
  L.push({ r: p0 - 3, ht: 22, cellules: [['B', '3. Les pictos (col. J)', S.section]] });
  L.push({ r: p0 - 2, ht: 18, cellules: [['B', 'Saisissez le nom exact (majuscules comprises), ou choisissez-le dans la liste déroulante de la colonne J.', S.discret]] });
  L.push({ r: p0 - 1, ht: 18, cellules: [['B', 'Nom à saisir', S.entete], ['C', 'Picto', S.entete]] });
  PICTOS.forEach((p, i) => L.push({ r: p0 + i, ht: 36, cellules: [['B', /^\d+$/.test(p) ? Number(p) : p, S.pictoNom], ['C', '', S.pictoImage]] }));
  return feuille({ codeName: 'Feuil3', largeurs: [2, 22, 34, 14, 62, 26], lignes: L, drawing: true, onglet: 'FF0070C0',
    fusions: ['B1:F1', 'B2:F2', `B${p0 - 2}:F${p0 - 2}`] });
}

// Images des pictos : déplacées de l'ancien onglet « pictos » vers la colonne C de l'onglet AIDE.
// Dans le modèle, l'image de la ligne n (base 0) illustre le picto de la cellule A(n+1), soit PICTOS[n]
// (« 123 » en premier).
export function dessinPictosAide(drawingXml) {
  const tete = drawingXml.slice(0, drawingXml.indexOf('<xdr:twoCellAnchor'));
  const fin = '</xdr:wsDr>';
  const ancres = drawingXml.match(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g) || [];
  const out = [];
  for (const a of ancres) {
    const ligne = +/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/.exec(a)[1];
    if (ligne >= PICTOS.length) continue;
    const [, cx, cy] = /<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(a).map(Number);
    const h = 381000, w = Math.round(cx * h / cy);                 // 40 px de haut
    let pic = /<xdr:pic>[\s\S]*?<\/xdr:pic>/.exec(a)[0];
    pic = pic.replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${w}" cy="${h}"/>`);
    const rowAide = PREMIERE_LIGNE_PICTO - 1 + ligne;               // base 0
    out.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>2</xdr:col><xdr:colOff>${Math.max(0, Math.round((34 * 7 * 9525 - w) / 2))}</xdr:colOff><xdr:row>${rowAide}</xdr:row><xdr:rowOff>28575</xdr:rowOff></xdr:from><xdr:ext cx="${w}" cy="${h}"/>${pic}<xdr:clientData/></xdr:oneCellAnchor>`);
  }
  return tete + out.join('') + fin;
}

/* ---------- Onglet READ ME ---------- */
export function feuilleReadMe(S) {
  const L = [];
  const fusions = ['B1:D1', 'B2:D2'];
  let r = 1;
  const add = (cellules, ht) => L.push({ r: r++, ht, cellules });
  const addCD = (cellules, ht) => { fusions.push(`C${r}:D${r}`); add([...cellules, ['D', '', S.cellule]], ht); };
  const blanc = () => { r++; };
  add([['B', "Fichier d'import WebFactory : mode d'emploi", S.titre]], 32);
  add([['B', "Ce classeur prépare le fichier import.csv d'un import en masse de ressources numériques. Il contrôle vos données et n'exporte import.csv que s'il ne reste aucune erreur bloquante.", S.texte]], 30);
  blanc();
  add([['B', 'Avant de commencer', S.section]], 22);
  const ligne2 = (a, b, ht = 30) => addCD([['B', a, S.celluleGras], ['C', b, S.cellule]], ht);
  ligne2('Activer les macros', "À l'ouverture, cliquez sur « Activer le contenu ». Si Excel bloque le fichier : fermez-le, clic droit sur le fichier > Propriétés > cochez « Débloquer », puis rouvrez-le.");
  ligne2('Le ruban', "Toutes les actions sont dans l'onglet « Import WebFactory », en haut de la fenêtre Excel.", 18);
  ligne2('Où saisir', "Uniquement dans l'onglet « SC_import_modele_V1 », une ligne par ressource, à partir de la ligne 2. Ne modifiez pas la ligne 1 ni l'ordre des colonnes.");
  blanc();
  add([['B', 'Préparer un import en 5 étapes', S.section]], 22);
  add([['B', 'Étape', S.entete], ['C', 'Que faire', S.entete], ['D', 'Bouton du ruban', S.entete]], 18);
  const etape = (a, b, c, ht = 30) => add([['B', a, S.celluleGras], ['C', b, S.cellule], ['D', c, S.celluleCentre]], ht);
  etape('1. Créer les lignes', 'Choisissez le dossier qui contient les fichiers à importer : une ligne par fichier est créée, avec le nom exact du fichier en colonne A.', 'Sélectionner un dossier de ressources');
  etape('2. Compléter', "Remplissez les colonnes : en-tête bleu = obligatoire, en-tête gris = facultatif. La colonne R se remplit seule (0) dès qu'une ligne contient des données. Valeurs possibles et pictos : onglet « AIDE ».", '—', 44);
  etape('3. Contrôler', "Les cellules en erreur se colorent et portent une note (survolez-les). L'onglet « Contrôle » liste les erreurs par type.", 'Contrôler un fichier');
  etape('4. Corriger', "Corrigez chaque cellule signalée, puis cliquez à nouveau sur « Contrôler un fichier », jusqu'à « Aucune erreur bloquante ».", 'Contrôler un fichier');
  etape('5. Exporter', "Enregistrez le fichier sous le nom exact import.csv, puis créez un .zip avec import.csv et tous les fichiers, sans sous-dossier.", 'Exporter import.csv');
  blanc();
  add([['B', 'Les autres boutons', S.section]], 22);
  ligne2('Vérifier un fichier', 'Charge un import.csv ou un fichier Excel déjà rempli dans le tableau, puis le contrôle.', 18);
  ligne2('Comparer le fichier et les ressources', "Vérifie qu'un fichier d'import (Excel ou CSV) et un dossier de fichiers médias correspondent : même nombre de fichiers, noms identiques. Le tableau n'est pas modifié ; résultat dans l'onglet « Comparaison ».", 30);
  ligne2('Supprimer les données', 'Vide le tableau, le dossier lu et les rapports pour commencer un nouvel import. Action définitive.', 18);
  blanc();
  add([['B', 'Les couleurs', S.section]], 22);
  const couleur = (nom, style, sens) => addCD([['B', nom, style], ['C', sens, S.cellule]], 18);
  couleur('Rouge', S.rouge, "Erreur bloquante : à corriger avant l'export.");
  couleur('Orange', S.orange, 'Nom de fichier en double : interdit.');
  couleur('Jaune', S.jaune, 'À vérifier, non bloquant (par exemple un titre en double).');
  couleur('Gris', S.gris, 'Rempli automatiquement, non modifiable (colonne R).');
  couleur('En-tête bleu', S.bleu, 'Colonne obligatoire.');
  blanc();
  add([['B', 'Noms de fichiers : les règles', S.section]], 22);
  const regle = (a, b) => addCD([['B', a, S.celluleGras], ['C', b, S.cellule]], 18);
  regle('Avec son extension', 'fiche_eleve.pdf (et non fiche_eleve)');
  regle('Sans espace', 'mon_fichier.pdf (et non mon fichier.pdf)');
  regle('Sans accent ni caractère spécial', 'tete.mp4 (et non tête.mp4) ; ni ç, °, œ…');
  regle('Identique au fichier du dossier', 'mêmes majuscules et minuscules : doc2.pdf et DOC2.PDF sont différents');
  regle('Une seule fois', "un même fichier n'apparaît que sur une ligne");
  regle("À la racine de l'archive", 'pas de sous-dossier dans le .zip');
  blanc();
  add([['B', "Besoin d'aide ?", S.section]], 22);
  ligne2('Onglet AIDE', 'La signification de chaque colonne, les valeurs autorisées et la liste des pictos avec leur image.', 18);
  ligne2('Une erreur VBA', "Notez le message, cliquez sur « Débogage », faites une capture de la ligne surlignée en jaune et envoyez-la à l'équipe WebFactory.");
  return feuille({ codeName: 'Feuil4', largeurs: [2, 30, 78, 30], lignes: L, fusions, onglet: 'FF1E7B3C', selection: true });
}

/* ---------- Onglet de travail ---------- */
// Colonne R grisée, à 0 et non modifiable ; F facultative ; vos largeurs de colonnes et zoom.
export function adapterFeuilleTravail(xml, S) {
  xml = xml.replace(/<sheetView([^>]*?) zoomScaleNormal="\d+"/, '<sheetView$1 zoomScale="115" zoomScaleNormal="115"');
  xml = xml.replace(/<col min="1" max="1" width="[\d.]+"/, '<col min="1" max="1" width="72.7109375"');
  xml = xml.replace(/<col min="2" max="2" width="[\d.]+"/, '<col min="2" max="2" width="42"');
  xml = xml.replace('<c r="R1" s="2" t="s">', '<c r="R1" s="3" t="s">');                 // en-tête gris
  // cellules grises et vides : le 0 est écrit par les macros sur les seules lignes remplies
  xml = xml.replace(/<c r="R(\d+)" s="\d+"\/>/g, (m, n) => `<c r="R${n}" s="${S.auto}"/>`);
  // La ligne est « commencée » si une colonne autre que R (toujours remplie) contient une valeur
  xml = xml.split('COUNTA($A2:$W2)&gt;0').join('COUNTA($A2:$Q2,$S2:$V2)&gt;0');
  xml = xml.replace('<conditionalFormatting sqref="P2:R2000">', '<conditionalFormatting sqref="P2:Q2000">');
  xml = xml.replace('sqref="L2:L2000 Q2:R2000"', 'sqref="L2:L2000 Q2:Q2000"');
  xml = xml.replace('(onglet « pictos »)', '(onglet « AIDE »)');
  xml = xml.replace('<dataValidations count="5">', '<dataValidations count="6">');
  xml = xml.replace('</dataValidations>', '<dataValidation type="whole" operator="equal" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Colonne automatique" error="La colonne R est remplie automatiquement : 0 sur les lignes remplies, vide sinon." promptTitle="Colonne automatique" prompt="Rempli automatiquement : 0 dès que la ligne contient des données." sqref="R2:R2000"><formula1>0</formula1></dataValidation></dataValidations>');
  for (const attendu of ['COUNTA($A2:$Q2,$S2:$V2)', 'sqref="P2:Q2000"', 'Q2:Q2000"', 'sqref="R2:R2000"', `<c r="R2000" s="${S.auto}"/>`]) {
    if (!xml.includes(attendu)) throw new Error('onglet de travail : transformation manquante ' + attendu);
  }
  return xml;
}
