# Planning pratique — choix de 3 ou 4 candidats par jour

## Correction en aperçu

- Même menu « Candidats par jour » dans Candidats à former et Planning formation pratique, relié au même réglage de session/période.
- 56 VTC : 3/jour = 19 jours ; 4/jour = 14 jours. 12 TAXI : 3/jour = 4 jours ; 4/jour = 3 jours.
- Le choix explicite applique la même capacité aux journées configurées. Les réglages individuels restent lisibles et modifiables ; aucun changement lors d’une simple lecture.
- Répartition des journées VTC/TAXI et places affichées suivent la capacité. Les noms restent ceux des réservations existantes : aucune affectation, annulation, suppression ou notification automatique.
- Le portail candidat lisait encore 3 par défaut, même si max_per_day changeait : désormais la valeur choisie est lue et utilisée pour les jours et les places restantes.
- Confirmation serveur : code lu, utilise déjà max_per_day_map / max_per_day ; aucun changement serveur/migration requis ni déploiement effectué.
- Persistance : circuit existant de sauvegarde de planning par exam_date/date_pratique, seulement après chargement, conservé. Aucun réglage réel écrit pendant les tests.

## Vérifications exécutées

- 16 tests Vitest PASS : capacité 3/4, 56/12 candidats, lecture individuelle sans mutation, listes de candidats et périodes/dates de pratique.
- Deux parcours navigateur fictifs PASS : ordinateur 1621×1125 et mobile 390×844, 3→4→3 depuis chacun des menus, synchronisation des deux menus/totaux/capacités ; captures vérifiées, aucun débordement horizontal ni erreur d’exécution.
- Dernier journal aperçu : build OK.
- Base lue avant changement : 21 configurations, toutes max_per_day=3 ; aucune normalisation/écriture appliquée.

## Limites

Tentative avec le compte du demandeur : session restaurée, mais redirection vers /cours-public ; menu administrateur inaccessible. Toute mutation de table était interceptée. Parcours CRM connecté, sauvegarde puis relecture réelle et réservation effective NON PROUVÉS. Les tests fictifs ne remplacent pas ces vérifications.

Aucune publication, aucun email, aucune réservation ou date de formation réelle modifiée. Le dossier Thomas et les autres chantiers restent hors de ce changement.