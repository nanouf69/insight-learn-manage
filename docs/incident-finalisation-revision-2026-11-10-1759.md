# Incident finalisation des questions fausses — 10/11/2026 17:59

## Verdict : NO-GO publication
Correctifs appliqués au circuit actif dans l'aperçu, pas au seul candidat désactivé. Aucune migration, publication ni écriture de données élèves effectuée.

## Causes constatées
- Le paquet public contient le même circuit que le code inspecté : clôture durable dans reponses_apprenants, puis insertion séparée dans apprenant_quiz_results. finaliser_revision_fausses est absent du catalogue serveur ; son commutateur reste false.
- Une interruption entre ces étapes laisse une clôture sans résultat. La reprise publiée excluait completed=true et allouait un nouveau tour, abandonnant la finalisation précédente.
- L'insertion n'était ni relue ni précédée d'une recherche du résultat exact. Un accusé perdu pouvait relancer une insertion.
- Le badge était lu seulement à l'ouverture, sans remise à false ni protection contre une lecture d'un ancien élève/examen ; il n'était pas rattaché au passage affiché.
- L'admin assimilait completed=true du brouillon à une révision terminée, même sans résultat.
- Le dernier index et completed ne prouvent pas la couverture : deux révisions récentes ont des réponses/validations manquantes.

## Inventaire réel en lecture seule
- 223 brouillons de révision, 161 clôturés ; 18 comportent plus de 50 questions.
- 105 clôtures sans résultat explicitement lié par revision_exercice_id ; ce nombre n'affirme pas 105 élèves bloqués, car 101 sont d'ancien format sans revisionState exploitable.
- Parmi les quatre clôtures versionnées sans résultat : HAMDI Mohamed EB2 TAXI r2 = 33/33 réponses revues, MLIKI Mohamed EB1 = 48/48 ; Haddouche Djamel EB2 = 59 réponses sur 60, 58 revues ; AIT BALLAGH SAMI EB2 = 21/23 revues/réponses.
- Aucun doublon de résultat lié au même brouillon trouvé. Le catalogue n'a pas de contrainte unique sur propriétaire/examen/revision_exercice_id ; l'index matière/tentative ne prouve pas cette unicité.
- 151 résultats de révision lors du dernier contrôle, empreinte f59e3655fa83e9814a57add7f1a409ef. Empreinte relevée en fin seulement : ne pas la présenter comme comparaison avant/après.

## Correctifs d'aperçu
- Reprise de la même clôture privée sans résultat, sans réécrire une ligne completed.
- Chargement refusé en cas d'erreur plutôt qu'écran vierge permettant une nouvelle écriture.
- Terminer exige couverture complète, mêmes examen/ordre/identités et réponses renseignées, indépendamment du nombre de réponses correctes. Aucun recalcul QCM/QRC ajouté.
- Lecture avant insertion et après tentative d'insertion, même en cas d'accusé perdu ; résultat confirmé seulement sur propriétaire/examen/révision/réponses/ordre/score/max exacts.
- Badge relu au retour, focus, connexion et événement noyau ; garde de génération et rattachement explicite aux copies source affichées. Une ancienne révision sans lien ne justifie pas un badge sur un passage arbitraire.
- Lecteur admin ne marque terminé que si le résultat exact est relu et confirme toute la couverture ; une clôture orpheline est signalée.

## Tests réellement exécutés
- 61 tests applicatifs dans neuf fichiers PASS : chemin publié, accusé perdu, reprise clôture, refus de couverture partielle, QCM/QRC, file réelle simulée, déconnexion/reconnexion, double clic, projection admin, 73 questions et identités voisines.
- Navigateur 1280×1800 et 390×844 : reprise d'une clôture fictive, insertion commise dont la réponse est coupée, résultat exact relu, une seule insertion, callback de confirmation observé. Transport intercepté ; aucune identité réelle utilisée, aucun accès production pour ces écritures. Captures inspectées.
- Dernier signal de compilation : build OK.

## Blocages empêchant publication
1. Lecture avant insertion n'est pas atomicité entre deux appareils ; aucune garantie serveur unique installée. Le contrat candidat antérieur refuse de nombreuses anciennes copies sans snapshot et contient un barème QRC par mots-clés qui ne doit pas être activé dans ce chantier.
2. Parcours navigateur élève authentifié → badge → admin sur serveur réel NON PROUVÉ, ainsi que vrais jours/soirs, TA/VA et finalisation concurrente multi-appareils. Le test PC/mobile porte sur transport fictif, pas sur le site publié.
3. Anciennes clôtures sans couverture ne doivent pas être réécrites/réinitialisées ni réparées automatiquement. Il faut un mécanisme append-only de reprise prouvé avant toute réparation nominative.
4. Publication de l'aperçu regrouperait des travaux encore NO-GO ; pas de livraison isolée prouvée, pas de rollback déployé répété.
5. Le fallback préexistant toutes les 8 secondes dans ExamensBlancsPage demeure en contradiction avec la règle zéro polling ; pas modifié ici, décision déjà demandée dans le chantier parent.

## Suite sûre
Préparer une commande serveur spécifique de finalisation dérivée, idempotente et verrouillée, sans recalcul des notes QRC, avec preuve de couverture/identité et refus clair des historiques insuffisants. La tester contre le catalogue réel jetable, puis prouver concurrence, rollback et parcours autorisé avant installation/publication. Le chantier des trois corrigés reste désactivé.
## Reprise 18:20
- Blocage 1 levé côté serveur : index unique additif `uniq_aqr_revision_fausses_finalisation` (migration 0265) sur propriétaire/examen/brouillon, limité aux résultats de révision liés. Anciens résultats sans lien (95) non concernés. Aucune ligne modifiée ; 151 résultats avant/après en nombre (pas d'empreinte comparable avant).
- Client : un refus 23505 signifie « déjà finalisé par un autre appareil », suivi de la relecture exacte existante ; pas de seconde insertion possible.
- Tests : `src/test/revision_finalisation_unique_sql_contract.sh` 8/8 PASS (deux appareils simultanés, rejeu après accusé perdu, identités voisines, autres quiz, historique, rollback = DROP INDEX sans changement de données) ; 68 Vitest révision PASS.
- Restent NO-GO pour publier l'écran : parcours élève authentifié réel PC/mobile → badge → admin, site publié, livraison isolée des autres chantiers désactivés. EB2 VTC toujours sans corrigé publié ; trois corrigés toujours désactivés.
