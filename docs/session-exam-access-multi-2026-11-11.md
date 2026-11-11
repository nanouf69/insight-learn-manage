# Accès présentiel multi-session — aperçu seulement

## Chemin
GESTION → Cours et exercices → Examens blancs → carte EB6 (ou autre EB) → sous Mettre en pause / dernière action → Accès présentiel.

Cases accessibles, aucune présélection, présentiel compatible en cours/futur uniquement ; règles inclusives Paris et tri existants conservés. Chaque session est lue même sans sélection via la RPC de contexte partagée. Dates rouges ≠ fermeture. États textuels distincts : Ouvert, Fermé, Accès habituel (aucune restriction manuelle), Non vérifiable, Contrôle non installé. État absent/erroné ne donne aucune action possible. Les sélections devenues incompatibles disparaissent immédiatement.

## Production — lecture seule
SELECT pg_proc exécuté : les trois RPC d’accès ci-dessous sont absentes. Donc l’aperçu doit afficher Contrôle non installé, pas Ouvert. Aucun appel mutant, aucune installation, aucune publication, aucune donnée réelle changée.

## Dépendances préparées, hors historique de migration
1. `docs/sql-revue/2026-11-11-session-exam-access.sql` : journal `session_exam_access_events`, droits/RLS admin, garde append-only ; fonctions `session_exam_mode`, `session_exam_catalog`, `assert_session_exam_start`, `session_exam_start_guard` ; triggers BEFORE INSERT `session_exam_new_v2`, `session_exam_new_retake`, `session_exam_new_timer`.
2. `docs/sql-revue/2026-11-11-session-exam-access-batch.sql` : reçu append-only `session_exam_access_batches`, mêmes événements existants, RPC groupée atomique.

RPC publiques nécessaires :
- `admin_session_exam_access_context(p_session_id uuid)`
- `admin_set_session_exam_access(p_operation_id uuid,p_session_id uuid,p_exam_id text,p_opened boolean,p_expected_operation_id uuid,p_session_name text)`
- `admin_set_sessions_exam_access(p_operation_id uuid,p_exam_id text,p_opened boolean,p_selections jsonb)`

La commande groupée valide noms, IDs uniques, dates Paris, compatibilité, absence distanciel et versions attendues de TOUTES les sessions avant insertion. Verrou exclusif partagé avec les frontières de démarrage, reçu/idempotence, un échec annule toute la transaction. Aucun changement aux copies ou sauvegardes. Le transport préparé vérifie le reçu puis relit toutes les sessions, échoue si un seul état manque/diffère, sans repli en boucle sur la RPC individuelle. Il n’est pas invoqué par l’interface : confirmation finale désactivée.

## Tests exécutés
- 40 tests Vitest PASS : droits admin/signed-out/élève, placement, 17 règles de dates/tri/compatibilité, plusieurs cases, états mixtes, RPC absente, erreur réseau, sélection exclue, annulation, transport batch/refus/relecture obligatoire/retour périmé, routage P0551 sans repli.
- 18 scénarios batch PostgreSQL PASS (33 exécutions incluant 15 scénarios de base répétés). Cluster jetable basé sur fixture du catalogue, socket local, aucun accès Cloud : session invalide → zéro événement, duplicata/passée/remote/CAS, replay, droits, append-only, inscriptions croisées, e-learning, démarrage fermé refusé avant timer/copie/repassage, concurrence, fermeture après démarrage, timer identique, vrais core_save_answer/core_finalize_attempt.
- Chromium 1280×1800 et 390×844 PASS sur API fictive : cinq états visibles séparément, deux cases puis dialogue avec examen/noms/états, confirmation finale désactivée, annulation, sélection non vérifiable bloque, aucun débordement horizontal, espace élève sans zone admin, zéro erreur JS. Captures inspectées après animation.
- Dernier signal de compilation : build OK.

## Bloquants avant mise en service
Les tests de frontières INSERT ne prouvent PAS encore tous les appels complets des RPC publiques : `core_start_attempt(uuid,uuid,text,text,boolean)`, `start_exam_subject_retake(uuid,uuid,text,text,text,uuid)`, `start_or_get_exam_timer(uuid,text,integer)` et surcharge avec tentative. Ces signatures ont été confirmées par SELECT.

Restent NON PROUVÉS : parcours complets de démarrage/reprise ancien et V2 avec toutes les protections du catalogue actuel (dont variantes TA/VA, replay historique, horloges expirées), non-extension des droits via chacun de ces appels, session admin/apprenant réelle E2E et intégration post-installation. Il faut également revalider le catalogue/triggers frais avant installation et décider explicitement d’activer le transport groupé après accord du propriétaire. Aucun bouton d’enregistrement ne sera activé tant que ces points ne sont pas couverts. Aucun succès simulé pour l’absence serveur.