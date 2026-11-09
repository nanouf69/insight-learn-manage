# Rectification EB2 VTC : V2 exclusivement

## État
L'approche « EB2 — VTC — ancien circuit » est annulée dans l'aperçu : les trois fichiers fonctionnels sont revenus exactement à la référence 724e6abf3474d902eba3255baee7ce53bdba0e12. Les deux tests et le helper spécifiques à cette approche ont été retirés. Aucun autre correcteur existant n'est modifié. Aucune écriture Cloud, migration, import, correction réelle ou nouvelle publication.

## Preuve du blocage
- EB1 historique intégré possède déjà des tentatives et QRC V2 avec provenance `snapshot.source_historique.result_id`. EB2-TAXI utilise des tentatives V2. Ce n'est pas une simple différence de libellé.
- La définition réelle de `core_correct_qrc` lue le 09/11 verrouille une ligne `qrc_instances_v2` par UUID et refuse une identité absente avec P0476. `core_correct_qrc_publish` recalcule ensuite le résultat du même attempt_id. Une identité UI `ancien:<result_id>` n'est pas une identité V2.
- Contrôle réel à cette intervention : sessions 02–13 novembre, journée 40 résultats matière/9 élèves/93 QRC ; soir 4 résultats matière/1 élève/10 QRC. Aucun de ces 44 résultats n'a de lien V2 par result_id. Les 85 QRC du diagnostic précédent étaient un décompte à 13:31 ; le nouveau décompte brut comprend 103 QRC, sans supposer qu'il s'agit de 103 copies indépendantes ou remises vérifiées.
- Global EB2 depuis novembre : 69 résultats matière, dont 17 liés à des tentatives V2. Ils restent intacts. Ne jamais importer les 44 résultats pour contourner le blocage.

## Adaptation nécessaire, non appliquée
Une projection serveur en lecture seule doit fournir chaque QRC historique avec son identité originale (résultat + matière + question et preuve de remise même tentative), réponse, question/barème figés et correction prouvée. La matrice/panneau V2 peut consommer cette projection avec un discriminant de source sans créer d'instance V2.

La persistance demande un endpoint serveur admin dédié aux identités historiques : correction append-only, idempotence, verrou/concurrence, validation du barème figé, résultat révisé séparément et readback. Aucune correction d'une réponse réelle lors des essais. Les RPC V2 existantes restent réservées aux véritables UUID V2. Identité/barème insuffisants = refus explicite, jamais reconstruction depuis le contenu courant.

Une solution de correction réelle ne peut promettre de ne changer aucun état/note : une action volontaire de notation doit créer une nouvelle preuve de correction. Aucun changement existant n'est autorisé pour la préparer. Ce contrat serveur doit être validé et testé sur un environnement jetable avant toute activation ; aucune migration préparée ni appliquée ici.

## Publication
Le site public au contrôle initial sert `/assets/index-BFL2MHLY.js`, commit annoncé `a959d210f63fd3610a08b42abf5cfe1cf70cfc04` ; le paquet contient l'approche refusée. La publication demandée au tour précédent a donc fini par basculer. L'annulation reste dans l'aperçu : aucune nouvelle publication n'est lancée car le workflow demandé n'est pas prêt/sûr. Le bug de verdict et les protections EB3 ne sont pas touchés.

## Tests
76/76 tests existants PASS sur cinq fichiers : torture V2, inscriptions croisées, navigation manuelle/automatique et ordre des candidats. Compilation automatique : build OK à 13:51:04 UTC. Leur réussite n'établit pas une intégration des copies historiques novembre dans le workflow V2 : affichage, sélection, ouverture, correction et persistance de ces identités historiques restent NON PROUVÉS. Ne pas présenter la simulation V2 native comme un test du futur adaptateur historique.