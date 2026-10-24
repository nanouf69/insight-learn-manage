# Dossier de bienvenue — engagements e-learning — 24/10/2026

## Périmètre approuvé
- Étape 12 : dates début/fin des accès e-learning, deux confirmations obligatoires avant finalisation et génération du récapitulatif.
- Accès non reçus à la date indiquée : recontacter le centre ; présence à une journée pratique dans les trois semaines à compter du lendemain de l’examen théorique.
- VTC/TAXI/VA/TA e-learning uniquement ; présentiel et formation continue sans nouvelles cases.

## Garanties
- Lecture par jeton personnel existant, sélection du seul dossier autorisé. Date absente/incohérente ou erreur de lecture empêche la finalisation ; aucune date de formation ne remplace une date d’accès.
- Engagements restaurés seulement pour le même dossier et les mêmes dates ; ajout au circuit de reprise existant.
- Dates et textes figés dans les données des futurs dossiers et leur PDF ; téléchargement CRM affiche les engagements uniquement lorsqu’ils existent.
- Aucun ancien dossier/PDF signé réécrit, aucune modification de dates enregistrées, aucune écriture pédagogique, aucun mail/SMS/IA.
- Seule fonction déployée : onboarding-invitation, extension de lecture access_dates. Aucune publication frontend.

## Vérifications
- Tests unitaires du périmètre, dates, engagements, restauration et PDF généré avec données fictives.
- Tests écran finalisation/persistance/PDF avec tous transports fictifs ; aucune vraie soumission ni notification.
- Exécution du handler serveur dans un environnement isolé : jeton invalide 403 sans lecture, jeton HMAC valide limité au dossier, lecture échouée 500.
- Régressions : formation-order-regression, dossier-bienvenue-examens, dossier-bienvenue-depot, dossier-bienvenue-date-examen.
- Navigateur : 1280×1800 et 390×844, ouverture étape 12, dates affichées, cases cochées, signature fictive, finalisation et téléchargement ; tous transports Cloud interceptés. Aucune erreur JS ni débordement horizontal.
- PDF téléchargé inspecté : dates françaises complètes, deux cases [X], délai des trois semaines lisible ; rendu de l’écran inspecté aussi.
- Compilation automatique : build OK.
- NON PROUVÉ : sauvegarde réelle Cloud et ancien dossier réellement téléchargé depuis CRM ; volontairement non exécutés pour ne pas écrire de données élève.