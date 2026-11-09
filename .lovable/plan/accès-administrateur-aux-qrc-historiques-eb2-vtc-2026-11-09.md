# Accès administrateur aux QRC historiques EB2 VTC

## Périmètre autorisé
- Ajouter « EB2 — VTC — ancien circuit » dans Correction QRC V2, pour les copies historiques remises existantes.
- Préserver les options/circuits actuels, les filtres sessions et dates, et séparer les anciennes copies déjà représentées en V2.
- Aucune migration, activation de version, création de copie, écriture de réponse, note, statut ou progression. Aucun changement au verdict d’examen ni aux protections EB3.

## Correctif et vérifications
1. Lire les résultats historiques EB2 par pages stables ; exclure ceux dont le snapshot V2 porte exactement leur identifiant de résultat, sans rapprochement par date ou nom.
2. Réutiliser le lecteur historique par identifiants de résultats, conserver les réponses et corrigés figés. Vérifier sa fidélité ; si une incompatibilité empêche cette garantie, arrêter la publication.
3. Tester le menu, novembre journée/soirée, pagination, filtrage date et absence de doublons ; conserver les circuits EB1, EB2-TAXI et EB3–EB6.
4. Comparer les fichiers actifs avec la version publique, vérifier tests et compilation, puis sécurité. Publier uniquement si le correctif est le seul changement fonctionnel embarqué.

## Détails techniques
- Modifications ciblées : liste historique dans `noyauReel.ts`, libellé dans `AdminCorrectionQrcV2Reel.tsx`, tests ciblés ; lecteur historique uniquement si nécessaire à la fidélité EB2.
- Contrôle préalable : les fichiers actifs correspondent à la référence publique examinée ; les prototypes EB2/EB3 restent hors imports applicatifs et hors migrations actives.
- La confirmation navigateur authentifiée reste nécessaire ; une lecture des sources ou un écran fictif seul ne sera pas présenté comme une vérification du compte administrateur.
