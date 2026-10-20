# Onglet « Signatures manquantes » dans la fiche apprenant

## Résultat prévu
- Ajouter un onglet dans chaque fiche apprenant du CRM, à côté de « Session ».
- Afficher les dates et créneaux sans signature réelle, depuis le même calcul que le bilan des signatures. Une erreur de lecture affiche « Indisponible », jamais zéro signature manquante.
- Distinguer les absences enregistrées et les anomalies ; ne pas les transformer en présence.
- Proposer un aperçu du mail individuel puis une confirmation explicite avant envoi à l’adresse de l’apprenant, depuis **contact@ftransport.fr**, par le circuit Outlook déjà utilisé dans le CRM.
- Inclure les créneaux manquants et le lien vers l’espace apprenant. Préciser de signer uniquement en cas de présence réelle, le jour du cours ou après, avec conservation de la date réelle de signature.
- Relire les signatures avant la confirmation finale pour ne pas relancer des créneaux déjà signés. Pas de renvoi automatique en cas de résultat d’envoi incertain.

## Protections
- Aucun mail réel envoyé pendant les vérifications ; aucun envoi collectif ou automatique.
- Aucun changement aux signatures, feuilles, inscriptions, comptes, questions, réponses, notes, heures ou relevés figés ; aucune création de feuilles historiques.
- Aucun traitement d’Ismail AMAR.
- Aucune publication sans demande explicite.

## Fichiers et détails techniques
- `src/components/crm/ApprenantDetailPage.tsx` : ajouter uniquement le titre et le contenu de l’onglet.
- `src/components/crm/apprenant-sections/SignaturesManquantesTab.tsx` (nouveau) : liste, états de lecture, aperçu et confirmation d’envoi individuel.
- `src/lib/relanceSignaturesManquantes.ts` (nouveau) : préparation du message, exclusion des absences et contenu HTML échappé.
- `src/test/relance-signatures-manquantes.test.ts` (nouveau) : tests sur données fictives des exclusions et de la relecture avant envoi.
- Réutiliser `chargerSignaturesManquantes` et `sync-outlook-emails` sans changer leurs règles ni les anciennes relances.
- `AGENTS.md`, `roadmap.md` et un journal daté : périmètre et résultats des contrôles.

## Vérifications
- Tests ciblés sur données fictives, notamment créneaux futurs, absences, signatures déjà réalisées et lecture impossible.
- Vérifier l’onglet et l’aperçu sans autoriser d’envoi réel ni d’écriture sur un dossier apprenant.
- Contrôler la compilation automatique. L’envoi réel restera non prouvé tant qu’aucun envoi individuel n’aura été expressément autorisé.