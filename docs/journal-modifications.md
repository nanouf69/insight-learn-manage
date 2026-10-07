# Journal des modifications

Entrées chronologiques conservées : ajouter une nouvelle entrée, ne pas remplacer les précédentes.
Ce journal commence le 7 octobre 2026 ; il ne reconstitue pas les interventions antérieures.

## 2026-10-07 — Numérotation administrateur des quiz

- **Accord** : « Autoriser ce périmètre » — correction de la numérotation administrateur, contrôles et journal uniquement.
- **Pourquoi** : l'éditeur calculait encore les parties cours/quiz par position après filtrage des quiz inactifs ; la vue apprenant utilisait déjà les identifiants.
- **Changement** : extraction de la fonction de numérotation, qui utilise désormais `orderedCoursePages` pour les mêmes modules concernés. Les autres règles de numérotation sont conservées.
- **Impact autorisé** : libellés de partie des quiz dans l'éditeur administrateur ; aucun changement de l'ordre apprenant, du contenu ou de la progression.
- **Fichiers** : `src/components/cours-en-ligne/ModuleDetailView.tsx`, `src/lib/exercicePartNumbers.ts`, `src/test/formation-order-regression.test.ts`, `src/test/fixtures/formation-order-baseline-20261007.json`, `AGENTS.md`, `roadmap.md`, ce journal.
- **Référence** : ordre complet des 15 formations dans `FORMATION_MODULES`, séquences des quatre jeux de cours VTC/TAXI/TA/VA, empreintes SHA-256 des 68 fichiers pédagogiques `*-data.ts`. Référence figée avant modification.
- **PASS exécutés** : 102/102 tests (11 existants + 91 nouveaux) ; comparaison des 15 configurations, des quatre séquences cours/quiz, des 68 fichiers ; quiz Gestion et Anglais avec parties inactives ; série supplémentaire TA ; associations VA ; conservation des objets ; aller-retour des coordonnées historiques.
- **PASS comparaison indépendante** : toute la partie de `ModuleDetailView.tsx` après l'ancienne fonction de numérotation est identique octet pour octet ; moteur d'ordre apprenant inchangé. Vérification des empreintes avant/après exécutée.
- **PASS serveur en lecture seule** : 62 états de modules ; empreinte globale avant/après identique `6f6b6cd4233b5623487b9b21b531c4bb` (contenus et exercices masqués compris).
- **PASS compilation** : journal automatique « build OK », 2026-10-07 18:24:27 UTC.
- **NON PROUVÉ** : parcours complets à l'écran sur ordinateur et téléphone, Safari iPhone réel ; configurations individuelles apprenants et contenus générés à l'ouverture non parcourus. Les tests de référence ne certifient pas la justesse juridique des questions.
- **Aucune écriture serveur**, aucun envoi, aucune activation de quiz ; aucune donnée de véritable apprenant utilisée pour un test. Aucun déploiement demandé ni exécuté.

### Procédure pour les prochains changements autorisés

1. Diagnostic en lecture seule, annonce du périmètre et des impacts possibles, accord explicite.
2. Conserver la référence avant modification et les anciens contenus ; ne jamais actualiser une référence uniquement pour faire passer un test.
3. Exécuter les contrôles d'ordre de toutes les formations et les tests ciblés ; comparer les contenus serveur si concernés.
4. Vérifier les écrans concernés avec des données fictives, sans écrire sur un élève réel ; signaler chaque contrôle non exécuté.
5. Ajouter une entrée datée avec fichiers, raison, impacts, preuves et limites ; ne pas déclarer « rien d'autre n'a changé » au-delà des comparaisons réellement exécutées.

## 2026-10-07 18:25 UTC — T3P, accord reçu mais écriture suspendue

- **Demandé/autorisé** : P1 Q29/Q42 et P2 Q36/Q60/Q79 selon formulations approuvées ; réactivation des quiz 1/2 VTC seulement ; textes TPMR/sanctions sans modification.
- **Diagnostic avant écriture** : les quiz partagés sont présents dans les modules 2/10/13/25/32/39. Le déclencheur existant conserve l'activation propre à chaque module. Aucun conflit de contenu entre copies, mais des métadonnées divergent.
- **Blocage hors périmètre** : toute sauvegarde du module 2 déclenche `sync_bilan_from_cours(2,4,false)` ; la propagation vers le module 10 peut déclencher `(10,9,false)`. Simulation en lecture seule de la logique existante : 21 objets questions remplacés côté VTC et 852 côté TAXI avant même les corrections autorisées (différences incluant les métadonnées). La fonction reconstruit les blocs complets et ne limite pas ses effets aux cinq questions.
- **Décision de sécurité** : aucune écriture de contenus ni activation ; aucun déclencheur désactivé/contourné, aucune réparation du mécanisme sans accord supplémentaire. Aucune donnée apprenant écrite ni test réel effectué.
- **Conservation** : les 62 états pédagogiques avant intervention sont conservés en référence temporaire pour comparaison ; aucune donnée personnelle exportée dans le document de questions.
- **Fichiers touchés** : `roadmap.md`, ce journal, mémoire des formulations autorisées ; rapport autonome `Questions-T3P-TPMR-et-sanctions-07-10-2026.md`. Aucun fichier de l'application modifié.
- **Livrable** : questions TPMR, viol et autres sanctions, avec choix et lettres marquées correctes telles qu'enregistrées, sans interprétation juridique.
- **NON PROUVÉ** : corrections et réactivation non exécutées ; affichage après réactivation non testable tant que le blocage demeure. Prochain périmètre à autoriser : empêcher la reconstruction hors périmètre des bilans sans changer les bilans ni les données apprenants.