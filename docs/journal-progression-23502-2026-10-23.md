# Journal — régression 23502 progression des modules (23/10/2026)

Autorisation : Naoufal, 23/10/2026 (réparation live).

## Cause directe (prouvée)
- Migration 0193 (22/10) : `save_module_completion` insère `completed_at = NULL` pour une progression non terminée.
- Colonne `apprenant_module_completion.completed_at` : `NOT NULL DEFAULT now()`.
- PostgreSQL contrôle NOT NULL sur la ligne proposée avant ON CONFLICT : refus 23502 même sur ligne existante.
- Reproduit sur base jetable construite depuis l'instantané du schéma de production (test `Avant0197`).
- Seules les sauvegardes `_completed = false` échouaient ; les validations (`_completed = true`) insèrent une date et passaient.

## Pourquoi les anciens tests sont passés
- `module-completion-preuve-serveur.test.ts` mocke `supabase.rpc` et lit le SQL par regex ; aucun test n'exécutait la fonction contre la vraie colonne NOT NULL.

## Correction (migration 0197, appliquée)
- `completed_at` facultative (NULL = non validé) ; DEFAULT now() conservé pour les anciens appels directs.
- Contrainte `amc_terminee_a_une_date` : une ligne `completed` a toujours une date.
- Passage à `completed` depuis une ligne non terminée : date = instant serveur de validation (plus l'ancienne date de création héritée).
- `save_module_pages_progress` : nouvelle ligne sans date de fin (plus de now()).
- Aucune ligne existante modifiée. Signatures, droits et protections inchangés.

## Tests réels
- `python3 src/test/module_completion_sql_contract.py` : 11/11 (1 reproduction avant + 10 contrats après) ; contre-épreuve sans correction : 9 échecs.
- Vitest : 11 fichiers, 71 tests (lecteurs, gel, compteur, cas Hedy 4/7).

## Empreintes (avant = après)
- module_editor_state 62 `6dcdf347cd039743c67774ed064fbbb6`
- exam_content_versions 57 `614b47fc7749ae2f0130745ce042e8c8`
- releve_jalons_calcul_fige 22 `4fcc0d041f89b4770fef79f95129e01a` (md5(string_agg(md5(to_jsonb(t)::text),'' ORDER BY to_jsonb(t)::text)))

## 8 dossiers (lecture seule)
- Modules déjà terminés (Bouguessa M2, Dakhlaoui M40, Sawadogo M2, Sow M2) : statut et date intacts ; les refus portaient sur des sauvegardes de révision.
- En cours (Pichon M2, Nibitanga M4, Ferreira M7, Smail M2) : progression refusée toujours inférieure à la progression déjà enregistrée ; seuls les compteurs de score/détails du module n'ont pas été mis à jour le 22/10. Réponses présentes dans `reponses_apprenants`.
- Aucune réconciliation écrite : rien à valider, rien à inventer.
