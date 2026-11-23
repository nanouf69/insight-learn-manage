# Cinq alertes RLS — correction ciblée du 23 novembre 2026

Migration appliquée réellement : `drizzle/migrations/0281_restreindre_cinq_alertes_rls.sql`. Aucun déploiement de l’application, aucune écriture de données réelles, aucune nouvelle identité de test.

## Politiques et droits changés

| Table | Avant | Après |
|---|---|---|
| qrc_instances_v2 | INSERT authentifié WITH CHECK true | INSERT propriétaire exact via core_est_proprietaire, état en_attente, note/correcteur/date de correction NULL ; seulement attempt_id/question_id/apprenant_id/reponse insérables par client. Les gardes existants vérifient propriétaire de tentative, tentative ouverte et question du snapshot. SELECT owner/admin et correction admin conservés. |
| audit_journal | Tout authentifié pouvait fabriquer un événement | Politique INSERT supprimée, droit INSERT client retiré ; SELECT admin conservé, écrivains serveur et fonctions SECURITY DEFINER propriétaires postgres conservés. UPDATE/DELETE client retirés, trigger append-only inchangé. |
| exam_content_write_log | INSERT sans restriction | Admin seulement, auteur=auth.uid(), statut refuse et action ecriture_contenu ; aucun détail/score/signature/identité d’examen autoritaire. GRANT INSERT limité aux six champs réellement envoyés par logExamWriteRefusal. Auteur, identifiant et date imposés par défaut serveur ; client ne peut les choisir. SELECT admin conservé. |
| qrc_engine_flags | SELECT intégral pour tout authentifié | Seulement quiz_id/enabled lisibles ; lignes actives pour utilisateurs, admins également lignes désactivées. Notes internes et dates non lisibles directement côté client. Appels internes SECURITY DEFINER et service préservés. |
| app_version | SELECT public true | Politique publique supprimée, droits anon retirés ; ALL admin existant conservé. Quatre colonnes techniques non personnelles, mais lecture publique inutile : useAppVersionCheck ne fonctionne que pour admin/formateur authentifié. |

Service_role conserve ALL sur les cinq tables ; aucune configuration de moteur, note, image, réponse, événement ni version n’a été changée.

## Chemins examinés

- Aucun INSERT navigateur dans qrc_instances_v2 ni audit_journal retrouvé ; les lectures correcteur réel/rapprochement, statistiques, historique des copies et corrections IA élève utilisent SELECT, inchangés.
- `qrcInstances.ts` lit exactement quiz_id/enabled avec enabled=true : compatible sans modification ni nouvelle fonction publique. Les anciennes fonctions upsert_qrc_instances et qrc_engine_enabled restent inchangées ; celle-ci lit l’état booléen sous son propriétaire, jamais la note interne.
- `ExamensBlancsEditor.tsx::logExamWriteRefusal` envoie exactement les six colonnes autorisées ; seul le chemin admin passe. Le trigger enforce_exam_content_integrity écrit avec son propriétaire et conserve les événements d’écriture acceptée.
- `core_finalize_attempt`, corrections/révisions/commentaires, imports et opérations admin journalisent en SECURITY DEFINER propriétaire postgres : retirer le droit INSERT du navigateur n’en retire pas l’écriture interne.
- Attestation/signature/fermeture de compte : fonctions locales `_shared/attestationFinDeps.ts`, `_shared/attestationCompteFermetureDeps.ts`, `attestation-fin-formation` utilisent le client service ; sauvegardes/restore et qrc-ia-correction utilisent le service. Les droits service restent présents ; aucun envoi ni sauvegarde/restauration exécuté.
- Rôles stockés dans user_roles, contrôlés par has_role, propriétaire par apprenants.auth_user_id ; aucune confiance ajoutée au stockage navigateur ou aux métadonnées utilisateur.

## Tests réellement exécutés

**PASS : 10 tests PostgreSQL jetable du nouveau contrat**, migration appliquée identique au fichier réellement installé. Anon, propriétaire apprenant, autre apprenant, admin et service_role ; données entièrement fictives, environnement PG réel retiré.

