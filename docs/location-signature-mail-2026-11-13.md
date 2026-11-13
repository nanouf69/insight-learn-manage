# Contrat de location : signature par mail — aperçu uniquement

## Livré
- Fiche CRM : section « Signature du client par mail », destinataire, validation du texte non précochée, aperçu du mail et bouton « Envoyer pour signature » avec motifs de refus.
- Version PDF finale : retrait des deux mentions résiduelles de brouillon dans les articles/signatures ; brouillon disponible et signalé comme tel. Cela ne certifie pas une revue juridique réalisée.
- Écran client préparé pour un contrat PDF figé, consentement spécifique et tracé, accusé seulement après relecture de la même référence/empreinte, date serveur et lien du PDF final.
- Noyau isolé avec réservation exclusive d’envoi, renvoi après premier envoi confirmé seulement, résultat inconnu en quarantaine, vérification du PNG et de l’empreinte vue.
- Refus explicite dans la branche publique candidate : un modèle location ne tombe pas dans le circuit générique insuffisamment protégé.

## Preuves exécutées
- 47 tests Vitest réussis, 6 fichiers : coordonnées, clauses, version papier existante, circuit isolé et écran client.
- Chromium PC 1280×1800 et mobile 390×844 : aperçu mail, bouton réel désactivé, consentement, tracé fictif et relecture simulée du contrat signé. Aucune requête vers les données hébergées.
- Build automatique : OK, dernière entrée contrôlée 13/11 à 12:11:52 UTC.
- Catalogue réel lu par SELECT uniquement : colonnes documents_a_signer et déclencheur d’immuabilité. Aucun contrat réel créé ni modifié.

## NON PROUVÉ / blocages
- `LOCATION_SIGNATURE_ACTIVE = false` ; aucun transport, stockage, réservation SQL ou preuve append-only location installé. Les dépendances du noyau sont un contrat de conception, pas une garantie actuellement fournie par la base.
- PDF final avec vraie signature : NON PROUVÉ ; le navigateur a testé un PDF fictif et un accusé simulé, pas l’incrustation ou le stockage final.
- Renvoi réel, journal durable et reprise inter-appareils : non disponibles tant que le circuit atomique n’est pas installé et testé en cible isolée.
- Confirmation écrite assurance, pièces annexes et permis restent nécessaires. L’autorisation de préparer cette fonctionnalité n’est pas une preuve d’accord de l’assureur.
- Sauvegarde/restauration complète toujours non prouvée ; aucune activation ou publication.

## Statut
NO-GO pour envoi réel. Aucun mail, migration, déploiement de fonction, publication ou écriture sur dossier réel dans cette intervention.