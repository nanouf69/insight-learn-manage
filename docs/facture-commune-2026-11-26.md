# Facture commune — 26 novembre 2026

## Périmètre
- Sessions de formation continue → Factures : cocher au moins deux apprenants, puis « Créer une facture commune ».
- Choisir explicitement le destinataire et confirmer qu’il prend en charge tous les stagiaires ; ajuster chaque montant avant création.
- Une nouvelle facture en brouillon, avec une ligne nominative par apprenant et la somme des montants. Les anciennes factures et leurs paiements restent séparés ; un avertissement et une confirmation sont exigés s’ils existent déjà.
- Liste distincte dans la session, lien vers Comptabilité → Toutes les factures, aperçu/validation du brouillon commun et PDF nominatif.
- Aucun envoi de mail ajouté, aucun changement de cours, de validation ou de preuve individuelle de paiement/présence.

## Contrôles exécutés
- **PASS :** `bunx vitest run src/test/facture-commune.test.ts src/test/facture-fournisseur-identite.test.ts` — 8 tests.
- **PASS :** `python3 src/test/facture_commune_sql_contract.py` — 14 scénarios PostgreSQL jetables. Deux apprenants, doublons, montant positif, inscription, rôle admin, total 400 €, identité côté serveur, réessai sans doublon, confirmation des factures existantes, conservation après refus, lignes figées, total protégé, isolation apprenant et validation du brouillon, restriction FC.
- **PASS :** formulaire signé admin PC/mobile : deux sélections, destinataire et confirmations obligatoires, montants 200 € + 200 € = 400 €.
- **PASS SIMULÉ UNIQUEMENT :** clic de création intercepté, réponse et relecture remplacées par une facture fictive en mémoire ; affichage dans la session puis dans Comptabilité, téléchargement PDF. Aucun appel réel de création transmis. Le PDF téléchargé contient les deux noms et le total 400 €.
- **PASS :** dernier signal de construction de l’aperçu : `build OK`.
- **Lecture réelle :** zéro facture commune enregistrée à l’issue des vérifications.

## Non prouvé / mise en ligne
- Aucun premier enregistrement réel ni validation réelle de facture commune testé ; les tests de persistance ont été exécutés uniquement dans PostgreSQL jetable.
- Aucune publication du site et aucun mail de test.
- Les ajouts de structure et les contrôles de création ont été appliqués au service de données partagé entre aperçu et site publié. Le bouton et les nouveaux écrans restent dans l’aperçu tant qu’ils ne sont pas publiés.