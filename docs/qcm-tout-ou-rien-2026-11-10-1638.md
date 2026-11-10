# QCM tout-ou-rien — contrôle du 10/11/2026 16:38 UTC

## Verdict
**GO sur les cas de barème contrôlés ; NO-GO publication du corrigé actualisé.** Aucun calcul de note, aucune correction, aucune réponse, aucun snapshot ou contenu pédagogique n’a été écrit en production. Aucun déploiement demandé.

## Source officielle relue en production
- EB3 VTC : `francais:4`, « Donnez un synonyme du verbe " titiller": », **A+C**, **2 points**, version **23**, publication **15:59:36.030970 UTC**.
- EB3 TAXI : même question, **A+C**, **2 points**, version **10**, publication **15:59:38.078948 UTC**.
- L'heure affichée en France correspond à UTC+1.

## Calculs inspectés
- Définition réelle de `core_note_attempt` : choix attendus ordonnés, choix enregistrés distincts ordonnés, égalité exacte avant attribution de tous les points ; sinon zéro. Source = snapshot, jamais version officielle actuelle. `core_recalc_result` délègue à cette fonction.
- `bilan_future_submit` réel : ensembles ordonnés comparés exactement, aucune fraction de point. Lecture du code seulement : aucune soumission réelle exécutée.
- Calcul partagé `computeMatiereScoreFromReponses`, bilans `isBilanAnswerCorrect`, corrigé QCM de `ExamenBlancsResultats`, révisions `revisionQuestionsFigees`, cours `ModuleDetailView` et écran admin `CorrectionQCMTab` : aucune attribution de points partiels QCM trouvée sur ces chemins. Pas de modification nécessaire pour les choix valides contrôlés.
- Cette vérification n'est pas une certification de tous les formats anciens possibles : le serveur V2 extrait les lettres A–E d'une réponse texte ; les UI/bilans comparent des tableaux. Les données anormales/choix dupliqués ne sont pas exhaustivement exercés ici.

## Tests effectivement exécutés
- **20 tests Vitest PASS** : 11 nouveaux QCM/titiller, 4 corrigé courant, 5 invariants QCM+QRC /20.
- **95 tests Vitest PASS** : snapshots figés, verrou moteur, sauvegarde partielle, finalisation matière.
- **1 contrat PostgreSQL PASS**, contenant **14 calculs réels sur base jetable** avec la définition `core_note_attempt` de migration 0244, correspondant à la définition production relue. Chaque fixture est rollbackée.
- A+C et C+A = **2/2** ; A, C, A+B+C, B et vide = **0/2**, lorsque le snapshot contient A+C.
- Snapshot historique C seul : C reste **2/2**, A+C reste **0/2**, même si le contenu pédagogique actuel contient A+C.
- Dernier signal de compilation disponible : **build OK, 16:42:14 UTC**.

## Parcours navigateur réel et blocage
- Session administrateur reconnue ; accès à Cours en ligne → Vue apprenant → Mourad CHEMOUN → Examens → EB3 → Voir mes résultats.
- La carte conserve D Français **9,5/20**, F(T) **14/20**, G(T) **18/20** et A/B en attente : aucun changement de note.
- Le détail sélectionné montre « En attente de correction des QRC » et « Vos réponses enregistrées ». **Aucun encadré de corrigé actuel n'est rendu sur cette branche**. Le corrigé enrichi existant se situe dans la branche de correction détaillée ; la visibilité positive A+C n'a donc pas été prouvée sur ce cas.
- Il ne serait pas honnête d'annoncer « corrigé publié et vérifié ». Pas de publication. Aucun passage démarré, aucune note saisie pour forcer l'accès.

## Reste non prouvé / suite
- Affichage positif A+C puis rechargement sur une copie EB3 terminée affichant réellement le corrigé, VTC et TAXI, ordinateur/mobile.
- Parcours complet modification admin → sauvegarde → relecture candidat : non exécuté car aucune modification pédagogique réelle de test n'est autorisée.
- Actualisation d'un écran de correction déjà ouvert après modification officielle : non prouvée ; le code relit après changement de copies/signal core, pas sur un événement spécifique de version officielle.
- Retour arrière d'une publication : non répété dans ce contrôle, puisque aucun code actif n'a été modifié ou publié.
- La règle utilisateur permanente est enregistrée et les tests conservés dans le projet. Publier seulement après levée de ces blocages, sans recalcul rétroactif.