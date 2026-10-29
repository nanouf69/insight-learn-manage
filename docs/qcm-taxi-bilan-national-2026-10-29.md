# QCM TAXI — Bilan examen national — 29 octobre 2026

## Périmètre confirmé
TAXI > Bilan examen > Réglementation nationale : **module 11, exercice 605**, quiz canonique `bilan-examen-taxi`, section605. Pas le Bilan exercices module9/203.

La transcription fournie dans le message est la référence ; le fichier DOCX nommé n'est pas présent dans les uploads accessibles. Aucune conversion des QRC6/8/9/15.

## Comparaison et décisions
| N° document | Décision | Référence existante / clé à conserver |
|---|---|---|
| 1 | Manquant | A |
| 2 | Ne pas dupliquer | 605/40, énoncé équivalent sur avis d'imposition, clé C. 605/1 traite également la preuve d'exploitation avec plusieurs moyens. |
| 3 | Manquant | B+C |
| 4 | Suspendu, aucun ajout obsolète | 605/18 existe déjà, réponse B « À la DGFIP, avant il s'agissait de la douane ». Aucune actualisation juridique ni modification de cette question effectuée. |
| 5 | Manquant | C+D |
| 7 | Manquant | A ; question605/27 sur la sanction en l'absence d'imprimante n'est pas un doublon de l'obligation de connexion. |
| 10 | Manquant | C ; 605/60 et63 évoquent le décès/la dérogation mais pas le délai d'un an des ayants droit. |
| 11 | Manquant | B+D ; 605/32 vise uniquement une ADS achetée, pas les deux cas de cession gratuite/antérieure. |
| 12 | Ne pas dupliquer | 605/65, même question d'équipements obligatoires, TPE correct en position C dans l'existant (D dans le document). Aucune lettre existante changée. |
| 13 | Manquant | A ; la question605/10 de mise en circulation du véhicule de remplacement n'a ni le même acte ni la même correction. |
| 14 | Manquant | B ; les autres questions sur lumineux concernent lettres/couleurs de tarifs, pas l'obligation de vert disponible. |
| 16 | Manquant | B ; cas d'ADS onéreuse datée, absent de la liste actuelle. |

**9 QCM manquants**, **2 équivalents conservés**, **Q4 suspendue**. Le rapprochement des doublons est une comparaison de sens, pas une preuve de texte identique. Les onze QCM horsQ4 ont été transcrits dans un fichier temporaire de préparation ; aucun ajout dans l'application.

## Blocage d'isolation prouvé
Les lectures Cloud renvoient deux bindings pour la même section605 :
- module11 / exercice605, TAXI ;
- module28 / exercice700, TA.

Un ajout dans cette section canonique apparaîtrait aussi chez TA, même sans modification de la ligne JSON du module28. Un ajout au seul JSON11 serait ensuite remplacé par l'hydratation canonique : il ne constituerait pas une intégration fiable.

L'exercice partagé par trigger JSON n'existe qu'au module11 sous sa clé605 ; cela ne résout pas le **partage canonique d'affichage** avec TA. Aucun contournement de ce partage, aucun changement de binding, aucune copie massive de questions ni code de filtrage nouveau effectués.

Pour continuer en respectant « TAXI uniquement », il faut autoriser une séparation ciblée du contenu national TAXI/TA. Cette décision structurelle n'est pas implicitement incluse dans l'import : elle change la source commune existante et doit être validée avant toute écriture. Sinon un accord explicite d'ajout commun TAXI+TA est nécessaire.

## Contrôles exécutés
- PASS : transcription de onzeQCM horsQ4, 3/4 choix, clés valides ; QRC6/8/9/15 et Q4 absentes du lot préparé.
- PASS : Q3=B+C, Q5=C+D, Q11=B+D.
- PASS : relecture canonique active605/40=C, 605/65=C (TPE), 605/18=B (DGFiP).
- Liste JSON nationale :76 questions stockées. Canonique :69 lignes dont68 actives, une inactive ; aucun ancien numéro réutilisé.
- Empreinte JSON module11 avant toute opération : `a7f3e1a441246b35be200f3fda2b27a1`, updated_at25/10/2026 09:31:32.763372 UTC.
- NON PROUVÉ : tests d'ajout élève/admin et nouvelle soumission, puisque aucun ajout n'a été effectué. Pas de test d'écriture sur apprenant réel.

## Résultat
**0 ajout**, **0 modification de question/code applicatif**, **0 suppression**, **0 donnée élève touchée**, **aucune publication**. Seuls la feuille de route et ce rapport de diagnostic ont été écrits. Blocage : partage TAXI/TA incompatible avec le périmètre imposé ; Q4 demeure suspendue faute de validation juridique indépendante.

## Accord et ajout effectif — 29/10/2026, après 10:56 UTC

L'utilisateur a explicitement autorisé l'ajout commun TAXI + TA, sans séparation. Le blocage précédent est levé ; le diagnostic ci-dessus reste conservé comme historique.

