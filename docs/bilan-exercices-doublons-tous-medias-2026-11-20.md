# Bilan exercices TAXI/VTC — doublons tous médias compris

Demande du 20/11/2026 à 13:34 UTC. **Décision : aucun retrait appliqué**, conformément à la condition d’arrêt si une réponse attendue disparaît ou si les dénominateurs changent.

## Périmètre et méthode
- Modules 4/VTC et 9/TAXI uniquement ; matières comparées indépendamment. Aucune modification applicative de ces modules ou d’un autre module.
- Lecture de `module_editor_state` pour 2/4/9/10 avant/après ; projection réelle via `mergeSourceExercices`, `resoudreExercicesSourcesBilan`, `projeterBilanDepuisCours`, avec la référence embarquée pour les identités historiques.
- Comparaison des énoncés exacts, type, propositions ordonnées/lettres/corrigés, réponse QRC et médias ; contre-vérification de tous les autres champs sur les candidats sans image.
- Les deux candidats sans image ne diffèrent que par leur identité/source et date éditoriale ; T3P a aussi une taille d’image `sm` sans image, sans différence illustrée. Leur sens pédagogique est identique. Les quatre couples illustrés restent exclus.
- La projection suit les sources sans appliquer un regroupement des parties de « Cours et exercices » au Bilan ; aucune confusion avec Bilan examen, examens blancs ou quiz autonomes.

## Six couples retrouvés dans chacun des deux parcours

Les IDs sont identiques TAXI/VTC ; les clés de réponse sont exercice-ID de question.

| Matière / exercice Bilan | Numéros affichés | IDs permanents | Sources originales | Médias | Décision |
|---|---|---|---|---|---|
| T3P / 100 | 19 / 41 | 1026 / 1051 | E1-Q26 / E1-Q51 | Image uniquement sur 1026 | Exclus, deux conservées |
| T3P / 100 | 44 / 107 | 1054 / 2068 | E1-Q54 / E2-Q68 | Image uniquement sur 2068 | Exclus, deux conservées |
| T3P / 100 | 46 / 108 | 1056 / 2069 | E1-Q56 / E2-Q69 | Image uniquement sur 2069 | Exclus, deux conservées |
| T3P / 100 | 50 / 115 | **1066 / 2077** | E1-Q66 / E2-Q77 | Aucune image des deux côtés | Identiques mais deux réponses attendues : aucun retrait |
| T3P / 100 | 62 / 121 | 2070 / 2083 | E2-Q70 / E2-Q83 | Image uniquement sur 2083 | Exclus, deux conservées |
| Gestion / 101 | 131 / 142 | **62031 / 62050** | E62-Q31 / E62-Q50 | Aucune image des deux côtés | Identiques mais deux réponses attendues : aucun retrait |

Énoncés des candidats tous médias identiques :
- 1066/2077 : « A quoi sert la formation continue ? »
- 62031/62050 : « Auprès de quel organisme doit s'immatriculer un VTC ou Taxi exploitant individuel ? »

**Identifiants retirés : aucun.** Les quatre variantes illustrées et tous les quasi-doublons restent inchangés.

## Blocage démontré
- `ModuleDetailView.tsx:9499–9525` requiert une réponse pour chaque QCM compté, sous sa propre clé. Répondre à `100-1066` ne renseigne pas `100-2077` ; répondre à `101-62031` ne renseigne pas `101-62050`.
- `:9178–9185` calcule les totaux et réponses justes question par question ; `:9585–9595` utilise toutes les questions pour la progression ; `:9706–9713` transmet le total à la remise.
- Masquer seulement la seconde carte laisse une réponse attendue inaccessible : remise refusée. Retirer la seconde question du tableau entraîne **122→121** ou **146→145**, changeant dénominateurs et score. Copier la première réponse dans la seconde fabriquerait une réponse, interdit.
- `bilanCoursSommeProjection.ts:142–186` conserve une identité par question source, et `:215–229` rétablit les questions serveur lors d’une sauvegarde admin. Une déduplication introduite dans la projection ne suffit donc pas à garantir un comportement cohérent de tous les lecteurs et sauvegardes.
- Une nouvelle architecture d’obligations ou un repli visuel conservant la saisie indépendante n’est pas livré sous couvert de suppression ; aucun changement de règle ni de données nécessaire à cette demande n’a été appliqué.

