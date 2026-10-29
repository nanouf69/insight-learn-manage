# Contrôle connaissances — diagnostic et correction ciblée

## Lecture seule
Module confirmé : 13, exercice actif 13100. Suppressions Admin du 29/10 09:58–09:59 UTC : IDs stables 199, 201, 204, 207 ; retirés du JSON enregistré. Tombstone antérieur 69 conservé. Les positions affichées Q220/Q221 correspondent aux IDs 226/227 : aucune suppression Admin de ces deux questions prouvée ; elles restent intactes.

Le JSON actuel contient 221 questions actives. Le texte « 211 questions » est une description ancienne, pas le compteur réel. La présence de Q220/Q221 n'établit donc pas à elle seule une résurrection. Aucun binding canonique module13 renvoyé par la lecture ; 17 lignes du quiz canonique existent mais ne prouvent pas leur application à 13100. Cause exacte du navigateur d'Ahlem NON PROUVÉE.

## Correction dans l'aperçu uniquement
Liste enregistrée module13 seule prioritaire sur fallback source ; projection des tombstones aussi sur exercices ajoutés Admin ; filtre de membership avant hydratation canonique ; suppression du prune d'ouverture concurrent pour ce module uniquement. Relecture temps réel déjà existante conservée, relecture à reconnexion/focus/online/visibilité sans polling module13. Aucun reset de réponses et aucune écriture Cloud.

Description de l'écran module13 compte les questions actuelles ; aucun barème, question, ordre ou identifiant modifié. Consultation historique séparée inchangée.

## Tests
- PASS : 20 tests ciblés exécutés, identifiants exacts, filtre canonique, empreinte des autres questions fictives identique, pas de mutation du JSON ou des objets réponses.
- PASS : aperçu administrateur avec données fictives TAXI puis TA, exercice isolé : disparition de la question 1 sur page ouverte après événement online/relecture, compteur 3 → 2, aucune erreur JavaScript.
- TAXI : coche restante visible sur capture après actualisation.
- NON PROUVÉ : conservation de saisie TA (l'interception des lectures de réponses retourne vide ; la sélection finale est vide), vraie session autonome de deux comptes techniques, suppression Admin via événement temps réel réel, reload/reconnexion complète avec accusés serveur. Aucun compte réel usurpé ni question réelle supprimée pour tester.
- PASS : compilation automatique.

## Publication
NON PUBLIÉ : le projet contient plusieurs travaux inachevés ; une publication globale les embarquerait. Aucune migration, aucune mutation de question ni de preuve, aucune publication canonique effectuée. Correction préparée, pas annoncée disponible en production.