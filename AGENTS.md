
- Module « Terminé » : le serveur (save_module_completion) refuse une validation sans aucune réponse prouvée pour un module qui a des questions (P0501) ; why: le navigateur ne doit jamais décider seul qu’un module est terminé.
- Règles de fin des modules définis dans le code : table `module_regles_validation` (protection_serveur) lue par save_module_completion ; why: le serveur doit connaître les modules à questions absents de module_editor_state.
- Comptes de test techniques : table `comptes_test_techniques` ; why: les exclure des signalements et statistiques sans deviner par le nom.
- Comptes de test exclus des lectures via policies RESTRICTIVE `est_compte_test()` (apprenants, reponses, progression, notes) ; why: exclusion centrale de tous les écrans/statistiques, le compte ne voit que lui-même.
- Bilans protégés : trigger `trg_bilan_aa_controle_ids` refuse (P0510) un id d'exercice hors entier 32 bits ; why: empêcher silencieusement un futur Bilan incompatible sans toucher aux anciens IDs.
