# Audit préalable — trois corrigés TAXI — 30/10/2026

## Décision
Correction pédagogique suspendue à validation : les trois propositions comportent des divergences ou qualifications nécessaires. Aucun corrigé, énoncé, clé, barème, compte, note, passage, snapshot ou donnée Cloud modifié. Aucune publication, aucun appel IA/mail/SMS. Seuls mémoire, feuille de route et ce rapport sont ajoutés/actualisés.

## Localisation par texte
- Quiz intégré `src/data/quiz-qrc-taxi/quizData.ts` : IDs permanents 25 (sanction), 26 (stationnement), 33 (équipements). Présents dans complet et spécialités. Q13 possède une variante textuelle « hors ceux cités ci-après », distincte du QCM à un équipement.
- Fiches de cours `src/components/cours-en-ligne/bilan-qrc-cours-data.ts` : sanction nationale TA, deux stationnements TAXI/TA, deux équipements TAXI/TA. La sanction TA est actuellement erronée/ancienne (« 1 an, 15 000 € »).
- Source historique de H `src/components/cours-en-ligne/bilan-questions-exercice-complementaire-taxi.ts` : QRC 44/46/60 ; QCM associés 43/45/59. H masqué dans l'affichage TAXI mais conservé, aucune édition.
- Contrôle de connaissances réel : `module_editor_state`, module 13, exercice 13100, IDs 212/213/220 et sourceRef `auto-grade-quiz:national:25/26/33`, localisés par énoncé avant identifiant. Réponses actuelles : 1500 €, phrase stationnement restrictive, liste de six équipements non qualifiés. Le fichier de base `controle-connaissances-taxi-data.ts` ne contient pas ces trois ajouts : modifier ce seul fichier n'aurait pas corrigé la source serveur.
- Autres occurrences de texte dans les JSON modules 5/11 (H), 9/10 (cours), 90001/90002/90007/90008/90009/90014/90015 et 90019/90020 (matières d'examens blancs), plus sources EB et bundle de relevés figés : repérées mais exclues de toute modification. Aucune propagation vers examen existant.
- Aucune occurrence correspondante dans `canonical_questions` et `quiz_questions` par les trois expressions recherchées. Cela ne prouve pas l'absence de toute paraphrase.

## Q5 — divergence majeure : réforme du 27 juin 2026
Le premier retour de recherche reprenait la sanction ancienne pour les délits. Il n'a pas été retenu comme conclusion. Vérification supplémentaire par texte officiel complet : loi n°2026-534 du 25 juin 2026, article 28 I 5°, ajoute à L3124-12 le fait de « réaliser ou de faire réaliser des prestations de transport […] lorsque le conducteur ne dispose pas de la carte professionnelle […] correspondant à l'activité pratiquée » et porte la peine à trois ans / 45 000 €. L'article 28 III ne reporte que les 7° et 8° du I, pas le 5°. Version consolidée du 27/06/2026 corroborée par plusieurs reproductions de la base LEGI.

Sources :
- Loi officielle complète, article 28 : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054309429 (texte intégral récupéré par recherche ; accès direct HTTP403).
- Version officielle L3124-12 : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000054336042 (texte consolidé direct non récupérable) ; reproduction https://librejustice.fr/norm/fr/code-des-transports/l3124-12 et https://justice.pappers.fr/loi/LEGITEXT000023086525/article/LEGIARTI000054336042.
- L3124-4 exploitation sans ADS : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000054336023 ; même réforme, 3 ans / 45 000 €.
- R3124-12 IV conserve un texte contraventionnel sur l'absence de carte valide : https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000030048385/ ; reproduction https://librejustice.fr/norm/fr/code-des-transports/r3124-12. L'articulation avec le nouveau délit et le cas particulier d'une carte expirée ne peuvent être simplifiés silencieusement.
- Code pénal 131-13 : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006417259/ : 1500 € maximum, 3000 € seulement « lorsque le règlement le prévoit ». Clause spéciale de récidive pour ce cas NON PROUVÉE.

Blocage : ne pas imposer « seulement 5e classe / 1500 €, 3000 € récidive » à l'énoncé général actuel. Proposition à valider : expliquer le délit nouvellement prévu en 2026 et distinguer non-affichage/non-présentation d'une carte valide ; signaler le texte contraventionnel et la nuance carte expirée sans en faire une alternative automatiquement équivalente.

Sanctions administratives : la commission rend un avis ; l'autorité administrative décide. Retirer une carte jamais délivrée n'est pas une sanction matériellement applicable. Ne pas promettre un retrait systématique.

## Q6 — territoire ADS ≠ couleur du lumineux
- L3121-11 : recherche de clientèle dans le ressort réel de l'ADS ; hors ressort, réservation préalable justifiable pour la prise en charge, pas de maraude libre. https://www.legifrance.gouv.fr/codes/id/LEGISCTA000023083937
- Service-Public officiel consulté : vert lorsque libre, rouge lorsque occupé. Couleur non automatiquement déterminée par la frontière ADS. https://entreprendre.service-public.gouv.fr/vosdroits/F22127
- Arrêté Rhône du 21/09/2026 lu intégralement pages 15–19 : article 18 stationnement aux emplacements réservés pour taxis autorisés ZUPC ; article 10 possibilité de taxis réservés/momentanément non en course dans le tiers arrière de stations >=6 places, lumineux allumé, disque, maximum deux heures. Pas de couleur imposée rouge par seul franchissement de zone, ni phrase générale sur gaine opaque dans ce texte. L'article 20 abroge l'arrêté 2018 : ne pas reprendre automatiquement ses anciennes formulations.
- Source préfectorale téléchargée et extraite : https://www.rhone.gouv.fr/contenu/telechargement/70315/473664/file/RAA_69-2026-285-220926.pdf

Blocage : valider un feedback nuancé territoire/réservation/disponibilité ; règle « hors zone réservé = rouge » et « gaine jamais recouverte » non validées comme règles nationales universelles. Une réservation ne donne pas un droit illimité d'attente à toute station/gare/aéroport.

## Q13 — liste non universelle
- TPE : R3121-1 II 2°, fonctionnel, visible et disponible. https://www.legifrance.gouv.fr/codes/id/LEGISCTA000030048417/
- Carnet métrologique : document constamment à bord, arrêté du 18/07/2001 art.27. https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000406641/
- Affichage tarifaire : arrêté du 06/11/2015 art.1 et 7. https://www.legifrance.gouv.fr/loda/id/LEGITEXT000031449271
- Trousse : convention-cadre nationale approuvée le 29/07/2025, art.2.2, obligation des taxis conventionnés : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052060568 ; https://www.ameli.fr/taxi-conventionne/textes-reference/convention-nationale-type. Elle n'est pas un équipement spécifique universel au titre de ce texte. « Uniquement CPAM, aucune autre règle possible » serait trop absolu.
- Horodateur conditionnel ; facturier papier non démontré obligatoire universellement en présence de l'imprimante. Gilet/triangle sont des équipements routiers généraux, pas une quatrième obligation spécifique taxi à inventer.

Blocage : conserver l'énoncé mais valider un feedback indiquant que la quatrième obligation dépend du conventionnement et qu'on ne doit pas exiger une trousse de tous les taxis. Aucun changement silencieux de la question ni ajout d'une quatrième réponse universelle.

## Protection des passages et vérifications
- Lecture module13 : 11 copies principales (6 non terminées) et 1 révision non terminée de 13100. Aucune mention snapshot dans reponses/reponses_meta pour ces douze copies ; absence de mention ne garantit pas absence de snapshot ailleurs.
- Changer le JSON module13 peut modifier la référence de correction de copies commencées sans protection prouvée. Toute application y reste bloquée, même après validation réglementaire, tant que le périmètre futur-only n'est pas garanti. Aucune copie reconstruite.
- Empreinte avant/après identique des 73 lignes `reponses_apprenants` module13 : `8e578fc37099dfcfbd1afc3ef5334970` ; aucun appel d'écriture effectué par cet audit.
- PASS : 27 tests réellement exécutés, `quiz-qrc-taxi-integre.test.tsx` (22) + `controle-connaissances-display.test.ts` (5), données fictives.
- NON PROUVÉ : correction souple des nouvelles formulations, puisqu'aucun nouveau corrigé n'est appliqué ; parcours élève connecté, nouvelle persistance/correction Cloud, qualification judiciaire de chaque carte expirée. Aucune assertion ne prétend ces points validés.
- Comparaison finale réellement exécutée : quizData, fiches QRC et source H strictement identiques octet par octet aux copies avant audit. Dernier contrôle automatique disponible : build OK 09:48:08Z. Aucun changement applicatif : aucun nouvel effet sur notes, progression ou comptes.

## Validation demandée
Autoriser des feedbacks nuancés, et non les trois propositions comme vérités absolues : Q5 tient compte de la réforme juin2026 et distingue les situations ; Q6 disponibilité et territoire séparés ; Q13 quatrième élément conditionnel, sans pénaliser l'absence d'une obligation universelle inexistante. Le contrôle13 reste à préparer séparément pour les futurs passages seulement.