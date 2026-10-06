# Notes individuelles des candidats

## Résultat
- Ajouter un champ « Note » à côté de chaque élève dans les listes TAXI/VTC de la lettre CMA et des candidats à former.
- Conserver la même note pour cet élève et cette session ; bouton d’enregistrement explicite et confirmation visible.
- Afficher la note à côté de son nom dans la lettre envoyée à la CMA, son aperçu et son impression.
- Inclure uniquement sa propre note dans son invitation et sa relance d’entraînement pratique, ainsi que dans les aperçus concernés.
- Une note vide n’ajoute rien aux mails.

## Sécurité
- Conserver toutes les versions des notes, sans suppression ni écrasement de l’historique.
- Refuser une sauvegarde périmée si une autre personne a modifié la note ; conserver la saisie pour résolution manuelle.
- Ne modifier aucune date, réservation, réponse, note d’examen ou liste de candidats.
- Aucun mail ni SMS envoyé pendant les vérifications ; aucun test sur de vrais élèves.

## Fichiers prévus
- `src/components/examens/ExamenReussitePage.tsx` : champs et insertion dans les mails/aperçus CMA et élèves.
- Nouveau composant ciblé de saisie et nouveau module de lecture/enregistrement des notes.
- Nouvelle migration additive : historique des notes et sauvegarde sécurisée, accès administrateur uniquement.
- Tests ciblés, `AGENTS.md` et `roadmap.md`.

## Détails techniques
Notes distinctes des notes d’examen et du champ CRM général, identifiées par élève + session théorique + période pratique. Historique append-only, contrôle de version côté serveur et texte échappé avant insertion dans les mails HTML. Vérifications sur données fictives et contrôle lecture seule avant/après.