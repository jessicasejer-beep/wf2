# Kanban Projets

Tableau kanban unique pour suivre tous vos projets en cours. Chaque projet a sa propre couleur ; on peut filtrer sur un ou plusieurs projets.

**Utilisation :** ouvrir `index.html` dans un navigateur. Aucune installation. Les données sont enregistrées dans le navigateur (localStorage) ; pensez à **Exporter** régulièrement pour garder une sauvegarde JSON.

## Fonctionnalités

- **Projets** : créer, modifier (nom, couleur, description), supprimer (avec ses tâches, confirmation + annulation possible). Barre d'avancement par projet.
- **Tâches** : créer, modifier, dupliquer, supprimer (annulation possible). Champs : titre, projet, statut, priorité, échéance, description, étiquettes, sous-tâches.
- **Kanban** : colonnes À faire / En cours / Terminé, glisser-déposer entre colonnes et pour réordonner, ou menu « ⋯ › Déplacer vers ».
- **Filtres** : par projet (clic ; Ctrl/⌘+clic pour en combiner plusieurs), priorité, échéance (en retard, aujourd'hui, 7 jours, sans date), recherche texte. Tri manuel / priorité / échéance.
- **Indicateurs** : nombre de tâches, % d'avancement, priorités hautes ouvertes, tâches en retard (cliquable).
- **Divers** : thème sombre, export / import JSON, version mobile.

## Raccourcis clavier

| Touche | Action |
|---|---|
| `N` | Nouvelle tâche |
| `P` | Nouveau projet |
| `/` | Rechercher |
| `Échap` | Fermer la fenêtre / le menu |
