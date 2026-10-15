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
- Note/statut d'examen blanc affichés via `src/lib/noteExamenAffichee.ts` (attacherSourceUnique + noteExamenAffichee) dans « Mes notes » et la fiche admin ; why: les deux écrans ne doivent jamais diverger.
- Passages du nouveau moteur « non fiables » repérés à l'affichage par `src/lib/passagesV2NonFiables.ts` : note de l'ancien système + mention ; why: le moteur n'a parfois gardé que la première valeur.
- Modules Examens blancs 35–38 : déclencheur serveur `trg_zz_examens_blancs_6_sur_6` (écrit seulement « completed », jamais bloquant) ; why: validation 6/6 automatique côté serveur.
- Émargements : une feuille erronée est masquée (emargements_fc.masque = true), jamais supprimée ; toutes les lectures filtrent masque = false ; why: aucune donnée élève ne disparaît.
- Practical planning: exact exam session/period key, save only after load; locked dates never empty/reversed; why: preserve recorded dates.
- Jours de formation pratique : toujours ceil(candidats / 3) partout ; why: max_per_day enregistré donnait un faux nombre.
- Page élève de réservation pratique : tout jour auquel l'admin a fixé un type VTC/TAXI dans le planning (même samedi/dimanche) est proposé tel quel ; why: l'élève doit voir exactement le planning admin.
- Practical notes: admin-only append-only revisions by learner/session/period, server revision guard, escaped HTML shared by CMA/learner emails; why: preserve history and reject stale/cross-session writes.
- Exam selectors share sessions/handler; all-dates paginates separately; planning names use CRM callback; why: no cross-session writes.
- Accreditation: shared company letters keep IDs/originals; exports are new agrements/exports/ files via signed https; why: preserve history/all formats, avoid blocked blobs.
- Course/quiz labels use permanent IDs and dated baselines; why: no drift.
- Supports corrigés et protection T3P : voir `src/components/cours-en-ligne/AGENTS.md`.
- Student counters/CRM jalons share progressionModulesEleve, account proofs and Lyon waivers; attendance uses milestone ID; why: no divergence or leakage.
- Signatures PDF/Contrôle ZIP share readonly planning loader; retain IDs/versions, unknown hours, abort read errors; EDOF targets shared, PDF counts images not timestamps; why: no fabricated proof or mutations.
- Accès élève : créés/envoyés par trigger serveur si aucun compte ; why: aucune fiche sans accès.
- Quiz validé : `trg_00_garde_*` gardent réponses/note/statut (refus dans `quiz_valide_reecritures_refusees`, Admin/service/nouvelle tentative passent) ; EB legacy : clôture vide refusée P0530 ; why: anti-réécriture.
- Échecs de validation : RPC `signaler_echec_validation_quiz` (clé publique) ; 3/15 min = 1 alerte/h ; why: session expirée OK.
- Frozen relevé: `releve_jalons_calcul_fige`, resoudre-releves-gel/releveCalculServeur.ts, ACTIVITES_CODE at gele_le + archived answers; admin practice = new version; why: immutable history.
- Per-module freeze: registry activities added after a module's completed_at are acquired, not required (activitesRequisesModule); hours freeze only at access end; why: never reopen a finished module.
- Shared theory attendance uses sessionHeures with the learner track; why: prevent cross-track hour denominators.
- VTC theory-fail mail + practice choice: one mail (`src/lib/modeles/entrainementPratiqueVtc.ts`), proof in `documents_a_signer` (modele_code, frozen text hash), immutable trigger; why: single signed answer, no auto admin effect.
