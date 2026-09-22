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
- 15 matières EB3 en cours à 19h46 : confirmer la resynchronisation élève par élève (🟢/🟠/🔴).

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
