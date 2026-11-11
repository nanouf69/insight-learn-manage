# Sessions actuelles et Notes par session — aperçu du 11/11/2026

## Résultat
Trois boutons de formation actuelle s'affichent avant la grille. Dates CRM inclusives en Europe/Paris ; statut Planifiée accepté ; type examen exclu. Sans filtre, première formation actuelle sélectionnée, sans catalogue global. Un lien profond reste prioritaire. Toutes les sessions et les groupes spéciaux restent explicites dans le menu.

L'onglet Notes par session affiche d'abord les choix actuels sans lire leurs résultats. Chaque clic charge uniquement les inscrits et leurs preuves/résultats nécessaires. Une ligne par inscrit, filière explicite, six colonnes générales EB1–6. Aucun zéro de remplacement.

## Sources officielles
- `loadSavedExamens(false, undefined, true)` : même fusion de définitions que CRM, variante sans écriture de journal en cas d'échec ; comportement des autres consommateurs inchangé.
- `lignesExamenAffichees` par apprenant : reset, placeholders, sélection par tentative enregistrée ; anciens sujets complètent seulement selon la règle partagée existante. Archives de reset exclues.
- `fetchCoreMatiereStatesBulk`, `fetchPassagesV2NonFiables`, `attacherSourceUnique`, `noteExamenAffichee` : mêmes preuves de publication et identité que le CRM.
- `computeMoyenneExamen` + `computeMatiereScoreForAttempt` : moyenne pondérée officielle et verdict. Nombre affiché seulement si toutes matières couvertes et publiées ; même échec éliminatoire sur copie partielle ne devient pas moyenne définitive.
- Filière issue du type apprenant enregistré, jamais de l'examen retrouvé. Type inconnu = indisponible. Passage V2 sans fiche exploitable = indisponible, pas Non passé.

## Contrôles exécutés
- PASS SELECT lecture seule : TAXI/TA 26/10–16/11 = 12 ; VTC/TAXI 02–13/11 = 16 (6 TAXI, 10 VTC) ; soir 02–13/11 = 18 ; les trois statuts sont Planifiée, types théoriques.
- PASS navigateur admin réel : trois boutons ; onglet 16 lignes, 51 notes générales définitives, une cellule indisponible signalée, autres états explicites ; puis 18 lignes soir et 12 TAXI/TA. Aucun appel d'écriture, aucune erreur JavaScript observée.
- PASS premier accès sans filtre : VTC/TAXI actuelle sélectionnée ; aucun appel de catalogue copies non filtré dans la vérification finale. Interception bloquante des requêtes globales et des mutations pendant les tests.
- PASS desktop/mobile : boutons passent à la ligne ; tableau défile horizontalement sans fusion de colonnes.
- PASS 70 tests Vitest : notes pondérées (12×3 + 20×1)/4 = 14/20, partialité éliminatoire, attente, absence, erreur, filière, dates Paris, navigation grille, source unique.

## Limites
Les lectures de publications ou de preuves peuvent encore échouer sous charge : cellules indisponibles et Réessayer, jamais moyenne reconstruite. La cellule indisponible constatée n'est ni réparée ni rattachée automatiquement. Les copies V2 sans projection officielle exploitable restent indisponibles. Les tests n'enregistrent aucune note ; aucune migration ni publication effectuée.