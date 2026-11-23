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