# QCM TAXI — Bilan examen national — 29 octobre 2026

## Périmètre confirmé
TAXI > Bilan examen > Réglementation nationale : **module 11, exercice 605**, quiz canonique `bilan-examen-taxi`, section605. Pas le Bilan exercices module9/203.

La transcription fournie dans le message est la référence ; le fichier DOCX nommé n'est pas présent dans les uploads accessibles. Aucune conversion des QRC6/8/9/15.

## Comparaison et décisions
| N° document | Décision | Référence existante / clé à conserver |
|---|---|---|
| 1 | Manquant | A |
| 2 | Ne pas dupliquer | 605/40, UUID 955cfdd0 à ne pas déduire : voir la copie exacte de contrôle ; énoncé équivalent sur avis d'imposition, clé C. 605/1 traite également la preuve d'exploitation avec plusieurs moyens. |
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