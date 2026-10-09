# Historique de M. Majsak depuis le 5 octobre

## Changement proposé
- À l'ouverture de l'historique de **Sébastien Majsak**, afficher par défaut les connexions et actions depuis le **5 octobre 2026 inclus**.
- Conserver le choix **Tout l'historique** pour retrouver les dates antérieures.
- Appliquer le même filtre à l'impression de cet écran.

## Préservation et impacts
- Diagnostic en lecture seule : **26 connexions enregistrées**, dont **15 depuis le 5 octobre**.
- Aucune suppression, modification de connexion, réponse, note, signature ou date d'accès.
- Les heures globales réellement effectuées et les autres apprenants restent inchangés.
- Pas de publication sans demande explicite.

## Fichiers prévus
- `src/components/cours-en-ligne/ApprenantActivityReport.tsx` : sélection initiale du filtre pour ce dossier uniquement.
- Un test dédié sur données fictives : date incluse, anciens enregistrements accessibles, autres dossiers inchangés.
- `docs/journal-modifications.md`, `roadmap.md` et, si nécessaire, `AGENTS.md` : journal et règle technique du filtre non destructif.

## Vérifications
- Tests réellement exécutés sur données fictives ; aucune connexion à un compte élève réel.
- Contrôle des requêtes de dates et de l'impression ; contrôle de compilation disponible.
- Contrôle en lecture seule que les 26 connexions restent enregistrées.