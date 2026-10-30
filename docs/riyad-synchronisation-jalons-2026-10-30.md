# Riyad LABIOD — diagnostic et correction, 30 octobre 2026

## Périmètre et protection
Lecture des données réelles uniquement. Aucune requête de mutation Cloud, aucune modification de questions, réponses, notes, signatures, statuts ou dates de validation. Aucun mail, SMS, appel IA ou publication. Les ouvertures administrateur n'ont soumis aucun quiz. Les calculs figés ne sont pas recalculés.

## Dossier et modules
Riyad LABIOD, VTC E-learning, dossier `a179e889-4a49-4b92-b561-c3b826833391`, sept modules explicites : 26, 2, 3, 4, 35, 5, 8. Formation du 08/07 au 30/11/2026. Aucun relevé gelé trouvé : le taux observé est un calcul actuel.

| Module | Validation enregistrée | Preuves examinées | Conclusion de lecture |
|---|---|---|---|
|26 Introduction|08/07|10 questions historiques renseignées, 8 pages enregistrées|Terminé|
|2 Cours et exercices|08/07|763 questions dans les détails, 394 vides initiaux ; soumissions complètes réparent certaines sections uniquement|Pas entièrement prouvé : Développement commercial et Réglementation VTC|
|3 Formules|26/09|26 questions, 4 vides couverts par les soumissions entières 406/407 du 16/10|Terminé|
|4 Bilan exercices|15/10|875 questions dans les détails ; 88 vides dans T3P 100 ; première soumission 118 réponses seulement|Pas entièrement prouvé : Bilan T3P|
|35 Examens blancs|15/10|Drapeau serveur completed ; circuit exam séparé, non modifié|Terminé selon ce circuit ; exhaustivité indépendante des examens non réauditée|
|5 Bilan examen|15/10|1 002 questions renseignées ; huit snapshots 500–507 présents|Terminé|
|8 Pratique|15/10|99 questions renseignées ; 10 pages ; deux activités serveur submitted/completed|Terminé, activités 2/2|

## Manques et traces détaillées
Module 2 :
- Développement commercial 7 : 55 clés concordantes sur 66 ; 11 absentes (8,15,47,51,55,56,57,58,61,62,63).
- Réglementation 72 : 34 clés concordantes sur 35 ; question 57 absente.
- Aucun événement du journal correspondant aux 12 clés absentes trouvé.
- Les soumissions des autres exercices (anglais, français, sécurité) rétablissent leurs preuves en lecture. La règle existante exige une soumission couvrant l'exercice entier : la projection conserve donc 101 vides dans les deux exercices partiels, plutôt que de les fusionner avec un autre passage. Progression pondérée effective module 2 : 662/763 = 86,8 %.

Module 4 :
- Première copie T3P `module_4_exo_100`, soumise le 26/09, contient 118/206 clés concordantes.
- Une révision `module_4_revision_exo_100` contient les 206 réponses et des événements de journal jusqu'au 16/10. Elle reste `in_progress`, `completed=false`, sans `submitted_at`.
- Les 88 clés absentes de la première copie existent dans le journal de la RÉVISION, pas dans celui de la première soumission. Aucune fusion automatique ni assimilation du brouillon à une soumission.
- Progression effective module 4 : 787/875 = 89,9 %.

L'historique d'édition montre des ajouts dans les exercices 7/72/100, notamment en septembre. Aucun contenu figé des modules 2/4 n'a été trouvé dans `contenu_module_fige`. Les détails de complétion sont modifiables par le RPC existant et leurs dates updated_at correspondent à de récentes ouvertures. Il n'est donc PAS PROUVÉ que tous les vides actuels étaient obligatoires lors de la première validation, ni que l'élève n'avait jamais répondu à une ancienne formulation. Aucun contenu initial n'a été inventé. L'absence de preuve actuelle n'est pas une preuve de perte de réponses.

## Cause du 100 %
Les compteurs élève/CRM/EDOF chargent `details` et les soumissions puis utilisent `moduleCompletionEvidence`. Le taux pondéré ne lisait que status/progress/completed_at ; sept drapeaux completed lui suffisaient pour afficher 100 %. Il ignorait les mêmes vides rejetés par les compteurs. Ce n'était pas seulement un cache.

