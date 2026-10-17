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
- Harness de compilation/typecheck automatique : dernière entrée observée build OK à 08:34:15 UTC ; nouvelle vérification requise après les derniers ajustements.

## Limites non garanties
La file locale complète de Nika n'est pas accessible : pas de restauration totale prouvée. Les écritures autosave concurrentes entre onglets n'ont pas de garde de révision serveur ; l'ordre final en cas de requête très tardive reste NON PROUVÉ. Aucun historique élève réécrit.
Trois QRC EB4 VTC2 corrompues laissées en attente : aucune reconstruction/question/note inventée. Réactivation des 500 liens nécessite écrire les questions et est donc interdite ici. Exports manuels/restauration hors périmètre non modifiés.