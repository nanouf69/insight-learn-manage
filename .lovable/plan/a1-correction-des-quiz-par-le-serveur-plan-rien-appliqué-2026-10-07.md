# A1 — Correction des quiz par le serveur (plan, rien appliqué)

## Problème
Les bonnes réponses sont lisibles par un élève connecté à trois endroits : la table des questions, les contenus pédagogiques des modules, et le code de l'application. La correction se fait dans le navigateur.

## Ce qui sera fait (après accord, étape par étape)
1. Fonction serveur « corriger le quiz » : reçoit les choix de l'élève, compare avec les bonnes réponses lues côté serveur, enregistre et renvoie la note. Elle réutilise exactement la formule actuelle.
2. Phase d'observation : pendant quelques jours, l'application calcule la note comme aujourd'hui ET interroge le serveur. Les écarts sont journalisés, l'élève ne voit aucun changement.
3. Bascule : la note affichée vient du serveur seulement. Le navigateur ne calcule plus rien.
4. Masquage : les contenus envoyés aux élèves ne contiennent plus la marque « correcte ». La table des questions est réservée aux admins et formateurs. Les bonnes réponses sont retirées du code envoyé aux élèves.
5. La correction affichée après validation (« bonne réponse = B ») est renvoyée par le serveur, seulement une fois le quiz terminé.

## Ce qui ne change pas
Notes, tentatives, progression, corrections formateur, examens blancs déjà passés. Rien n'est recalculé rétroactivement.

## Risques
- Hors connexion : le quiz ne peut plus être noté sans le serveur (réponse gardée en file locale jusqu'à confirmation).
- Éditeur admin et portail formateur doivent garder l'accès aux bonnes réponses.
- Quiz partagés entre modules : même règle partout.

## Contrôles
Tests d'ordre des 15 formations, comparaison des empreintes des 23 tables élèves avant/après, comparaison serveur/navigateur sur compte fictif uniquement, journal daté à chaque étape.