- Insertion de réponse propre en attente autorisée ; autre propriétaire, fausse note/date, question hors snapshot et tentative fermée refusés.
- Lecture QRC propre/admin/service autorisée, autre apprenant voit zéro ; anon refusé.
- Audit : tout INSERT direct client, admin compris, refusé ; événement service autorisé ; seul admin voit le journal.
- Journal examens : signalement admin autorisé ; apprenant, statut accepté, faux auteur/date/détails refusés ; écriture service autorisée.
- Drapeaux : identifiants actifs lisibles, désactivés non exposés à apprenant, notes refusées aux clients, service intégral.
- Version : anon refusé, apprenant zéro ligne, admin/service autorisés.
- Correction admin conservée ; note élève non modifiable ; réponse originale non réécrivable par correction ; suppression client des quatre tables sensibles refusée.

Gardes de tentative extraits des fixtures de définitions réelles EB3, relus dans le catalogue actuel. **PASS : 15 tests EB3 VTC/TAXI existants** (corrections, commentaires seuls, révisions, idempotence/concurrence et isolation) ; suite distincte, ne prétend pas être un examen réel effectué après migration.

**Lectures API réelles après migration** : anon reçoit 401 sur les cinq tables. Compte demandeur actuellement non admin : version/audit/journal examens/QRC retournent zéro ligne, drapeaux actifs retournent deux lignes, notes internes 403. Aucun POST/PATCH/DELETE réel utilisé.

**NON PROUVÉ** : opérations écrites de bout en bout sur comptes réels apprenant/admin/service après migration, finalisation d’examen réel, correction réelle, signature réelle et restauration indépendante ; intentionnellement aucune mutation de dossier ou preuve pour tester. La matrice d’écriture est démontrée sur PostgreSQL jetable seulement.

## Conservation contrôlée avant/après

Empreinte MD5 ordonnée des JSON complets de chaque ligne, pas des seuls compteurs :

| Table | Lignes avant/après | Empreinte identique |
|---|---:|---|
| qrc_instances_v2 | 9 459 | 74b14aa5b62cb3ceed941b50fa3177be |
| audit_journal | 11 016 | 2998fa5469e158e0513db7941639b6b6 |
| exam_content_write_log | 1 150 | a02ac890635983f6a9ee46c4ccf2ea11 |
| qrc_engine_flags | 2 | f5790673c87eb38fc1b1ffcccb31c388 |
| app_version | 1 | 9090118342a1af2dcc40ea39b7f3b53c |

## Contrôles relancés et réserves restantes

Scanner du 23/11 à 15:50 UTC : **les cinq alertes ciblées absentes**, 0 erreur, 2 avertissements stockage cours-fichiers et 1 information module_change_notifications. Les cinq constats persistés ont été marqués corrigés, aucun ignoré. Analyse complémentaire Wiz non exécutée car connecteur non configuré ; pas de déclaration « toute application sécurisée ».

Linter : **287 observations de sécurité** hors ces cinq alertes : 1 RLS sans politique (table verrouillée resend_webhook_config), 16 search_path non fixés, 2 extensions public, 93 fonctions SECURITY DEFINER exécutables anon et 175 exécutables authentifiés. Ce sont des indicateurs à analyser, pas tous des failles démontrées. Performances séparées : 51 clés étrangères non indexées et 110 politiques permissives multiples.

Réserve importante de code réellement lu : `core_assert_session_owner` retourne sans refus si auth.uid() NULL ou aucun dossier trouvé ; `core_finalize_attempt` est SECURITY DEFINER exécutable anon et ne contient pas de garde propriétaire explicite dans sa définition lue. Il appelle d’autres fonctions/gardes ; leur chaîne complète après ce lot n’est pas certifiée. Les restrictions RLS ne sécurisent pas seules les fonctions qui les contournent. Aucun changement de ce moteur hors périmètre des cinq politiques n’a été effectué ; audit ciblé supplémentaire requis avant garantie globale.

