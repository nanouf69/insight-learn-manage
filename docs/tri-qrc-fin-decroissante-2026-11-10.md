# Tri admin QRC — 10/11/2026

## Diagnostic
- `ordreCandidats.ts` imposait explicitement la fin croissante : cause partagée de l'ordre ancien → récent dans chaque matière.
- La grille V2 et les flèches utilisent toutes deux ce comparateur ; les copies EB2 historiques passent aussi par la même grille.
- V2 : fin réelle `exam_attempts_v2.finished_at`. EB2 historique : fin de remise `apprenant_quiz_results.completed_at`, sans utilisation de la date de correction.
- Attention : la colonne « Passage » affiche actuellement le début V2, pas la fin ; ces heures affichées ne doivent pas servir à vérifier le tri. Aucun changement de cette colonne dans ce correctif ciblé.

## Correctif en aperçu seulement
- Fin décroissante pour les passages terminés ; égalités départagées par ID immuable, indépendamment du nom et du début. Fins inconnues puis passages non terminés restent derrière ; aucune fin inventée.
- Navigation entre copies alignée sur la grille.
- Pagination de découverte : ajout de l'ID stable après les dates, pour les égalités entre pages ; le chargement V2 sans filtre parcourt désormais toutes les pages. Les chargements filtrés utilisent des lots de 150 IDs ; consultation EB2 par lots de 100 et pagination des remises déjà présentes.
- Arrivée/finalisation d'un passage : écoute des tables V2 et historiques déjà activées en Realtime, actualisation du catalogue puis relecture, délai de regroupement 500 ms, aucun polling ni migration.

## Tests exécutés
- PASS : 89 tests / 6 fichiers (tri, navigation, persistance de notes, inscriptions croisées, projection historique, grille compacte).
- Cas explicites : 20:59 → 20:40 → 20:38 → 20:27 ; fin plutôt que début/correction/nom ; 1205 lignes regroupées ; égalités et rechargement ; absence de fin ; nouvelle fin reçue par signal serveur sans écriture de note.
- PASS navigateur authentifié admin, lecture seule : 7 matières EB2 TAXI, ordre identique après rechargement ; 5 matières avec QRC EB2 VTC soir, ordre identique après rechargement en viewport mobile 390 × 844.
- PASS rapprochement réel ciblé de 6 passages TAXI : ordre des lignes conforme aux fins serveur, dont 13:49:50 → 13:44:19 → 13:32:48 UTC pour Réglementation TAXI 2. Le début affiché est différent.
- Build aperçu : OK.

## Limites et état
- Arrivée d'un nouveau passage testée sur données synthétiques et événement simulé, pas par création de copie réelle. Aucune copie élève créée pour le test.
- Aucun contrôle exhaustif navigateur de tous les EB ni modification des écrans d'archives anciens ; le correctif vise la grille partagée V2 et sa consultation historique EB2.
- Aucune donnée élève, note, QRC, réponse, barème ou version d'examen écrite ; aucune publication effectuée. Accord requis avant publication.