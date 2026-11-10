# Onglet « Actualiser les notes » — 10/11/2026 14:55 UTC

Statut : **installé côté serveur (inerte sans clic admin), écran en aperçu, NON PUBLIÉ.**

## Livré
- Serveur (migrations 0261, 0262) : `eb_notes_diagnostic` (lecture seule, paginée), `eb_notes_diagnostic_ancien` (lecture seule), `eb_notes_actualiser` (admin, copie terminée, identité, verrou, version CAS, idempotence, journal append-only `eb_notes_synchronisations`).
- Actualisation possible uniquement : résultat absent, « En attente » avec 0 QRC restante, « définitif » avec QRC restantes, compteur faux — et seulement si la note enregistrée = calcul serveur. Jamais : note divergente, identité incohérente, copie importée sans barème, ancienne copie.
- Écran : onglet « Actualiser les notes » (Cours en ligne, admin) + panneau repliable dans le correcteur ; bouton « Vérifier et actualiser » (lecture), bouton par copie et « tout actualiser » (une copie à la fois, version lue). Revérification automatique de la copie après chaque correction enregistrée.

## Tests
- PostgreSQL jetable : 14/14 (droits élève/anonyme refusés, attente normale puis cohérent TAXI et VTC, attente fantôme réparée note inchangée, définitif → provisoire si QRC restantes, note divergente refusée, résultat manquant jamais définitif avec QRC restantes, version périmée refusée, copie en cours refusée, identité incohérente refusée, concurrence = un seul gagnant, double clic = une écriture, pagination, ancien circuit jamais réparable, importée sans barème refusée, rollback + réinstallation).
- Application : 4 103 tests PASS (dont 6 nouveaux).
- Production : empreinte des 2 749 résultats existants identique avant/après ; journal vide (aucune actualisation exécutée) ; compte non administrateur refusé (403).

## Constat production (répétition SQL en lecture seule de la même règle)
- 1 439 copies cohérentes, 164 en attente normale, 1 044 importées conservées.
- 0 attente fantôme, 0 définitive avec QRC restantes, 0 résultat absent.
- 56 notes différentes du calcul (32 TAXI/TA), dernière le 06/11 : vérification humaine, aucune réparation.
- 36 copies importées sans barème avec QRC restantes (25 élèves) : les corriger effacerait leur note (cas Diallo EB3 25/09, note vide). Défaut latent du recalcul, à traiter sur accord.
- Ancien circuit : 8 copies TAXI récentes sans correction possible (CHEMOUN, FERREIRA) — voir docs/incident-notes-qrc-eb3-taxi-2026-11-10-1432.md.

## Non vérifié
- Diagnostic réel exécuté avec un compte administrateur (votre compte de contrôle a le rôle élève) ; écran non vu dans le navigateur.
- Rafraîchissement immédiat de l'écran élève déjà ouvert.

## Rollback
docs/sql-revue/2026-11-10-eb-notes-synchronisation-ROLLBACK.sql (retire les trois commandes, conserve le journal) — testé sur base jetable.
