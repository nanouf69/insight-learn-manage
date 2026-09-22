# Migration du nouveau système de notation / examens blancs — état réel et suite

Diagnostic 100 % lecture seule. Aucune donnée modifiée. Better Stack et les 12 resynchronisations EB3 sont hors périmètre.

## 1. Ce qui est DÉJÀ ACTIF sur les examens blancs actuels

- Le nouveau circuit est **activé pour tous les apprenants réels** depuis le 22/09 17:33 (drapeau `passage_v2_apprenants_reels`) et pour les comptes TEST (17:25).
- Concrètement, chaque **nouveau** passage de matière crée aujourd'hui :
  - une tentative avec sujet figé (1 360 tentatives, dont 3 de test),
  - les réponses en ajout seul (19 480 réponses),
  - les QRC identifiées une à une (3 358),
  - un résultat serveur (1 360 ; 1 323 définitifs publiés, 37 provisoires en attente de correction).
- Les garanties demandées sont déjà en place côté serveur : identité unique par apprenant + examen + matière + passage + question, réponse jamais écrasée par une plus ancienne, finalisation unique et rejouable, QRC vide = 0 sans blocage, QCM recalculés depuis les réponses réellement enregistrées, points des QRC déjà corrigées repris tels quels, publication bloquée tant qu'une QRC répondue n'est pas traitée.
- L'écran de correction réel `/admin/correction-qrc-v2` lit ce nouveau circuit.

## 2. Ce qui n'existe que dans le nouveau système / en test

- Écran maquette `/admin/correction-qrc-v2-maquette` et pages pilotes (`/pilote-apprenant-test`, `/pilote-correction-test`) : test uniquement.
- Contenus d'examens en version officielle publiée : **2 sur 24** seulement (EB2 VTC et EB2 VA). Les 22 autres restent en brouillon.
- Le moteur QRC « nouvelle génération » n'est déclaré que pour EB2 et l'examen de test.

## 3. Ce qui reste à migrer

- **2 726 passages de matière historiques** encore uniquement dans l'ancien circuit (sur 4 625 au total ; 1 357 déjà recopiés le 22/09 sans perte). Répartition : EB1 864, EB2 455, EB3 256, EB5 244, EB6 218, EB4 205, puis TAXI/TA/VA.
- **22 contenus d'examen** à publier en version officielle (dont EB1, EB3 à EB6 et toutes les filières TAXI / TA / VA).
- **3 266 QRC vertes** issues de corrections automatiques historiques, contre seulement 13 corrections humaines tracées. Décision toujours en attente : les distinguer visuellement (vert = humain, orange = automatique) ou les laisser telles quelles.
- L'ancien circuit reste la référence affichée dans plusieurs écrans CRM (résultats apprenant, correction QCM).

## 4. Différences anciens EB / nouveaux EB

| | Anciens EB | Nouveaux EB |
|---|---|---|
| Passage | une ligne de résultat par matière, sans identité de tentative | tentative identifiée, sujet figé au démarrage |
| Réponses | état final écrasable | ajout seul, numéro de révision |
| QRC | rapprochées par texte/date | identifiant définitif par question et par passage |
| Note | calculée à l'écran | calculée par le serveur, seule source |
| Corrections | souvent automatiques | humaines tracées (qui, quand) |

## 5. Comment migrer sans rien perdre ni recalculer de travers

Règles de la copie (déjà éprouvées sur les 1 357 passages) :
- copie **additive et idempotente** : rien n'est supprimé, rien n'est réinitialisé, relancer la copie ne crée pas de doublon ;
- uniquement les matières **déjà finalisées** dans l'ancien circuit ; une matière en cours n'est jamais touchée ;
- la note historique est **reprise telle quelle**, jamais recalculée ; les QRC déjà corrigées gardent leurs points exacts ;
- le sujet est figé à partir du contenu réellement servi à l'élève, conservé dans la copie ;
- l'ancien circuit reste intact et consultable en parallèle ;
- toute divergence (barème manquant, question absente) **bloque** la ligne concernée au lieu de deviner.

Point bloquant connu : la copie 0058 n'a jamais rien copié parce que son journal d'audit écrit dans une colonne inexistante. C'est ce défaut qu'il faut corriger en premier.

## 6. Prochaine étape exacte à exécuter

**Voici la prochaine étape exacte à exécuter pour terminer la migration : réparer le journal d'audit de la copie historique (colonne d'auteur inexistante), puis relancer la copie EN MODE SIMULATION sur EB1 uniquement — comptage avant/après, aucune écriture — et vous présenter le résultat chiffré avant toute copie réelle.**

Séquence proposée ensuite, une étape à la fois, avec accord à chaque palier :
1. correction du journal d'audit + simulation EB1 (aucune écriture) ;
2. copie réelle EB1 sur un échantillon de 5 apprenants, contrôle avant/après ;
3. copie réelle du reste d'EB1, puis EB2, EB4, EB5, EB6, puis TAXI/TA/VA — EB3 en dernier et seulement après sécurisation des 12 resynchronisations ;
4. publication des 22 contenus d'examen en version officielle ;
5. bascule des écrans CRM sur la note serveur unique ;
6. décision sur l'affichage vert humain / orange automatique.

Aucune suppression, aucune réinitialisation, aucune migration irréversible ne sera lancée sans votre accord explicite à chaque étape.
