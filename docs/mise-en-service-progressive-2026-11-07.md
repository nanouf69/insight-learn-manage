# Mise en service progressive — 07/11/2026

Point de départ : `280112574e72daaea3bd617ddaf57b77be3df613`.
Référence de publication comparée : `origin/_agent-publish` = `3a9014a87a051bcded619021caa82f0ebfa75d4b`.
Aucune question, bonne réponse, réponse existante, note, signature, donnée figée ou historique n'a été modifié par cette intervention. Aucun email/SMS, appel IA de notation, export réel ou restauration réelle.

## 1. Intégration réelle avant activation

Nouveau test `src/test/upsert_reponse_http_integration.py` : vrai handler Deno de `upsert-reponse-apprenant`, vraie API PostgREST et PostgreSQL jetable, avec fixtures fictives. Seule la réponse d'authentification est une fixture HTTP locale.

Scénarios PASS : lot ordinaire v2, U+0000 + U+2400 littéral + emoji, original exact et journal, renvoi après réponse perdue sans doublon, deux modifications concurrentes, tentative figée, refus de faux ACK quand la relecture du journal est impossible, confirmation après rétablissement sans doublon, authentification et propriété.

Contrats PostgreSQL jetables PASS : `originaux_exacts_nul_contract.py`, `transport_nul_22p05_contract.py`, `core_correction_securite_contract.py`, `qrc_ia_sql_guards.py` (8 tests).
Vitest ciblé : 46/46. Suite globale finale : **3 688 réussis, 0 échec, 13 ignorés**, 422 fichiers réussis et 2 ignorés. Build aperçu : OK.

## 2. Étapes réellement appliquées

### Migration additive v3 — APPLIQUÉE

`drizzle/migrations/0243_originaux_exacts_nul_v3.sql`, issue de `docs/sql-revue/2026-11-07-originaux-exacts-nul.sql`.
Verrou borné à 1,5 s et durée bornée à 20 s. Deux colonnes ajoutées, aucune réécriture ni backfill. `persist_answer_batch_v2` conserve l'empreinte de corps `5054fd013b8adb30b95d2cd4e7d1f391`. v3 est exécutable par `service_role` seulement.

### Fonction réponses — DÉPLOYÉE

`upsert-reponse-apprenant`, SHA-256 source `042df7dd0ebdb340ef6274db8b729b87a8b76244c14a706a24179e3c0014fad5`.
Vérification réelle sans élève : requête volontairement non authentifiée → HTTP 401 ; log `auth_rejected` / `bad_jwt` à 13:52:59 UTC. Aucun appel authentifié de smoke test et aucune écriture élève provoquée.

### Durcissement correction/notes — APPLIQUÉ

`drizzle/migrations/0244_securiser_fonctions_correction_notes.sql`.
Précontrôles : 21 tâches actives, 0 dépendante ; 0 déclencheur dépendant ; 0 opération de correction dans les 15 minutes ; corps de production identiques aux fixtures revues. Verrou borné à 1,5 s.
Droits relus : anonymes exclus ; correction brute réservée au service ; publication/révision accessibles aux authentifiés avec garde admin ; recalcul accessible aux authentifiés avec garde propriétaire/admin/service ; helpers internes non exécutables directement.
Contrôle admin réel non destructif : rejeu de l'opération déjà journalisée `1ea59152-c17d-4892-8577-e4130fa1e8b1` → état `corrigee`, note existante 0,5, sans erreur. Empreintes de l'opération et de la QRC identiques avant/après. Aucune nouvelle correction.

### Export nocturne — CORRECTIF DÉPLOYÉ, AUCUN EXPORT LANCÉ

`sauvegarde-quotidienne-eleves`, SHA-256 source `022b0bf7a33d820ff3a5f9be5f97ba95284156c3c5e20bd3cb2f0d8275335dbf`.
La reprise par clé, les erreurs bornées, la réparation explicite indépendante et les états honnêtes sont actifs pour les prochains appels planifiés. Aucun marqueur de succès posé, aucune réparation et aucune rotation lancées manuellement. Un export paginé n'est toujours pas un instantané cohérent ; intégrité et restauration restent non prouvées tant qu'un export réel n'a pas été restauré sur base jetable.

