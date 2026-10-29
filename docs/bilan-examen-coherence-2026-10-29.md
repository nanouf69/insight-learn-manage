# Bilans examen TAXI / TA — 29 octobre 2026, 13:35–13:49 UTC

## Réalisé
- Lecture des neuf absences locales : IDs 45,46,47,48,49,51,52,53,54 dans le JSON TAXI 11/606, absentes de la banque commune 606. Aucun ajout effectué : voir blocage TA ci-dessous.
- Migration 0219 appliquée et définition serveur relue : les futurs passages TAXI 11/606 figent exactement les 40 questions canoniques actives dans l’ordre administratif, et non les 49 JSON. Identités existantes conservées ; lecture vide refusée. Le traitement national 11/605 reste inchangé ; les passages existants sont retournés avant toute lecture de contenu actuel.
- La banque nationale contient toujours 84 actifs ; les sept IDs79,82,83,85,86,87,88 sont présents une seule fois aux positions79–85. Pas de réinsertion.
- Q73 fictive, identifiant permanent73 (ne pas confondre avec le numéro affiché73), reste inactive. Les quatre copies nationales historiques l’ont toujours et sont désormais toutes soumises : 30/76,40/76,38/76,48/76 bonnes réponses, scores39,53,50,63. Aucun retrait, masquage ou recalcul de ces copies.

## Vérification des neuf questions locales
| ID | Clé JSON | Conclusion / arbitrage |
|---|---|---|
|45|D|Aller-retour avec client à23h50 : tarifB selon page officielle 2026 ; ne pas ajouter avecD.|
|46|C|Demande préalable covering non établie par règlement2024 actuel ; suspendue.|
|47|B|Basilique Notre-Dame de Fourvière : vérifiée, aucun équivalent dans les40.|
|48|A|Musée des Confluences : histoire naturelle/anthropologie/sociétés/civilisations, vérifiée.|
|49|B|Lugdunum : vérifiée, distincte de l’adresse du musée déjà présente.|
|51|A+C|Âge réglementaire moins de10ans ; huit ans ne suffit pas à exclure le véhicule. Clé actuelle non valide.|
|52|A|400litres règle générale, mais dérogation300litres faibles/très faibles émissions : formulation à préciser. Notion déjà couverte parQ40.|
|53|C|23communes + aéroport, pas24communes ; aucune option23. Ne pas ajouter telle quelle.|
|54|B|Autorisation préalable publicité non établie ; doublon de notion avec46.|

Sources officielles consultées :
- https://mobilites.grandlyon.com/espace-pros/conducteurs-taxi
- https://api.mobilites.grandlyon.com/fileadmin/user_upload/media/PDF/PROs/Taxis/Taxis_arrete_Metropolitain_20241127.pdf (article7, règlement2020 abrogé)
- https://api.mobilites.grandlyon.com/fileadmin/user_upload/media/PDF/PROs/Taxis/ARRETE_PREFECTORAL_21092026_relatif_%C3%A0_la_r%C3%A9glementation_des_taxis_dans_le_d%C3%A9partement_du_Rh%C3%B4ne.pdf (article17 :23 communes+aéroport)
- https://mobilites.grandlyon.com/univers/voiture/clients-taxi (aller-retour de nuitB, retour à videD)
- https://www.fourviere.org/fr/vie-du-site-notre-dame-de-fourviere/notre-dame-de-fourviere/la-basilique/
- https://museedesconfluences.fr/fr/le-musee/le-projet
- https://lugdunum.grandlyon.com/fr/un-musee-de-sites/fondation-de-lyon

## STOP : ajouts partagés et TA
- TA28 lit les mêmes sections605/606 via bindings700/701, mais ne possède aucun snapshot : module28 absent des flags et du circuit d’ouverture.
- Lecture réelle : 6 copies nationales TA et8 locales TA in_progress (une personne peut avoir les deux) ;12 nationales et5 locales soumises. Ajouter même les trois questions vérifiées modifierait immédiatement la liste des huit copies locales TA en cours. La contrainte de preservation impose de différer les ajouts jusqu’à un mécanisme futur-only démontré ou la fin de ces copies. Aucun snapshot historique fabriqué, aucun flag TA activé.
- La cohérence des anciens passages avec le contenu administratif actuel n’est ni réalisée ni revendiquée. Les nouveaux TAXI locaux sont alignés ; TA garde la banque actuelle40/84.

## Incident pendant contrôle interface
- Première ouverture d’Éditer TAXI, sans saisie intentionnelle, suivie de lecture : Q68 repasse deA àA+D à13:39:39.079004 ; JSON module11 sauvegardé13:39:40.536544. Corrélation temporelle observée, déclencheur exact NON PROUVÉ.
- Q68 rétablie immédiatement àA seule par écriture conditionnée sur cet exact horodatage ; lecture finale confirme49=B,68=A,70=D. Aucun historique renoté.
- Les contrôles suivants ont bloqué toutes écritures REST/fonctions avant l’ouverture (seule RPC has_role en lecture autorisée). Aucun autre changement de question autorisé. Le pipeline possède un risque de promotion d’un callback vers une intention admin ; origine exacte non reproduite, correctif de ce pipeline non effectué dans ce périmètre.
- Empreintes globales questions/JSON ont donc changé pendant l’ouverture : NE PAS déclarer toutes données inchangées. Les214 snapshots conservent exactement l’empreinte7150dc306fb6b6dafcf9b4db188cde3a avant/après.

## Tests exécutés
- PASS12 assertions PostgreSQL jetable :40 canoniques, ordre, texte, choix, identités QCM, métadonnées nulles, réouverture entièrement identique après modification de source fictive, VTC inchangé, TA non activé, source locale vide refusée, Q73 exclue des futurs nationaux. Fichier src/test/bilan_local_future_sql_contract.py, migration réellement appliquée rejouée.
- PASS132 tests : lectures projetées605/700=84 et606/701=40, IDs/ordre/énoncés/choix, clés49B/68A/70D, Q73 inactive, toutes combinaisons de réponses des124 questions actives. Fichier src/test/bilan-national-local-coherence-20261029.test.ts ; fixture lecture serveur réelle sans données personnelles.
- PASS23 tests existants : neuf QCM nationaux, archives de notes, QRC historiques, lecture session et refus snapshot manquant.
- PASS interface administration connectée et aperçu local TAXI/TA :40 questions, vrais clics d’ouverture des matières ; capture locale TAXI et TA consultée. Aperçu national TA ouvert ; ce n’est pas une connexion élève autonome ni une soumission.
- NON PROUVÉ : connexion élève autonome, ouverture/soumission réelle Cloud de bout en bout, écran national complet TAXI et toutes réponses corrigées à l’écran. Aucun test d’écriture avec un vrai apprenant.
- Dernier journal compilation : build OK13:45:56Z. Aucun frontend applicatif modifié, aucune publication ni mail/SMS/IA élève.

## Arbitrages nécessaires
1. Autoriser la préparation d’un circuit TA réservé aux futurs passages, sans reconstruction des copies actuelles, avant ajout des trois questions47/48/49.
2. Confirmer nouvelles formulations/clés proposées45=B,51=A,53=23communes+aéroport et clarification52 ;46/54 suspendues sans preuve de demande préalable.
3. Neutralisation Q73 dans les quatre notes historiques : nécessite une correction distincte approuvée ; aucune note existante ne sera réécrite.
4. Traitement de la réécriture observéeQ68 : reproduction isolée puis correction ciblée de l’intention d’édition, jamais une nouvelle harmonisation silencieuse des historiques.