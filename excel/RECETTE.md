# Essai du classeur Excel avec macros

Fichier à tester : `Fichier-de-travail-import-WF.xlsm` (à la racine du dépôt).
Matériel : les dossiers `excel/recette/Lot_essai/` et `excel/recette/Comparaison_essai/`, et l'exemple `ref/import.csv`.
Durée : 20 minutes environ, sur un PC Windows avec Excel installé.

Les règles de contrôle, l'import, l'export d'import.csv, la colonne R et la comparaison ont été testés
automatiquement (108 vérifications, dans LibreOffice). Cet essai vérifie ce qui ne peut l'être que dans
Excel : l'onglet du ruban, le choix des dossiers et fichiers, l'enregistrement du fichier et l'affichage.

| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Copier les dossiers d'essai et le `.xlsm` sur le PC. Ouvrir le `.xlsm`. | Si un bandeau rouge « Risque de sécurité » s'affiche : fermer Excel, clic droit sur le fichier → Propriétés → cocher « Débloquer » → OK, puis rouvrir. Cliquer sur « Activer le contenu » si demandé. Le classeur s'ouvre sur l'onglet **READ ME**. | |
| 2 | Regarder les onglets et le ruban. | Onglets READ ME, SC_import_modele_V1, AIDE (plus d'onglet « pictos »). Onglet **Import WebFactory** du ruban avec 6 boutons : Sélectionner un dossier de ressources, Vérifier un fichier, Vérifier, Comparer le fichier et les ressources, Exporter import.csv, Supprimer les données. | |
| 3 | Onglet AIDE. | Liste des 23 colonnes, valeurs autorisées (profil, langue, 0/1, watermark), 46 pictos avec leur image en face du nom. | |
| 4 | Onglet SC_import_modele_V1, colonne R. | En-tête et cellules gris, **vides**. Taper un titre en B2 : R2 affiche 0. Effacer B2 : R2 redevient vide. Taper 1 dans R2 : Excel refuse (« Colonne automatique »). | |
| 5 | **Sélectionner un dossier de ressources** → choisir `Lot_essai`. | Message : 9 fichiers lus, 9 lignes créées ; 1 fichier était dans un sous-dossier ; 2 fichiers système ignorés. Colonne A remplie, dans l'ordre doc1, doc2, doc10… | |
| 6 | Onglet **Contrôle**. | Titre rouge « N erreurs bloquantes sur N lignes ». Groupes « Contient un espace… », « Accents ou caractères spéciaux… », « Colonne obligatoire vide : L2 (Titre, Niveau principal…) » (la colonne R n'y figure jamais). Pas de bouton « Copier le rapport ». | |
| 7 | Cliquer sur un nombre en colonne A de l'onglet Contrôle. | Excel va à la première cellule concernée. | |
| 8 | Dans le tableau, survoler la cellule rouge de « mon fichier.pdf ». | Une note explique l'erreur et propose « mon_fichier.pdf ». | |
| 9 | Corriger cette cellule (taper `mon_fichier.pdf`). | La couleur et la note disparaissent. | |
| 10 | **Exporter import.csv** (alors qu'il reste des erreurs). | Export refusé, l'onglet Contrôle s'affiche. | |
| 11 | **Supprimer les données** → Oui. | Tableau vide, colonne R vide, onglet Contrôle supprimé. | |
| 12 | **Vérifier un fichier** → `ref/import.csv`. | 5 ressources chargées, « Aucune erreur bloquante ». | |
| 13 | **Exporter import.csv** → enregistrer dans un dossier vide. | Message « import.csv enregistré : 5 ressources ». Le fichier fait exactement 1 146 octets, comme `ref/import.csv` (clic droit → Propriétés). | |
| 14 | **Comparer le fichier et les ressources** → choisir `Comparaison_essai`, puis répondre Oui pour `liste_essai.csv`. | Onglet **Comparaison** : « Différences : 2 fichiers listés introuvables… 1 fichier du dossier non listé ». Fichiers attendus 4, fichiers dans le dossier 4, écart 0. Introuvables : DOC2.pdf (majuscules différentes : « doc2.pdf ») et absent.pdf. Non listé : extra.pdf. Le tableau n'a pas changé. | |
| 15 | Enregistrer le classeur, le fermer, le rouvrir. | Les données, les 0 de la colonne R (lignes remplies seulement) et l'onglet du ruban sont toujours là ; le classeur s'ouvre sur le tableau s'il contient des ressources. | |

En cas de message d'erreur VBA (« Erreur d'exécution… » avec un bouton « Débogage ») : noter le
numéro de l'étape, le texte du message et, après « Débogage », la ligne surlignée en jaune.
