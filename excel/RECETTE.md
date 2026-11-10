# Essai du classeur Excel avec macros

Fichier à tester : `Fichier-de-travail-import-WF.xlsm` (à la racine du dépôt).
Matériel : le dossier `excel/recette/Lot_essai/` et l'exemple `ref/import.csv`.
Durée : 15 minutes environ, sur un PC Windows avec Excel installé.

Les règles de contrôle, l'import, l'export d'import.csv et le rapport ont été testés
automatiquement (78 vérifications, dans LibreOffice). Cet essai vérifie ce qui ne peut l'être
que dans Excel : l'onglet du ruban, le choix du dossier, le presse-papiers, l'enregistrement
du fichier et l'affichage.

| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Copier `Lot_essai` et le `.xlsm` sur le PC. Ouvrir le `.xlsm`. | Si un bandeau rouge « Risque de sécurité » s'affiche : fermer Excel, clic droit sur le fichier → Propriétés → cocher « Débloquer » → OK, puis rouvrir. Cliquer sur « Activer le contenu » si demandé. | |
| 2 | Regarder le ruban. | Un onglet **Import WebFactory** apparaît en premier, avec 6 boutons. Le classeur s'ouvre sur l'onglet de travail. | |
| 3 | **Lire le dossier** → choisir `Lot_essai`. | Message : 9 fichiers lus, 9 lignes créées ; 1 fichier était dans un sous-dossier ; 2 fichiers système ignorés. Colonne A remplie, dans l'ordre doc1, doc2, doc10… | |
| 4 | Ouvrir l'onglet **Contrôle**. | Titre rouge « N erreurs bloquantes sur N lignes ». Groupes « Contient un espace… : L… », « Accents ou caractères spéciaux… : L… », « Colonne obligatoire vide : L2 (Titre, Niveau principal…) ». | |
| 5 | Cliquer sur un nombre en colonne A de l'onglet Contrôle. | Excel va à la première cellule concernée. | |
| 6 | Dans le tableau, survoler la cellule rouge de « mon fichier.pdf ». | Une note explique l'erreur et propose « mon_fichier.pdf ». | |
| 7 | Corriger cette cellule (taper `mon_fichier.pdf`). | La couleur et la note disparaissent. Ctrl+Z fonctionne ensuite sur les autres cellules. | |
| 8 | **Copier le rapport d'erreurs**, puis Ctrl+V dans le Bloc-notes. | Même texte que le titre et les groupes de l'onglet Contrôle. | |
| 9 | **Exporter import.csv** (alors qu'il reste des erreurs). | Export refusé, l'onglet Contrôle s'affiche. | |
| 10 | **Supprimer les données** → Oui. | Tableau vide, onglet Contrôle supprimé. | |
| 11 | **Importer un fichier** → `ref/import.csv`. | 5 ressources importées, « Aucune erreur bloquante ». | |
| 12 | **Exporter import.csv** → enregistrer dans un dossier vide. | Message « import.csv enregistré : 5 ressources ». Le fichier fait exactement 1 146 octets, comme `ref/import.csv` (clic droit → Propriétés). | |
| 13 | Ouvrir l'import.csv exporté dans l'outil web (partie 1 → Importer). | 5 ressources, aucune erreur. | |
| 14 | Enregistrer le classeur, le fermer, le rouvrir. | Les données et l'onglet du ruban sont toujours là. | |

En cas de message d'erreur VBA (« Erreur d'exécution… » avec un bouton « Débogage ») : noter le
numéro de l'étape, le texte du message et, après « Débogage », la ligne surlignée en jaune.
