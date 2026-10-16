# Planning pratique

- Import PDF planning CMA : lecture locale sans IA (`cmaPlanningImport.ts`), rapprochement prudent (ambigu/à vérifier = choix manuel), ajout seul dans `cma_planning_lignes` sans modifier la fiche apprenant ; why: aucun candidat perdu, aucune date de fiche écrasée ni mail déclenché.
- Lignes PDF sans fiche certaine : `cma_planning_attente` (append-only, clé source/date/heure/filière/jury/n°/nom normalisé), affichées « À rapprocher » ; rattachement uniquement via RPC `rattacher_attente_cma` (ligne + trace dans `cma_planning_attente_rattachements`) ; calendrier dédoublonne par ID de fiche, jamais par nom ; why: aucun oubli, pas de compte fictif, homonymes jamais fusionnés.
