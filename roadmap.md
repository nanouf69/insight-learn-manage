# Feuille de route

## Terminé — écran unique Correction QRC (23/09/2026)
- EB3 finalisé apparaît dans le menu sous « EB3 — ANCIEN CIRCUIT », sans migration ni copie.
- Les 9 matières EB3 ouvertes sont exclues ; les 50 QRC finalisées uniques de la session sont affichées (50/50 avec le contrôle en base).

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
- Tests ciblés : 7/7. Tests sauvegarde + ordre + propriété + retries + indicateur : 34/34, dont les 20/20 critiques historiques inchangés.
- Suite exécutable complète : 463 réussis / 5 échecs préexistants ; 50 fichiers restent non collectés à cause de `canvas`, comme au snapshot. Aucun nouvel échec.
- Empreintes protégées inchangées pour `examFinalizationGuard.ts`, `pontV2.ts` et `useAutoSaveReponses.ts`. `answerPersistence.ts` change uniquement pour exposer le compteur informatif ; `ExamenBlancsPassage.tsx` change uniquement pour afficher l'indicateur commun.
- Statut : EN ATTENTE D'ACCORD, aucun déploiement.

## Verrouillage moteur d'examen — 23/09/2026
- Terminé : suite de non-régression bloquante `src/test/verrouillage-moteur-examen.test.ts` (41 tests critiques, 8 axes) + `npm run test:critique` (96 tests, bloquant avant déploiement du moteur d'examen).
- Terminé : surveillance production `supabase/functions/surveillance-moteur-examen` — détection seule, lecture seule, alertes e-mail/webhook, journaux anonymisés.

## Plan de stabilisation validé (23/09, 19h36) — une phase à la fois : TEST → rapport → accord → production → contrôle
- [ ] Phase 1a — C2+C3 isolation stricte entre candidats (serveur/base) — EN ATTENTE : choix d'un environnement TEST isolé
  - Étape C inclut désormais le **retrait physique des corrigés V2 de `examens-blancs-data.ts` et du bundle public compilé** ; écrans Admin/Correction QRC V2 alimentés par une fonction serveur protégée ; contrôle post-compilation : 0 corrigé V2 dans le JavaScript servi (23/09, 20h10). Détail : `phase1-c2c3-plan-deploiement-2026-09-23.md`.
  - A n'est PAS lancé : accord explicite + créneau vérifié sans examen en cours requis. Premier travail = A uniquement, puis test et arrêt avant B.
- [ ] Phase 1b — C1 unicité OPEN en base (audit préalable, aucune suppression)
  - Cas de test de référence : BOUDJORF DOUBAA Kamel, EB2 T3P, 2 passages créés à 19 ms d'écart le 22/09 09:16:32 (ancien circuit, ne pas corriger individuellement) — la protection doit rendre ce cas impossible.
- [ ] Plus tard — règle propre pour tentatives abandonnées encore ouvertes (HOMAWOO eb3-ta, VALENTIN EB5/EB6-TAXI) ; ne pas les fermer manuellement.
- [ ] Phase 1a étape A — en attente : ne lancer que si 0 élève en train de composer (activité < 30 min).
- [ ] Phase 1c — C5 publication interdite si test critique échoue
- [ ] Phase 2 — serveur d'abord au chargement/F5 + double-clic Commencer ; V2 seule source d'état
- [ ] Phase 3 — C4 chrono serveur, tolérance 30 s transmission uniquement (arrêt si non garantissable)
- [ ] Phase 4 — 7 scénarios manquants (serveur/intégration/navigateur réel), alerte double OPEN, 4 alertes hautes
- Ne pas nettoyer l'ancien circuit.

## Chantiers séparés — après stabilisation V2 uniquement (23/09, 20h10), hors A→B→C→D
- [ ] S1 — Sécurisation EB3 / EB3-TAXI : retrait des corrigés du code servi au navigateur + correction QCM côté serveur ; hors session EB3, sauvegarde + tests fictifs préalables.
- [ ] S2 — Sécurisation des Bilans e-learning : même logique, corrigés exposés dans le code du site ; traitement séparé.
- Aucun diagnostic supplémentaire : cartographie jugée suffisante (23/09).

## Stabilisation moteur EB (après pause — pas avant, sauf bug critique ; TEST → validation → production)
- [ ] Serveur interrogé avant toute reprise locale (le navigateur ne choisit jamais la tentative)
- [ ] V2 seule source du statut / progression / Commencer-Reprendre pour les EB V2
- [ ] Déploiement bloqué si un test critique échoue
- [ ] Test + alerte tableau de bord « 2 tentatives OPEN même candidat/examen » (vu transitoirement le 23/09, candidat non identifié)

## Après C1/C2/C3/C5 — fonctionnement type Formative (exigence 23/09, 19h56, à NE PAS développer maintenant)
Supprimer la nécessité de publier manuellement chaque modification pédagogique :
- [ ] Enregistrement d'une modification d'un examen blanc → création/publication AUTOMATIQUE d'une nouvelle version pour les futurs passages uniquement (plus de bouton « Publier » pour les modifications ordinaires)
- [ ] Passage déjà commencé → snapshot inchangé
- [ ] Passage terminé → inchangé
- [ ] Notes/corrections existantes → jamais recalculées
- [ ] Nouveau passage → dernière version enregistrée
- [ ] Conserver l'historique / version précédente pour audit et retour arrière
- Invariant : une modification ne doit jamais changer le sujet d'un élève en cours d'examen.
