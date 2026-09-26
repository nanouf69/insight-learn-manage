# Quiz de module : délai de 20 s, révision après rechargement, affichage pendant le chargement

Pas de publication. Synchronisation, réponses, notes, questions et boutons élèves inchangés. « Refaire les fausses » reste disponible partout.

## 1. Délai global de 20 secondes sur « Valider les QCM »
- L'envoi, la relecture et la validation serveur sont chronométrés ensemble : au-delà de 20 s, on arrête d'attendre à l'écran.
- L'élève voit alors l'encadré « Vos réponses sont conservées sur cet écran mais n'ont pas encore été confirmées par le serveur. » et le bouton « Réessayer la validation ».
- Les réponses restent dans la file d'envoi existante (non vidée, non annulée). Si le serveur confirme plus tard, rien n'est affiché tant que l'élève n'a pas relancé la validation, qui passe alors en quelques secondes.
- Le journal d'erreurs note l'étape « delai_depasse » avec l'étape en cours (envoi, relecture ou validation serveur).
- Étape qui attendait sans limite pendant l'essai précédent : l'**envoi** (attente de la file jusqu'au retour du réseau). Je le confirmerai pendant le nouvel essai grâce à ce journal.

## 2. Révision vide après rechargement
Cause trouvée dans le code (deux points possibles, les deux corrigés) :
- le calcul des questions à refaire lit la liste des exercices telle qu'elle était au moment du lancement de la lecture ; si elle n'était pas encore chargée, il la voit vide ;
- une liste de questions à refaire, gardée de la visite précédente, peut contenir des numéros qui ne correspondent à aucune question affichée : tout est filtré, la page est vide.

Correction :
- le calcul utilise toujours la liste d'exercices la plus récente ;
- à l'affichage, on ne garde que les questions à refaire qui existent réellement ; si aucune ne correspond, **toutes les questions sont affichées** (jamais de page vide).

## 3. Pendant le chargement
- Liste de gauche du module : un quiz n'apparaît « fait » qu'une fois sa validation serveur relue ; avant, pas de coche.
- Compteur « x/6 quiz » : « Chargement… » tant que les validations serveur ne sont pas relues.
- Le flash « 0/10 modules » vient du tableau de bord (bandeau d'accueil), pas de l'écran module. Vous avez demandé de ne toucher que l'écran module : **je ne le corrige pas** sans votre accord pour ce deuxième fichier.

## 4. Les 2 tests qui avaient échoué puis réussi
Le détail du premier lancement n'est plus disponible : je n'ai plus les noms. Je ne les invente pas. Pendant ce tour, je lancerai la suite complète deux fois et je vous donnerai le nom exact et la raison de tout test instable.

## 5. Essais à l'écran (compte TEST uniquement)
1. Validation normale d'un quiz.
2. Coupure réseau de 25 s : message + « Réessayer la validation » attendus vers 20 s, puis réessai après rétablissement.
3. « Refaire les fausses » sur un quiz validé, puis rechargement : questions à refaire affichées.
Captures et résultat PASS / FAIL / NON PROUVÉ, puis arrêt avant toute publication.

## Fichiers touchés
- src/components/cours-en-ligne/ModuleDetailView.tsx : délai de 20 s, correction de la révision, affichage pendant le chargement.
- src/test/quiz-module-validation-serveur.test.ts : tests ajoutés pour ces trois points (aucun autre test modifié).

Si vous refusez le fichier de test, seul ModuleDetailView.tsx sera modifié.
