# Fiabilisation de la chaîne sauvegarde → confirmation → validation (30/10/2026)

Statut : correctif préparé dans l'aperçu, **non publié**. Aucune donnée élève, question, note, signature, relevé ou copie modifiée. Aucun mail/SMS/IA, aucun test sur dossier réel.

## Mesures (lecture seule)
- Statistiques serveur (temps d'exécution cumulé) : relecture complète `module_editor_state` par module = **36,7 %** (36 958 appels, moy. 188 ms, max 5,8 s) ; banque `quiz_questions` = **12,6 %** (15 026 appels). Requêtes triviales (ex. réservations pratiques, 143 lignes) à 1,5 s en moyenne → serveur saturé aux heures de pointe.
- 29/10 10:00 UTC : 12 élèves connectés ; sauvegarde Admin 57014 à 10:00:28 puis PGRST003/PGRST002/57014 chez les élèves 10:00:29–40 (séquence prouvée ; causalité = hypothèse forte).
- « Délai d'envoi dépassé (15 s) » : 12 le 29/10 (NESAR 22:11, Benachour 16:33–18:00, Dakhlaoui 12:42–14:17).
- `quiz_validation_echecs` depuis le 15/10 : relecture 20 (10 élèves), délai 20 s pendant envoi 17 (6 élèves).
- Hedy Khalfoun : copies EB2 réglementation VTC t1/t2 soumises (22/10), intactes. Corps/SQLSTATE exact du 400 du 29/10 **introuvable** (aucun journal Edge conservé) — non inventé.
- Dakhlaoui 12/307 : échec relecture 10:28:05 puis soumis 10:28:26. Souici/Sawadogo/Dakhlaoui : quiz principaux soumis ; les lignes `revision_exo` en cours sont des révisions distinctes.
- PDF Cihan : le polyfill existait sur la page mais pas dans le worker pdf.js (contexte séparé).

## Correctifs
1. `src/lib/moduleLiveRefresh.ts` + `ModuleDetailView.tsx` : sonde légère (id + date) toutes les 5 s / 15 s, relecture complète seulement si la version change ou toutes les 2 min ; une lecture à la fois ; focus + visibilité fusionnés ; Realtime décalé 0–1,5 s ; attente 5 s→60 s ±20 % après erreur ; onglet masqué = aucun appel. Les réapplications formateur ne partent plus à chaque tic mais après chaque relecture complète réussie.
2. `src/lib/relectureBornee.ts` : relecture de confirmation du quiz relue ≤ 3 fois pour erreur passagère (PGRST00x, 57014, 5xx, 429, réseau), un seul renouvellement de session sur JWT expiré ; une différence de contenu reste un échec. Télémétrie : `relecture_erreur_<code>`, `relecture_difference`, `relecture_ligne_absente`.
3. `answerPersistence.ts` : envoi de fermeture avec `operation_id`, une seule fois par version et par 10 s, jamais en doublon d'un envoi en cours ; refus serveur journalisé avec code et `request_id` (aucune réponse ni jeton).
4. `pdfWorker.ts` : navigateurs sans `Promise.withResolvers` natif → worker enveloppe qui pose le polyfill puis importe le vrai worker.

## Tests
- `src/test/fiabilisation-chaine-sauvegarde-30oct.test.ts` : 18 PASS (sonde, sécurité 2 min, onglet masqué, rafale Realtime, PGRST003/57014 saturé, erreur de relecture complète, édition en cours, 401/JWT, 42501 sans réessai, PDF ancien navigateur).
- `quiz-module-validation-serveur` : test mis à jour pour les nouvelles étapes. Un test de ce fichier (« Promise.race([sequence(), delai]) ») échouait déjà avant ce correctif.
- Typecheck OK. Empreintes : versions 57 `614b47fc7749ae2f0130745ce042e8c8`, relevés 22 `4fcc0d041f89b4770fef79f95129e01a` inchangées.

## Limites
- Aucun clic réel avec un compte élève ; baisse de charge à confirmer après publication sur les statistiques serveur.
- Files locales NESAR/Benachour/SMAIL/HAMDI : inaccessibles depuis le serveur ; aucune récupération affirmée.
- Le délai Edge 15 s n'est pas allongé ; sa cause côté serveur (attente de la validation automatique avant réponse) reste à mesurer.
