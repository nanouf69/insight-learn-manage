# Campagne distincte connectés incomplets — 14/11/2026

## Réalisé, sans activation

- Nouveaux modèles dans `modelesRappelTheorique.ts`, campagne `rappel_modules_connectes_theorique` : ferme J−7/J+1/J+3/J+5 ; obligations J+7/J+9/J+11… Texte alternatif généré depuis les mêmes paragraphes, avertissements rouges #C62828 / 700.
- Le modèle historique `relance_suspension_cpf` n'est ni appelé, ni copié, ni modifié. Empreinte locale SHA256 : `89a43968590d81d032ba9078d17248ad265eab88568b7925598d102b4b9c9848`.
- Nouveaux destinataires : preuve de connexion obligatoire ; jamais connectés exclus ; connexion inconnue, incident technique ou état inconnu = mise en attente. Obligations hors pratique/dispenses, progression inconnue, annulations/reports/absences conservés.
- L'interdiction de pratique a été retirée. Tant que la priorité n'est pas opérationnelle et vérifiée, le texte dit seulement que les dates dépendent des places et engagements ; réservations inchangées. Une priorité effective prouvée permet la variante non-prioritaire, sans interdiction de réserver.
- Nouveau moteur `rappelConnectesExecution.ts` : garde d'activation, lecture serveur, réservation via adaptateur atomique, nouvelle lecture juste avant transport, arrêt si complétion/absence/changement d'échéance, conservation de la réservation si issue réseau ou journal indéterminé. Clé indépendante des versions de modèle pour éviter le double envoi après changement de texte.
- CPF et France Travail ne sont mentionnés que selon indicateurs vérifiés du dossier ; aucun automatisme de sanction.

## Vérifications exécutées

Commande : `bunx vitest run src/test/rappel-theorique-priorite.test.ts src/test/rappel-theorique-financement.test.ts src/test/rappel-connectes-execution.test.ts`.

**85 tests réussis** : 63 calendrier/progression/séparation destinataires, 7 financement, 15 orchestration. Les réservations concurrentes et transports sont synthétiques ; ce n'est PAS la preuve d'un verrou réel en production, ni d'une livraison. Aucun e-mail réel.

Catalogue de production relu à 00:24 UTC : `relance-suspension-cpf-daily` et `relance-non-connectes-daily` actives à 09:00 UTC, aucune nouvelle tâche théorie. Aucun import des nouveaux modules par une fonction d'envoi active. Aucun déploiement ou migration de ce lot ; code des fonctions réellement déployées non téléchargé.

## Blocages restants et actions précises

1. **Sauvegarde/restauration indépendante** : inventaire des sauvegardes et restauration externe non accessibles par un outil agent. Export intégral via More → Database → Manage → Settings → Export data, puis copie de test séparée ; fichiers de Storage téléchargés à part. Ne surtout pas restaurer la production : cela perdrait les écritures postérieures au cliché. L'utilisateur doit déclencher l'export et rendre une destination indépendante disponible ; aucun dump intégral depuis l'agent, aucun contournement par brouillon.
2. **Preuve dates** : source datée CMA/admin liée au dossier et à une occurrence réelle requise ; date prévue / résultat manuel seuls insuffisants. Un registre append-only de confirmation datée et d'annulation/report doit être implémenté avec contrôle admin, puis alimentation explicite sur documents probants. Pas de reconstruction à partir de la date d'envoi de copie.
3. **Adaptateurs production** : branchement des obligations/dispenses canoniques, incidents, arrêt après attestation, connexion de ce compte, financement/engagements vérifiés. Les contrats de lecture préparés ne remplacent pas ce raccordement.
4. **Journal atomique réel** : table dédiée et réservation unique par dossier/occurrence/phase/jour, résultats append-only, accès service/admin protégé et tests d'intégrité sur environnement indépendant. Pas d'utilisation d'un journal existant non conçu pour verrouiller les envois.
5. **Activation** : après tests des adaptateurs et migration sûre, déploiement isolé de la nouvelle fonction, tâche quotidienne à cadence calendaire, borne nouveaux examens explicite, test légitime au premier destinataire dû puis preuve provider/CRM. Rien à envoyer tant que ces conditions ne sont pas satisfaites. Aucun appel IA et aucun coût nouveau de campagne à ce stade.

**Statut précis : préparation implémentée et testée, campagne de production ABSENTE / NON ACTIVE.** L'autorisation générale est acquise ; les obstacles sont les preuves et l'environnement indépendant, pas un nouvel accord général.