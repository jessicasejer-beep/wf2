# Générateur d'import.csv — WebFactory / SEJER

Outil web **100 % local** (un seul fichier HTML) qui aide les équipes éditoriales à préparer le fichier
`import.csv` d'un import en masse de ressources numériques (10 à 350 ressources).

**À utiliser : ouvrir `generateur-import-csv.html` dans Chrome, Edge ou Firefox.** Rien n'est envoyé :
les noms des fichiers et les tableaux sont lus dans le navigateur. Seules la lecture d'Excel (SheetJS 0.18.5)
et l'export Excel (JSZip 3.10.1) chargent une bibliothèque depuis cdnjs ; sans connexion, le reste fonctionne.

## Parcours

1. **Point de départ**
   - *Je commence de zéro* : choisir (ou glisser-déposer) le dossier des fichiers, ou une archive `.zip`
     (zip64 et noms CP437 gérés). Une ligne par fichier, en ordre naturel. Fichiers système, cachés,
     `~$…`, `__MACOSX` et `import.csv` ignorés ; fichiers en sous-dossier signalés (ils doivent être à la racine).
   - *Je vérifie un travail déjà commencé* : importer le fichier de travail Excel (onglet dont A1 commence par
     « Nom du fichier ») ou un CSV (séparateur ¤, tabulation, `;` ou `,` détecté) ; facultativement, choisir aussi
     le dossier pour comparer les noms aux fichiers réels.
2. **Compléter le tableau** façon Excel : 23 colonnes visibles sans défilement horizontal, sélection
   multiple, copier/coller depuis et vers Excel, Ctrl+D, Suppr, Ctrl+Z/Ctrl+Y, listes déroulantes (avec les
   icônes des pictos), remplissage d'une colonne entière, contrôles en direct, brouillon automatique,
   **Télécharger en Excel** (dans le modèle d'origine : listes, couleurs, onglets « pictos » et « AIDE » conservés).
3. **Télécharger import.csv** : bouton actif seulement sans erreur bloquante.

## Format produit (`import.csv`)

En-tête identique à l'exemple fourni (`ref/import.csv`), séparateur `¤`, encodage Latin-1, fins de ligne CRLF,
23 colonnes, uuid toujours vide, aucune ligne vide. Texte normalisé (’ ‘ → ' ; “ ” → « » ; – — → - ; … → ... ;
œ/Œ → oe/OE ; € → EUR ; ¤ supprimé ; espaces multiples, tabulations et retours à la ligne → une espace ;
espaces de début et de fin supprimés). Colonnes de noms de fichiers (1, 13, 14, 15, 20) : NFC + trim seulement.

## Développement

| Fichier | Rôle |
|---|---|
| `src/generateur.src.html` | Source (HTML + CSS + JS) |
| `tools/build.mjs` | Insère le modèle Excel (base64) → `generateur-import-csv.html` |
| `ref/` | Modèle Excel et exemple `import.csv` de référence |
| `tests/run.mjs` | Tests Playwright de bout en bout (146 vérifications) |
| `tests/make_fixtures.py` | Jeux de test (dossier de 30 fichiers, zip, zip64, CSV, Excel) |

```sh
node tools/build.mjs          # reconstruire la page après modification de src/ ou du modèle
node tests/run.mjs            # tests (Chromium, Python 3 + openpyxl, LibreOffice pour l'export Excel)
```
