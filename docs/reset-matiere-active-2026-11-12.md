# Réinitialisation ciblée — préparation non activée

## Audit actuel, lecture seule
- Catalogue réel lu le 12/11 : `exam_subject_reset_context`, `admin_authorize_exam_subject_reset`, `start_exam_subject_retake` présents.
- Le bouton admin utilise exclusivement ce circuit dédié : identité du dossier/examen/matière/résultat, versions serveur, confirmation, autorisation et relecture. Aucun appel au reset global.
- L'autorisation normale est additive. Une copie V2 expirée entièrement vide est clôturée techniquement sans note après recontrôle sous verrou ; original conservé. Une copie ouverte avec réponses reste refusée.
- Le repassage crée une copie matière séparée au choix de l'élève. Son numéro est alloué à l'échelle de l'examen : la reprise générale pouvait confondre ce numéro avec un nouveau passage de sept matières.

## Correctif préparé
- `resolveExamPassage` distingue les reçus exacts de repassage matière des passages généraux. Les identifiants restent réservés, les entrées ne sont pas modifiées.
- Lecture des reçus et résolution commune préparées dans `ExamensBlancsPage`, derrière `SUBJECT_RETAKE_ISOLATION_ACTIVE = false`. Aucun branchement actif nouveau sur données réelles.
- Confirmation admin précise les exclusions (autres examens, Bilans, révisions) et l'exception copie expirée vide.
- Aucun changement SQL installé, aucun reset réel, aucun envoi/IA, aucune publication.

## Vérifications exécutées
- 35 Vitest PASS : dont sept matières, passage général partiel/repassage isolé plus récent, allocation sans collision, identité autre examen, doubles clics, changement dossier, refus copie ouverte.
- 9 tests SQL dédiés PASS et 14 tests avec triggers du catalogue PASS sur PostgreSQL jetable : droits, idempotence, historique, sources exactes, absence d'effets externes, concurrence réponse/admin.
- Navigateur avec réseau intercepté vers PostgreSQL jetable : EB3 legacy PC et EB4 TAXI V2 mobile, réponse relue après rechargement puis remise confirmée, aucune erreur transport. Ces parcours ont une seule matière QCM ; ils ne prouvent pas le parcours complet demandé.
- Compilation corrigée et dernière entrée `build OK`.

## Limites / suite bloquée
La demande complète n'est pas activable en l'état :
1. Réinitialiser une matière **ouverte avec réponses** exige une nouvelle autorisation liée à la tentative active et une neutralisation additive atomique, couvrant aussi les anciennes files d'envoi. Le serveur actuel refuse ce cas ; refus conservé.
2. Il faut une identité explicite du passage général auquel rattacher le remplacement isolé, pas son seul numéro. Ce lien n'est pas fourni par le reçu actuel.
3. Projection commune admin/élève à préparer : matière À refaire, ancienne note historique distincte, global non définitif, nouvelle QRC en attente de correction humaine. Ne pas masquer une vraie note par un zéro ni réutiliser une note précédente.
4. Intégration de la matière dans « Terminer les matières manquantes » non livrée ; les sources actuelles proposent « Reprendre l'examen » et « Choisir les matières à passer », plus le panneau séparé de repassages autorisés.
5. Matrice complète sept matières QCM multiples/QRC, mêmes notes B–G, session changée, reprise, remise, correction humaine et verdict global PC/mobile reste NON PROUVÉE.

Décision : conserver le flag OFF, aucune migration/publication avant ces preuves et validation explicite.