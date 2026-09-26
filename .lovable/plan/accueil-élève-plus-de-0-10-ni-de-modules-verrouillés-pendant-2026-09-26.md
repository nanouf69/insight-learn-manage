# Accueil élève : plus de « 0/10 » ni de modules verrouillés pendant le chargement

Affichage uniquement, un seul fichier de code : `src/pages/CoursPublic.tsx` (+ un fichier de test).

## Constat (lecture seule)
- La grille « À faire / Réalisés » attend déjà la progression serveur.
- Mais le bandeau de bienvenue, la barre XP/badges et le bloc « modules terminés X/10 » (bloc avec `completedCount` / `globalProgress`) s'affichent tout de suite avec 0, et les suggestions « modules à commencer » aussi.
- Si le chargement échoue, rien ne l'indique : « Récupération… » reste affiché indéfiniment.

## Ce qui change
1. **Pendant le chargement** : `getLearnerModuleDisplayState` appelé avec `loaded: completionsLoaded` (au lieu de `true`). Tant que la progression n'est pas arrivée :
   - compteurs remplacés par « Chargement… » (bienvenue, XP/badges, X/10, % global) ;
   - aucun module affiché verrouillé, « à faire » ou dans les suggestions.
2. **En cas d'échec** : nouvel état `completionsError` quand `fetchModuleCompletions` renvoie une erreur (après ses essais déjà prévus). Message « Impossible de charger votre progression » + bouton « Réessayer », qui relance uniquement la lecture. Jamais 0/10.
3. **Aucune écriture** : ni validation, ni réparation, ni statut. Seules des lectures sont relancées.

## Non touché
Synchronisation (fichiers listés dans les règles), questions, notes, réponses, progressions, boutons élèves (dont « Refaire les fausses »), `moduleUnlockLogic.ts` (lecture seule).

## Essais sur le compte TEST (preview, pas de publication)
- Rechargement de l'accueil : captures à 0,5 s / 2 s / fin → jamais 0/10 ni cadenas.
- Réseau lent (lecture de la progression retardée) : « Chargement… » visible.
- Réseau coupé sur la lecture : message + « Réessayer » ; au rétablissement, clic → bons chiffres.
- Arrêt avant toute publication.

## Fichiers
- `src/pages/CoursPublic.tsx` — état chargement/erreur des compteurs et bouton Réessayer.
- `src/test/cours-public-chargement.test.ts` (nouveau) — vérifie qu'aucun 0/10 ni verrou n'est calculé tant que `loaded=false`.
