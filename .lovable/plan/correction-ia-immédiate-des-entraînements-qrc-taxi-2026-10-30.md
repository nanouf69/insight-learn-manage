# Correction IA immédiate des entraînements QRC TAXI

## Résultat
- Les deux quiz corrigent chaque réponse libre dès « Valider ma réponse », avec « Correction en cours », résultat sur 1 point et explication courte.
- L’IA reconnaît le sens, les synonymes et les fautes d’orthographe sans imposer une correspondance mot à mot.
- Les QCM, cases et listes de communes gardent leur correction exacte sans IA.
- Aucun changement aux questions, corrigés, notes officielles, jalons ou progression ; les alertes Q5/Q6/Q13 restent visibles. Pas de publication.

## Accord nécessaire : protection des coûts
Lovable Cloud ne fournit pas de limite de fréquence standard. L’approbation de ce plan autorise une protection dédiée, vérifiée côté serveur :
- **60 nouvelles corrections par heure et 200 par jour par compte**, cumulées sur les deux quiz ; fenêtres glissantes.
- **Une correction active par compte** ; aucun placement en file d’attente.
- Relire un résultat déjà reçu ne consomme pas une nouvelle correction IA.
- Les appels Lovable AI consomment des crédits du workspace ; ces limites réduisent les abus mais ne garantissent pas un montant fixe de dépense.

## Fiabilité et conservation
- Réponse sauvegardée avant l’appel ; résultat associé au compte, quiz, version, question et empreinte de réponse.
- Double clic et rechargement ne déclenchent pas de nouvel appel pour une opération déjà engagée ; résultat inconnu = à vérifier, jamais rejoué à l’aveugle.
- Erreur technique = correction indisponible, **aucune note zéro fabriquée**. Reprises bornées seulement après refus transitoire prouvé, avec attente ; refus définitifs et erreurs de configuration arrêtés.
- Questions juridiquement contestées : l’IA ne certifie pas la référence historique et ne tranche pas le conflit ; état « à arbitrer » sans note définitive pour les points litigieux.
- Aucune correction automatique des anciennes réponses à l’ouverture et aucune suppression de brouillons.

## Détails techniques
- Nouvelle fonction immédiate indépendante du circuit officiel de correction QRC ; authentification et contrôle d’accès côté serveur.
- Copie serveur versionnée des références existantes, contrôlée par empreinte ; jamais de réponse attendue fournie par le navigateur comme autorité.
- Nouvelle table dédiée aux reçus et protections de coûts, permissions restrictives ; aucune écriture dans les tables pédagogiques existantes. Pas de réponses brutes dans les journaux.
- Appels sécurisés via AI SDK / Responses, résultat transmis en flux ; modèle par défaut du workspace pour ce nouvel appel. Secrets uniquement côté serveur.
- Fichiers concernés : `QuizQrcTaxiIntegre.tsx`, nouveaux modules client dans `src/lib/quizQrcTaxi/`, nouvelle fonction et dépendances serveur, migration dédiée, tests et règles AGENTS. `correction.ts` conserve les contrôles exacts des communes ; les corrigés Q5/Q6/Q13 ne sont pas remplacés.

## Vérifications
Tests isolés : paraphrases correctes, réponse fausse/partielle, erreurs réseau, réponse perdue après envoi, double clic, reprise après rechargement, changement de compte et de quiz, limites serveur et absence d’effet sur progression. Vérification réelle de l’IA avec réponses fictives, puis parcours sous compte technique PC/mobile si disponible ; tout contrôle non exécuté sera déclaré NON PROUVÉ.

## Statut actuel
Audit terminé ; fonctionnalité IA **pas encore implémentée ni active**. Accord sur la protection dédiée des coûts requis avant les écritures serveur. Aucune publication demandée.