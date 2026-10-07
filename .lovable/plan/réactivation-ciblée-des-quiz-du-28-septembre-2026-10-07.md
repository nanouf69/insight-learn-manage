# Réactivation ciblée des quiz du 28 septembre

## Périmètre exact à appliquer
| Module | Quiz à réactiver | Identifiants permanents |
|---|---|---|
| 2 — Cours VTC | Anglais 1 et 2 | 3, 4 |
| 10 — Cours TAXI | T3P 1 et 2, Anglais 1 et 2 | 1, 2, 3, 4 |
| 32 — Introduction TA | T3P 1 | 1 |
| 17 — Anglais | Anglais 1 et 2 | 3, 4 |
| 23 — Anglais | Anglais 1 et 2 | 3, 4 |
| 25 — T3P Partie 2 | T3P 2 | 2 |
| 39 — T3P Partie 2 | T3P 2 | 2 |

Total : **13 quiz dans 7 modules**, uniquement leur réglage d'activation.

## Corrections et exclusions
- Les cinq corrections approuvées (P1 Q29/Q42, P2 Q36/Q60/Q79) sont **déjà présentes et strictement identiques dans toutes les copies T3P** : modules 2, 10, 13, 25, 32 et 39 selon la partie. Ne pas les réécrire inutilement.
- Module 13 : aucune modification ; anciens quiz restent désactivés, quiz 13100 reste actif.
- Bilans Français des modules 4 et 9 : aucune modification. Ils étaient déjà désactivés dans la sauvegarde du 28 septembre ; à ce stade, aucune preuve d'une décision volontaire. Terminer le diagnostic en lecture seule et préciser sa limite.
- Aucun changement aux notes, réponses, tentatives, snapshots, signatures, progression ou acquis des élèves.
- Aucun autre quiz réactivé ; aucun contenu, identifiant, ordre enregistré ou support modifié.

## Impacts possibles et garanties
- Les quiz réapparaîtront dans les formations utilisant ces modules ; ils pourront donc être proposés aux élèves qui poursuivent leur parcours.
- Les acquis serveur restent prioritaires : aucun module terminé ne sera rétrogradé, aucune note recalculée.
- Vérifier les protections actuelles contre la propagation des activations et la reconstruction des bilans avant l'application ; si un effet hors périmètre est détecté, arrêter.

## Vérifications et publication
1. Conserver les références avant intervention ; refuser toute écriture si la version du module a changé entre-temps.
2. Comparer intégralement les 62 états pédagogiques après intervention : seuls les 13 réglages autorisés doivent changer, module 13 et bilans intacts.
3. Vérifier l'ordre complet des 15 formations et les associations cours/quiz par identifiants permanents ; vérifier l'aperçu sur données fictives, sans test sur un véritable apprenant.
4. Contrôler les données élèves en lecture seule et les effets des déclencheurs ; annoncer toute limite de preuve, sans prétendre qu'une activité normale d'élèves est une régression.
5. Ajouter le résultat daté au journal puis publier, comme demandé, uniquement après réussite des contrôles et vérification qu'aucun examen actif ne rend la publication incompatible avec les règles permanentes.

## Détails techniques et fichiers concernés
- Données : `module_editor_state`, uniquement les champs `actif` des identifiants ci-dessus ; entrée d'historique explicite dans `module_admin_audit_log`.
- Documentation : `roadmap.md`, `docs/journal-modifications.md`, mémoire du périmètre autorisé.
- Aucun fichier d'affichage ou moteur d'examen à modifier ; contrôles existants utilisés sans modifier leurs références pour masquer un échec.