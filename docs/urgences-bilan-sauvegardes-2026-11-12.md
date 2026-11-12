# Deux correctifs isolés — 12 novembre 2026

## Bilan examen VTC

Correction de présentation dans `ModuleDetailView.tsx`, avec `BilanVtcComplements.tsx` et `bilanVtcComplements.ts`.

- Nouveau Bilan A–E inchangé, reste monté pendant la navigation.
- Compléments : exercices 505 (49 questions), 506 (46), 507 (48), cours QRC 9001. Contenu serveur lu avant vérification.
- Réutilisation de `LearnerPreview`, `renderSingleExercicePage` et `renderCoursPage`, mêmes identités, restauration des réponses/snapshots et ordre historique.
- Filtre de navigation seulement : les tableaux utilisés pour les réponses et preuves ne sont pas réduits/renumérotés. Les données inactives restent masquées.
- Aucun accès complémentaire module 11 ; aucune version, éligibilité ou migration modifiée.
- Compléments : aucun bouton de remise à zéro ni validation globale du module ; la saisie/soumission de l'exercice reste dans son transport historique. Progression globale A–E non réécrite par la vue complémentaire.
- Aperçu CRM : saisie, validation, correction IA, ouverture de snapshot et sauvegardes refusées ; garde globale existante maintenue.

### Preuves exécutées

Chromium, vrai `ModuleDetailView`, contenu module 5 lu sur serveur puis réponses fictives interceptées : F=49, G=46, H=48 ; cours 9001 visible ; réponse 505-1 B restaurée et toujours visible après retour A–E ; aucun appel pédagogique mutateur. Captures PC/mobile sous `/tmp/browser/urgences`. Tests de filtre et maintien de réponse A–E exécutés. Pas de saisie réelle élève.

**Mise en service** : correctif frontend uniquement, aucun serveur requis. Ne pas publier l'aperçu global. Reporter ces trois fichiers et la règle locale dans une base correspondant au bundle public, vérifier puis publier ce paquet isolé. La publication frontend ciblée par fichier n'est pas disponible dans cet environnement. NON PROUVÉ : soumission complète learner legacy 505–507 avec serveur fictif intégré, toutes variantes de copies figées, et nouveau parcours sur le site public. Aucun élève réel utilisé pour écrire une réponse.

## Sauvegardes

Fonction `sauvegarde-quotidienne-eleves` seule mise en service ; aucun bundle frontend, cron global, restauration, migration ou règle du bucket changé.

### Causes confirmées

- 11/11 : manifeste incomplet, fin 02:38:25 UTC, 26 tables, journal abandonné à 0 après trois erreurs puis compte absent.
- 12/11 : fin 02:42:06 UTC (**03:42 Paris**), cinq erreurs. Journal abandonné à 0 + compte absent ; trois divergences sous concurrence :
  - `apprenant_question_temps` : 287739 exportées / 287714 début / 287753 fin.
  - `answer_state` : 45781 exportées / 45781 début / 45783 fin.
  - `answer_state_historique` : 182505 exportées / 182451 début / 182589 fin.
- Fichiers d'erreur journal et historique vides : ancien code utilisait un message vide. Aucun code SQL exact ne peut être déduit de ces fichiers.
- Sondes réelles bornées : comptage exact journal et historique échoue sans code/message (10,9 / 14,3 s), mais chaque page de 10 lignes se lit. La cause opérationnelle prouvée est le comptage bloquant avant toute pagination ; le timeout précis 57014 reste NON PROUVÉ pour ces nuits.
- Les divergences ne sont pas assimilées à des pertes certaines : elles signalent un export non instantané pendant des écritures.

### Correctifs et préservation

- Échec d'un comptage = observation indisponible (-1), pas abandon des pages lisibles. Parcours et marqueur final ne certifient jamais intégrité/restauration.
- Pages journal 250 lignes, mêmes clés, erreurs de lecture réessayées au même curseur. Aucun décalage historique changé.
- Lots existants identiques : réutilisés ; différents : refus explicite, jamais écrasés. Aucun ancien lot ou manifeste historique supprimé.
- Nouveaux lots : SHA-256 du fichier, nombre de lignes et bornes de clés inscrits au manifeste. Les anciennes nuits ne sont pas rétroactivement certifiées.
- Réexport indépendant `_reparation-1`, liste issue des seules erreurs ; aucun mélange avec les lots de la nuit.
- Diagnostic admin authentifié, chemins bornés 11/12, aucune réponse élève renvoyée ; bucket `public=false` confirmé.

### Rattrapage effectivement réalisé

Procédure existante appelée une fois par nuit, `saut:39` pour **aucune chaîne automatique** :

```json
{"jour":"2026-11-11","reparer":true,"saut":39}
{"jour":"2026-11-12","reparer":true,"saut":39}
```

Chaque nuit : premier lot journal = **10000 lignes**, **10000 clés uniques**, ordre croissant vérifié par relecture privée. 11/11 lot SHA-256 `7db35a8656caff275668f3234a6ee488a6b1ffb0b4fd7ddc042a3b59beab9d87` ; 12/11 `f942fd8748523b53f8f7a307171e800f6615f42a105f4fa8e76e859abd86c864`.

**Rattrapage incomplet** : curseur 10000 sur chaque journal, aucun marqueur terminal de réparation. 12/11 autres trois tables pas encore réexportées. Le journal volumineux exige de nombreux paquets ; aucune chaîne intensive lancée pendant les parcours élèves. Rien ne continue automatiquement depuis ces appels (les tâches programmées déjà existantes restent inchangées).

### Suite ciblée et vérifications

Réappeler une nuit à la fois avec le même JSON et `saut:39`, en contrôlant charge/délais entre paquets. Relire `_etat.json` avant chaque reprise ; ne pas changer le curseur, ne pas démarrer une réparation concurrente. À la fin : `_reparation-1/_export_termine.json` ou `_incomplet.json`, liste des tables attendues, somme des lignes des lots, unicité/ordre des clés et SHA-256 de chaque lot. Les comptes observés ne suffisent pas à prouver une couverture instantanée, particulièrement pour UUID sous concurrence. Une restauration jetable et une comparaison serveur cohérente restent nécessaires avant de déclarer la restauration prouvée.

### Tests

59 tests exécutés : Bilan futur/correction/transport, aperçu lecture seule, compléments et sauvegardes. Rejeu après ajout des empreintes : 32 tests exécutés. Comptage indisponible testé sur les quatre tables défaillantes, pannes temporaires/persistantes, reprise, conflit de lot, manifeste avant état terminal et conservation des anciennes copies. Build observé OK. Avertissements existants des mocks de barème (auth.getSession absent) : pas une preuve de barème réel, aucune note réelle modifiée.