Ajout exclusivement dans `public.quiz_questions`, quiz `bilan-examen-taxi`, section605. Une seule opération d'insertion, conditionnée à l'empreinte complète précédente et à l'absence d'identifiant/énoncé existant. Aucun UPDATE de question, aucune suppression, aucun changement de binding, de JSON de module, de règle de validation ou de code applicatif. Le trigger existant a seulement actualisé la date du jeu de questions.

| N° document | ID permanent numérique | UUID | Position enregistrée | N° affiché actuel | Correction |
|---|---:|---|---:|---:|---|
| 1 | 89 | 1e49c049-f734-4a21-880c-26c7490808be | 70 | 69 | A |
| 3 | 90 | 9becec9c-159e-486b-8f91-3c725f6e457a | 71 | 70 | B+C |
| 5 | 91 | f28610b7-d25e-49c3-ad8f-3e252ea03e0d | 72 | 71 | C+D |
| 7 | 92 | f737eed0-f8da-4825-8361-13b0f6ba7358 | 73 | 72 | A |
| 10 | 93 | fb685316-6e8e-4c50-a664-f42398dc677e | 74 | 73 | C |
| 11 | 94 | 19203158-1a93-4c24-bf22-db1794559f59 | 75 | 74 | B+D |
| 13 | 95 | c624ef13-c70a-40f1-a60c-0fa7f733f04c | 76 | 75 | A |
| 14 | 96 | 16a3feae-f35d-40e9-912f-300165d08b0a | 77 | 76 | B |
| 16 | 97 | 08b6fad0-c6e6-4b85-be4e-acb1f3a45da0 | 78 | 77 | B |

Les numéros affichés sont calculés sur les lignes actives : aucune renumérotation des identifiants ni positions existantes. Les nouveaux IDs commencent à89 pour ne réutiliser aucun ID canonique ou JSON de TAXI/TA (maximum constaté88). Énoncés et choix exactement transcrits depuis le message utilisateur, sans ajout d'explication inventée.

### Conservation prouvée avant/après
- 2 301 lignes `quiz_questions` préexistantes relues et comparées individuellement : toutes strictement identiques ; exactement9 nouvelles lignes. Section605 :69→78 lignes,68→77 actives, inactive conservée.
- Empreinte de toutes les questions préexistantes : `e451a45a3c0153324dbac061d9caf4d4`, identique après exclusion des9 ajouts.
- Autres questions/sections : `5b6c1c30a6e2bfc1fb6d7bdfa35ce708`, identique.
- 62 lignes `module_editor_state` identiques intégralement ; empreinte `408bf4bc3ec23ea21f12f4e59fa2cf02` inchangée, y compris11 et28.
- 64 bindings identiques intégralement ; empreinte `8fdf5ed8c96c85ffbc89d58f7e81ff32` inchangée. Section605 reste accessible uniquement via11/605 et28/700.
- Q2 existante605/40 et Q12 existante605/65 inchangées, aucun doublon ajouté. Q4 existante605/18 avec DGFiP inchangée ; aucune ancienne réponse Douanes ajoutée, pas de nouvelle certification juridique. QRC6/8/9/15 absentes du lot.
- Aucune commande visant les réponses, notes, tentatives, snapshots ou jalons élèves. Aucun envoi mail/SMS/IA, aucun recalcul ni soumission Cloud de test.

### Tests exécutés
- PASS :29 tests,3 fichiers (`qcm-taxi-ta-national-20261029`, `canonical-question-deletion-persistence`, `admin-question-save-intent`). Les12 nouveaux tests vérifient les9 clés avec toutes les combinaisons de choix (réponses partielles/supplémentaires refusées), la sélection exacte du lot et l'hydratation605/700. Le test utilise la fonction réelle de correction du composant, sans créer un autre barème.
- PASS : navigateur, composants réels et copie isolée des lectures Cloud après insertion, TAXI11/605 puis TA28/700 :77 questions nationales affichées ; clics réels, correction locale des9 ajouts, bonnes options en vert dont B+C/C+D/B+D ; présence après rechargement ;9 IDs visibles dans l'éditeur Admin des deux parcours. Zéro erreur de page et zéro requête d'écriture. Captures `/tmp/browser/qcm-taxi-ta/{learner-11,learner-28,admin-11,admin-28}.png`.
- Les premiers essais du script ont échoué à cause d'une cible numérique au lieu d'une chaîne et de sélections textuelles partielles ; le script corrigé a ensuite entièrement réussi. Aucun changement applicatif pour résoudre ces erreurs de test.
- NON PROUVÉ : soumission finale authentifiée d'un compte élève technique hébergé, réception temps réel sur une page de production déjà ouverte. Les tests navigateur sont des copies isolées et ne sont pas une connexion autonome d'apprenant.
- Dernier signal de compilation observé : build OK ; aucun fichier applicatif modifié par ce lot. Ajout de tests/fixture et mise à jour du présent rapport et de la feuille de route uniquement.

### Disponibilité
Les9 QCM sont enregistrés dans le contenu Cloud commun à l'aperçu et au site publié ; aucun déploiement ni publication de l'application n'a été lancé. Les chargements utilisant la source canonique partagée liront77 questions actives ; l'affichage sur une session de production réelle n'a pas été contrôlé directement. Les copies et résultats historiques n'ont pas été modifiés.