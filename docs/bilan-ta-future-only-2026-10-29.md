# Bilans TAXI/TA — corrections autorisées 29/10 13:49 UTC

## Résultat : partiel, pas de publication

### Modifications effectivement réalisées
- `ModuleDetailView.tsx` transmet l’ID explicitement édité dans les callbacks sauvegarde/brouillon. Pour bilans11/28, une comparaison de toute la projection ne peut plus autoriser les questions voisines ; l’ensemble des intentions d’édition est propre à l’éditeur monté. Les autres modules gardent leur détection existante.
- `adminQuestionSaveIntent.ts` fournit le calcul des identifiants explicites, testé contre Q68 A+D dans JSON ancien versus A dans la projection actuelle.
- Q68 canonique seule a été rétablie A seule par condition sur l’horodatage observé13:57:03.214275Z ; résultat14:01:18.998793Z. Aucune autre question corrigée ; aucun ajout local.
- Prototype `src/test/fixtures/bilan-ta-future-only.sql` créé et exécuté UNIQUEMENT sur PostgreSQL jetable. Il n’est pas une migration Cloud et n’est pas activé. Nouvelle ouverture TA700/701 issue de605/606 ; source vide refusée ; propriétaire vérifié ; ancienne réponse ou archive ⇒ ancien, jamais snapshot rétroactif ; snapshot existant ⇒ retour identique.

### Incident Q68 : limites de la preuve
La lecture initiale13:50 confirmait A seule ; une modification concurrente réelle13:57:03 l’a passée àA+D. Les fenêtres Playwright bloquaient tous appels d’écriture REST/fonctions, exception lecture `has_role` uniquement ; aucun appel d’écriture bloqué n’a été observé lors de l’ouverture Q68. Les réponses réseau reçues alors contenaient effectivement A+D : le mapper n’a pas inventéD. Le journal admin consulté sur cette période ne fournit pas l’origine. Donc le défaut d’intention est corrigé et testé, MAIS la cause exacte de la réécriture concurrente n’est pas prouvée et l’incident ne doit pas être déclaré définitivement résolu.

Après rétablissement : trois réponses réseau et les cases de l’éditeur montrent A=true,B/C/D=false. Capture élément `/tmp/browser/q68-guard/question.png` consultée ; aucune saisie, aucune sauvegarde. Lecture Cloud finale confirme le même horodatage et A seule. Pas de clic élève réel.

## Pourquoi les ajouts et l’activation TA restent bloqués
Lecture13:50 :6 nationales TA en cours,7 locales en cours,12 nationales soumises,6 locales soumises. Une copie locale s’est donc terminée depuis le décompte8 précédent. Les réponses partielles ne stockent pas le contenu intégral ni le barème initial (`reponses_meta={}`). Il n’existe pas de snapshot TA pour ces copies. Figement de la banque actuelle ne prouverait pas ce qui fut vu au début et ne couvrirait pas une saisie encore présente seulement dans un navigateur.

Activer le prototype ne suffit pas : les anciennes copies restent legacy et continuent de lire la banque commune. Il faut une provenance intégrale démontrée et une transition protégeant aussi les onglets déjà ouverts avant d’ajouter47/48/49. Aucun passage ancien n’a été converti, réinitialisé ou renoté. Les six45/46/51/52/53/54 restent en attente de validation, sans clés inventées.

Q73 : non masquée. La même liste est utilisée pour affichage, dénominateurs et correction ; enlever une question de cette liste ne garantit pas l’absence d’impact. Les quatre snapshots nationaux restent inchangés.

## Tests réellement exécutés
| Contrôle | Résultat |
|---|---|
| Prototype TA SQL sur deux identités fictives locales UUID suffixes28/29, aucune identité Cloud | PASS : ancienne réponse inchangée, absence de snapshot rétroactif, réponse supplémentaire possible, national84 exact ordre/énoncés/choix, Q73 absente, réouverture après changement canonique inchangée, local40, refus699/702 et propriétaire inconnu |
| Éditeur QuestionEditor réel compilé et monté sur copie fictive Q68 | 2 PASS : ouverture+attente+Enregistrer sans saisie ⇒ zéro écriture ; saisie réelle ⇒ A seule et ID68 |
| Intentions admin | 9 PASS, dontQ67 éditée ne crée aucune commandeQ68 |
| Accusés éditeur | 18 PASS |
| Comparaisons/combinaisons nationales-locales sur fixture | 132 PASS |
| Protection T3P hors scope | 3 PASS |
| Ordre/contenus de toutes formations | 90 PASS,1 FAIL : empreinte `connaissances-ville-quiz-data.ts` différente du baseline07/10 ; fichier non modifié dans ce travail, test/baseline non altérés |
| Écran admin Q68, ouverture avec réseau protégé | PASS après rétablissement : A seule, zéro tentative de sauvegarde |
| Soumission complète TAXI/TA avec compte technique hébergé | NON PROUVÉ ; aucun compte élève Cloud utilisé ni créé |

Le prototype SQL vérifie contenu et conservation, pas une soumission applicative complète. Les132 tests vérifient les combinaisons de clés avec le correcteur extrait du code, pas la réception d’une note Cloud.

## Intégrité et disponibilité
214 snapshots : empreinte avant/après `7150dc306fb6b6dafcf9b4db188cde3a`, inchangée. Les réponses des élèves peuvent évoluer naturellement pendant l’audit ; aucune écriture d’intervention sur réponses/notes/tentatives/signatures. Les banques gardent84 nationale/40 locale, aucun ajout ni doublon.

La correction d’éditeur est en aperçu seulement ; Q68 rétablie dans la banque Cloud. Aucune migration appliquée dans ce travail, prototypeTA non activé ; aucune publication, mail, SMS ou IA élève. Build final vérifié dans les journaux.

## Blocages précis
1. Protection rétroactive TA : contenu original non enregistré ; besoin de preuve issue de sauvegardes/journaux et protection des onglets/brouillons sans réinitialisation.
2. Ajouts47/48/49 attendent cette protection, même s’ils sont vérifiés.
3. Réécriture concurrente Q68 : origine non prouvée, ne pas confondre avec le défaut d’intention réparé.
4. Q73 reste historique ; masquage sans effet sur tous les calculs non démontré.
5. Bout-en-bout hébergé et écart baseline connaissances-ville non résolus dans ce périmètre.