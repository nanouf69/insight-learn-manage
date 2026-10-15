# Cohérence des signatures VTC journée

- Corriger l’objectif VTC journée : **20 signatures de session + 2 de pratique = 22**, comme le soir. TAXI et TA inchangés.
- Faire suivre ce même objectif au compteur et à la mention du téléchargement PDF.
- Vérifier l’écart visible entre les **22 signatures comptées** et les **20 signatures incluses dans le PDF** : ne pas afficher artificiellement 22 si seules 20 images sont disponibles. Signaler la limite si elle est confirmée, sans fabriquer de signature.
- Conserver intégralement les signatures, versions et heures : **60 h de session + 6 h de pratique = 66 h** pour VTC journée. Aucun envoi ni écriture sur les dossiers élèves.
- Tester avec des données fictives les objectifs VTC journée/soir, TAXI/TA, les comptes incomplets et les exports ; journaliser les résultats et les limites. Pas de test sur un vrai apprenant ni de publication dans cette intervention.

## Fichiers concernés
- `src/lib/signaturesManquantes.ts` : objectif partagé.
- `src/test/signatures-manquantes-bornes.test.ts` et tests ciblés des exports : vérifications.
- Si l’écart 20/22 est confirmé, fichiers d’affichage/export des signatures uniquement, après diagnostic de sa cause.
- `roadmap.md` et journal daté : suivi et preuves.