## Totaux avant → après

| Matière | VTC (4) | TAXI (9) |
|---|---:|---:|
| T3P E100 | 122 → 122 | 122 → 122 |
| Gestion E101 | 146 → 146 | 146 → 146 |
| Sécurité routière E102 | 240 → 240 | 240 → 240 |
| Français E103, désactivé | 103 → 103 | 103 → 103 |
| Anglais E105 | 126 → 126 | 126 → 126 |
| Développement commercial E104 | 66 → 66 | Hors parcours |
| Réglementation spécifique VTC E106 | 34 → 34 | Hors parcours |
| Réglementation nationale TAXI E203 | Hors parcours | 99 → 99 |
| Réglementation locale TAXI E204 | Hors parcours | 105 → 105 |
| **Total composition, Français inclus** | **837 → 837** | **941 → 941** |
| **Total exercices actifs, Français exclu** | **734 → 734** | **838 → 838** |

La Nationale TAXI reste à 99 dans cette projection ; la divergence historique avec la sélection attendue de 98 n’est pas corrigée dans ce lot.

## Vérifications exécutées
- **102 tests Vitest PASS** : huit nouveaux tests des couples/obligations, composition des sources, sources dynamiques, sauvegarde après refresh, obligations de Cours et exercices inchangées. Un journal de conflit attendu par les tests de protection ne constitue pas un échec.
- **Huit parcours Playwright fictifs PASS** : TAXI/VTC × PC 1280×1800/mobile 390×844 × T3P/Gestion. Compte et transports fictifs, toutes sorties externes bloquées.
  - Toutes les autres questions sont explicitement préremplies dans le jeu fictif ; la seconde occurrence n’a aucune réponse.
  - Clic sur Valider : refus observé, zéro remise ; la première réponse n’a pas fabriqué la seconde.
  - Réponse explicite à la seconde question puis sauvegarde/remise : 122/122 T3P et 146/146 Gestion, réponses justes et total concordants.
  - Correction visible vérifiée en capture et rechargement : état soumis et deux réponses indépendantes relues.
- Première série interrompue au scénario TAXI/Gestion : le menu ouvrait T3P par défaut ; le script ouvre maintenant explicitement Gestion. Seules les huit exécutions finales complètes sont comptées PASS.
- Plusieurs images du corpus ne sont pas chargées dans le navigateur fictif à sorties externes bloquées. Aucun rendu réseau intégral des médias revendiqué ; les quatre couples illustrés restent exclus de toute suppression, même sans cette vérification. Les deux candidats testés sont sans image.
- Sources enregistrées 2/4/9/10 relues identiques avant/après, données et timestamps inclus. SHA-256 sur les lignes JSON triées :
  - 2 : `e6235c92d5169d9efceea517f6272883f820a50e2776af79c82f5700264f4d55`
  - 4 : `77a781ca258af4e158c239db76f2ddbcb80cd10f4dc1f74ab572368de1d7a887`
  - 9 : `29517efc4bb0d61f92385dae408b873c8689826d2d186f00735ea8ef058285fa`
  - 10 : `8d40d958bf288df3467c946fba3d93a975d0a1236f5064dfe2a64fcad54900e5`
- Parité complète des tableaux de questions T3P/Gestion/Sécurité/Français/Anglais prouvée par égalité des objets ordonnés TAXI/VTC.
- Aucun fichier fonctionnel modifié ; autres modules préservés par absence de mutation et tests hors périmètre. Aucune empreinte exhaustive des historiques vivants revendiquée.
- Aucun élève réel, score, jalon, signature ou progression modifié ; aucun email, migration ou déploiement. Compte réel et remise réelle : **NON PROUVÉS**, volontairement non exercés sur le serveur partagé.

## Fichiers ajoutés
Jeu audité sans donnée personnelle, tests d’obligations, écran de test avec le vrai rendu et transport fictif, script PC/mobile. Ils ne changent pas la déduplication de l’application. La structure suit les écrans de tests existants ; aucune nouvelle architecture applicative ni règle de projet créée.