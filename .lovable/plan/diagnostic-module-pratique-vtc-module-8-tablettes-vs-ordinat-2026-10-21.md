# Diagnostic module « PRATIQUE VTC » (module 8) — tablettes vs ordinateur

## Ce qui est déjà prouvé (lecture seule, 21/10)

- Aucun service worker / PWA dans l'application (aucune inscription trouvée) : ce n'est pas un vieux cache d'application installée.
- Il existe **deux versions du contenu du module 8** :
  - **Version enregistrée par l'éditeur admin** (modifiée le **20/10/2026 à 08:20 UTC**) : ~7 cours actifs, dont « Questions Examen pratique (à apprendre) » et un « Nouveau cours » vide ; exercices dont un « Nouvel exercice » de test (1 question « Choix A/B/C ») et l'ex-quiz 200 renommé « Bilan T3P — Partie 1 + Partie 2 ».
  - **Version d'origine dans le code** (empreinte v12) : 10 cours, 3 quiz (200 Épreuve, 201 Devis, 202 Monuments).
- Capture B (tablette : 10 cours, 3 quiz, parties 10/11/12) correspond **exactement à la version d'origine du code**, pas à la version enregistrée. Capture A (aperçu Lovable : 7 cours, 1 quiz, grille du 20/10) correspond à la version enregistrée le 20/10.
- Conclusion provisoire : ce n'est pas « l'ancienne version de la tablette » ; c'est l'écran qui retombe sur le contenu du code quand la version enregistrée n'est pas lue ou n'est pas appliquée. Reste à prouver pourquoi sur ce compte précis.

## Ce qui n'est pas encore prouvé

- Même élève, même module, même adresse (aperçu vs gestion.ftransport.fr) pour A et B.
- Pourquoi la tablette n'a pas appliqué la version enregistrée (échec de lecture, filtre « actif », ancien fichier chargé, règle de fusion).
- Origine exacte du 125 % (hypothèse : terminés comptés sur une liste et total sur l'autre, par ex. activités validées dans la version code divisées par les 7 cours de la version enregistrée).
- Qui a créé le « Nouvel exercice » / « Nouveau cours » vides le 20/10 et s'ils sont voulus.

## Étapes de diagnostic (lecture seule)

1. Identifier l'élève des captures (nom à demander si absent) ; lire ses connexions du 20–21/10 (appareil, adresse, version chargée) et ses activités/complétions module 8.
2. Lire le journal d'édition du module 8 (`module_admin_audit_log`, historique) pour dater les ajouts du 20/10 et savoir si la version d'origine a été voulue remplacée.
3. Tracer dans le code la fusion « version enregistrée + version du code » (hydratation, `deleted_cours/deleted_exercices`, champ `actif`) et le repli en cas d'erreur de lecture : vérifier si un échec réseau affiche silencieusement la version du code.
4. Reproduire sur la production avec Playwright, compte élève VTC, écran tablette (800×1280) et ordinateur : comparer listes cours/quiz et pourcentage.
5. Recalculer le 125 % à partir des vraies données et pointer la ligne fautive.
6. Comparer avec le module 6 (PRATIQUE TAXI) qui, lui, n'a pas été modifié depuis juillet.

## Correctifs probables à proposer ensuite (après votre accord, rien dans ce tour)

- Une seule source de contenu par module : la version serveur ; si elle n'est pas lisible, afficher « contenu indisponible, réessayer » au lieu du contenu du code.
- Afficher sur l'écran élève une empreinte/version du module pour comparer deux appareils.
- Pourcentage borné et calculé sur la même liste (terminés ⊂ total), test dédié « jamais > 100 % ».
- Vous laisser décider du sort des « Nouvel exercice » / « Nouveau cours » vides (aucune suppression automatique).
- Ne jamais vider les sauvegardes locales ; aucune question, réponse, progression ni signature modifiée.

## Question pour vous

Quelle est la version voulue du module PRATIQUE VTC : celle modifiée le 20/10 (7 cours) ou celle d'origine (10 cours, 3 quiz) ? Et quel élève figure sur la capture tablette ?
