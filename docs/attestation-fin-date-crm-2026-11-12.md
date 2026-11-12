# Fin d'attestation plafonnée au CRM

Préparé, testé, non déployé et non publié.

Pour les nouveaux documents : date de fin = minimum entre le jour Paris de la dernière connexion vérifiée et la date de fin des cours en ligne du CRM (sinon fin de formation du dossier). Exemple demandé : une connexion le 12 novembre ne permet jamais d'attester une fin après le 31 octobre 2026 si le CRM affiche cette fin. L'horodatage original n'est pas changé ; source et plafond sont conservés dans le nouveau contenu figé. Absence/date invalide ou plafond antérieur au début = refus.

Le même calcul alimente l'aperçu et la préparation serveur. Avant l'envoi, la date figée est comparée à la fin CRM relue : dépassement = refus, sans modifier le document. Les documents déjà signés restent inchangés.

Exécuté : 44 tests (date, plafond, circuit, règles et présentation PDF) PASS ; Deno check de l'entrée attestation PASS ; build observé OK. Aucun mail réel, aucune modification des connexions, notes, jalons, signatures ni attestations existantes. Le parcours d'envoi réel n'a pas été exécuté. Activation serveur en attente d'accord.