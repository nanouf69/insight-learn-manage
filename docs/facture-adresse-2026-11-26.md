# Adresse du destinataire — 26 novembre 2026, 16:28 UTC

La capture concerne le champ « Email du destinataire de la facture » de l’édition, et non la confirmation de suppression.

## Diagnostic en lecture seule
Les requêtes de la capture renvoient déjà une adresse de facturation financeur et une adresse apprenant (HTTP 200). La capture montre l’état transitoire « Chargement de l’adresse… ». Aucune adresse inexistante ou panne de lecture n’est démontrée dans ces traces.

## Ajustement en aperçu
- Priorité existante conservée : mail de facturation du financeur, contact/coordonnées de facturation, sinon apprenant lorsqu’aucun financeur n’est identifié. Aucun remplacement silencieux d’un financeur sans adresse.
- Champ modifiable même pendant la lecture, aucune réponse tardive ne remplace une saisie manuelle.
- Lecture bornée à dix secondes, annulée à la fermeture/changement de facture ; erreur visible et champ déverrouillé en cas d’échec.
- Aucune écriture, adresse inventée, modification de facture ni activation de l’avis.

## Vérifications
- PASS : 26 tests existants destinataire, avis/suppression, envoi et révisions.
- PASS : quatre parcours Playwright isolés : financeur à 1158 px, stagiaire sans financeur à 390 px, saisie manuelle protégée après lecture tardive et lecture en erreur avec saisie possible. Captures du champ vérifiées. Toutes les requêtes externes interceptées ; aucun enregistrement ni mail réel.
- NON PROUVÉ : ouverture de la facture réelle, session disponible n’ayant pas permis de retrouver sa ligne.
- Fichier modifié : `src/components/comptabilite/ComptabilitePage.tsx`.