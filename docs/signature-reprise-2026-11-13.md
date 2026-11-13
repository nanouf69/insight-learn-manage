# Annuler et refaire une signature — aperçu uniquement

## Périmètre certain
La date affichée 12/11/2026 22:40:10 Paris ne désigne pas un dossier, une zone ou un signataire de façon certaine. Aucune recherche nominative ou annulation de cette signature effectuée ; aucun jugement juridique déduit de son apparence.

## Préparation
- Dans Documents → document PDF à zones signé : une action distincte par zone de signature enregistrée ouvre une confirmation avec document, zone, destinataire affiché, date Paris et original. Le destinataire affiché ne prouve pas seul une identité Auth ; activation interdite sans association serveur vérifiée.
- Motif facultatif borné à 200 caractères, confirmation spécifique ; bouton final explicitement inactif tant que journal/archives non installés. Aucun appel réseau de révocation.
- Candidat partagé de règles : événement append-only portant l’original intégral, auteur et date serveur ; PDF original confirmé avant révocation. Nouvelle signature par le même signataire authentifié uniquement, empreinte document inchangée, nouveau PDF confirmé et nouvel horodatage. Admin ne signe pas à sa place. Zone formateur distincte compatible avec ces règles ; pas de révocation globale.
- Projection candidate par identité preuve/document/zone/signataire : à refaire pour la seule zone annulée, signée pour les autres, refaite après nouveau reçu. Conflits de journal refusés.
- Formulaire signataire candidat séparé, non monté sur les liens publics : connexion au propre compte, canvas local effaçable, consentement, envoi/relecture stricts sans succès optimiste.

## Limites de sécurité
Le repository serveur transactionnel, tables/RLS/journal immuable, liens signataire Auth, archives privées et téléchargement des PDF versionnés ne sont pas installés. Les tests du repository sont simulés ; ils ne prouvent ni atomicité DB ni permissions Cloud. Les circuits publics existants à token restent inchangés ; la reprise ne doit jamais les réutiliser comme une preuve de connexion.

La préparation UI concerne les PDF à zones de Documents. Attestations/modèles, émargements et devis nécessitent leurs propres raccords exacts ; aucune prétention de couverture de ces circuits ou des calculs officiels de présence/FC/EDOF. Historique PDF existant inchangé, aucune feuille globale invalidée.

Point relevé en lecture : Documents possède déjà des actions de suppression et de renvoi qui ne constituent pas ce processus de révocation. Ne pas les utiliser pour refaire une signature enregistrée. Leur sécurisation globale n’est pas entreprise sans audit dédié ; aucune action destructive exécutée.

## Tests
À compléter après exécution : règles identité/droits, archive PDF, absence de perte, multi-signataires, projection de statuts, confirmation UI ; tests isolés seulement.

**Non publié, non actif en production.** Activation après désignation certaine du dossier/zone, confirmation spécifique et preuve de journal/archives/restauration/lecteurs serveur ; la capture seule n’autorise aucune annulation.