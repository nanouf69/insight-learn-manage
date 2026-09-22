# Migration du nouveau système de notation / examens blancs — état réel et suite

Diagnostic 100 % lecture seule. Aucune donnée modifiée. Better Stack et les 12 resynchronisations EB3 restent hors périmètre.

## 1. Ce qui est réellement actif aujourd'hui sur les examens blancs

- **Les élèves passent toujours leurs examens blancs sur l'ancien circuit.** Le nouveau circuit est autorisé depuis le 22/09 17:33, mais aucun passage réel n'y est encore créé : sur 1 360 passages présents dans le nouveau système, 1 357 sont des copies de l'historique et 3 sont des passages d'un examen de test.
- Raison précise : un passage ne peut démarrer dans le nouveau système que si le sujet de l'examen y a été **publié en version officielle**. Or seuls 2 sujets sur 24 le sont (EB2 VTC et EB2 VA). Pour tous les autres examens, le démarrage est refusé et l'élève continue, sans s'en apercevoir, sur l'ancien circuit. C'est le vrai point bloquant de la migration.
- La correction QRC nouvelle génération n'est déclarée que pour EB2 et l'examen de test.

## 2. Ce qui existe déjà et fonctionne dans le nouveau système

- Copie de l'historique réussie : **1 357 passages** recopiés, avec 19 480 réponses, 3 358 QRC et 1 360 résultats (1 323 définitifs publiés, 37 provisoires bloqués car une QRC répondue attend encore une correction). Aucune perte, aucun doublon, aucun orphelin (vérifié).
- Les garanties demandées sont en place côté serveur : identité unique par apprenant + examen + matière + passage + question ; réponses en ajout seul, une plus ancienne ne peut pas écraser une plus récente ; finalisation unique et rejouable (double-clic, F5, requête répétée sans effet) ; QRC vide = 0 sans bloquer ; QCM recalculés depuis les réponses réellement enregistrées ; points des QRC déjà corrigées repris à l'identique ; sujet figé au démarrage ; publication du résultat interdite tant qu'une QRC répondue n'est pas traitée ; nouveau passage sans effet sur l'ancien.
- Écran de correction réel branché sur ce circuit : `/admin/correction-qrc-v2`. Écrans pilotes et maquette : hors production.

## 3. Ce qui reste à migrer

1. **22 sujets d'examen sur 24** à publier en version officielle (EB1, EB3 à EB6 et toutes les filières TAXI / TA / VA). Sans cela, aucun élève ne bascule.
2. **2 726 passages historiques** encore uniquement dans l'ancien circuit (sur 4 625) : EB1 864, EB2 455, EB3 256, EB5 244, EB6 218, EB4 205, puis TAXI/TA/VA.
3. **3 266 QRC vertes** issues de corrections automatiques historiques, contre 13 corrections humaines tracées : décision toujours en attente sur l'affichage (vert = humain, orange = automatique).
4. Écrans CRM (résultats apprenant, correction QCM/QRC) encore alimentés par l'ancien circuit.
5. Défaut connu dans l'outil de copie : son journal d'audit écrit dans une colonne inexistante. La copie des 1 357 passages a été faite malgré cela, mais toute relance échouera tant que ce n'est pas corrigé.

## 4. Différences anciens EB / nouveaux EB

| | Anciens EB | Nouveaux EB |
|---|---|---|
| Passage | reconstitué après coup (matière + numéro de tentative + fenêtre de temps) | identifiant de passage créé dès le départ |
| Réponses | état final écrasable | ajout seul, numéro de révision |
| QRC | rapprochées par texte / date | identifiant définitif par question et par passage |
| Note | calculée dans le navigateur | calculée par le serveur, source unique |
| Corrections | majoritairement automatiques | humaines, tracées (qui, quand) |

## 5. Comment migrer sans rien perdre ni recalculer de travers

- Copie **additive et idempotente** : rien n'est supprimé ni réinitialisé, relancer ne crée pas de doublon.
- Seules les matières **déjà finalisées** sont copiées ; une matière en cours n'est jamais touchée.
- La note historique est **reprise telle quelle**, jamais recalculée ; les points des QRC corrigées sont conservés exactement.
- Le sujet est figé à partir du contenu réellement servi à l'élève et conservé dans la copie.
- L'ancien circuit reste intact et consultable en parallèle pendant toute la migration.
- Toute divergence (barème manquant, question absente) **bloque** la ligne concernée au lieu de deviner.
- La publication d'un sujet ne modifie aucun passage déjà commencé : les passages en cours gardent leur sujet figé.

## 6. Prochaine étape exacte

**Voici la prochaine étape exacte à exécuter pour terminer la migration : réparer le journal d'audit de l'outil de copie (colonne d'auteur inexistante), puis publier en version officielle le sujet d'un seul examen — EB1 VTC — en simulation d'abord (comparaison sujet publié / sujet réellement servi, aucune écriture), et vous présenter le résultat chiffré avant toute publication réelle.**

Séquence proposée ensuite, une étape à la fois, avec votre accord à chaque palier :
1. réparation du journal d'audit + simulation de publication EB1 VTC ;
2. publication réelle EB1 VTC, puis premier passage réel observé sur le nouveau circuit avec contrôle avant/après ;
3. publication progressive des autres sujets — EB3 en dernier, après sécurisation des 12 resynchronisations ;
4. copie des 2 726 passages historiques restants, examen par examen, avec comptage avant/après ;
5. bascule des écrans CRM sur la note serveur unique ;
6. décision sur l'affichage vert humain / orange automatique.

Aucune suppression, aucune réinitialisation, aucune migration irréversible ne sera lancée sans votre accord explicite à chaque étape.
