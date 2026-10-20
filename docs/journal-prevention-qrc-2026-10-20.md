# Prévention générale QRC — 20/10/2026

## Périmètre et diff
- `supabase/functions/qrc-ia-correction/index.ts` : un appel fournisseur streamé par invocation, erreurs du flux capturées, aucune publication d'un flux interrompu/refusé, reprise uniquement après erreur fournisseur terminée 429/5xx.
- `_shared/qrcIaSuite.ts` : délai exponentiel, deux reprises maximum par QRC. File limitée à 24 invocations et 48 livraisons. État inconnu/actif non rejoué, alerte explicite.
- Migrations 0180–0186 : réservation atomique, reçu initial et correction atomiques, identité de réponse recontrôlée au retry et JSON original comparé à la publication, preuve finale vérifiée, bail 1h clôturé en revue si expiré sans nouvel appel aveugle.
- Continuation par capacité UUID liée à un seul passage, table lisible seulement admin, claim service-only, état/délai/budget contrôlés. Un seul travail actif de file ; déclenchement à l'enqueue, contrôles chaque minute pendant la file seulement, arrêt après drain ou pause. Au plus 1440 contrôles/jour actif ; coût Cloud possible. Aucun travail historique mis en file (cutoff automatique 20/10 09:53Z).
- Tests `qrc_ia_sql_guards.py`, `stream_test.ts`, `qrc-ia-suite.test.ts`, adaptation test correction IA. AGENTS documente la décision.

## Preuves
- 180 tests Vitest dans 13 fichiers PASS (dont suite critique), 8 tests SQL sur PostgreSQL local jetable PASS, 2 tests Deno à fournisseur fictif PASS : 503 et interruption, un appel seulement.
- Deno check isolé PASS ; compilation automatique frontend build OK à 10:10:45Z. Pas de construction/typecheck frontend manuels (contrôles plateforme), aucun résultat distinct inventé.
- Fonction déployée ; test live mauvais token 403 « Continuation non autorisée », sans appel IA. Aucun test payant supplémentaire ni travail global lancé. File production vide et aucun cron actif au contrôle.
- Kevin SELECT : Q1=2 (08:50:10.593301Z), Q2=2 (08:50:57.988551Z), Q3=0 (08:51:09.270758Z), reprises appliquee ; Q17=2 le 19/10 14:03:53.103415Z intacte. Ancienne trace Q3 remplacée à l'affichage seulement par preuve finale.
- Jean : correctif PGRST303 et retry unique après refresh même compte conservé ; files intactes, jeux jamais réputés terminés sans preuve. Tablette/reconnexion réelle inaccessible, NON PROUVÉES.
- Vérification Jean supplémentaire : 21 tests dans 5 fichiers PASS (PGRST303, jeux, pages concurrentes et identité propriétaire), sans compte réel.
- Empreintes SELECT avant/après identiques : modules62 `6dcdf347cd039743c67774ed064fbbb6`, versions57 `614b47fc7749ae2f0130745ce042e8c8`, fin_acces22 `80fc8b42ea7e59cb4f98d91ca51ba064`, calcul_fige22 `eaaf8b4238abd56039cf4a978dab7821`. Méthode md5(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id)), gel_id pour calcul_fige. Baseline historique4fcc… non reproduite, source exacte requise.

## Limites
- Prévention ne répare pas une panne fournisseur. Succès de la nouvelle chaîne automatique avec un vrai élève NON PROUVÉ : aucun appel IA supplémentaire autorisé. Livraison dispatcher réelle non exercée (file vide) ; échecs de livraison bornés, résultat HTTP non stocké individuellement.
- Pas de modification de questions, réponses élèves, notes définitives, signatures/heures/gels/Ismail ; aucun mail. Publication frontend demandée, preuve asset ajoutée séparément après contrôle.

## Publication réelle
Navigateur public 20/10 10:14 UTC : https://gestion.ftransport.fr/login, connexion affichée, zéro erreur JavaScript, maintenance absente. Asset `index-BcmV7BPt.js` HTTP200 SHA256 `7ebe759489f176e708d50842e58c627d85e150d0ac5bedc1a41430ab93211325`. Fonction finale source SHA256 `5726b2da771269a795322daa18c37d9533d6d29faa28158794867faaa0d0f5dc` déployée. Types Deno PASS et dernière suite34 tests PASS après ultime changement. Preuve fonctionnelle complète connecté non revendiquée.