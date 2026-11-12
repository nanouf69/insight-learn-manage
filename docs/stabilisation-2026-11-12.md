# Stabilisation 12/11/2026 — Phase 0 (lecture seule) + Phase 1 (code aperçu)
Mesures lues le 12/11 ~20:15 UTC. Panne 19:27–19:38 UTC (20:27–20:38 Paris).
- Mémoire base 88 %, connexions 44/90, disque 35 %, base 2,02 Go, 0 redémarrage depuis boot.
- answer_events EB5 19:20–19:45 UTC : 3 900 écritures, 33 passages. 19:38–19:42 : 1 638 écritures pour 148 questions (≈11/question), 1 écriture par lettre (ex. 30 révisions en 10 s).
- error_logs : 12 délais d'envoi (15 s/60 s) « réponse conservée en file ».
- Requêtes lentes : reservations_pratique moyenne 1,18 s (table 80 kB, index unique) ; module_editor_state module_data 1,12 s moy / 7,3 s max ; apprenant_module_activites 2,7 s moy / 6,2 s max (87 k lignes, index existant).
- Sauvegardes/PITR : non vérifiables par l'agent (aucun outil de lecture de l'inventaire). Aucune modification de base effectuée.
Correctif code (aperçu) : src/features/noyau-passage/pontV2.ts ; tests src/test/pont-v2-stabilisation-panne.test.ts.
