# Corrections ciblées révision / QRC — 08 novembre 2026

## État : préparé et testé partiellement, non mis en service

Pas de migration appliquée ni de publication demandée dans ce tour. Paquet public relu : `assets/index-Dy9_Awa8.js`. Révision candidate relevée avant rédaction : `8df8427e34398aee2445a65f283d7fb8581d5700` (20:32:34 UTC), suivie des edits du harnais/rapport ; ne pas présenter ce hash comme version déployée.

## Causes et corrections

- Ancien Terminer insérait à nouveau après perte du retour réseau ; le trigger attribuait une nouvelle tentative. Nouveau candidat : RPC atomique, verrou transactionnel par apprenant/examen/révision, reçu indépendant, même résultat au rejeu. Les matières/questions restent dans `questionOrder` de la preuve serveur. Aucun changement des tentatives initiales.
- Protection INSERT également pour un ancien client avec identité de révision. Anciens résultats sans identité conservés ; conflit historique explicite, jamais fusionné. Timeout de verrou : 3 s. Retour arrière : révocation du RPC, reçus conservés, aucun retour vers l'ancien INSERT non idempotent.
- Réabonnement/online/focus/visibility : rattrapage regroupé à 400 ms puis une seule lecture supplémentaire à 2,4 s. Aucun polling périodique. Pas de garantie temporelle lorsqu'aucun événement de reprise n'arrive ou réseau indisponible.
- NotesView : valeur par défaut de liste vide instable provoquait des relectures à chaque rendu ; référence stabilisée. Réponses obsolètes et état d'un autre compte écartés. EcranResultats conserve l'état pendant une relecture du même compte mais l'efface lors d'un changement.

## Résultats exécutés

- PASS : 4 contrats PostgreSQL jetables (deux finalisations concurrentes, retour perdu/rejeu identique, ancien INSERT doublon refusé, clôture non confirmée refusée, autre propriétaire/session sans identité refusés). Résultat final unique ; empreinte de note initiale inchangée.
- PASS : 21 tests ciblés révision/rattrapage, dont vrai composant QCM/QRC et file durable simulée, double clic, reload, reconnexion, timers/callbacks obsolètes ; 11 autres tests note/source/snapshot/rattrapage passés (deux tests rattrapage communs aux séries).
- PASS : vrai handler réponses + PostgREST + PostgreSQL (1 test intégration, 501 événements et rejeu/concurrence) ; vrai handler QRC avec fournisseur HTTP fictif local (5 tests, aucune IA payante).
- PASS navigateur : vrais RevisionFausses/NotesView/EcranResultats ; transport local intercepté, finalisation et état des notes dans PostgreSQL jetable. QCM multiple B+C et QRC, commit puis ACK perdu, reload puis reçu identique : **1 résultat**, même UUID aux deux appels. Captures `1-ack-lost`, `2-reload-receipt`, `3-qrc-pending`, `4-qrc-partial`, `5-qrc-final-no-reload`, `6-other-learner` sous `/tmp/browser/qrc-revision`.
- Note SQL fictive 6,67 → 11,67 provisoire → 18,33 définitive. L'écran reste « en attente » pendant le provisoire (comportement existant), puis affiche **18,3/20 sans reload** après `online` local. Capture partielle à ~711 ms après SQL ; capture définitive à ~3,01 s après SQL (attente imposée au test, pas latence minimale mesurée).
- Build du harnais automatique : OK au dernier signal 20:36:15 UTC. Suite globale lancée mais interrompue par limite d'exécution avant résumé : **NON PROUVÉ**, aucun total global PASS revendiqué.
- Scan 20:36:21 UTC : 0 critique, 6 avertissements, 2 informations ; analyse connecteur non exécutée faute connecteur configuré. Aucun finding supprimé/ignoré.

## Données et limites

SELECT avant/après préparation : 118 résultats révision, empreinte `5fb009561a202f3a4da9e75aa263b16a` inchangée ; modules 5/11 : `d78e0738186ee71ca594eced80c263e6`. 95 anciens résultats sans identité, sept groupes répétés sans identité : pas une preuve de doublon même opération ; aucune mutation.

Realtime hébergé, vraie veille OS, expiration réelle de session et mobile complet non vérifiés. Le harnais navigateur n'est pas le handler Deno couplé : ses réponses de sauvegarde sont locales ; le handler est testé séparément avec PostgREST. Finalisation navigateur réellement exécutée en SQL mais transport RPC local, pas Data API authentifiée réelle. QRC navigateur utilise état SQL fictif, corrections réelles/handlers vérifiés séparément. Aucune copie réelle utilisée en écriture, mail/SMS/IA/export/restauration.

Publication non engagée : suite globale complète et matrice complète admin/RLS/conflits historiques à finir avant application serveur ; ne pas annoncer les deux défauts résolus en production. Le lot public diffère du candidat.