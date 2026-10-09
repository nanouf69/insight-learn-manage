
- Module « Terminé » : le serveur (save_module_completion) refuse une validation sans aucune réponse prouvée pour un module qui a des questions (P0501) ; why: le navigateur ne doit jamais décider seul qu’un module est terminé.
- Règles de fin des modules définis dans le code : table `module_regles_validation` (protection_serveur) lue par save_module_completion ; why: le serveur doit connaître les modules à questions absents de module_editor_state.
- Comptes de test techniques : table `comptes_test_techniques` ; why: les exclure des signalements et statistiques sans deviner par le nom.
- Comptes de test exclus des lectures via policies RESTRICTIVE `est_compte_test()` (apprenants, reponses, progression, notes) ; why: exclusion centrale de tous les écrans/statistiques, le compte ne voit que lui-même.
- Bilans protégés : trigger `trg_bilan_aa_controle_ids` refuse (P0510) un id d'exercice hors entier 32 bits ; why: empêcher silencieusement un futur Bilan incompatible sans toucher aux anciens IDs.
- Affichage progression monotone : une ligne serveur `completed` reste « Terminé » même si les compteurs actuels de quiz/examens ou les anciennes sous-lignes divergent ; why: une évolution de contenu ou un état client ancien ne doit jamais rétrograder un acquis.
- Affichage module apprenant : toujours via `getLearnerModuleDisplayState` / `isModuleDoneForDisplay` (moduleUnlockLogic) ; why: une seule règle, Terminé serveur jamais rétrogradé, aucun faux statut ; compteurs complets sans serveur = « Validation en cours » ; tableau de bord en lecture seule.
- Notes corrigées par un formateur : trigger `trg_garde_correction_admin_quiz` refuse (42501) toute modification élève de score/note/réussite/correctionsIA si une correction porte validatedByAdmin ou manuel ; why: une note en attente sur un appareil ne doit jamais écraser une correction admin.
- Quiz de module : résultat « OK » affiché seulement après envoi + relecture + submitQuizAttempt ; révision d’un quiz validé sous `module_X_revision_exo_Y` (jamais la ligne validée) ; why: un quiz ne doit jamais paraître validé sans preuve serveur, et une révision ne doit jamais toucher une validation.
- Note/statut d'examen blanc affichés via `src/lib/noteExamenAffichee.ts` (attacherSourceUnique + noteExamenAffichee) dans « Mes notes » et la fiche admin ; why: les deux écrans ne doivent jamais diverger.
- Passages du nouveau moteur « non fiables » repérés à l'affichage par `src/lib/passagesV2NonFiables.ts` : note de l'ancien système + mention ; why: le moteur n'a parfois gardé que la première valeur.
- Modules Examens blancs 35–38 : déclencheur serveur `trg_zz_examens_blancs_6_sur_6` (écrit seulement « completed », jamais bloquant) ; why: validation 6/6 automatique côté serveur.
- Émargements : une feuille erronée est masquée (emargements_fc.masque = true), jamais supprimée ; toutes les lectures filtrent masque = false ; why: aucune donnée élève ne disparaît.
- Planning pratique : chaque configuration est chargée et sauvegardée par la clé exacte session d'examen + période pratique (toutes les sauvegardes, y compris immédiates, refusées tant que la clé n'est pas chargée) ; dates Du/Au verrouillées par défaut et jamais envoyées si vides ou inversées ; why: un choix ancien, une saisie en cours ou une autre période ne doit jamais remplacer les dates enregistrées.
- Besoin en jours de formation pratique : toujours ceil(candidats / 3) partout (onglet Candidats à former et résumé du planning), jamais divisé par max_per_day enregistré ; why: une capacité sauvegardée différente faisait afficher un faux nombre de jours.
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
