# 📚 Infothèque

Une bibliothèque visuelle et ludique (façon site de recettes) pour se constituer une base de connaissances
**IA & product management** à partir d'infographies trouvées sur internet.

1. **Déposez** une ou plusieurs infographies (glisser-déposer, bouton, ou Ctrl+V).
2. **Choisissez ce que vous voulez en faire** :
   - 🇫🇷 Traduire en français
   - 🧒 Expliquer simplement
   - 📝 Résumer
   - 💡 Expliquer le concept
   - 🛠️ Mettre en pratique (côté équipe produit)
   - 🎯 Quiz de révision
   - 🎨 Refaire l'infographie en français (page HTML téléchargeable)
3. Claude lit l'image, la **classe automatiquement** (titre, catégorie, tags, niveau, temps de lecture)
   et prépare les fiches. Chaque infographie devient une « recette » avec ses onglets ; on peut lancer
   d'autres actions plus tard.

Recherche, filtres par catégorie, favoris, compteur de consultations et rubrique « À la une ».

## Démarrage

Prérequis : Node.js 20.12 ou plus et une clé API Anthropic.

```bash
npm install
cp .env.example .env      # puis collez votre clé dans ANTHROPIC_API_KEY
npm start                 # http://localhost:3000
```

## Fonctionnement

| Élément | Rôle |
|---|---|
| `server.js` | Serveur Express : upload, API REST, fichiers statiques |
| `lib/claude.js` | Appels à Claude (`claude-opus-5-5`) : analyse de l'image et actions. Les consignes de chaque action sont dans l'objet `ACTIONS` : c'est là qu'on en ajoute ou modifie une |
| `lib/store.js` | Stockage local : `data/library.json` + images dans `data/uploads/` |
| `public/` | Interface (HTML/CSS/JS sans framework ni build) |

- La clé API reste côté serveur, jamais dans le navigateur.
- Images acceptées : PNG, JPG, GIF, WebP, 5 Mo maximum.
- L'infographie recréée en HTML s'affiche dans un cadre isolé (aucun script exécuté).
- Les données sont dans `data/` (ignoré par git) : sauvegardez ce dossier pour garder votre bibliothèque.

Variables optionnelles : `PORT`, `CLAUDE_MODEL`, `DATA_DIR`.
