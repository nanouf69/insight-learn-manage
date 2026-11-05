# Bilan Français 63 QCM — état réel, 05/11/2026

## Appliqué
- Migration additive 0241 : pointeur de nouvelle version append-only, garde 63 QCM/neuf supports, ouverture des seuls nouveaux reçus Français 503/603 avec ancienne version préservée pour les reçus existants ; supports sans clés dans la projection élève.
- Version indépendante enregistrée : `ca3fc116-a0b7-4c07-a2e6-996226b2151d`, empreinte `95d445427a4216bf347ecd1b0a66de4b` ; 63 QCM et neuf textes, sept par texte.
- Q14 A+C, Q15 QCM A+C avec énoncé ambigu inchangé ; Q87 A+C, C exactement « Pour se mouvoir elle utilisera l'électricité », B intact. Q33 : fragment « ladies cab» : » remis dans l'énoncé d'après le DOCX, sans changer le sens ; vraie bonne réponse identique.
- Les 27 QRC et Q91–98 sont absentes seulement de la version candidate. Q80 non ajoutée ; Q40 QRC exclue, divergence sans effet.
- Affichage des neuf supports dans l'aperçu.

## Non activé / non publié
- Zéro entrée dans `bilan_future_french_releases` ; zéro reçu utilisant la version candidate. Les nouveaux passages continuent donc d'utiliser le circuit/version existants.
- Aucun appel de publication ; pas de mail, SMS, IA, compte créé ni tentative réelle de test.
- Le contenu actuel de `module_editor_state` n'est pas remplacé : seul le nouveau circuit versionné est préparé.

## Protection vérifiée en lecture seule
- Ancienne banque : 97 questions, empreinte toujours `3f12115d70f91bd8185660904c6f7fb0`.
- 8 reçus : `c8e2b7ed967da229f7913f7db18ce3cc` ; 4 soumissions : `932f7421214a076017918822ab1edb94` ; 45 éligibilités : `9e081857ee1636d5023c60cab9717cde` (identiques avant/après).
- Les 1377 brouillons enregistrés avant 19:47:29 UTC restent identiques (`51590d2333bd97ec2f938b6e660399d0`). Les nouvelles sauvegardes réelles intervenues pendant le travail ne sont pas confondues avec une modification des preuves initiales.
- Aucun identifiant historique renuméroté, aucune ancienne banque/copie supprimée.

## Tests réellement exécutés
- Vitest ciblé : **36/36 PASS** sur banque/source, écran, transport et isolation.
- PostgreSQL jetable Français : **3/3 PASS**, reçus existants préservés, nouveaux VTC/TAXI, supports sans clés, multichoix 62/63 et 63/63, permissions et idempotence.
- PostgreSQL jetable circuit existant : **14/14 PASS**, dont cinq matières et validation/progression intactes.
- Playwright : simulations utilisant le composant réel et la banque candidate, PC VTC 1280×1800 / mobile TAXI 390×844 : neuf supports, 63 QCM, reprise après retour aux matières, remise/readback 63/63, pas de débordement ni erreur JavaScript. **Ces simulations ne prouvent pas un parcours élève authentifié contre la base en ligne.** La session disponible est administrateur et redirige vers le tableau de bord.
- Non-régression complète : **3393 PASS, 5 FAIL, 13 SKIPPED**. Quatre échecs `gel-par-module-raccordement.test.ts` (mock sans `auth.getSession`), un échec `suivi-formation-indicateurs.test.ts` (attendu priorité agenda : 1/100%, calcul 2/50%). Tests/domaines hors périmètre laissés inchangés ; pas de revendication de non-régression globale réussie.
- Derniers journaux locaux : build OK ; cela ne prouve aucune publication.

## Bloquants
Activation et publication suspendues conformément à l'instruction de ne pas publier si les tests échouent ; les cinq échecs généraux et le parcours élève réel doivent être vérifiés avant la bascule.

## Recontrôle demandé 05/11 20:33 UTC
- Lecture live : candidate toujours 63 QCM, neuf supports de sept questions ; empreinte calculée `95d445427a4216bf347ecd1b0a66de4b` égale à celle enregistrée. Q14/Q15 A+C, Q87 (ID86) A+C et libellé C exact relus en base. Ancienne banque toujours 97 questions, empreinte `3f12115d70f91bd8185660904c6f7fb0`.
- Pointeur toujours vide, zéro reçu candidat. Huit reçus existants, dont deux Français sur l’ancienne version ; 45 éligibilités. Cinq soumissions désormais (contre quatre au contrôle initial) : une activité réelle supplémentaire est constatée, pas attribuée à ces vérifications en lecture seule. 1377 brouillons antérieurs au seuil initial encore présents. Les empreintes initiales ne sont pas revendiquées comparées ici : l’ordre d’agrégation initial n’est pas reproduit.
- Tests réellement rejoués : Français/source 7 PASS ; isolation versions 21 PASS ; transport 4 PASS ; écran élève simulé 4 PASS, soit **36/36 Français PASS**. Contrat PostgreSQL jetable Français 3/3 PASS et circuit isolé 14/14 PASS. Aucun appel d’ouverture/sauvegarde/remise live effectué.
- Cinq échecs généraux reproduits : quatre tests utilisent un client simulé sans `auth.getSession`, alors que la lecture actuelle requiert cette session via `freshSessionRead` ; défaut de simulation, pas une régression démontrée du Français. Le cinquième attend la priorité agenda (une signature), alors que `planningSignaturesReel` délègue à `creneauxSessionInscrite` (inscription 09–16 => matin et après-midi, deux signatures), conformément à la règle permanente du 01/11. Attendu ancien incompatible avec la règle actuelle, sans dépendance au Bilan Français. Aucun affaiblissement d’auth ni changement d’émargement réalisé pour faire passer ces tests.
- Le contrôle de session nominative autorisée (`--self`) a abouti, mais ce compte ne possède aucun dossier apprenant (lecture live count=0). Il ne permet donc pas de vérifier l’ouverture réelle, la reprise et la remise en tant qu’élève ; aucun autre compte n’a été choisi ou modifié.
- Routage live ouvert aux comptes sans trace ancienne, cinq matières actives ; reçus existants renvoyés AVANT le choix d’une release Française. `bilan_future_route` peut créer des éligibilités et `bilan_future_open` peut créer un reçu : ces appels ne sont pas des lectures neutres et n’ont pas été utilisés sur un élève réel pour ce contrôle.
- **NON ACTIVÉ / NON PUBLIÉ** : incertitude critique restante = parcours authentifié élève contre le système réel non vérifié, et publication globale de l’aperçu non certifiée (cinq tests généraux non remis à niveau et alertes de permissions connues non arbitrées). L’autorisation interdit de publier tant qu’une incertitude critique demeure. La candidate n’a reçu aucun pointeur et aucune demande de publication n’a été envoyée. URL de production connue : https://gestion.ftransport.fr ; accessibilité seule ne prouve pas la nouvelle version.