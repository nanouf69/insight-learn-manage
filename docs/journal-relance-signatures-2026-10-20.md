# Onglet de relance individuelle — 20/10/2026

## Périmètre approuvé
Ajout dans la fiche CRM de l’onglet Signatures manquantes : source partagée en lecture seule, dates/créneaux, absences distinctes, anomalies, aperçu, relecture puis confirmation explicite. Envoi unitaire par `sync-outlook-emails`, historique enregistré par le circuit existant. Aucun endpoint batch invoqué, aucune nouvelle autorisation de signature créée.

## Protections
- Pas de changement de questions, réponses, notes, signatures, heures, inscriptions ou gels.
- Date seule sans image non comptée ; absence enregistrée hors relance ; dates futures exclues.
- Liste relue avant confirmation et avant invocation : changement annule l’envoi et requiert un nouvel aperçu.
- Double clic bloqué pendant l’envoi ; aucun retry automatique après tentative ; réponse `skipped` jamais décrite comme nouvel envoi.
- Ismail AMAR exclu de cet onglet.
- Lien `/cours` vers l’espace authentifié, aucun token de mot de passe ou d’inscription réutilisé. Le mail ne crée aucun droit d’émargement ; accès aux créneaux historiques soumis aux règles existantes.

## Preuves exécutées
- Vitest : 23 PASS, trois fichiers (`relance-signatures-manquantes`, `signatures-manquantes`, `signatures-classification`).
- Compilation automatique : build OK, 20/10 à 15:50:53 UTC.
- Chromium CRM connecté, 1280 × 1800 : onglet affichant les deux créneaux pratiques du 20/10, anomalies distinctes, aperçu puis relecture, bouton final de confirmation visible, annulation. Aucune erreur JavaScript ; deux écritures périphériques bloquées ; aucun appel d’envoi réalisé.
- Captures examinées : `/tmp/browser/relance-signatures/onglet.png`, `confirmation.png`.
- SELECT avant/après : 25 lignes d’émargements du dossier, MD5 `d1d1a5b3e62b0816804573fec9ab2025` inchangé (JSONB complet trié par id).

## Limites
Envoi réel, réception inbox, signature par l’apprenant et téléphone réel NON PROUVÉS : aucun mail ni signature réelle autorisé pour ces vérifications. Aucune publication demandée ni réalisée. Pour vérifier ultérieurement l’envoi : comportement de l’onglet, boîte du destinataire et historique du circuit mail existant. Le projet utilise déjà ce circuit ; aucune nouvelle infrastructure d’email mise en place.