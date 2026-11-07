# Quatre alertes RLS et publication — 07/11/2026

Point de départ : `868ed83ff422ceaab249aa9335237cf130adc555`. Commit capturé pour le déploiement : `afda34b573528b93a9c136a26022ad12577545b8`.

## Périmètre

Aucune réapplication des migrations 0243/0244 ni des fonctions déjà déployées. Aucune modification de questions, propositions, bonnes réponses, réponses élèves, notes, signatures, historiques, relevés figés ou règles pédagogiques. Aucun backfill, export, restauration, email, SMS ou appel IA de notation.

## Alertes avant/après

| Objet | Référence scanner | Avant | Après |
|---|---|---|---|
| `bilan_future_opening` | `lov_pgscan/lov_db_rls_tautology_permissive_v1_de867624bf30d924` | `future_opening_read USING (true)` : tout compte connecté lisait le paramètre | `USING (public.has_role(auth.uid(), 'admin'))` ; absent du scan frais |
| `bilan_identite_flags` | `lov_pgscan/lov_db_rls_tautology_permissive_v1_3fbaa8a89983c7e8` | `Lecture flags identites USING (true)` | lecture admin uniquement ; absent du scan frais |
| `bilan_snapshot_flags` | `lov_pgscan/lov_db_rls_tautology_permissive_v1_0d1d91ceba1c21c8` | `Lecture flags snapshot bilan USING (true)` | lecture admin uniquement ; absent du scan frais |
| `module_regles_validation` | `lov_pgscan/lov_db_rls_tautology_permissive_v1_a21830dff276aa1b` | `Lecture règles modules USING (true)` | lecture admin uniquement ; absent du scan frais |

Ces alertes prouvaient une permission trop large, pas une exploitation. Les tables contiennent des paramètres internes, pas les copies élèves.

La migration `0245_restreindre_lecture_configuration_interne.sql` est appliquée. Elle remplace seulement les quatre prédicats de lecture et retire `SELECT` aux anonymes. Le droit de table `authenticated SELECT` est conservé pour permettre la lecture admin sous RLS. Aucune fonction ni permission `EXECUTE` n'a été changée.

Retour arrière testé : `docs/sql-revue/2026-11-07-rls-configuration-admin-RETOUR-ARRIERE.sql`. Il rétablit l'ancien comportement et ne doit être utilisé qu'en cas d'incident.

## Appelants légitimes vérifiés

- `bilan_future_route(integer)` : fonction `SECURITY DEFINER`, authentification explicite, utilisée par `BilanFutureExam.tsx`.
- `bilan_demarrer_passage(...)` et `bilan_ouvrir_passage_eleve(...)` : snapshots et flags lus côté serveur ; ouverture appelée par `bilanSnapshotsEleve.ts`.
- `bilan_identite_garde()` : trigger interne `SECURITY DEFINER`.
- `save_module_completion(...)` : propriétaire/admin/service ; utilisé par `moduleCompletion.ts`.
- `admin_signalements_validation_modules()` : garde admin ; utilisé par `SignalementsValidationModules.tsx`.

Aucun appel direct frontend aux quatre tables n'a été trouvé. Les droits `EXECUTE` de ces fonctions sont inchangés.

## Tests réellement exécutés

- `RLS_CONFIG_CANDIDATE=1 python3 src/test/bilan_future_isolated_sql_contract.py` : PASS ; ouverture, propriété, drafts, soumission, anciennes copies et route future.
- `RLS_CONFIG_CANDIDATE=1 python3 src/test/bilan_local_future_sql_contract.py` : PASS ; matrice anonyme/élève/autre compte/admin/service sur les quatre tables, snapshots, trigger d'identité interne et retour arrière.
- `RLS_CONFIG_CANDIDATE=1 python3 src/test/module_completion_sql_contract.py` : 25 tests déclarés, 17 exécutés avec succès, 8 ignorés car réservés à un autre candidat, 0 échec.
- `bun run test` : 422 fichiers réussis, 2 ignorés ; **3 688 tests réussis, 13 ignorés, 0 échec**.
- Build aperçu : OK, dernier contrôle 14:22:06 UTC.
- Navigateur admin réel, Correction QRC V2, ordinateur 1280×1800 et mobile 390×844 : aucun `pageerror`, aucun dépassement de document mobile, aucune écriture déclenchée. Les candidats terminés apparaissent avant les non terminés.
- Contrôle Data API réel sur l'aperçu : admin = 1/2/2/31 lignes sur les quatre tables ; anonyme = refus `42501` sur les quatre.

## Empreintes avant/après

Toutes identiques avant/après 0245 :

- `bilan_future_opening` : 1 ligne, `150e60556ef6f8215d4576720b10c57f` ;
- `bilan_identite_flags` : 2 lignes, `2349b1ace6942600ef6b67c15294ff85` ;
- `bilan_snapshot_flags` : 2 lignes, `78e2fa8ace30ba169de2b5c9cc3552c7` ;
- `module_regles_validation` : 31 lignes, `f05b5ab60a5d77d224c96aae848aa34c` ;
- `module_editor_state` : 62 lignes, `12015639c6b5ab0c0c0382f95970b1fa` ;
- `exam_attempts_v2` : 2 525 lignes, `4cb16d17972c47c2bb7fcd2a9bfd905f` ;
- `reponses_apprenants` : 12 800 lignes, `2ad49e0f339d7da1518238729f49d335` ;
- `core_exam_results` : 2 477 lignes, `432e7f91dd7cef643516e29277a12883` ;
- `emargements_fc` : 3 311 lignes, `94d42991ecce37eacdc7756c05b7568d`.

Les empreintes des six fonctions appelantes sont également inchangées.

## Nouveau scan et publication

Scan frais à 14:17:02 UTC : **0 erreur, 6 avertissements, 2 informations**. Aucune alerte ignorée ni masquée. Les avertissements existants sur `audit_journal`, `exam_content_write_log`, `qrc_engine_flags`, `qrc_instances_v2` et deux règles de stockage restent hors de cette correction ciblée.

La publication du lot global de 180 fichiers a été demandée après revue des dépendances, suite complète et build. Les serveurs nécessaires sont présents : 0242, 0243, 0244, 0245, `upsert-reponse-apprenant` et l'export nocturne. Le candidat gel-v3 reste dormant ; aucune activation de `geler_releves_fin_acces()`.

`preview_ui--publish` a répondu « Publishing is scheduled » pour https://gestion.ftransport.fr, commit `afda34b573528b93a9c136a26022ad12577545b8`. Le connecteur mentionnait encore l'ancienne alerte persistée `bilan_future_opening` ; ce n'était pas le résultat du scan frais et cela n'a pas bloqué la programmation.

Contrôle unique de la version servie à environ 14:24 UTC : HTTP 200, mais ancien titre `FTransport - Plateforme de Formation` et anciennes métadonnées. **La bascule effective du frontend n'est donc pas confirmée.** Ne pas affirmer que le nouveau frontend est en ligne.

## Limites et coût

- Aucun vrai élève utilisé pour une écriture ; parcours autonome élève mobile et Safari réel non prouvés.
- Cas Ahmed/appareil : récupération locale toujours non prouvée sans l'appareil.
- Aucun export ou restauration réelle lancé ; la sauvegarde du 07/11 n'est pas rétroactivement déclarée complète.
- Coût direct additionnel : 0 € d'IA payante, email, SMS ou export. Le coût Lovable de ce seul chantier n'est pas ventilé par l'outil ; le compteur global de la période affiche 795 crédits, tous travaux confondus.
