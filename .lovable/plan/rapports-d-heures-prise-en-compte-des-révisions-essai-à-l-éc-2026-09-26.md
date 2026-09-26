# Rapports d'heures : prise en compte des révisions + essai à l'écran sur le compte TEST

Rien n'est publié. Aucun fichier de synchronisation, aucune donnée pédagogique, aucune question, aucun bouton élève touchés. save_module_completion reste tel quel (point 1 : non).

## 1. Rapports d'heures : reconnaître les révisions (affichage uniquement)
Les identifiants `module_X_revision_exo_Y` sont rattachés au même module X et au même exercice Y que `module_X_exo_Y`.
- Libellé affiché : titre de l'exercice suivi de « (révision) ».
- Temps de révision compté dans le module X, comme le reste de l'activité.
- Aucune écriture : seule la lecture des rapports change.

Emplacements :
- src/lib/reports/connexion-detail-rows.ts : `resolveExerciceTitle` (ligne 49) et la déduction du module (ligne 139) acceptent aussi le format de révision.
- src/components/crm/ApprenantActivityReport.tsx (lignes 592 et 1163) : même règle, via une petite fonction partagée.
- src/lib/quizAttempts.ts : ajout d'une fonction de lecture `lireIdentifiantExerciceModule(id)` → { moduleId, exoId, revision }, utilisée par les deux fichiers ci-dessus.

## 2. Essai à l'écran, compte TEST uniquement
1. Déconnexion forcée des sessions du compte TEST (00000000-…a001) uniquement : clôture de ses connexions ouvertes. Aucun autre compte touché.
2. Connexion de l'aperçu avec le compte TEST, puis sur un quiz de module :
   - validation normale : « Enregistrement en cours… » puis OK ;
   - échec simulé (coupure réseau dans le navigateur de test) : réponses toujours affichées, message clair, bouton « Réessayer la validation » qui fonctionne une fois le réseau rétabli ;
   - « Refaire les fausses » sur le quiz validé, puis rechargement de la page : réponses refaites réaffichées, quiz d'origine toujours validé avec sa note (contrôle en base en lecture).
3. Captures d'écran pour chaque cas, contrôle des compteurs avant/après (seules les lignes du compte TEST peuvent changer).
4. Arrêt avant toute publication.

## Tests
- Nouveau test : les identifiants de révision sont rattachés au bon module/exercice dans les rapports et ne sont jamais comptés comme une validation.
- Suite complète relancée.

## Fichiers touchés
- src/lib/quizAttempts.ts
- src/lib/reports/connexion-detail-rows.ts
- src/components/crm/ApprenantActivityReport.tsx
- src/test/rapports-heures-revision.test.ts (nouveau)
