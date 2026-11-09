# EB2 VTC — consultation ciblée dans Correction QRC V2

## Cause prouvée, 09/11 14:15–14:19 UTC
Le menu lit les `exam_attempts_v2` puis ajoute uniquement les résultats historiques dont le préfixe est `eb3` (`noyauReel.ts:204–239`). L'identité VTC est exactement `EB2`, distincte de `EB2-TAXI`. La session journée `91f00853-2ac2-4da6-996b-4832fc132b6b` n'a aucun passage `EB2` dans V2 : **0 passage, 0 élève**. Les résultats EB2 historiques existent mais ne sont jamais ajoutés au menu. Ce défaut intervient avant les filtres de date/session ; ce n'est pas une perte de réponses ni une troncature à 1000 pour cette session.

## Données réelles contrôlées uniquement en lecture
Session « VTC et TAXI — Du 2 au 13 novembre » :
- 9 élèves, 56 résultats matière EB2, tous datés de fin ; 39 résultats contenant des QRC.
- **127 QRC et 127 réponses non vides**, issues des questions/réponses enregistrées, sans consulter la banque actuelle.
- **101 QRC datées du 09/11** ; 26 QRC antérieures dans la même période de session. Toutes les 127 sont dans le 2–13 novembre.
- Répartition : A/T3P 50 QRC/10 résultats ; B/Gestion 22/11 ; D/Français 27/9 ; F réglementation VTC 20/5 ; G réglementation VTC locale 8/4. C/E sont QCM, pas des QRC manquantes.
- Zéro paire de résultats avec même élève/matière/tentative et identifiants différents dans ce périmètre ; aucun effacement/dédoublonnage effectué.
- Session du soir distincte : **1 élève, 5 résultats QRC, 16 QRC** ; aucun mélange avec le groupe journée.
- **5 fiches en cours chez 5 élèves** en journée : restent distinctes des résultats finalisés, ne doivent pas être proposées comme copies soumises à noter.

### Preuve de soumission : ne pas confondre date de résultat et remise
Les résultats n'ont pas les clés `source_exercice_id/source_tentative` requises par le prototype global précédent : son premier contrôle donnait donc zéro preuve. Cela ne signifie pas zéro réponse soumise.
Relecture des fiches avec identité historique exacte `EB2__matiere` ou `EB2__matiere__tN`, même élève, même tentative, `completed=true`, `status=submitted`, date de remise et JSON réponses identique : **26 des 39 résultats QRC / 78 des 127 QRC** ont cette preuve exacte.
Les **13 autres résultats / 49 QRC** restent consultables comme contenu enregistré, **soumission non certifiée par ce rapprochement** ; aucune remise déduite d'une proximité temporelle. Des suffixes historiques `__t3` avec champ tentative 1 existent : ne pas raccorder automatiquement ces identités incohérentes.

## Préparation réalisée, pas une activation
Nouveaux fichiers test-only : `src/test/qrc-global-isolated/eb2ReadOnlyProjection.ts` et `.test.ts` ; règle de frontière dans le AGENTS local.
Projection : EB2 exact + élève inscrit ; identifiant `history:result_id:question_id` ; question/corrigé/barème/texte depuis le snapshot ; état de remise exact ou non certifié ; **`canGrade=false` pour toutes les copies**. Aucune fonction de mutation, aucun appel réel, aucun import par une route active.
Lecture paginée jusqu'à épuisement ; une erreur de page fait échouer toute la lecture, pas un succès partiel. Aucun classement « corrigée » inventé.

## Tests réellement exécutés
- **8/8 tests de la projection** : contenu exact et identité, exclusion TAXI/non inscrit, fiche en cours, même tentative/JSON, révisions distinctes, immutabilité des sources, pagination 1205, erreur réseau seconde page.
- **45/45 tests existants** de navigation/copies et inscriptions croisées ; total **53/53 PASS**.
- **Vrai écran V2**, transport entièrement synthétique et services réels bloqués : ordinateur 1280×1800 et tablette 820×1180, option EB2, cellule, vraie question/réponse du fixture, panneau, absence de bouton de note et rechargement PASS. Aucun ancien écran rendu.

### Limites explicites
Ce test navigateur est synthétique, pas un test authentifié avec les 127 réponses réelles. Il démontre que le même écran peut consulter une projection, pas une intégration réelle terminée.
Le transport temporaire bloque les notes en retirant uniquement dans le fixture le barème de notation : **son texte « barème introuvable » est un artifice de test, pas un constat sur les copies réelles**. La vraie préparation doit conserver le barème affiché et ajouter une capacité de lecture seule explicite, avec un texte « consultation — notation historique non disponible », sans prétendre que le barème manque. Ne pas publier cet artifice.
L'accès réel, pagination sous droits admin, rapprochement des 49 QRC non certifiées et affichage des corrections historiques déjà enregistrées restent à vérifier avant activation. Pas de note moyenne/matière projetée ni d'état officiel modifié.

## Prochaine étape ciblée, non effectuée
Ajouter la source EB2 à la lecture paginée du menu sans circuit `ancien`, puis adapter les résultats à la même matrice V2 avec une capacité explicite consultation uniquement, contrôlée aussi par les handlers de correction. Conserver copie/date/tentative et preuves ; afficher les 49 QRC non certifiées sans les qualifier de remises. Pas de note historique writable par `core_correct_qrc` : cette fonction exige une vraie `qrc_instances_v2` ; une identité projetée ne suffit pas.
**Aucune migration requise pour consulter ; notation historique toujours indisponible sans adaptation serveur séparément autorisée.** Aucun correcteur ancien rétabli, aucune intervention EB3, aucune écriture de données réelles, aucune migration, aucune publication.