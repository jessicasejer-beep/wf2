# Kanban Projets

Tableau kanban unique pour suivre tous vos projets en cours. Chaque projet a sa propre couleur ; on peut filtrer sur un ou plusieurs projets.

**Utilisation :** ouvrir `index.html` dans un navigateur. Aucune installation. Les données sont enregistrées dans le navigateur (localStorage) ; pensez à **Exporter** régulièrement pour garder une sauvegarde JSON.

## Fonctionnalités

- **Projets** : créer, modifier (nom, couleur, description), supprimer (avec ses tâches, confirmation + annulation possible). Barre d'avancement par projet.
- **Tâches** : créer, modifier, dupliquer, supprimer (annulation possible). Champs : titre, projet, statut, priorité, échéance, description, étiquettes, sous-tâches.
- **Kanban** : 3 colonnes : « À faire / En cours », « Bloqué / Attente validation » (motif affiché sur la carte), « Terminé / En prod », glisser-déposer entre colonnes et pour réordonner, ou menu « ⋯ › Déplacer vers ».
- **Archives** : « ⋯ › Archiver » range une tâche hors du tableau sans la supprimer ; bouton d'archivage groupé sur la colonne Terminé ; section Archives dans la barre latérale pour consulter, restaurer ou supprimer.
- **Filtres** : par projet (clic ; Ctrl/⌘+clic pour en combiner plusieurs), priorité, échéance (en retard, aujourd'hui, 7 jours, sans date), recherche texte. Tri manuel / priorité / échéance.
- **Indicateurs** : nombre de tâches, % d'avancement, priorités hautes ouvertes, tâches en retard (cliquable).
- **Divers** : export / import JSON, version mobile.

## Raccourcis clavier

| Touche | Action |
|---|---|
| `N` | Nouvelle tâche |
| `P` | Nouveau projet |
| `/` | Rechercher |
| `Échap` | Fermer la fenêtre / le menu |

## Application Windows (données sur le PC)

Le dossier `desktop/` contient une version installable sous Windows (Electron). La page est la même que `index.html`, mais les données sont enregistrées dans un fichier sur le PC :

- Données : `%APPDATA%\Kanban Projets\kanban-data.json` (menu **Fichier › Ouvrir le dossier des données**).
- Sauvegardes automatiques : une copie par jour d'utilisation dans `%APPDATA%\Kanban Projets\sauvegardes\`, les 14 dernières sont gardées.
- La désinstallation garde les données.
- Installation pour l'utilisateur courant, sans droits administrateur.

Pour reprendre les données de la version en ligne : **Exporter** dans la page en ligne, puis **Importer** dans l'application.

### Fabriquer l'installeur (depuis Linux, sans Wine)

```bash
sudo apt-get install nsis zip
cd desktop
npm install
npm run dist:win
```

Résultat dans `desktop/dist/` : `Kanban-Projets-Setup-<version>.exe` (installeur) et `Kanban-Projets-Portable-<version>.zip` (version sans installation).
Pour tester l'application sur Linux : `npm start`.
