# T3P — quatre déplacements locaux : contrôle du 19/11/2026

## Décision

Aucun déplacement appliqué. Aucun code applicatif, donnée Cloud, support, réglage, quiz séparé, bilan, examen, réponse, score, progression ou jalon modifié. Aucun envoi, déploiement ou publication.

La restriction « Cours et exercices seulement » a été examinée aussi pour une projection locale : le chemin actuel ne sépare pas la partie affichée de l'exercice de persistance et de remise. Un simple transfert dans une liste affichée ne garantit donc pas les copies et obligations inchangées. Ce constat ne signifie pas qu'une nouvelle présentation isolée est impossible.

## Questions vérifiées en lecture seule

Identités techniques en base, et non numéros de position à l'écran :

| Question | Source | Destination demandée | Résultat |
|---|---|---|---|
| Organisme service occasionnel | Exercice 2, Q73 | P1 | Non déplacée |
| Un seul passager en transport collectif | Exercice 2, Q74 | P1 | Non déplacée |
| Apposition carte professionnelle | Exercice 2, Q76 | P1 | Non déplacée |
| Conduite sans assurance | Exercice 1, Q59 | P2 | Non déplacée |

Ces quatre énoncés et empreintes sont identiques dans les modules 2/VTC et 10/TAXI. Leur confirmation pédagogique par les PPT actuels est celle de l'audit précédent ; aucun nouveau contrôle des diapositives n'a été exécuté ici. Q72 et Q75 restent inchangées ; Q75 était déjà exclue de la vue active, son exclusion n'est pas changée. Aucun doublon n'est retiré.

**Conflit concret :** P2 possède déjà Q59 « Les fonctions au sein du Comité national T3P sont exercées à quel titre ? ». Garder seulement l'ID numérique 59 après transfert de P1 ferait entrer deux contenus différents sous la clé `2-59`. Il faut conserver l'identité composée d'origine, et non renuméroter ou écraser cette entrée.

## Dépendances bloquantes du chemin actuel

1. `ModuleDetailView.tsx:3247–3301` : le bouton de déplacement copie vers l'exercice cible, crée un nouvel ID et enlève `uid`/`question_id`. Il appelle `save_module_editor_state` ; il ne s'agit pas d'une réaffectation locale de présentation.
2. Le déclencheur actif `trg_propagate_shared_exercices` appelle `propagate_shared_exercices`. Sa définition a été relue en base : un changement de composition est propagé aux exercices partagés. Les modules 13, 25, 32 et 39 contiennent aussi les exercices concernés. `trg_module_editor_state_sync_bilans` est également installé. Aucune désactivation ni contournement de ces protections n'est autorisé ou effectué.
3. `ModuleDetailView.tsx:7054–7066` : la même collection `activeExercices` sert aux questions requises et au total envoyé au serveur. `7214–7221` et `courseQuizOrder.ts:33–50` regroupent des exercices entiers, pas des questions avec une identité d'origine indépendante.
4. `ModuleDetailView.tsx:9300–9304, 9378–9380` : réponses et interactions sont indexées par `${exo.id}-${q.id}`. `7010–7013, 8062–8069` : enregistrement sous `module_X_exo_Y` ou sa révision. `9563–9570, 9659–9666` : la remise est filtrée et validée par exercice. Réaffecter seulement les questions changerait donc les clés ou la frontière de remise ; conserver leurs clés d'origine sans adapter la remise laisserait des réponses hors du lot soumis.

## Option technique sûre à préparer séparément

Séparer explicitement **partie affichée** et **identité originale module/exercice/question** dans une présentation réservée aux écrans Cours et exercices TAXI/VTC. Elle doit consommer les sources sans les réécrire, garder les collections originales pour persistance/remise, historique, scores et jalons, conserver les références d'origine y compris les deux Q59, et ne jamais être exportée vers les Bilans ou l'éditeur partagé.

Cette présentation exige des contrôles de reprise et de remise pour les deux exercices originaux, ainsi qu'un parcours signé sur PC/mobile ; aucun adaptateur existant ne fournit actuellement cette garantie. Elle n'a pas été créée ni activée dans cette intervention. Le changement visuel ne doit pas être présenté comme un transfert des anciennes copies.

## Avant / après réel

| Parcours | P1 avant | P1 après | P2 avant | P2 après | Déplacements |
|---|---:|---:|---:|---:|---:|
| VTC module 2 | 53 | 53 | 69 | 69 | 0 |
| TAXI module 10 | 53 | 53 | 69 | 69 | 0 |

Comptes après exclusions existantes. VTC P2 contient 80 objets bruts dont 11 exclus ; TAXI P2 contient 69 objets bruts actifs. Les comptes 56/67 seraient la cible d'une présentation réaffectée, pas l'état actuel.

349 lignes de copies originales concernées : 155/151 pour les exercices VTC 1/2, 22/21 pour TAXI 1/2. 168 contiennent une clé P1 Q59 et 155 au moins une clé cible P2 ; présence d'une clé ne signifie pas réponse complète, remise ou réussite. Aucun contenu individuel ni nom exporté.

Empreinte agrégée des 349 lignes, avant et après : `0147d6218303748dd45b5d908777eeae`.

| Module | Empreinte avant = après |
|---|---|
| 2 | `0e2a131d7cccd0dab4a601058b873627` |
| 10 | `537c2a7ec9498ac310088cfee0b6bc81` |
| 13 | `f33470402654a649b24019a6e55886d8` |
| 25 | `c1c6e194c517d0d889f2fd33474dd725` |
| 32 | `671798ac966dbede2c996d2575644869` |
| 39 | `9bb09e8c8bedb0c34943d504d12c2451` |

Relevé logique brut non nominatif : `docs/audits-t3p/2026-11-19-1550-exercices-2-10-lecture-seule.txt`, résultat de lecture des exercices originaux, conservé sans transformation. Ce relevé n'est pas une restauration indépendante de la base.

État de l'interface : non modifiée ; pas de parcours interactif exécuté puisqu'aucun déplacement n'a été appliqué. Dernier signal disponible de l'aperçu : build OK. Contrôle source et relecture Cloud exécutés, aucun test de nouvelle fonctionnalité annoncé.