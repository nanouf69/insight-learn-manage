# Feuille de route

## Bloqué — en attente de la fin de la session EB3 et des 15 resynchronisations
Aucun déploiement tant que des élèves passent EB3.

1. Réparer l'écriture des alertes (`alertes_systeme` : RLS refuse toute insertion).
2. Distinguer « identifiants incorrects » et « service temporairement indisponible » sur l'écran de connexion.
3. Corriger `permission denied for function check_apprenant_session` (et `start_or_get_exam_timer`).
4. Règle 48 h : message explicite « Nouveau passage non autorisé avant 48 h » + arrêt immédiat des réessais automatiques (pas de requête chaque seconde sur un refus définitif P0471).
5. Monitoring externe de la base (indépendant de la base elle-même) + health checks + alerte automatique si authentification ou sauvegarde indisponible.
6. Conservation des journaux au-delà d'un redémarrage (export périodique hors base) pour permettre une vraie analyse de cause racine.
7. Test de charge sur données fictives : charge du 22/09 puis ×2 et ×3 ; dimensionnement de l'instance décidé APRÈS ce test.

## Suivi en cours (lecture seule, sans modification)
- 15 matières EB3 en cours à 19h46 : confirmer la resynchronisation élève par élève (🟢/🟠/🔴).

## Décisions utilisateur en attente
- Affichage des QRC corrigées automatiquement (2 333) en orange plutôt qu'en vert.
- 2 divergences de contenu EB3 (longueur minimale VTC hybride, prix psychologique).
- Reprise de la copie incrémentale des matières finalisées (corriger `core_import_passage_finalise` / `audit_journal`).
