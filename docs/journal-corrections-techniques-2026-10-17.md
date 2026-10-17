# Corrections techniques — 17/10/2026

## Périmètre et intégrité
Production consultée exclusivement en SELECT. Aucun compte élève testé, aucun fichier réel déposé, aucune sauvegarde/restauration manuelle déclenchée, aucun mail/SMS/IA, aucune publication frontend. Ismail AMAR non lu ni modifié.

Méthode exacte : `md5(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id))`.

| Table | Lignes | Empreinte finale identique à l'initiale |
|---|---:|---|
| module_editor_state | 62 | 4659cfa59c6088414ca62e635d6047de |
| exam_content_versions | 57 | 614b47fc7749ae2f0130745ce042e8c8 |
| bilan_sync_liens | 500 | 78817ad66a1e960c97d7a3ed3cfa9c89 |

Les calculs intermédiaires avec une autre agrégation ou tri module_id ne sont pas comparables et n'ont pas servi à conclure.

## Correctifs préparés
- `sessionRpc.ts`, `modulePagesPersistence.ts`, `ModuleDetailView.tsx`, `useConnexionTracking.ts`, `usePresenceCheck.ts` : session fraîche, identité stable, attentes bornées, pages conservées par compte jusqu'à relecture serveur. Stockage indisponible = copie mémoire et protection de fermeture, pas promesse de durabilité.
- `canonicalOrigin.ts`, `CanonicalOriginNotice.tsx`, `main.tsx` : domaine avec point final corrigé uniquement sur action manuelle, chemin/query/hash conservés ; aucune copie inter-origine de session ou suppression de file.
- `ExamensBlancsEditor.tsx` : lecture fraîche, contrôles de compte pour versions et overrides ; erreurs différentes d'une absence de contenu ; retrait du nettoyage d'anciens snapshots locaux.
- `useAutoSave.tsx`, `savePublicFormDocument.ts` : brouillon pending séparé du cache confirmé, reprise du dernier brouillon, résultat local non assimilé à une confirmation, délais bornés et pas de retry immédiat d'une écriture au résultat inconnu.
- `documentUpload.ts`, `documentUploadRules.ts`, `DocumentUploadCard.tsx`, étapes 1/12, justificatifs et documents CRM : limite 4 MiB, formats cohérents, UUID d'opération, confirmation explicite, anciennes versions conservées ; aucune création de dossier depuis le dépôt.
- `upload-document-inscription/index.ts` : autorisation propriétaire/admin ou HMAC onboarding, dépôt immuable/idempotent, lecture de confirmation, conservation en échec.
- `BilanSyncDiagnostic.tsx` : diagnostic paginé lecture seule ; 500 liens en attente, zéro empreinte complète ; aucun déclenchement de synchronisation.

## Mise en service
`sauvegarde-quotidienne-eleves` déployée avec succès par l'outil. Source soumise SHA-256 : `4b5b0d3965a9db2c8d678fa687ec590771d98c759d4280f492cdcf10dca1c6ca`.
Registre 26 tables, trois CMA ajoutées à la fin avec PK id, indices/reprise préservés. Ancien export terminé reste 23 tables/version 1. Manifeste publié avant checkpoint terminal, erreurs de stockage vérifiées.
La fonction n'a pas été invoquée : exécution prochaine, contenu effectivement servi et export réel 26 tables NON PROUVÉS.
Authentification du déclencheur historique inchangée : callbacks existants utilisent la clé publique. Le projet n'offre pas la migration gérée de ces schedules ; ajouter un bearer strict casserait les deux tâches. Risque historique signalé, aucun élargissement RLS/GRANT.

`upload-document-inscription` NON déployée explicitement : l'ancien site ne transmet pas le HMAC onboarding. Une mise en service seule bloquerait les uploads anonymes légitimes. Nécessite rollout frontend coordonné, interdit dans ce périmètre. Les champs de receipt additionnels sont compatibles avec les anciens consommateurs authentifiés.

