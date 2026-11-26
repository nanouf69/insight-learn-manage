# Audit « les modules ne se valident plus » — constat et correctif minimal proposé

Audit en lecture seule. Aucune écriture, aucune publication.

## Conclusion

Aucun blocage général de validation n'est prouvé. Le cas de Mohamed BENTAYEB s'explique par la règle d'ouverture des modules l'un après l'autre en e-learning, pas par un refus de validation ni par le nouveau choix après quiz.

## Preuves

1. **Des modules se valident toujours (base réelle, heure UTC)**
   - 26/11 08:58:23 module 8 ; 26/11 08:18:09 module 8 ; 26/11 06:40:57 module 8
   - 25/11 18:46:47 module 8 ; 25/11 12:33:59 module 3 ; 25/11 12:13:45 module 35 ; 25/11 09:54 et 09:52 module 8
   - Par jour : 24/11 = 5, 25/11 = 5, 26/11 (avant 13h) = 3. Le volume reste normal, sans rupture.

2. **Le nouveau choix après quiz n'est pas en ligne**
   - Les derniers changements (sortie de correction, choix « Relire / Passer au cours / quiz suivant ») sont seulement en aperçu. Les élèves en production ne les voient pas, donc ils ne peuvent pas causer ce signalement.
   - Même en aperçu, le choix ne retire rien : sur le dernier quiz, son bouton de fin appelle la même validation (persistModuleCompletion) que les boutons déjà présents, « Terminer » et « Retour à l'accueil ». La validation reste décidée par le serveur (save_module_completion et ses règles).

3. **Mohamed BENTAYEB (vtc-e, accès du 04/11/2026 au 31/03/2027)**
   - Modules attribués dans l'ordre : 26, 2, 3, 4, 35, 5, 8.
   - Module 26 terminé le 26/10, module 2 terminé le 29/10 11:04 et module 8 terminé le 14/11 21:06.
   - Module 3 « en cours » depuis le 29/10 11:10, sans aucune activité depuis.
   - Règle e-learning : un module ne s'ouvre que lorsque le précédent est terminé ou en attente de validation. Seul le module Pratique (8) fait exception, il est toujours ouvert. Les modules 4, 35 et 5 restent donc fermés tant que le module 3 n'est pas validé.
   - Les lignes de reprise du module 2 encore en cours sont des reprises facultatives. Elles n'enlèvent pas sa validation et ne bloquent rien.
   - Ce qu'il appelle « modules pratiques restants » correspond en réalité aux modules théoriques 4, 35 et 5, fermés derrière le module 3.

## Cause concrète

Le module 3 n'a jamais été terminé (4 %). C'est le fonctionnement prévu de l'ouverture séquentielle, pas un défaut de validation.

## Correctif minimal recommandé (aucun changement de code)

Deux options, à votre choix :
- **A (recommandée) :** répondre à l'élève qu'il doit terminer le module 3 pour ouvrir les modules 4, 35 et 5.
- **B :** si vous voulez lui ouvrir l'accès sans attendre, utiliser la dérogation individuelle d'accès aux modules qui existe déjà. Elle ouvre l'accès sans rien valider ni inventer de progression. Cette écriture ne se fera qu'avec votre accord explicite.

Point d'amélioration facultatif, à faire plus tard : afficher sur un module fermé un message du type « Terminez d'abord le module 3 », pour éviter que l'élève croie à une panne.

## Limites

Je n'ai pas ouvert l'écran avec le compte de Mohamed. Je n'ai pas non plus vérifié s'il existe un refus serveur de validation du module 3 enregistré dans le journal des échecs.
