# Sécuriser l'affichage des 17 passages figés du Bilan Sécurité routière

Périmètre strict : affichage uniquement. Aucune écriture en base, aucune modification des 44 questions, de Q53/Q55, des réponses, de l'archive, d'un autre module ou examen.

## Ce qui recalcule aujourd'hui

1. **Écran du module côté élève et vue admin « voir comme l'élève »** (page du Bilan VTC module 5 exercice 502, Bilan TAXI module 11 exercice 602) : le cercle de score « Points : X / Y », le pourcentage et la grille verte/rouge par question sont recalculés à chaque affichage en comparant la lettre cochée avec la bonne réponse du contenu **actuel**. C'est le seul endroit où une réparation changerait ce que voit la personne.
2. **Résultats enregistrés** (tableau des résultats du module, rapport d'activité, dossier PDF) : ils lisent un score déjà enregistré, sans recalcul. Aucune réparation des questions ne les modifie. Rien à changer.
3. **Correction QCM admin** : ne recalcule que sur action volontaire de l'admin. Rien à changer, mais un avertissement sera affiché pour ces 17 passages (voir étape 3).

## Modification minimale proposée

1. **Lecture de l'archive** : à l'ouverture des exercices 502 et 602, lire l'archive figée (en lecture seule) pour l'élève et l'exercice concernés. Aucune archive = comportement actuel inchangé pour tous les autres élèves, modules et exercices.
2. **Affichage figé** : si une archive existe, le cercle de score, le pourcentage et la grille par question utilisent la clé et le score archivés, jamais le contenu actuel. Petite mention « Résultat historique figé au 24/09/2026 ».
3. **Correction QCM admin** : pour ces 17 passages, afficher un avertissement indiquant que le résultat historique est figé et que le recalcul ne doit pas s'appliquer. Aucun blocage automatique n'est ajouté sans votre accord.
4. **Passages non terminés (15)** : l'affichage de la partie déjà répondue reste figé. Pour les nouvelles réponses données après une réparation, deux options restent à trancher : (a) figer l'affichage pour les 17 passages, anciennes réponses seulement ; (b) figer seulement les 2 passages terminés. La recommandation est l'option (a). Aucune donnée n'est écrite dans les deux cas.

## Tests de non-régression

- Passage figé + correction fictive du contenu actuel (bonne réponse A remplacée par C) : score affiché et grille strictement identiques à l'archive.
- Même passage sans correction : l'affichage correspond exactement au score archivé (par exemple VTC 17/09 : 155/211/213, TAXI 18/09 : 60/210/210).
- Élève sans archive : le calcul actuel est inchangé.
- Autres modules ou exercices : aucune lecture de l'archive, comportement identique.
- Aucune écriture : le test vérifie qu'aucun appel d'écriture n'est fait vers les réponses, l'archive ou le contenu.
- Toute la suite de tests est relancée : 1 142 réussis attendus, les 23 échecs déjà connus restent identiques.

## Contrôles après la mise en place

- Empreinte des 17 passages et de l'archive identique avant et après.
- Contenu des Bilans VTC/TAXI inchangé (44 questions non réparées, Q53/Q55 non touchées).
- Arrêt avant la réparation des 44 questions.

## Détails techniques

- Nouvelle fonction pure `resultatFigeOuCalcule(archive, reponses, questionsActuelles)` dans un petit fichier dédié, utilisée par le bloc de résultats de `ModuleDetailView` (actuellement `isAnswerCorrect(selected, q)` vers la ligne 8491 et le calcul `exoCorrect/exoTotalQ`).
- Lecture `bilan_passages_figes` filtrée par `apprenant_id` + `exercice_id` (502/602), SELECT uniquement. La règle d'accès en lecture est vérifiée avant et ne sera ajustée qu'avec votre accord si l'élève ne peut pas lire sa propre archive.
- Test : `src/test/bilan-passages-figes-affichage.test.ts`.