## Vérifications
- 54 tests PASS, 11 fichiers : limites/HMAC/session/changement de compte/refus/persistance, véritables handlers upload/export sous services intégralement simulés, héritage manifeste, stockage échoué, doublons, sauvegardes existantes, absence de redirection avec réponses pending.
- Playwright, véritable DocumentUploadCard, réseau intercepté : deux refus puis bouton Réessayer et confirmation, desktop 1280x1800 et mobile 390x844, aucun débordement. Une écriture de monitoring de démarrage interceptée/simulée, zéro écriture réseau réelle. Captures sous /tmp/browser/technical-fixes.
- Tests ciblés rejoués après les derniers ajustements : 54/54 PASS à 08:40 UTC. Harness de compilation/typecheck automatique : dernière entrée observée build OK à 08:40:07 UTC.

## Limites non garanties
La file locale complète de Nika n'est pas accessible : pas de restauration totale prouvée. Les écritures autosave concurrentes entre onglets n'ont pas de garde de révision serveur ; l'ordre final en cas de requête très tardive reste NON PROUVÉ. Aucun historique élève réécrit.
Trois QRC EB4 VTC2 corrompues laissées en attente : aucune reconstruction/question/note inventée. Réactivation des 500 liens nécessite écrire les questions et est donc interdite ici. Exports manuels/restauration hors périmètre non modifiés.

## Finalisation coordonnée autorisée — 17/10 09:12 UTC
- Version fonctionnelle validée : `6e0157ad7b916459feedab273a1cb4e0a1339431` (travail devis/contrat terminé et conservé, aucun fichier de banque/questions dans le diff depuis `73fdbca8684b5534f5b85640e5a74b34ac314cd5`). Revue indépendante : aucun contournement trouvé permettant un PDF complet pour contrat incomplet ; brouillon marqué, pas de signature/conclusion créée.
- Seul correctif fonctionnel additionnel : `src/lib/documentUpload.ts`, réponse 2xx sans receipt exact = arrêt sans nouvelle tentative automatique, message de mise à jour/rechargement, fichier conservé. Ajouts tests `upload-document-rollout.test.ts` et trois cas handler admin/HMAC/4 MiB. Aucun handler backend modifié.
- 100 tests PASS / 15 fichiers à 09:14:09 UTC : les 54 existants + 6 cas additionnels + 40 contrat/devis. Compilation automatique OK 09:13:48 UTC, `git diff --check` sans erreur. Navigateur localhost réel avec réseau du dépôt intégralement simulé : ancien backend sans receipt → message explicite, un seul appel, fichier retenu.
- Issuers onboarding-search/onboarding-invitation relus : HMAC SHA-256 du message `onboarding:ID:exp`, secret serveur existant ; token du dossier conservé dans onboarding_session_token. Auth anonyme non élargie, aucune vraie requête de dépôt.
- Publication frontend demandée via outil à 09:14 UTC, outil retourne uniquement « scheduled », pas une confirmation. Au contrôle 09:15:53 UTC, les deux adresses publiques servent encore `/assets/index-OIFDUvnQ.js`, SHA-256 `3218bad45ca9509dab8679c5a9d294b094dfa55e571831bbe9fa89748b8b22fa` : nouveau message et contrat absents. Donc publication réelle NON PROUVÉE ; upload NON déployé seul. Ordre restant : confirmer frontend version validée servi, puis déployer immédiatement upload-document-inscription, puis contrôler version/CORS/refus sans vrai fichier.
- Source upload SHA-256 `86c043f08860ec211585de9b9c087ef1e18fde2e6dd4553a8ea7bffc981f2f31` ; règle partagée `1bad66684283a61ed72c6a6f25dd14158b9548b2f6e466f5d30fce3b5d6e949b`.
- SELECT empreintes exactes : 62/57/500 strictement identiques aux trois valeurs initiales. Aucun mail/SMS/IA ni donnée élève écrite. Dernier manifeste nocturne enregistré 17/10 02:10 UTC, avant déploiement 26 tables ; prochaine exécution 26 tables toujours NON PROUVÉE. Nika : appareil/file complète inaccessible, ordre autosave inter-onglets non garanti, aucune restauration revendiquée.