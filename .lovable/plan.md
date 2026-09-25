# Protéger les notes corrigées par l'admin contre les écrasements élève

Rien n'est appliqué. Diagnostic fait en lecture seule.

## 1. Comment une correction admin est repérée aujourd'hui

- Table `apprenant_quiz_results`, champ `details.correctionsIA.<questionId>`.
- Écrit par `CorrectionQRCTab.tsx` (lignes 1486-1495) : `manuel: true`, `validatedByAdmin: true`, `correctedAt`, `explication: "Correction manuelle par l'administrateur : X/Y pts"`.
- Exemple réel (ligne `afb436be…`, examen blanc, G(V) Réglementation VTC, question 1) :
  `{"manuel":true,"validatedByAdmin":true,"pointsObtenus":0,"correctedAt":"2026-09-21T21:02:47Z","explication":"Correction manuelle par l'administrateur : 0/4 pts"}`
- **Angle mort** : la correction QCM admin (`CorrectionQCMTab.tsx` lignes 327-335) met à jour `score_obtenu / note_sur_20 / reussi` **sans aucun marqueur**. Ces corrections-là ne sont pas repérables et ne seraient pas protégées par ce trigger (point à traiter séparément, sur accord).

## 2. Trigger proposé (BEFORE UPDATE, refus explicite)

Nouvelle fonction `public.garde_correction_admin_quiz()` + trigger `trg_garde_correction_admin_quiz` BEFORE UPDATE sur `apprenant_quiz_results`.

Règle :
- Si l'auteur est admin (`has_role(auth.uid(),'admin')`) ou `service_role` → autorisé, rien ne change.
- Sinon, si l'ANCIENNE ligne contient au moins une correction `validatedByAdmin=true` ou `manuel=true`, et que la nouvelle version change `score_obtenu`, `note_sur_20`, `reussi` ou `details->'correctionsIA'` → `RAISE EXCEPTION 'CORRECTION_ADMIN_PROTEGEE : cette note a été corrigée par un formateur et ne peut pas être modifiée depuis le compte apprenant' USING ERRCODE='42501'`.
- Aucune valeur n'est remplacée silencieusement ; les autres colonnes restent modifiables.
- INSERT non concernés (« Refaire les fausses » et nouvelles tentatives inchangés).

Ordre avec le trigger existant `trg_protect_nonzero_quiz_score_on_update` : nom choisi pour s'exécuter avant (ordre alphabétique `trg_garde…` < `trg_protect…`), donc le refus a lieu avant toute correction silencieuse.

Impact côté élève : une sauvegarde de note en attente sur une tablette, visant une ligne corrigée, sera refusée (erreur 42501) au lieu d'écraser. La synchronisation n'est pas modifiée ; l'erreur apparaîtra dans ses journaux. Aucun bouton désactivé.

## 3. Lignes protégées

- 4 863 lignes au total.
- **683 lignes corrigées par un admin** (toutes `examen_blanc`), dont 578 avec `validatedByAdmin` ; 683 réelles, 0 compte TEST.

## 4. Test sur données fictives (avant production)

Dans une transaction annulée (ROLLBACK), sur le compte fictif autorisé uniquement, ligne créée pour le test :
1. Élève modifie `note_sur_20` sur ligne corrigée → refus 42501 attendu.
2. Élève modifie `details.correctionsIA` → refus.
3. Élève modifie une autre colonne (`quiz_titre`) → accepté.
4. Élève modifie une ligne NON corrigée → accepté.
5. Admin modifie la ligne corrigée → accepté.
6. Élève INSERT (type revision_fausses) → accepté.
Contrôle AVANT/APRÈS : nombre de lignes et empreinte md5 de la table identiques.

Puis arrêt et attente de votre accord pour la mise en production (hors séance d'élève en cours).

## Fichiers touchés

- Nouvelle migration SQL (fonction + trigger), appliquée seulement après votre accord pour la production.
- Nouveau test `src/test/garde-correction-admin-quiz.test.ts` (lecture du SQL).
- `AGENTS.md` : une règle.
- Aucun fichier de synchronisation, aucun écran élève, aucune donnée existante.
