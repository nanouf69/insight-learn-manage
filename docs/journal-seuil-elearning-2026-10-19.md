# Seuil e-learning 50 % — 19/10/2026

## Périmètre approuvé
- Avertissement non bloquant sur l'accueil élève : heures réellement effectuées / heures e-learning prévues, reste pour atteindre 50 % seulement.
- Rappel refermable au retour du dernier jalon confirmé serveur, après actualisation des heures ; pas sur un compteur en attente.
- Indicateur rouge dans TAUX E-LEARNING et filtre CRM avant découpage de liste.
- Extraction du calcul existant des preuves horaires dans `elearningHoursEvidence` pour partager strictement la formule avec le lecteur groupé CRM.
- Durée inconnue, erreur et chargement ne deviennent pas zéro. Résultats antérieurs masqués si la lecture groupée échoue.

## Fichiers
- `src/lib/seuilElearning.ts`, `src/lib/elearningHoursEvidence.ts`.
- `src/hooks/useSeuilsElearningCRM.ts`, `src/hooks/useApprenantTauxRealisation.ts`.
- `StudentHoursTracker.tsx`, `CoursPublic.tsx`, `ApprenantDetailPage.tsx`, `CRMDashboard.tsx`.
- Trois nouveaux fichiers de tests seuil/CRM/batch ; adaptation des mocks du test présentiel aux créneaux du classificateur existant, sans modification du calcul présentiel.
- `AGENTS.md`, `roadmap.md`.

## Preuves
- PASS : 97 tests dans 12 fichiers exécutés le 19/10 à 16:12 UTC : seuil strict, 20/60 reste 10, limite exacte et arrondie, parcours/durée inconnue, erreurs, lecture groupée, exclusions pratique, progression serveur, gels, heures présentiel inchangées et double montage.
- PASS : contrôle Chromium isolé avec données fictives et appels distants interceptés, rappel visible puis fermeture par Continuer ; bandeau maintenu ; captures ordinateur 1280 × 1800 et téléphone 390 × 844 inspectées, aucun débordement mobile.
- Compilation automatique : build OK. Aucun lancement manuel de compilation.
- NON PROUVÉ : parcours authentifié complet d'un vrai élève et filtre CRM à l'écran. Le contrôle isolé ne prouve pas un parcours réel.

## Préservation
- Aucune modification de données Cloud, questions, réponses, notes, signatures, taux, règles de validation, tentatives ou relevés figés.
- Aucun envoi, compte créé, signature produite, gel exécuté, restauration ni publication.
- Bloc Mon dossier de formation hors périmètre.