# EB2 VTC — urgence journée/soir, 09/11/2026 17:23 UTC

## Conclusion opérationnelle
**Les réponses sont visibles dans les deux sessions ; la notation reste bloquée dans les deux. Le cours du soir n’est PAS sécurisé pour une correction V2 complète dans l’état public actuel.** Aucun enregistrement réel, import, activation de version, modification de note ou publication n’a été effectué.

Ce travail conserve le candidat et les protections du ticket précédent. Le prototype isolé est une preuve de notation append-only synthétique, pas une preuve de démarrage EB2 réel ou de publication de notes officielles.

## Contrôles réels en lecture seule
| Session actuelle | Élèves avec résultat EB2 | Résultats matière | QRC visibles dans le correcteur PUBLIC | Remise identique retrouvée | Liens V2 |
|---|---:|---:|---:|---:|---:|
| VTC/TAXI journée, 02–13 novembre | 9 | 68 | 156 | 95 QRC | 0 |
| VTC soir, 02–13 novembre | 1 | 7 | 16 | 9 QRC | 0 |

Les tableaux comptent toutes les tentatives enregistrées des inscrits, sans transformer « résultat matière » en examen complet. L’appartenance CRM et les dates effectives restent celles de l’application ; aucune nouvelle session n’est inventée. Le navigateur a sélectionné successivement les deux sessions et EB2 : 156 cellules puis 16 cellules, sur public et aperçu. Les copies ouvertes affichent réponse, attendu et panneau consultation. La copie journée ouverte porte `result_id=1385b2d2-0d1e-4eb4-9bef-125c38ae2297`, la copie soir `6f4d2615-68ca-4c03-8cbe-f5a6af393590`, question 1. Les preuves sont distinctes ; aucune écriture de notation n’a été autorisée dans le navigateur.

## Cause du risque pour les prochains passages soir
Lecture réelle de `exam_content_versions` EB2 : une version IMPORT HISTORIQUE en **brouillon**, et une version partielle F(V)/G(V) **retirée** ; **aucune version publiée active EB2**.

Le bridge réel est activé pour les nouveaux passages sur les sujets publiés. Mais `routerPassage` contrôle aussi `core_sujet_publie` : faute de sujet EB2 publié, le parcours peut rester historique. Une soumission historique peut enregistrer le snapshot et apparaître dans le même écran sous `consultation:<result_id>`, sans créer de `qrc_instances_v2` notable. Une identité d’affichage n’est pas une identité serveur de correction.

Ainsi, **affichage après soumission ≠ notation disponible**. Aucun test ne permet d’affirmer que les prochaines copies soir seront notables sans adaptation.

## Pourquoi l’import existant n’a pas été exécuté
`core_import_passage_finalise` existe déjà en base, mais sa définition réelle :
- retrouve une preuve submitted/completed par exercice, sans comparer les réponses au résultat et sans contrôle complet des reçus ;
- vérifie l’import existant par lecture sans unicité de provenance ni verrou protégeant deux imports concurrents ;
- crée chaque QRC répondue en attente, sans protéger les corrections historiques préexistantes ;
- transforme le snapshot et crée une nouvelle tentative ; cette action peut déclencher d’autres traitements réels.

Lancer cet import en urgence, même depuis un bouton, serait une écriture réelle non validée avec risques de duplication et de nouvelle correction d’une note historique. Aucun appel n’a été exécuté. Les contraintes/triggers éventuels supplémentaires ne sont pas déclarés audités exhaustivement.

## Changements de code sûrs réalisés en aperçu
- Pagination stable des passages EB2 et des liens V2.
- Lecture de **toutes** les pages des fiches de remise, auparavant limitée à la première réponse API : une preuve après la 1000e ligne n’est plus omise.
- Sur la copie affichée : référence de l’original et ID question visibles, sans champ de note trompeur.
- Aucun changement du barème, verdict, état corrigé/en attente, réponses, progression ou séparation CRM.

**Tests nouveaux/exécutés : 8 PASS dans deux fichiers**, dont remise située en seconde page après 1 000 lignes et routage EB2 retiré. Build automatique OK. Les cinq tests de projection existants restent valides. Le premier essai du nouveau test a échoué sur le mock de requête, corrigé puis relancé PASS.

## Mise en service à préparer avant accord de déploiement
1. **Journée et soir historique :** adapter la preuve serveur au reçu historique exact, conserver les traces `correctionsIA` en attente, unicité de provenance, verrous, prévisualisation nominative et autorisation explicite. Utiliser les 95 QRC journée et neuf QRC soir à remise identique comme groupe à qualifier, pas comme groupe déjà autorisé à importer. Le candidat précédent reste hors migrations actives.
2. **Nouveaux passages soir :** version EB2 complète certifiée depuis les questions enregistrées et publication explicite ; identité immuable de passage/cohorte pour ne pas basculer une matière d’un examen déjà commencé. Ne pas activer une version partielle ni un flag global pour masquer le défaut.
3. **Affichage et notation :** même grille V2, champs de note seulement après capacité serveur vérifiée, relecture de l’événement enregistré avant navigation ; correction partielle conservée et QRC en attente jamais présentée comme zéro définitif.
4. **Résultats :** publication révisée append-only avec QCM/QRC et coefficients/seuils figés entièrement prouvés ; même identité de résultat dans CRM/carte/élève, actualisation événementielle puis relecture.
5. **Preuve E2E obligatoire :** démarrer EB2 soir neuf, saisir QCM/QRC, soumettre, relire le correcteur, noter, relire résultat matière puis global et espace élève/mobile ; double clic, coupure réseau, reprise, corrections tardives et copies déjà corrigées, sur PostgreSQL jetable avec le catalogue réel complet. Ce parcours complet n’est pas encore exécuté.

## Publication
**Aucune publication demandée.** Les modifications sûres préparées améliorent lecture et traçabilité, mais ne débloquent pas la notation : les publier seules ne répondrait pas à l’urgence. Une adaptation additive serveur est nécessaire ; la sécurité et l’activation requièrent le rapport/validation spécifique avant toute écriture réelle. Aucun besoin de migration destructive n’a été établi.