## 3. Empreintes avant/après

Toutes identiques après les migrations et déploiements :

- `module_editor_state` : 62 lignes, `306ee6e04cbfc07f6d02c330bbe93a27` ;
- `exam_content_versions` : 57 lignes, `614b47fc7749ae2f0130745ce042e8c8` ;
- `reponses_apprenants` hors nouvelle colonne : 12 800 lignes, `dc1e7e57b5bc2e1af5ea19a42bea0fe1` ;
- `apprenant_quiz_results` : 6 019 lignes, `b34862212b368df1be79328e8b9894ad` ;
- `exam_attempts_v2` : 2 525 lignes, `03608eb723f83c693d1d89778275b457` ;
- `core_exam_results` : 2 477 lignes, `351101b91c9a2122a4bd0e8b7c52c8c1` ;
- `emargements_fc` : 3 311 lignes, `b6d4a059247aaf449319535bdf7569f9`.

Aucune activité naturelle concurrente détectée dans ces agrégats pendant la fenêtre de contrôle. Les nouvelles métadonnées d'origine exacte sont restées vides : aucune réponse réelle n'a été transformée pour tester.

## 4. Publication frontend — NON APPELÉE

Le lot complet contient 167 fichiers par rapport à la référence de publication, dont de nombreux changements hors du périmètre demandé. La suite globale est verte, mais le scan frais à 13:57 UTC contient **4 erreurs, 6 avertissements et 2 informations**. Aucun finding ignoré ou contournement.

Erreurs critiques indépendantes : accès authentifié trop large sur `bilan_future_opening`, `bilan_identite_flags`, `bilan_snapshot_flags`, `module_regles_validation`. Leur correction sort du périmètre autorisé ici. Le scan de dépendances signale aussi plusieurs vulnérabilités de niveau high, notamment Rollup, XLSX et Zod ; elles n'ont pas été modifiées dans ce lot ciblé.

Conséquence : `preview_ui--publish` n'a pas été appelé. Aucun commit frontend n'a été publié.

Isolation réalisable préparée : `docs/publication-ciblee-answer-persistence-20261107.patch`, limité à `src/lib/answerPersistence.ts`. Ce fichier n'ajoute aucune dépendance nouvelle : les deux imports existent déjà dans la référence publiée. Le serveur v3 réalise la projection/original exact ; le client n'a pas besoin du module `originauxExacts.ts` pour ce chemin. Le patch a été vérifié contre la version `3a9014a` sans modifier le dépôt. Il évite notamment d'embarquer les changements UI/CRM/émargements et les autres examens du lot de 167 fichiers. Son application et sa publication par connecteur restent subordonnées au traitement des alertes critiques selon la politique de publication.

## 5. Limites qui restent explicites

- Incident Ahmed : le mécanisme 22P05 est réparé et déployé, mais l'attribution exacte à son payload et la récupération de sa file locale ne sont pas prouvées sans son appareil. Aucun déblocage artificiel effectué.
- Aucun vrai élève utilisé : la création réelle d'une réponse U+0000, le parcours appareil et la confirmation autonome ne sont pas vérifiés en production.
- Correction admin prouvée par rejeu sans écriture ; IA payante non appelée ; chemin élève propriétaire prouvé sur base jetable, pas par un élève réel.
- Aucun export nocturne réel ni restauration réelle : le code est déployé, la sauvegarde du 07/11 n'est pas rétroactivement déclarée complète.

## Retour arrière

- v3 : redéployer la version précédente de `upsert-reponse-apprenant` ; ne jamais supprimer les nouvelles colonnes, qui peuvent contenir les seuls originaux exacts.
- Durcissement : `docs/sql-revue/2026-11-07-securiser-fonctions-RETOUR-ARRIERE.sql`, déjà testé sur base jetable ; à appliquer seulement en cas d'incident et avec le même contrôle de dépendances.
- Export : redéployer la version précédente de `sauvegarde-quotidienne-eleves` ; ne pas déplacer les curseurs historiques ni modifier les manifestes existants.
