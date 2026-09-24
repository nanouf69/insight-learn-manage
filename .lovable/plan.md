# Plan – Question 5 EB2 G(V) : remettre « C seul » pour les futurs passages

Plan uniquement. Aucune écriture tant que vous n'avez pas donné votre accord étape par étape.

## Constat de départ (lecture seule, 24/09)

- Bonne réponse officielle : **C seul, « tous les 5 ans »**. Vous l'avez confirmé, et c'est ce que retiennent la banque du Bilan « Réglementation VTC » et les 6 modules et bilans enregistrés par l'admin.
- L'écart ne vient que d'un endroit : le contenu EB2 dans le code, réécrit le 19/05, où B et C sont marquées bonnes. EB2-VA réutilise ce même contenu G(V).
- La version V2 « publiée » d'EB2 (et d'EB2-VA) du 22/09 est celle de la migration à blanc. Elle ne contient que 2 matières, F(V) et G(V). **Sa G(V) contient déjà la mauvaise clé B + C.** C'est la même version incomplète qui bloque Kevin sur la matière T3P.

## Étape 1 – Corriger la source des futurs passages (ancien circuit, EB2 + EB2-VA)

- Dans le contenu EB2 G(V), question 5, retirer uniquement la mention « correcte » de la réponse B. Libellés, ordre, lettres et barème ne changent pas.
- EB2-VA réutilise la même matière : il est corrigé en même temps, sans deuxième copie.
- L'empreinte du contenu EB2 change. La modification est enregistrée comme une action admin volontaire et journalisée, conformément à la règle « modification = action Admin volontaire, même numéro d'examen ». Aucune réparation silencieuse.
- **Aucun effet sur l'historique :** les 36 passages gardent leur sujet et leur clé figés au moment du passage. Le calcul relit toujours cette clé figée, jamais le contenu actuel. SILLA reste donc à **15/20**, et aucune note affichée ne bouge.
- Un passage EB2 G(V) en cours garde son sujet figé. Seuls les passages commencés après la correction ont la clé C.

## Étape 2 – Matière identique = source unique

- Ajouter un contrôle automatique : pour chaque question présente à la fois dans les examens blancs et dans la banque de référence (même énoncé normalisé), les bonnes réponses doivent être identiques.
- Toute divergence est signalée dans le contrôle d'intégrité admin et fait échouer les tests. Rien n'est corrigé automatiquement : conformément à vos règles, pas de correction sans accord explicite.
- Le premier passage du contrôle produit la liste complète des autres divergences éventuelles, en lecture seule, pour décision séparée.

## Étape 3 – Test de non-régression

- **Test 1 :** EB2 G(V) Q5 et EB2-VA G(V) Q5 ont exactement une bonne réponse, C « tous les 5 ans ». B « tous les ans » n'est pas correcte.
- **Test 2 :** pour cette question, les bonnes réponses d'EB2 et d'EB2-VA sont égales à celles de la banque de référence. Si la référence dit C seul, B + C fait échouer le test.
- **Test 3 (générique) :** aucune question d'examen blanc partagée avec la banque de référence n'a de bonnes réponses différentes.
- **Test 4 :** un passage déjà figé avec la clé B + C garde exactement sa note recalculée. Cela prouve que l'historique n'est pas réécrit.

## Étape 4 – Articulation avec la version V2 d'EB2 qui bloque Kevin

- On ne corrige pas la G(V) dans la version V2 publiée actuelle. Une version publiée ne se modifie pas, et on ne crée pas de nouvelle version V2 pendant cette opération.
- Le déblocage de Kevin reste un sujet distinct, avec les options déjà présentées :
  - retirer cette version incomplète, ce qui demande votre décision sur les 5 passages rattachés ;
  - ou faire passer par l'ancien circuit un examen sans questions.
- Dans les deux cas, EB2 repasse par l'ancien circuit. Grâce à l'étape 1, Kevin aura alors la bonne clé C.
- **Ordre recommandé :** étape 1 (source corrigée), puis déblocage EB2. Kevin ne passera jamais EB2 avec la mauvaise clé.
- Une future version V2 d'EB2 ne sera créée qu'après la fin de ce chantier, à partir de la source corrigée, et seulement si elle passe le test 2.

## Étape 5 – Les 8 passages sous-notés (plus tard, séparément)

Liste figée pour une correction contrôlée ultérieure, sans aucune action maintenant :

| Élève | Note actuelle | Note avec C seul |
|---|---|---|
| DIOP Bernard | 8 | 10 |
| WADOOD Abdul | 6 | 8 |
| NESAR Abdullbaset | 6 | 8 |
| TENGUE Nunangnon | 10 | 12 |
| Ouerfelli Isam | 12,5 | 14,5 |
| PANDA GBIANIMBI Auguste | 10 | 12 |
| SBOUI Dhia | 6,5 | 8,5 |
| FERRARI Kevin (T2 et T3, 17/07) | 16 | 18 |

- Le jour venu, il faudra ajouter une correction formateur journalisée par passage, comme un événement séparé, sans toucher à la réponse ni au sujet figé.
- Pour les 8 passages où la V2 affiche 2 points de moins que l'ancien système (dont SILLA), la question se posera au même moment. L'ancien système reste la référence, et rien n'est modifié maintenant.

## Ce qui n'est PAS fait dans cette première opération

Aucune modification de snapshot, réponse, correction QRC, note ou passage. Aucun retrait de version, aucun changement de routage, aucune création de version V2. Kevin ne relance pas EB2.

## Détails techniques

- Fichier source : `examens-blancs-data.ts`, matière `reglementation_vtc2` d'EB2 (question id 5), partagée avec `eb2-va`. Référence : `bilan-questions-reglementation-vtc.ts` (id 9) et `module_editor_state` (clé C).
- Le calcul historique (`examens-blancs-scoring.ts`) lit `details.questions[].reponseCorrecte` du passage, et `core_note_attempt` lit le snapshot de la tentative V2 : aucun des deux ne dépend du contenu actuel.
- Tests : nouveau fichier `src/test/eb2-gv-q5-cle-unique.test.ts`, plus un contrôle générique de cohérence avec la banque de référence.
