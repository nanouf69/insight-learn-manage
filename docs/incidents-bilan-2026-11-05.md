# Incidents bilan 05/11/2026

## P1 — 57014 enregistrement de module (modules 2/4/5/10)
- Traces : 03/11 19:40, 04/11 08:09, 10:07, 14:32 (m10 ×2, m2), 18:21, 19:38 (m4), puis « stream timeout » 19:42.
- Cause mesurée : `fusion_details_progression` (appelée à chaque sauvegarde de progression non terminée) comparait chaque question à toutes les autres (quadratique). Détails réels : ~850 questions, 73–85 Ko par module.
  Base isolée au repos : 152–215 ms pour un seul appel (module 2, 875 questions) ; ×5 à ×350 sous la charge mesurée hier en production.
- Correctif ACTIF (migration 0240) : passage linéaire via table de correspondance. Équivalence : 980/980 cas réels identiques (875 non triviaux, doublons, clés nulles, tableaux vides). Temps : 28–44 ms au lieu de 152–215 ms ; lot de 980 cas : 8,5 s au lieu de 83 s.
- Droits identiques (ACL relue), pas de SECURITY DEFINER, signature inchangée.
- Test contractuel `module_completion_sql_contract.py` : 17/17 après correction du banc de test (voir triage test_16).

### Triage test_16 (05/11 07:51)
- Assertion : `assertIn('1 question(s) QCM sans réponse', err(smc(U, 2, True, 100, {1:"B", 2:null})))` après une ligne `in_progress` contenant `1-2`. Attendu : refus P0501 « 1 question(s) QCM sans réponse ». Observé : `''` (validation acceptée).
- Cause prouvée : le banc rejouait 0230 (absence de `etat_completion_modules` dans le catalogue capturé), qui redéfinit `save_module_completion` dans sa version d'AVANT 0232 (brouillon accepté comme preuve). La prod exécute 0232 : md5 du corps live `be933393…` = corps de 0232, qui exige `status='submitted'`.
- Qualification : banc de test obsolète, pas un défaut de validation en production. Échec identique avant/après 0240 (contre-épreuve).
- Correction : le banc rejoue 0232 après 0230. Assertion de test_16 inchangée (propriété non affaiblie). Résultat : 17/17 OK.
- Client (aperçu, non publié) : single-flight des envois identiques + gigue 0,5×–1,5× des nouveaux essais (`src/lib/moduleCompletion.ts`, test `module-completion-single-flight.test.ts`).
- Non mesurable : `pg_stat_statements` par requête de production inaccessible au rôle de lecture ce jour ; gain réel en ligne à constater sur les prochains jours.

## P2 — files de réponses
- Ahmed MALKI : délai 15 s à 21:09 et 21:25:37 ; 7 lignes réécrites côté serveur 21:25:37–39 → reprise effective prouvée pour ces 7. 8e élément : non prouvé. File locale vide : non prouvée.
- Mohamed MLIKI : délais 15:58 → 22:11:37 (3 occurrences) ; aucune écriture serveur après 19:56:04 → 1 élément non confirmé, ni perdu ni récupéré prouvé.
- Discrimination : réseau (Failed to fetch 18:12), délai serveur (15 s, concomitant aux 57014), aucun refus SQL ni auth dans leurs traces. Comportement de la file conforme (conservation + nouvel essai). Aucun changement de code de la file ; la charge réduite (P1) est le levier.

## P3 — 42501 etat_completion_modules
- 22:14:17 depuis CoursPublic, trace sans user_id ni e-mail. La trace ne contient pas le rôle JWT : l'appel anonyme est une HYPOTHÈSE (session absente, expirée ou non encore restaurée côté client), non prouvée. Code actuel : `chargerEtatCompletionServeur` passe par `freshSessionRead` (utilisé par CoursPublic ×2, useCandidatModules, jalonsPedagogiques). Version en ligne à 22:14 : non prouvée. Aucun droit élargi.

## P4 — voir roadmap (preventDefault vite:preloadError).

## QRC « 22 en attente »
- Belarbi 12, Ferreira 8, Rhaima 2 = exactement les 22 lignes `exclue / matiere_exclue_gt`, matière `reglementation_taxi2` (règle volontaire `MATIERES_EXCLUES`). Politique de correction formateur, pas un bogue. Aucune IA lancée, aucune copie renotée.
