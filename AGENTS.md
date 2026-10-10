
- Module « Terminé » : le serveur (save_module_completion) refuse une validation sans aucune réponse prouvée pour un module qui a des questions (P0501) ; why: le navigateur ne doit jamais décider seul qu’un module est terminé.
- Règles de fin des modules définis dans le code : table `module_regles_validation` (protection_serveur) lue par save_module_completion ; why: le serveur doit connaître les modules à questions absents de module_editor_state.
- Comptes de test techniques : table `comptes_test_techniques` ; why: les exclure des signalements et statistiques sans deviner par le nom.
- Comptes de test exclus des lectures via policies RESTRICTIVE `est_compte_test()` (apprenants, reponses, progression, notes) ; why: exclusion centrale de tous les écrans/statistiques, le compte ne voit que lui-même.
- Bilans protégés : trigger `trg_bilan_aa_controle_ids` refuse (P0510) un id d'exercice hors entier 32 bits ; why: empêcher silencieusement un futur Bilan incompatible sans toucher aux anciens IDs.
- Affichage module apprenant : via `getLearnerModuleDisplayState`/`isModuleDoneForDisplay` ; une ligne serveur `completed` reste « Terminé » ; compteurs complets sans serveur = « Validation en cours » ; why: jamais rétrogradé ni faux statut.
- Notes corrigées par un formateur : trigger `trg_garde_correction_admin_quiz` refuse (42501) toute modification élève de score/note/réussite/correctionsIA si une correction porte validatedByAdmin ou manuel ; why: une note en attente sur un appareil ne doit jamais écraser une correction admin.
- Quiz de module : résultat « OK » affiché seulement après envoi + relecture + submitQuizAttempt ; révision d’un quiz validé sous `module_X_revision_exo_Y` (jamais la ligne validée) ; why: un quiz ne doit jamais paraître validé sans preuve serveur, et une révision ne doit jamais toucher une validation.
- Note/statut d'examen blanc affichés via `src/lib/noteExamenAffichee.ts` (attacherSourceUnique + noteExamenAffichee) dans « Mes notes » et la fiche admin ; why: les deux écrans ne doivent jamais diverger.
- Passages du nouveau moteur « non fiables » repérés à l'affichage par `src/lib/passagesV2NonFiables.ts` : note de l'ancien système + mention ; why: le moteur n'a parfois gardé que la première valeur.
- Modules Examens blancs 35–38 : déclencheur serveur `trg_zz_examens_blancs_6_sur_6` (écrit seulement « completed », jamais bloquant) ; why: validation 6/6 automatique côté serveur.
- Émargements : une feuille erronée est masquée (emargements_fc.masque = true), jamais supprimée ; toutes les lectures filtrent masque = false ; why: aucune donnée élève ne disparaît.
- Planning pratique : config chargée/sauvegardée par clé exacte session d'examen + période (sauvegarde refusée avant chargement) ; dates Du/Au verrouillées, jamais envoyées vides/inversées ; why: ne jamais remplacer les dates enregistrées.
- Jours de formation pratique : toujours ceil(candidats / 3) partout ; why: max_per_day enregistré donnait un faux nombre.
- Page élève de réservation pratique : tout jour auquel l'admin a fixé un type VTC/TAXI dans le planning (même samedi/dimanche) est proposé tel quel ; why: l'élève doit voir exactement le planning admin.
- Practical notes: admin-only append-only revisions by learner/session/period, server revision guard, escaped HTML shared by CMA/learner emails; why: preserve history and reject stale/cross-session writes.
- Exam selectors share sessions/handler; all-dates uses separate pagination, never changes planning; why: complete registrations without cross-session writes.
- Accreditation: shared company letters keep IDs/originals; exports are new agrements/exports/ files via signed https; why: preserve history/all formats, avoid blocked blobs.
- Course/quiz order and admin labels share permanent-ID associations; historical adapters stay unchanged; why: prevent positional drift. Verify all paths against dated baselines and append the change journal.
- Supports corrigés et protection T3P : voir `src/components/cours-en-ligne/AGENTS.md`.
- Exam rates reuse CRM hook, mails require confirmation; why: no drift or auto-send.
- Accès élève : créés/envoyés par le serveur (trigger sur apprenants) à chaque modification si aucun compte ; why: une fiche corrigée ne doit jamais rester sans accès.
<!-- LOVABLE:BEGIN -->
- Practical attendance PDF hours use learner planning details by exact date and half-day, display-only; why: preserve signatures and never label evening attendance with daytime hours.
<!-- LOVABLE:END -->
- Quiz validé : triggers `trg_00_garde_*` gardent réponses/note/statut, refus tracés dans `quiz_valide_reecritures_refusees` ; Admin/service/nouvelle tentative passent ; why: jamais réécrit par l'élève.
- Échecs de validation : RPC `signaler_echec_validation_quiz` (clé publique) ; 3/15 min = 1 alerte/h ; why: marche même session expirée.