Dernier journal aperçu : build OK. Aucun mail, aucune activation de moteur, aucun déplacement de preuve, aucun changement de signature ou de sauvegarde ; aucune publication.

## Revue transversale supplémentaire après correction (23/11, 15:53 UTC)

**Règle** : chacun accède uniquement aux données autorisées ; les réponses, corrections et journaux ne peuvent pas être fabriqués par un autre utilisateur. Une politique de table ne suffit pas si une fonction serveur la contourne.

Relecture des sources locales et des définitions actives de toutes les 34 fonctions référençant directement les cinq tables ; droits EXECUTE vérifiés séparément avec has_function_privilege. Deux autres fonctions de chaîne (replay et import groupé) et helpers d’identité également lus. **Lecture seulement, pas exécution des fonctions de production.**

### Inventaire des usages visibles et services

| Usage | Sources relues | Respect de la règle / réserve |
|---|---|---|
| Correcteur QRC réel, liens CRM historiques et rapprochement | AdminCorrectionQrcV2Reel, noyauReel, lectureRapprochement, HistoriqueCopiesMatiere | Lectures QRC protégées par owner/admin ; aucune insertion directe dans les cinq tables. Fonctions de correction contrôlées séparément ci-dessous. |
| Notes élève et corrections IA affichées | CorrectionsIaEleve, coreExamPublication, useLearnerResultRefresh | SELECT et signaux, aucun droit de modification ajouté ; politique QRC protège les images/réponses des autres. Les sources voisines n’ont pas toutes été auditées ici. |
| Statistiques premier passage | premierPassageExamStatsRead | Vérification admin serveur avant lecture, compte recontrôlé à la fin ; SELECT QRC compatible. |
| Surveillance/cohérence/notes de session | ControleCoherenceEB, useAlertesNotesGlobales, signalNotesSession, examPassageIdentity | Abonnements et calculs de lecture ; pas d’écriture des tables ciblées. Autorisation des fonctions de diagnostic vérifiée ci-dessous. |
| Éditeur examens : refus de sauvegarde | ExamensBlancsEditor | Six champs du refus compatibles avec nouveau GRANT ; admin seulement. L’erreur de journalisation reste silencieuse dans ce chemin, pas une preuve de journal officiel. |
| Activation ancien moteur et QRC en attente | qrcInstances | Lecture minimale quiz_id/enabled et RPC ; notes internes non demandées. Tables de l’ancien moteur distinctes, pas certifiées globalement par ce lot. |
| Notification de version | useAppVersionCheck | Après connexion admin/formateur uniquement, SELECT version compatible ; pas de besoin anonyme retrouvé. |
| Correction IA et suites arrière-plan | qrc-ia-correction, _shared/qrcIaRegles | Propriétaire/admin ou token de suite vérifiés avant traitement ; service pour écritures, réservations/identité exactes. Déploiement et issue réelle non exécutés. |
| Attestation, signature et fermeture de compte | attestation-fin-formation, _shared/attestationFinCore, attestationFinDeps, attestationCompteFermetureDeps | Entrée admin validée et client service pour journal ; modifications de droits n’empêchent pas ce journal. Signature réelle non exécutée. |
| Sauvegarde manuelle/export/restauration | backup-export, backup-restore | Connexion + admin exigés ; service conservé. Réserves hors RLS : restore utilise upsert, table fournie par requête ; ne constitue pas une garantie anti-écrasement. Jamais exécuté. |
| Sauvegarde quotidienne/manifeste | sauvegarde-quotidienne-eleves/index, manifest | Service conservé, identité de pages explicite. Réserve : entrée ordinaire préserve callbacks historiques sans garde applicative commune, diagnostic admin seulement ; protection externe de la fonction déployée non vérifiée. Aucun déclenchement ni réglage changé. |

### Fonctions actives : matrice de lecture

