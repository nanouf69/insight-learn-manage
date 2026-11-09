# EB3–EB6 : protections prospectives — STOP activation

## Résultat du 09/11/2026
Préparation isolée et audit en lecture seule effectués. **Aucune migration réelle, publication, modification de réponse, note, progression ou examen commencé.** Le périmètre demandé remplace EB2 : EB3–EB6 VTC/TAXI et uniquement les nouvelles tentatives originales après une future activation. Aucune date d'activation réelle n'a été fixée ; 13:02 UTC est une valeur de test fictive.

## Blocage principal prouvé
La fonction réelle `core_start_attempt(p_operation_id,p_apprenant_id,p_exam_id,p_matiere,p_is_test)` démarre/reprend une matière sous verrou de l'examen, mais n'enregistre pas d'identifiant parent immuable de passage global ni de cohorte d'activation. Une matière nouvelle ou une révision nouvelle après activation peut appartenir à un examen commencé avant activation. Une simple date sur ces lignes ne garantit donc pas l'exclusion des copies en cours.

Le prototype exige un parent original et les sept sources de matière, y compris les matières sans mauvaise réponse. **Le serveur actuel ne fournit pas cette preuve.** Ce prototype n'est pas une migration déployable et ne prétend pas vérifier l'attribution des sources par le système existant.

## Audit réel des preuves
Identifiants vérifiés : `EB3`, `EB4`, `EB5`, `EB6`, `EB3-TAXI`, `EB4-TAXI`, `EB5-TAXI`, `EB6-TAXI` ; modules éditeur VTC 90002–90005, TAXI 90008–90011. EB1/EB2 et TA/VA exclus.

| Examen | Résultats historiques | Avec details.snapshot.questions | Passages V2 | V2 en cours |
|---|---:|---:|---:|---:|
| EB3 | 704 | 177 | 292 | 0 |
| EB3-TAXI | 123 | 28 | 39 | 0 |
| EB4 | 591 | 159 | 354 | 9 |
| EB4-TAXI | 105 | 20 | 47 | 1 |
| EB5 | 522 | 132 | 239 | 7 |
| EB5-TAXI | 89 | 23 | 38 | 1 |
| EB6 | 421 | 128 | 179 | 4 |
| EB6-TAXI | 74 | 17 | 42 | 1 |

Ces comptes ne sont pas un nombre d'élèves ni de passages globaux. 23 lignes de matière V2 sont en cours. Tous les passages V2 comptés ont un tableau de questions ; ce seul fait ne prouve ni identité parent, ni corrigé utilisable. Aucun des résultats historiques comptés ne porte `details.attempt_id` au premier niveau. Des projections V2 peuvent disposer d'une autre identité : il ne faut pas en déduire que toute liaison est impossible.

Les snapshots ne sont pas uniformes : la création native écrit `matiere`, tandis que certains historiques importés lus exposent `session`, `matieres`, `source_historique` sans ce champ. Le candidat EB2 utilise `details.snapshot.matiereId` et ne peut pas être activé tel quel.

## Déclencheurs réels
Définitions de tous les déclencheurs des réponses, résultats et passages V2 lues.
- `protect_reponses_apprenants_terminal` transforme la clôture en `status=submitted` avec `submitted_at` ; une hausse de tentative a d'autres effets, donc interdiction de la substituer à une reprise.
- `ensure_quiz_result_on_matiere_completion` sort pour `exercice_type` différent de `examen_blanc`, notamment les révisions ; ce n'est pas une garantie d'atomicité de révision.
- Le déclencheur de module complet ne traite pas un résultat `revision_fausses` ; les chemins examen/V2 restent distincts.
- La file IA sur fin V2 est existante et n'a été ni déclenchée ni modifiée.
- Le garde INSERT du candidat EB2 reste global et n'est **pas installé**. Anciens clients, imports/service et ordre complet des déclencheurs avec le nouveau périmètre restent à tester ensemble.

## Fichiers de préparation
Créés uniquement dans `src/test/eb3-isolated/` :
- `AGENTS.md` : frontière test/production.
- `scope.sql` : prototype activation + identité parent + sources serveur ; droits clients sans écriture ; aucun garde global ni clôture.
- `scope_sql_contract.py` : contrats sur PostgreSQL local jetable, connexions loopback explicites et variables PG héritées retirées.
- `scope.ts` et `scope.test.ts` : miroir test-only, aucune autorisation navigateur ni import applicatif.

Autres modifications : ce rapport, section correspondante de `roadmap.md`, mémorisation de la nouvelle consigne. Aucun composant actif, fonction hébergée ou historique de migration modifié. Candidats EB2 conservés sans modification.

## Tests réellement exécutés
| Série | Résultat | Portée et limite |
|---|---|---|
| Nouveau périmètre PostgreSQL | **9/9 PASS** | Huit IDs, EB1/2 exclus, ancien parent avec nouvelles matières/révision exclu, frontière activation exclue, preuve manquante, droits, absence de mutation |
| Candidat atomique EB2 préexistant | **18/18 PASS** | Rollbacks, deux connexions, reçu rejoué, version/payload périmés, identité, QRC mots-clés vides/espaces ; fixture réduite, non couplée au nouveau périmètre |
| Huit fichiers Vitest | **94/94 PASS** | Dont 29 nouveaux tests de périmètre ; révision QCM/QRC, write_seq inter-appareils simulé, double geste, rechargement, Terminer/retry, matière, snapshots et notes |
| Compilation automatique | **PASS** | Dernière entrée consultée : build OK |

Les erreurs affichées par les scénarios de refus sont attendues ; aucune suite en échec. Aucune IA payante ni communication envoyée.

## NON PROUVÉ — interdit de publier
1. Création atomique d'une identité parent/cohorte originale par les vrais chemins natifs et anciens ; cohabitation avec les examens déjà commencés et les reprises par matière.
2. Compatibilité des deux formats de snapshot et rattachement exact de chaque réponse QRC à sa preuve figée, sans corrigé inventé.
3. Nouveau périmètre branché sur les trois protections dans un même contrat avec le catalogue complet des déclencheurs/droits, tous les chemins UPDATE/import/service et anciens navigateurs.
4. Chaîne navigateur → vrais handler/PostgREST → PostgreSQL jetable réunie pour les huit examens ; parcours intégral officiel matière après matière et remontée des corrections humaines QRC. Les tests séparés ne prouvent pas cette intégration.
5. iPad Safari, Android tablette et iPhone physiques, vraies pertes réseau/session : non exécutés. Aucun nouveau parcours navigateur EB3–EB6 effectué après le blocage.

Le prototype de périmètre ne certifie pas les bonnes réponses ni l'authenticité d'une empreinte. Il doit être accompagné d'un mécanisme serveur immuable d'attribution et de validation des sources avant activation. Les mots-clés ne deviennent pas une note officielle QRC ; priorité humaine/IA validée inchangée.

## Publication et site public
**Aucun outil de migration/déploiement/publication appelé.** Le drapeau applicatif de finalisation serveur reste `false`. Le site public contrôlé par lecture HTML sert toujours `/assets/index-BbNPGt9M.js` ; cette lecture ne certifie pas ses parcours authentifiés. Le diff local contre la référence `d23a89f49` avant cette préparation contenait uniquement les candidats EB2, rapports et feuille de route ; la provenance des changements déjà servis n'est pas réétablie ici. Aucun lot sans rapport n'a été publié.

**Décision : STOP mise en service.** Le changement de numéro d'examen ne résout pas la preuve d'identité originale ; activer sur une simple date de matière/révision risquerait d'inclure des examens commencés, contrairement à la consigne.