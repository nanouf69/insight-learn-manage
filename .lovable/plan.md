# VTC e-learning — diagnostic et proposition, sans modification de l’application

## Périmètre et fichiers envisagés
Aucun fichier de l’application, support de cours ou donnée élève n’a été modifié pendant le diagnostic. Seule cette proposition est préparée pour approbation.

Après accord :
- `src/components/cours-en-ligne/ModuleDetailView.tsx` : association explicite cours/quiz, au lieu de leur position dans deux listes filtrées.
- Un utilitaire dédié et des tests de cette association, dont le nom sera fixé à l’implémentation.
- Nouvelles versions des supports Réglementation partie 2 (PowerPoint et PDF), sans écraser les originaux.
- Configuration des liens de cours concernés, uniquement pour sélectionner ces nouvelles versions.
- `PdfSlideViewer.tsx` / `PptxViewerComparison.tsx` seulement si un défaut de défilement est reproduit après correction des supports.
- `AGENTS.md`, `roadmap.md` pour documenter les règles et suivre les contrôles.

## Diagnostic : encadrés coupés
La coupure est présente dans les supports eux-mêmes, indépendamment du navigateur :
- Dans le PowerPoint, l’encadré TPMR dépasse jusqu’à **104,5 % de la hauteur de la diapositive**. Le rappel covoiturage dépasse également à 104,5 %.
- Les images du PDF confirment visuellement la coupure de ces deux encadrés en bas de page.
- Le texte complet subsiste dans le PowerPoint : il n’est donc pas nécessaire de réinventer le contenu.
- Ajouter du défilement à la page web ne peut pas récupérer ce qui est hors du cadre du PowerPoint ou du PDF.

### Contrôle de toutes les pages de partie 2
Contrôle géométrique exécuté sur **43 diapositives PowerPoint** et **42 pages PDF** ; les deux fichiers ne sont donc pas strictement alignés.

Débordements de zones de texte PowerPoint repérés aux pages physiques **2, 11, 13, 15, 18, 23, 26, 28, 33 et 43** : sommaire, classes d’amendes, recours, TPMR, covoiturage, discriminations, Comité national, commission disciplinaire, synthèse VSS/discriminations, mentions du B2.

Dans le PDF, du texte dépasse également le cadre aux pages physiques **2, 11, 12, 13, 15, 17, 22, 26, 27, 30, 32 et 42**. Les numéros imprimés sur les slides ne sont pas les numéros de page des fichiers ; la correction ciblera les titres, sans renumérotation.

Ces contrôles repèrent des dépassements, mais ne constituent pas une validation visuelle complète de chaque slide, ni un test Safari/Chrome/mobile. Ces vérifications restent à réaliser après accord et correction.

## Diagnostic : quiz décalés
La lecture de la configuration enregistrée confirme :
- Quiz T3P partie 1 et partie 2 : **présents, mais désactivés** (53 et 80 questions enregistrées).
- Quiz Anglais parties 1 et 2 : également désactivés.
- L’affichage filtre séparément les cours et les quiz actifs, puis les alterne par position : cours 1 → quiz actif 1 → cours 2 → quiz actif 2.
- La disparition des deux quiz T3P de la liste active place donc Gestion n°1 immédiatement après Réglementation partie 1 et décale les suivants.

## Ordre actuel des modules VTC e-learning
1. Introduction e-learning
2. Cours et exercices VTC
3. Formules
4. Bilan exercices VTC
5. Examens blancs VTC
6. Bilan examen VTC
7. Sources juridiques VTC
8. Fiches révisions VTC
9. Pratique VTC
10. Fin de formation VTC

### Ordre actuel à l’intérieur de « Cours et exercices VTC »
Chaque ligne se lit **cours puis quiz indiqué**, avant la ligne suivante.

| Cours | Quiz affiché juste après |
|---|---|
| Réglementation T3P partie 1 | Gestion partie 1 |
| Réglementation T3P partie 2 | Gestion partie 2 |
| Gestion partie 1 | Gestion partie 3 |
| Gestion partie 2 | Sécurité routière partie 1 |
| Gestion partie 3 | Sécurité routière partie 2 |
| Sécurité routière partie 1 | Sécurité routière partie 3 |
| Sécurité routière partie 2 | Français |
| Sécurité routière partie 3 | Anglais partie 3 |
| Français | Anglais partie 4 |
| Anglais partie 1 | Développement commercial |
| Anglais partie 2 | Réglementation spécifique VTC |
| Anglais partie 3 | Aucun |
| Anglais partie 4 | Aucun |
| Développement commercial | Aucun |
| Réglementation spécifique VTC | Aucun |

## Ordre corrigé proposé
Conserver l’ordre des 10 modules ; corriger uniquement l’enchaînement interne par matière :
1. Réglementation T3P partie 1 → quiz T3P partie 1 **si réactivation approuvée**.
2. Réglementation T3P partie 2 → quiz T3P partie 2 **si réactivation approuvée**.
3. Gestion partie 1 → quiz Gestion partie 1.
4. Gestion partie 2 → quiz Gestion partie 2.
5. Gestion partie 3 → quiz Gestion partie 3.
6. Sécurité routière parties 1, 2, 3 → chaque quiz après sa partie.
7. Français → quiz Français.
8. Anglais parties 1, 2, 3, 4 → chaque quiz actif après sa partie ; parties 1 et 2 restent désactivées sans accord spécifique.
9. Développement commercial → son quiz.
10. Réglementation spécifique VTC → son quiz.

L’association se fait par identifiants existants, jamais par position après filtrage. Un quiz désactivé ne décale plus les autres.

## Correction des supports proposée
- Préparer une nouvelle version qui remet tous les encadrés dans le cadre par adaptation de la mise en page, sans changer les textes, supprimer de contenu ni renuméroter les diapositives.
- Produire un PDF correspondant exactement au PowerPoint corrigé ; conserver tous les anciens fichiers.
- Vérifier chaque slide visuellement, dont les encadrés signalés, avant de sélectionner ces nouveaux liens dans l’application.
- Vérifier ensuite l’affichage et le défilement sur ordinateur et mobile, Chrome et WebKit ; un contrôle Safari réel sera distingué d’un contrôle WebKit automatisé.

## Garanties et validation
- Aucun changement avant votre accord ; réactivation des quiz T3P uniquement si elle est explicitement approuvée.
- Aucune suppression, fusion, migration, restauration ou réparation automatique.
- Réponses, notes, identifiants de quiz, progression acquise, tentatives et snapshots conservés. Aucun recalcul ni rétrogradation de module terminé.
- Tests uniquement avec données fictives, aucune écriture de test sur un vrai apprenant et aucun appel Gemini.
- Tests d’association couvrant les quiz désactivés et les matières communes ; contrôle des autres écrans utilisant la même association.
- Rapport séparant les contrôles effectivement exécutés de ceux non prouvés.