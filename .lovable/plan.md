# Choix de réinscription et réactivation d’un mois

## Sur la fiche élève
- Rendre le badge **Réinscription examen** cliquable, même lorsque l’élève n’a pas répondu.
- Permettre à l’administrateur de choisir **Oui** ou **Non**, puis confirmer l’enregistrement.
- Conserver chaque modification datée et son auteur. Afficher clairement « choix enregistré par l’administration », distinct d’une signature de l’élève ; ne jamais modifier les documents signés.
- Afficher le même choix actuel dans la fiche CRM et les listes d’examens. Aucun envoi ni inscription automatique.
- Rattacher le changement à l’examen concerné, y compris sans réponse signée, pour ne pas modifier le choix d’un autre examen.

## Nouvel onglet « Réactiver la plateforme »
- Afficher la fin d’accès actuelle et la nouvelle date avant confirmation.
- Accès expiré : réactivation à partir du jour de confirmation pour **un mois calendaire**. Accès encore actif : ajouter un mois à la fin actuelle, sans raccourcir la période.
- Garder le compte existant, les modules attribués, les réponses, les notes, les tentatives et les relevés figés. Ne modifier ni les dates de formation ni les signatures.
- Ne pas recréer de compte ni envoyer de mail/SMS. Les comptes bloqués et dossiers supprimés, abandonnés ou archivés restent bloqués : leur réouverture nécessiterait une action distincte.
- Une confirmation = une extension ; double clic ou reprise réseau ne doit jamais ajouter deux mois.

## Protections et vérifications
- L’administrateur doit être autorisé côté serveur ; aucune autorisation tirée du navigateur.
- Relire le résultat après enregistrement ; une erreur de lecture ne vaut jamais une réussite ou une valeur vide.
- Contrôles isolés sur choix Oui/Non, historique, expiration, fin de mois, double clic, refus d’accès et panne réseau ; aucun test d’écriture sur un dossier réel, aucun appel IA.
- Journal daté et comparaison avant/après des données concernées. **Aucune publication sans votre accord.**

## Détails techniques — périmètre prévu
- `src/components/crm/apprenant-sections/ChoixPratiqueBadges.tsx` et un formulaire administratif dédié.
- `src/components/crm/ApprenantDetailPage.tsx` et un nouvel onglet de réactivation.
- `src/components/examens/ReinscriptionExamenBadge.tsx` et une lecture partagée du choix administratif, sans modifier le circuit de signature.
- Migration additive : journal administratif de choix et réactivations, opérations idempotentes réservées aux administrateurs ; historique append-only.
- Réactivation enregistrée comme période supplémentaire distincte, avec garde de concurrence : conserver les dates d’accès initiales et les références historiques de fin d’accès. Tracer d’abord les contrôles serveur et écran de la fenêtre d’accès, puis leur faire reconnaître cette extension sans recalcul des relevés figés ni des engagements signés. La commande refusera les dossiers sans compte existant.
- Tests dédiés, rapport dans `docs/`, règles structurelles dans `AGENTS.md` et suivi dans `roadmap.md`.