**Contrôle admin/propriétaire présent dans le corps lu** (pas garantie d’exécution end-to-end) :
- core_admin_reset_exam, core_publish_version_contenu, core_retirer_version_examen, qrc_disable_engine, qrc_ia_definir_actif : admin exigé.
- core_start_attempt, core_restart_matiere : propriétaire ou admin exigé avant opérations.
- core_commenter_qrc, core_correct_qrc, core_correct_qrc_publish, core_revise_qrc_publish, core_note_attempt, eb_notes_actualiser, eb_notes_diagnostic : contexte serveur/identité vérifiée ; EXECUTE anon refusé.
- qrc_demander_verification : propre QRC exigée ; anon refusé.
- qrc_ia_bilan_statuts : service/admin/interne vérifié, anon refusé.

**Service seul par EXECUTE, non exposé aux clients** : alerter_qrc_ia_coupee, qrc_ia_copies_en_attente_elearning, qrc_ia_enfiler, qrc_ia_raison_file, qrc_ia_reconcilier, qrc_ia_reserver_auto, qrc_ia_reserver_reprise, qrc_ia_reserver_reprise_exceptionnelle, qrc_ia_publier_auto, qrc_ia_publier_initial, qrc_ia_publier_reprise. Certains corps contiennent aussi une garde service ; les droits service sont inchangés.

**Usages spécifiques** : qrc_engine_enabled renvoie seulement un booléen d’activation, aucune note/réponse ; enforce_exam_content_integrity est un trigger (appel RPC direct sans contexte trigger non fonctionnel), contrôles d’identité de contenu et journal serveur, source déclenchante non réauditée en totalité.

**Écarts sérieux restant hors des cinq politiques** :
- core_publish_exam_version : EXECUTE anon/authenticated, aucune garde admin dans le corps lu ; peut écrire des versions et audit sous son propriétaire. D’autres triggers éventuels non certifiés, pas d’appel tenté.
- core_operation_replay : EXECUTE anon/authenticated, retourne le résultat d’une opération par ID/type sans vérifier l’auteur/propriétaire ; accès indirect possible si ID connu.
- core_finalize_attempt : EXECUTE anon/authenticated, pas de garde propriétaire explicite ; core_assert_session_owner tolère uid NULL et compte sans dossier. Les politiques QRC ne protègent pas cette écriture SECURITY DEFINER. Chaîne complète non testée contre production.
- core_import_passage_finalise et core_import_passages_finalises : EXECUTE anon, garde uniquement « si uid non NULL et non admin » ; uid NULL passe cette garde. Aucun import effectué.
- core_purge_donnees_test : EXECUTE anon/authenticated, pas de garde ; désactive les triggers et supprime des lignes is_test, dont journaux. **Jamais exécutée** ; le périmètre test ne justifie pas cet accès ouvert.
- qrc_ia_rattrapage_historique : anon ne peut pas exécuter, mais garde tolère uid NULL ; droits actuellement authentifiés/service. Comptes auth réels contrôlés, contexte interne à examiner.

### Tâches lues

État/horaire uniquement : alerte-qrc-ia-attente-24h et qrc-ia-rattrapage-historique à :17 chaque heure ; qrc-ia-reconciliation toutes les 10 minutes ; sauvegarde 01h30 et reprises toutes les 2 minutes entre 01h–05h. Toutes actives. Commandes, secrets et résultats des jobs non exportés ; aucun job exécuté ou modifié.

### Conclusion remplaçant toute garantie globale

Les cinq alertes de **politiques de table** restent corrigées et données conservées, mais **sécurité de bout en bout non prouvée** : les points serveur ci-dessus peuvent contourner les RLS. Aucun correctif supplémentaire, changement de permissions hors cinq tables, migration d’examen, suppression, modification de données réglées ou publication effectué dans cette relecture.

La demande étant ciblée sur cinq alertes, correction des fonctions d’examen/publication/import/replay/purge et du callback de sauvegarde soumise à accord ciblé, avec tests jetables avant activation. Les limites précédentes (écritures réelles par rôle, parcours QRC/examens/signatures, restauration indépendante, déploiements) demeurent. Les 3 alertes scanner et 287 observations linter précédentes ne représentent pas un audit exhaustif.