Le RPC `save_module_completion` lu dans le catalogue garantit une réponse au minimum pour une première validation, pas toutes les questions. Il permet aussi le remplacement de détails non vides pour un statut déjà completed. Aucun RPC, trigger ou permission n'a été modifié dans cette intervention. Un durcissement serveur intégral demanderait un chantier séparé, avec périmètre historique prouvé et tests SQL jetables : non réalisé ici.

## Correction du calcul et synchronisation
- `jalonsPedagogiques.ts` charge maintenant les détails et soumissions, comme le compteur CRM/EDOF.
- `liveCompletionEvidence` ne projette 100 % que si les obligations historiques lisibles sont couvertes ; les mauvaises réponses comptent comme réalisées.
- Projection après calcul des dispenses d'activités : les dates serveur originales restent disponibles et les ajouts post-validation ne sont pas réexigés.
- Option explicite live-only dans `jalonsCalculCore` : méthode des calculs figés inchangée.
- Carte jalons : tous changements de réponses du dossier déclenchent relecture, pas seulement les jeux.
- Accueil élève : abonnement aux réponses/complétions du dossier, relecture regroupée après événements, focus et reconnexion réseau ; nettoyage à la sortie.
- Compteur CRM/EDOF déjà commun via `useCandidatModules`, pas de statut artificiellement réparé.

Les deux métriques restent distinctes : 5/7 = 71,4 % de modules entièrement terminés, contre **95,5 % d'avancement pondéré** tenant compte des modules partiellement réalisés et des six heures de pratique signées. Les sept modules attribués apparaissent bien, avec le jalon physique distinct existant.

## Audit global en lecture seule
- 486 lignes de modules completed avec au moins un vide de détail, dans 214 dossiers.
- Après exclusion des exercices couverts par une soumission entière : 426 lignes dans 204 dossiers. Ce sont des candidats à vérifier, pas des élèves automatiquement rétrogradés ni des erreurs historiques démontrées.
- Répartition : VTC-e 56 modules/37 dossiers, TAXI-e 22/8, TA-e 3/2, VA-e 3/1 ; VTC 200/89, TAXI 61/16, TA 32/13 ; autres/FC 49/38.
- La règle corrigée s'applique aux lectures live des parcours concernés, sans réécrire ces dossiers. Les calculs figés restent prioritaires.
- Tables réponses et complétions présentes dans la publication Realtime. Aucune permission élargie. La table apprenants n'est pas dans cette publication : rafraîchissement d'affectation interappareils instantané non démontré.

## Vérifications exécutées
- 123 tests PASS dans 11 fichiers : preuves, sept modules, soumission/draft, quatre parcours, notes sans seuil, dispenses historiques, relevés et EDOF.
- Premier test ajouté échouait faute de jeux confirmés dans sa fixture ; corrigé avec les deux IDs réels. Test de raccordement ancien : simulation complétée avec `like` ; tous ses tests passent.
- Test annexe `jalons-ponderes-compte` : 2 PASS, 1 FAIL préexistant de couleur selon date ; logique de couleur non modifiée. La publication globale reste bloquée, ce test n'est pas déclaré PASS.
- Aperçu administrateur réel : fiche Riyad 5/7, jalons 95,5 %, modules 2/4 non terminés, module 8 2/2. Rechargement : compteur stable.
- Onglet Vue apprenant réel (consultation administrateur) : 5 terminés/7, restants 2/4, quiz 13/15 et 5/6. Aucun clic Soumettre.
- Build automatique OK au dernier contrôle.

## Non prouvé / prochaines garanties
Pas de connexion autonome comme Riyad ni de soumission sur son compte réel. Validation réelle multiappareils et événement Realtime réel après nouvelle soumission NON PROUVÉS (aucune écriture de test sur ses preuves). Audit global nominatif de chaque ancien périmètre NON TERMINÉ : snapshots historiques 2/4 insuffisants. Il serait incorrect de certifier ses sept modules terminés ou d'exiger rétroactivement des ajouts non prouvés.

Le faux 100 % de la lecture live est corrigé et vérifié ; l'achèvement effectif des deux modules ne peut pas être inventé. Publication suspendue, également pour les autres blocages globaux déjà présents dans roadmap.