# Publication autorisée et cohérence des Bilans — 29/10/2026, 19:24 UTC

## Mise en ligne effective
- Publication en bloc explicitement autorisée et demandée à 19:25 UTC : version courante, incluant protection stricte des snapshots, Bilan exercices TAXI complet, quiz fériés, EDOF, calendrier devis et quiz externes déjà présents.
- Avant : `/assets/index-CAJXubK1.js`. Après : `/assets/index-tGd3fqJR.js`, HTTP 200, SHA256 `cf64d6f70284d2a0db765f219866befef77a68da40ed972ed42fd18d7448a293`.
- La substitution stricte depuis le snapshot a aussi été retrouvée dans le JavaScript réellement publié : `return nt?{...Sn,questions:nt.questions}:Sn`.
- Navigateur public : `https://gestion.ftransport.fr/login`, écran Connexion visible, aucune erreur JavaScript. Capture conservée sous `/tmp/browser/publication-bilans/screenshots/public.png`.
- Cela prouve la nouvelle version servie, pas chaque parcours authentifié, ni une actualisation forcée des onglets élèves déjà ouverts. Aucune réinitialisation ou interruption volontaire de session.
- Aucun changement de code, banque, clé ou version d'examen blanc dans cette intervention ; la publication capture la version courante autorisée, elle n'est pas une nouvelle publication de contenu EB.

## Vérifications de cohérence 5/11 : lecture seule
Le serveur actuel fige les futurs 500–504/600–604 depuis le JSON. La liste admin TAXI provient des lignes canoniques. Les exceptions canoniques serveur concernent 605/606, pas les cinq matières communes.

| Correction candidate | État constaté | Décision |
|---|---|---|
| T3P Q104, TAXI 600 | JSON complet, B Racolage ; canonique tronqué, C Racolage | Suspendue : 4 copies sans snapshot ni archive, dont 1 en cours. La correction canonique changerait leurs choix/clé visibles. |
| Gestion Q48 VTC 501 | A « Un travailleur  salarié » ; TAXI JSON/canonique simple espace | Suspendue : 18 copies VTC sans snapshot/archive, dont 8 en cours ; pas de modification rétroactive du texte. |
| Gestion Q53 | C Arrêt maladie confirmé ; aucune explication canonique | Rien à corriger sur la clé ; aucune explication inventée. |
| Gestion Q206 TAXI 601 | JSON présent, B 52.87 %, canonique absent, non désactivé | Suspendue : ajouter la ligne changerait la liste canonique 197→198 de 3 copies sans snapshot/archive, dont 1 en cours. |
| Sécurité Q73 TAXI 602 | JSON « Bande d'arrêt d'urgence », canonique « BAU », A Vrai | Suspendue : 5 copies sans snapshot, dont 4 en cours ; les archives protègent des clés/réponses, pas l'intégralité du texte historique. |

La protection publiée est effective pour les passages disposant d'un snapshot complet. Elle ne transforme pas les copies héritées sans snapshot en copies figées et n'autorise aucune reconstruction de leur contenu initial.

Les autres divergences, questions spécifiques, 42 Sécurité et 73 T3P restent inchangées. Les cours 2/10 sont préservés. Aucune écriture pédagogique, apprenant, réponse, note, signature, passage ou snapshot n'a été exécutée dans cette intervention.

## Tests et limites
- PASS : 20 tests protection/projection avant publication (3 fichiers).
- PASS : 27 tests sauvegarde/intention/lecture/reprise historiques ; FAIL : 1 ancien test de chaîne source attend une ancienne signature de callback (9 tests de ce fichier, 8 passent). Aucun correctif du code partagé effectué pour masquer cet échec.
- PASS : 12 assertions PostgreSQL jetable du contrat futur national/local, conservation intégrale à la réouverture après changement canonique, ordre/champs/identités, refus banque vide, absence de bascule TA. Ce test n'est pas une preuve du circuit cinq matières.
- PASS : 11 tests après publication (4 fichiers), dont 2 nouveaux diagnostics exécutant la véritable fonction d'hydratation sur copies fictives ; changement C→B sans snapshot et expansion Gestion 197→198 reproduits. Les deux tests ne valident pas ces mutations en production : ils prouvent pourquoi elles sont arrêtées.
- NON PROUVÉ : parcours hébergé sous compte technique admin → sauvegarde → nouveau passage → soumission/recharge des cinq matières. Aucun compte réel utilisé, aucune écriture d'essai dans la base partagée.
- Contrôle serveur : 216 snapshots lus (166 VTC, 50 TAXI). Aucune écriture dans ces tables ; changements dus à l'activité réelle des élèves ne seraient pas attribuables à cette intervention.
- Sécurité avant publication : trois alertes critiques de lecture de paramètres signalées ; publication acceptée par l'outil. Aucune permission modifiée ni alerte masquée.

## Blocage précis et suite sûre
Avant toute correction concernée, protéger séparément les copies héritées sans snapshot avec preuve de leur contenu initial, ou différer leur exposition à la version corrigée sans changer leur liste/clé/texte. Une reconstruction depuis le contenu actuel ne constitue pas une preuve historique. Ce chantier n'est pas appliqué silencieusement.
Dans cette intervention, seuls des tests et ce rapport ont été ajoutés après publication ; aucune nouvelle correction applicative n'est en attente de mise en ligne.