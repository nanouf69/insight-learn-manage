# Révision EB5 — Mme BENNANI — 13 novembre 2026

## Diagnostic réel, lecture seule
- Identité retrouvée : Meriem BENNANI, parcours VTC (distincte de Redouane BENANI).
- EB5 : révision non clôturée, version serveur 394, dernière sauvegarde 09:05:45 UTC ; 47 clés de réponses et 47 marqueurs de validation, mais une QRC est vide. Aucun résultat final de révision EB5 enregistré.
- Journal 09:06:12 UTC : « Toutes les questions doivent avoir une réponse validée avant de terminer ». Le toast générique accusait ensuite la connexion, alors que ce refus précis intervient avant la clôture serveur.
- EB4 et EB3 : clôtures et résultats de révision présents. EB2 : nouvelle révision partielle 18/37 ; ancienne clôture conservée. EB1 : ancien format sans état structuré exploitable.
- Relecture après tests : version 394 et date identiques, toujours non clôturée, une QRC vide. Aucune réponse privée reproduite dans ce rapport. Aucun reset ni écriture réelle.

## Cause et correctif aperçu
Le compteur « validé » peut contenir une question vide. Le contrôle final refuse correctement cette preuve insuffisante, mais l'écran ne renvoyait pas vers la question et présentait un faux diagnostic réseau.

- `src/lib/revisionFinalisationPreuve.ts` : contrôle partagé de réponse renseignée, repérage de la première preuve manquante ; aucune couverture assouplie.
- `src/components/cours-en-ligne/ExamenBlancsResultats.tsx` : retour automatique vers la question manquante, QRC vide/espaces refusée, reprise d'un marqueur existant sans double score, message précis persistant ; terminer ne déverrouille plus les réponses pendant l'envoi et un succès confirmé ne peut être soumis à nouveau. Version `write_seq` amorcée depuis la lecture qui restaure le brouillon pour éviter une reprise à zéro sur un nouvel appareil.
- Tests : `revision-finalisation-preuve`, `revision-fausses-comportement`, `revision-fausses-chemin-publie`, simulateur `revision-manquante`.
- Aucune correction officielle, copie initiale, note historique ou signature modifiée. Aucun lecteur ou RPC inactif activé.

## Preuves et limites
- 42 tests ciblés PASS : EB1–EB6, réponse vide, reprise version 394, QCM multiples/QRC, double clic, refus/retry, pertes d'accusé et finalisation exacte.
- Chromium PC 1280×1800 et mobile 390×844 : vrai écran avec données fictives, retour à la question vide, validation désactivée tant qu'elle est vide ; zéro requête d'écriture. Captures inspectées.
- Suite globale : 4 734 PASS, 1 FAIL, 13 ignorés. Test de panne 30 candidats : 98 appels au lieu de 90 sous la charge de la suite. Même fichier relancé seul : 7/7 PASS. Échec global non masqué, ni assertion assouplie.
- Construction automatique : OK. Pas de test avec saisie sur le compte réel de Mme BENNANI afin de préserver ses données.
- Synchronisation après changement de correction : contrôles de liste/couverture conservés ; matrice complète réelle multi-appareils non exécutée.

## Décision
**NO-GO — non publié.** La restauration complète reste non prouvée avec les outils disponibles, et la suite globale comporte un échec sous charge. Aucun déploiement, migration, mail, dépense ou modification de données réelles. Ce correctif ne débloque donc pas encore Mme BENNANI sur le site publié.

## Autre demande en attente
« Accepter les signatures après la formation » nécessite de préciser : attestation ou feuille de présence tardive. Aucune règle de signature changée ; toute régularisation doit garder sa date réelle et ne jamais fabriquer de présence.