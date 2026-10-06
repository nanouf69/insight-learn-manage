# Choisir une session ou toutes les dates

## Résultat
- Dans « Inscrits théorique », proposer « Toutes les dates » en plus de chaque session d’examen.
- Une date affiche ses inscrits ; « Toutes les dates » affiche ensemble tous les inscrits ayant une date d’examen.
- Adapter le titre et masquer la date limite unique dans la vue globale.
- Ne changer ni la session du planning quand on choisit « Toutes les dates », ni les dates enregistrées ; aucun envoi.

## Détails techniques
- Garder la liste officielle des sessions ; ajouter un état de vue globale limité au tableau.
- Paginer la lecture globale pour ne pas tronquer les inscrits à 1 000 lignes ; maintenir les filtres existants.
- Fichiers prévus : `src/components/examens/ExamenReussitePage.tsx`, `src/test/examen-session-selector.test.ts`, `AGENTS.md`, `roadmap.md`.
- Vérifier les deux choix sur données fictives, avec toutes les écritures et tous les envois bloqués.