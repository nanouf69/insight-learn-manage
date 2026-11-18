# Indicateur 8 — admissions documentaires, 18/11/2026

## Résultat enregistré et relu
- 234 inscriptions éligibles pour 187 dossiers : 234 nouvelles preuves et 234 liens à l’indicateur 8, décision « Accepté / Admis en formation ».
- 5 anciennes preuves/liens conservés. Aucun questionnaire original, inscription, dossier CRM, signature, note ou résultat réécrit.
- Décisions enregistrées dans les preuves Qualiopi, pas dans les questionnaires historiques : leur circuit de révision durable reste non raccordé.
- Chaque preuve conserve dossier, inscription, session, nom exact de session, bornes connues et IDs des traces de participation. La session reste la source historique, jamais la formation actuelle du CRM.
- 0 début/fin effectifs manquants parmi les 234 preuves. 163 inscriptions n’ont pas de bornes individuelles saisies : dates exactes de leur session conservées, sans remplir rétroactivement l’inscription.
- 234 dates de décision historiques à confirmer : aucun champ explicite de décision/date dans les formulaires analysés. Horodatages de signature, création et validation ne deviennent pas des dates d’admission.
- Les dates de formation ne sont pas des dates d’expiration documentaire ; champs de validité laissés vides.

## Éligibilité conservatrice
Émargement image signé, non masqué et non absent dans la période effective ; rattachement apprenant/date seulement si une inscription de formation unique correspond. Signatures papier : inscription/session/document concordants ; présence administrative : créneau exact, PDF référencé, validation non annulée. Plusieurs inscriptions simultanées sans preuve de rattachement explicite restent en exception.

Une présence prouvée documente l’entrée/suivi, pas l’assiduité complète, le positionnement réalisé avant entrée, l’achèvement intégral ou la réussite examen. Statut Qualiopi « À compléter » conservé.

## Exceptions sans mutation
- 325 inscriptions : 294 participation non rattachée avec certitude ; 20 futures ; 11 exclusions/interruption à revoir.
- 169 dossiers ayant une inscription n’ont reçu aucune décision ; 42 dossiers admis pour une inscription restent en exception pour une autre.
- 3 013 autres dossiers sans inscription de formation en session identifiable : aucune admission déduite. Parmi le premier recensement sans session, 50 dossiers avaient des réponses/modules pédagogiques : preuve d’activité, mais rattachement historique formation/période non établi ; ils restent à revoir, pas déclarés absents.
- Comptes techniques et noms de test/démonstration exclus, y compris variantes avec tirets. Aucun compte test dans les 234 nouvelles preuves, vérifié en SQL.
- Liste individuelle produite dans le classeur privé remis à l’utilisateur : admissions + exceptions, IDs de dossier/session/inscription et motifs, sans données sensibles de questionnaire, mots de passe ou signature.

## Vérifications effectuées
- 12 tests du SQL d’audit sur PostgreSQL jetable : participation obligatoire, date de décision NULL, tests exclus, masquage, absence, chevauchement, dates individuelles, futur, interruption, examen exclu, source de session préservée.
- Relecture SQL : 234 preuves / 187 dossiers / 234 liens / zéro début-fin manquant / zéro date historique inventée / 5 liens antérieurs conservés.
- Empreintes globales avant/après strictement identiques pour apprenants, inscriptions, questionnaires complétés, émargements et résultats quiz.
- Navigateur avec compte administrateur : indicateur 8 affiche 239 preuves, détail d’une décision FC et dates lisibles ; 239 preuves conservées après rechargement. Aucun formulaire soumis pendant le contrôle.
- Aucun envoi, migration, déploiement de fonction ou publication. Écritures des seules preuves Cloud effectives immédiatement ; il ne s’agit pas de simples données d’aperçu.

## Limites
Inventaire des inscriptions structuré intégral ; absence de participation non affirmée pour les exceptions. Archives papier privées référencées non ouvertes individuellement ; leur présence dans la base n’est pas une nouvelle certification de validité du fichier. La participation pédagogique sans session exige un rapprochement individualisé avant admission historique.