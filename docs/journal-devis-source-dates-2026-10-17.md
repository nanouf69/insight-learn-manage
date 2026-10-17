# Dates de formation du devis — 17/10/2026

- Demande : seules les dates choisies dans le devis sont utilisées, jamais celles de la fiche élève.
- Diagnostic lecture seule : l’aperçu DOCX reprenait la date de début de la fiche ; les deux générations DOCX utilisaient cette même date en repli lorsqu’aucune session n’était choisie.
- Correction limitée à ces trois expressions dans `DevisSection.tsx`. PDF, dates enregistrées et page de signature utilisaient déjà les dates du devis.
- Aucun historique, dossier, prix, réservation ou document enregistré modifié. Aucun envoi réel ni publication.
- Vérifications : 10/10 tests Vitest PASS ; compilation automatique OK à 08:55:28 UTC. Recherche statique : plus aucune référence à `date_formation_catalogue` ou `date_debut_formation` dans DevisSection.
- Navigateur isolé : fiche fictive datée au 16/10, aperçu sans sélection = « — » ; sélection du 22 octobre = même date dans aperçu et DOCX téléchargé inspecté. Envoi simulé, page publique et signature simulée confirmés, zéro erreur JavaScript. Captures inspectées.
- Réception réelle et signature réelle NON PROUVÉES : aucun appel réel d’envoi ou de signature autorisé. Aucun test pédagogique global exécuté, fichiers pédagogiques hors périmètre.