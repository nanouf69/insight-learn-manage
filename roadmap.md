# Feuille de route

## Bloqué — en attente de la fin de la session EB3 et des 15 resynchronisations
Aucun déploiement tant que des élèves passent EB3. Surveillance lecture seule uniquement.

Pré-requis avant Phase 1 (demande du 22/09, 21h22) :
- Snapshot/état de référence du système actuel à figer AVANT Phase 1 : file locale, accusé de réception serveur, numéro d'ordre, idempotence réponses, idempotence finalisation, snapshots V2, journaux append-only, résultats actuels des tests automatiques.
- Phase 1 ne reconstruit PAS la file locale ; périmètre : indicateur 🟢/🟠/🔴, arrêt définitif des retries sur erreurs fonctionnelles non récupérables (règle 48 h), backoff avec jitter, durcissement du contrôle serveur avant « Terminer la matière », message clair du mode dégradé.
- Après Phase 1 : tests existants + tests spécifiques panne/récupération ; si un seul mécanisme existant régresse → pas de déploiement.
- Aucune modification des réponses, tentatives, notes, corrections ou historiques existants.

1. Réparer l'écriture des alertes (`alertes_systeme` : RLS refuse toute insertion).
2. Distinguer « identifiants incorrects » et « service temporairement indisponible » sur l'écran de connexion.
3. Corriger `permission denied for function check_apprenant_session` (et `start_or_get_exam_timer`).
4. Règle 48 h : message explicite « Nouveau passage non autorisé avant 48 h » + arrêt immédiat des réessais automatiques (pas de requête chaque seconde sur un refus définitif P0471).
5. Monitoring externe de la base (indépendant de la base elle-même) + health checks + alerte automatique si authentification ou sauvegarde indisponible.
6. Conservation des journaux au-delà d'un redémarrage (export périodique hors base) pour permettre une vraie analyse de cause racine.
7. Test de charge sur données fictives : charge du 22/09 puis ×2 et ×3 ; dimensionnement de l'instance décidé APRÈS ce test.

## Suivi en cours (lecture seule, sans modification)
- Point 21h28 : MTIMET Chokri 🟢 (matière EB3 complète envoyée et finalisée à 21h12 Paris). SAWADOGO : 1 seule écriture réussie à 21h23 Paris, plus aucune boucle détectée. Les 15 élèves restent 🟠 — dernière écriture serveur toujours 19h35–19h45 Paris, aucun retour depuis le rétablissement. MTIMET prouve que la chaîne fonctionne ; il ne valide pas les files locales des 15.

## Décisions utilisateur en attente
- Affichage des QRC corrigées automatiquement (2 333) en orange plutôt qu'en vert.
- 2 divergences de contenu EB3 (longueur minimale VTC hybride, prix psychologique).
- Reprise de la copie incrémentale des matières finalisées (corriger `core_import_passage_finalise` / `audit_journal`).

## Plan anti-panne (cahier des charges du 22/09, 21h18) — GELÉ jusqu'à la fin d'EB3 et des 15 resynchronisations
État relevé en lecture seule le 22/09 (aucune modification) :
- EXISTANT : file locale durable + accusé serveur (answerPersistence.ts, answer_save_queue_v1), numéro d'ordre serveur anti-écrasement, idempotence des envois, finalisation idempotente (examFinalizationGuard.ts), snapshot immuable V2, journal append-only (reponses_apprenants_journal, audit_journal), 83 fichiers de tests de non-régression.
- PARTIEL : indicateur de sauvegarde côté élève (états internes idle/saving/saved/error, pas d'affichage permanent 🟢/🟠/🔴) ; arrêt des réessais (403 stoppe, 500 fonctionnel type P0471 continue de réessayer) ; backoff exponentiel (plafond 30 s, sans jitter) ; blocage de la finalisation tant que la file n'est pas vide ; journalisation d'erreurs (error_logs, dans la base) ; mode dégradé (réponses conservées mais pas de message explicite).
- ABSENT : monitoring externe indépendant de la base ; canal d'alerte hors base ; alertes_systeme (RLS refuse toute insertion) ; health checks liveness/readiness/DB/auth/exam-save ; conservation des journaux après redémarrage ; distinction panne / mauvais mot de passe (Login.tsx, StudentLogin.tsx) ; test de charge ; test de panne provoquée ; test de restauration.

Phases (ordre imposé) : 1 données → 2 observabilité → 3 corrections → 4 infrastructure → 5 résilience → 6 capacité → 7 production.

## Étape 0 — Snapshot de référence figé (22/09, 21h40)
Voir `docs/snapshot-reference-avant-phase1.md` : empreintes md5 des 5 fichiers de protection, description figée des mécanismes (file locale, accusé serveur, write_seq, anti-écrasement, idempotences, snapshots V2, journaux), et résultats des tests AVANT modification (449 réussis / 5 échecs préexistants / 50 fichiers non collectés faute du module natif canvas ; 20/20 sur les tests de sauvegarde).
Étapes 1 à 5 de la Phase 1 : EN ATTENTE de l'accord explicite de l'utilisateur après lecture du snapshot.

## Étape 1 — Politique de réessai (faite, EN ATTENTE D'ACCORD pour déploiement)
- `src/lib/answerPersistence.ts` : ajout de `classifyAnswerSaveFailure()` (définitif vs temporaire) et `computeRetryDelay()` (backoff existant + jitter ±30 %, plafond 30 s). Le bloc 403 est remplacé par la classification ; un refus définitif marque l'élément « blocked » (conservé, jamais supprimé) et affiche la vraie raison. Nouvelle empreinte : df05119856fc6c6ba7dff21daaa489b4.
- `src/components/cours-en-ligne/AnswerSaveIndicator.tsx` : affiche le message réel du refus.
- `src/test/retry-classification-etape1.test.ts` : 7 tests (48 h, droits, passage fermé, 5xx/timeout temporaires, jitter, 100 réessais → 1 seul envoi).
- Non-régression : 456 réussis / 5 échecs préexistants (449+7) ; 20/20 sur les tests critiques ; clés de file locale et format inchangés ; examFinalizationGuard.ts, pontV2.ts, useAutoSaveReponses.ts, ExamenBlancsPassage.tsx : empreintes identiques au snapshot.

## Étape 2 — Indicateur de sauvegarde (préparée, NON DÉPLOYÉE)
- Indicateur informatif branché sur les états existants : vert après accusé serveur et file vide, orange avec compteur de réponses, rouge sur panne temporaire, refus fonctionnel séparé.
- Ajout sur le passage des examens blancs ; aucune modification des clés ou du format des files locales.
- Tests ciblés et non-régression à valider avant tout accord de déploiement.
