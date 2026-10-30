# Contrôle de connaissances — accès TAXI/TA

## Diagnostic et accord
Lecture seule de la session TAXI/TA du 26 octobre au 16 novembre 2026 : le module 13 était absent des listes explicites de Mohktar BEN ALI, Ilyes Dakhlaoui, CIHAN RAYMAN et Harutyun Pndukyan. L’accès de Harutyun était expiré ; aucun changement pour ce dossier. MASSINISSA HADDOU possède une liste NULL, qui déclenche le parcours par défaut : absence du contrôle non établie pour lui.

Les formulaires de création et modification omettaient le contrôle dans les listes TA et TA e-présentiel, alors que le catalogue et les autres variantes théoriques le contiennent.

Accord utilisateur : « Oui, les trois élèves », y compris la correction des futures attributions TA.

## Changements limités
- Ajout du seul module13 en fin des listes des trois dossiers actifs, avec verrouillage, vérification de la liste initiale et du statut/date/session, annulation atomique si un dossier avait changé.
- Trois événements dans audit_journal, avec listes avant/après.
- Ajout de13 aux seules listes TA et TA e-présentiel dans ApprenantForm.tsx et ApprenantEditForm.tsx ; tous les autres IDs conservés.
- Aucun contenu de question, corrigé, réponse, note, validation, date ni snapshot modifié.

## Contrôles exécutés
55 tests PASS : attribution contrôle14, attribution cas pratique26, source modules10, affichage contrôle5. Empreintes des réponses, validations et dossiers hors modules identiques pour chacun des trois dossiers. Les216 snapshots conservent leur empreinte e bad90cec518117b29c6736b891d90dc (sans espace : ebad90cec518117b29c6736b891d90dc).

CRM authentifié : fiche Mohktar BEN ALI → Attribuer les cours, Contrôle coché après relecture ; aucune sauvegarde ou réponse soumise. Build automatique OK. Ouverture autonome sous compte élève NON PROUVÉE.

Les accès sont enregistrés sur Cloud, donc utilisables par le site existant sans publication du frontend. Les corrections des formulaires restent non publiées. Aucun mail/SMS/IA envoyé.