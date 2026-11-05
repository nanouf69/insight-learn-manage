# Sessions de l’indicateur premier passage — 05/11/2026 20:18 UTC

## Modifications effectives de l’aperçu
- `premierPassageStats.ts` : sélection commune des sessions par dates inclusives Europe/Paris et statut, vues par identifiant de session et modalité. Double inscription : comptée une fois dans chaque catégorie applicable, une fois au global.
- `premierPassageStatsRead.ts` : mêmes lectures paginées sous droits admin, résultat accompagné des sessions retenues ; aucune nouvelle requête par question et aucune écriture.
- `QuestionFirstPassageRate.tsx` : filtres Global / JOURNÉE / SOIRÉE ; intitulés exacts, dates, modalités et effectifs éligibles ; taux et n/N par question, catégorie et session. Aucun taux en absence de session active, absence de preuve explicitement signalée.
- Tests, règle architecture et feuille de route mis à jour. Aucun changement à ModuleDetailView ni à ses mécanismes de rafraîchissement existants.

## Sessions réellement lues
Date Paris : 05/11/2026. Trois sessions répondent à début <= aujourd’hui <= fin, malgré le statut administratif « planifiee » :

| Session | Dates | Modalité | Élèves éligibles |
|---|---|---|---:|
| Session TAXI et TA - Du 26 octobre au 16 novembre 2026 | 26/10–16/11/2026 | JOURNÉE | 12 |
| Session VTC et TAXI - Du 2 au 13 novembre 2026 | 02/11–13/11/2026 | JOURNÉE | 16 |
| Session VTC cours du soir - Du 2 au 13 novembre 2026 | 02/11–13/11/2026 | SOIRÉE | 18 |

La lecture conserve les identifiants distincts, jamais regroupés par intitulé. Les inscriptions hors dates effectives, liste d’attente et comptes techniques restent exclus.

## Vérifications réellement exécutées
- 33/33 Vitest PASS : 19 calcul/session, 9 intention sauvegarde admin, 3 focus recherche, 2 projection recherche.
- Administrateur authentifié, navigation réelle Cours > Modules > VTC > Développement Commercial > liste des questions, trois filtres puis actualisation manuelle : PASS.
- Q1 « Qu’est-ce que le marketing ? » : global 0 % (0/2), JOURNÉE 0 % (0/2), SOIRÉE aucune réponse prouvée, 18 premiers passages non prouvés ; journée 8 non prouvés, total 26 non prouvés. TAXI/TA : aucune réponse à cette question. Les limites historiques ne sont pas résolues ni cachées.
- Captures du panneau de sessions et de la question PC 1280×1800 et mobile 390×844 : textes et filtres lisibles, pas de chevauchement observé dans les éléments contrôlés. Pas de validation générale du reste de la navigation mobile.
- Aucune erreur JavaScript ; dernier journal aperçu : build OK.
- L’état « Aucune session en cours » est couvert par test de calcul sans catégorie active ; les données réelles ont actuellement les deux catégories, donc ce cas n’a pas été observé sur données réelles.

## État
**NON PUBLIÉ.** Aucune migration, aucun déploiement, aucune écriture de question, réponse, note, progression, émargement ou session ; aucun email/SMS/IA. Les taux restent partiels lorsque le premier choix et le corrigé historique ne sont pas prouvables.

## Demande de publication 20:22 UTC
- Filtre individuel par session ajouté : choix par identifiant immutable, options limitées à la modalité active sélectionnée ; changement de modalité réinitialise le choix. Une session retirée/incompatible ne produit aucun taux global de remplacement.
- 20 tests calcul/session PASS (dont nouveau filtre individuel) ; suite complète exécutée : **3413 PASS, 5 FAIL, 13 skipped**. Les cinq échecs préexistants sont quatre mocks auth incomplets dans gel-par-module-raccordement et un attendu agenda dans suivi-formation-indicateurs ; aucune modification de ces règles hors demande.
- Navigateur admin réel : sélection TAXI/TA seule affiche aucune réponse et n’inclut plus les sessions VTC ; passage SOIRÉE réinitialise correctement la sélection ; actualisation global 0/2, 26 non prouvés inchangé. PC/mobile, aucune erreur JavaScript, build OK.
- Scan sécurité exécuté : quatre alertes critiques actives sur lecture de tables de paramètres `bilan_future_opening`, `bilan_identite_flags`, `bilan_snapshot_flags`, `module_regles_validation`, six avertissements et deux informations. Ce scan signale des permissions larges, pas une preuve de fuite de réponses élèves ; aucune modification de droits ni suppression d’alerte.
- **Publication non demandée** : l’autorisation est conditionnée aux tests conformes et à l’absence de risque, conditions non établies. Production connue : https://gestion.ftransport.fr ; aucune preuve de nouvelle publication et aucun nouvel indicateur prétendu présent en production. La publication capture tout l’aperçu, pas uniquement cette fonctionnalité.