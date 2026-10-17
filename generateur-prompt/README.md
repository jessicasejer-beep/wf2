# Générateur de prompt

Outil 100 % navigateur (un seul fichier `index.html`, aucun serveur, aucun envoi de données) pour rédiger des prompts Claude Code complets, toujours avec la même structure.

## Utilisation

1. Ouvrir `index.html` dans Chrome, Edge ou Firefox (double-clic suffit).
2. Remplir les sections du formulaire. Le prompt se construit en direct à droite.
3. Joindre les fichiers de référence (glisser-déposer) et décrire leur rôle. Pour les fichiers texte, CSV et Excel, on peut inclure leur contenu (ou un aperçu des onglets) en annexe du prompt.
4. **Copier le prompt** (Ctrl+Maj+C), ou télécharger le `.md`, ou le **pack .zip** (prompt + fichiers joints) à décompresser dans le dossier du projet avant de lancer Claude Code.

Le panneau « Contrôle du prompt » signale les sections obligatoires vides, les fichiers sans rôle, les fichiers cités mais non joints, l'absence de critères de test, etc.

## Prompts enregistrés

- Sauvegarde automatique dans le navigateur (plusieurs prompts, menu déroulant en haut).
- « Plus ▸ Dupliquer » pour partir d'un prompt existant.
- « Plus ▸ Exporter (.json) » pour partager un prompt avec sa structure ; « Importer » accepte ce `.json` ou un prompt `.md` existant (les titres `##` sont rangés dans les sections correspondantes).
- L'exemple « POC générateur de csv » est disponible dans « Plus ».

## Faire évoluer la structure

« Plus ▸ Modifier la structure… » : ajouter, masquer, réordonner des sections, changer leur type (texte, liste, étapes, tableau, fichiers), leur aide, leur caractère obligatoire, et surtout les **suggestions réutilisables** (formulations éprouvées ajoutées en un clic). La structure est versionnée (v1, v2…) et s'exporte en `.json` pour être partagée avec l'équipe.

Bibliothèques externes (facultatives, depuis cdnjs) : SheetJS pour l'aperçu des fichiers Excel, JSZip pour le pack .zip. Sans elles, le reste fonctionne.
