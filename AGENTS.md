<!-- LOVABLE:BEGIN -->
- Practical attendance PDF hours use learner planning details by exact date and half-day, display-only; why: preserve signatures and never label evening attendance with daytime hours.
<!-- LOVABLE:END -->


- save_module_completion refuses completion without proven answers for modules with questions (P0501); why: browser never decides alone.
- Règles de fin des modules définis dans le code : table `module_regles_validation` (protection_serveur) lue par save_module_completion ; why: le serveur doit connaître les modules à questions absents de module_editor_state.
- Comptes de test techniques : table `comptes_test_techniques` ; why: les exclure des signalements et statistiques sans deviner par le nom.
- Comptes de test exclus des lectures via policies RESTRICTIVE `est_compte_test()` (apprenants, reponses, progression, notes) ; why: exclusion centrale de tous les écrans/statistiques, le compte ne voit que lui-même.
- Bilans: `trg_bilan_aa_controle_ids` rejects non-int32 exercise IDs (P0510); why: protect compatibility without changing old IDs.
- Affichage module apprenant : via `getLearnerModuleDisplayState`/`isModuleDoneForDisplay` ; une ligne serveur `completed` reste « Terminé » ; compteurs complets sans serveur = « Validation en cours » ; why: jamais rétrogradé ni faux statut.
- `trg_garde_correction_admin_quiz` refuses (42501) learner writes to admin/manual-corrected quiz scores; why: pending device notes never overwrite admin corrections.
- Quiz de module : résultat « OK » affiché seulement après envoi + relecture + submitQuizAttempt ; révision d’un quiz validé sous `module_X_revision_exo_Y` (jamais la ligne validée) ; why: un quiz ne doit jamais paraître validé sans preuve serveur, et une révision ne doit jamais toucher une validation.
- Exam source = noteExamenAffichee + passagesV2NonFiables: same-attempt identity, matching answers/content else legacy; snapshots compared by relative order and explicit correct choices; why: no borrowed or truncated score.
- Modules Examens blancs 35–38 : déclencheur serveur `trg_zz_examens_blancs_6_sur_6` (écrit seulement « completed », jamais bloquant) ; why: validation 6/6 automatique côté serveur.
- Émargements : une feuille erronée est masquée (emargements_fc.masque = true), jamais supprimée ; toutes les lectures filtrent masque = false ; why: aucune donnée élève ne disparaît.
- Practical planning: exact exam session/period key, save only after load; locked dates never empty/reversed; why: preserve recorded dates.
- Practical training days = ceil(candidates/3) everywhere; why: stored max_per_day was wrong.
- Practical booking offers every admin-typed VTC/TAXI day (weekends too); why: exact admin planning.
- Practical notes: admin-only append-only revisions by learner/session/period, server revision guard, escaped HTML shared by CMA/learner emails; why: preserve history and reject stale/cross-session writes.
- Exam selectors share sessions/handler; all-dates paginates separately; planning names use CRM callback; why: no cross-session writes.
- Accreditation: shared company letters keep IDs/originals; exports are new agrements/exports/ files via signed https; why: preserve history/all formats, avoid blocked blobs.
- Course/quiz labels use permanent IDs and dated baselines; why: no drift.
- Supports corrigés et protection T3P : voir `src/components/cours-en-ligne/AGENTS.md`.
- Student counters/CRM jalons share progressionModulesEleve, account proofs and Lyon waivers; attendance uses milestone ID; why: no divergence or leakage.
- Signatures PDF/Contrôle ZIP share readonly planning loader; retain IDs/versions, unknown hours, abort read errors; EDOF targets shared, PDF counts images not timestamps; why: no fabricated proof or mutations.
- Accès élève créés/envoyés par trigger serveur si aucun compte ; why: aucune fiche sans accès.
- Quiz validé : `trg_00_garde_*` gardent réponses/note/statut (refus dans `quiz_valide_reecritures_refusees`, Admin/service/nouvelle tentative passent) ; EB legacy : clôture vide refusée P0530 ; why: anti-réécriture.
- Échecs validation : RPC `signaler_echec_validation_quiz` (clé publique), 3/15 min = 1 alerte/h ; why: session expirée OK.
- Frozen relevé: `releve_jalons_calcul_fige`, resoudre-releves-gel/releveCalculServeur.ts, ACTIVITES_CODE at gele_le + archived answers; admin practice = new version; why: immutable history.
- Live jalons list = attributed modules (modulesAttribuesDashboard); unattributed 50–53/83/84 dropped, attributed required, EB/practice kept, renormalised; why: match learner space.
- Per-module freeze: registry activities added after a module's completed_at are acquired, not required (activitesRequisesModule); hours freeze only at access end; why: never reopen a finished module.
- Completed quiz counters use first validated question IDs/answers via moduleQuizCounter; why: later revisions never regress proof.
- Shared theory attendance uses sessionHeures with the learner track; why: prevent cross-track hour denominators.
- Subdirectories may have their own `AGENTS.md`: read first (theory-fail mail: `supabase/functions/_shared/`).
