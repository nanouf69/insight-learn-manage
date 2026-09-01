# Forcer l’expéditeur FTRANSPORT

## Objectif
Empêcher définitivement l’affichage de « GUENICHI NAOUFAL » comme expéditeur des emails envoyés par l’application.

## Modifications
- Centraliser les envois sortants sur le service email qui fixe explicitement l’expéditeur à `FTRANSPORT <contact@ftransport.fr>`.
- Remplacer les envois directs encore liés au profil nominatif de la boîte email, notamment les identifiants, relances, documents et renvois.
- Conserver `contact@ftransport.fr` comme adresse de réponse et enregistrer `sender_name = FTRANSPORT` dans l’historique.
- Ajouter une vérification automatisée interdisant toute réapparition du nom personnel dans les fonctions d’envoi.

## Vérification
- Contrôler tous les chemins d’envoi et leurs traces en base.
- Tester les fonctions concernées et vérifier la compilation sans modifier les contenus pédagogiques.
