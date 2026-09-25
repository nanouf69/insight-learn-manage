
- Module « Terminé » : le serveur (save_module_completion) refuse une validation sans aucune réponse prouvée pour un module qui a des questions (P0501) ; why: le navigateur ne doit jamais décider seul qu’un module est terminé.
- Règles de fin des modules définis dans le code : table `module_regles_validation` (protection_serveur) lue par save_module_completion ; why: le serveur doit connaître les modules à questions absents de module_editor_state.
- Comptes de test techniques : table `comptes_test_techniques` ; why: les exclure des signalements et statistiques sans deviner par le nom.
