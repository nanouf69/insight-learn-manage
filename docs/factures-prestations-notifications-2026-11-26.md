# Prestations et notifications des factures

## Résultat
Dans **Comptabilité → Toutes les factures → Modifier la facture**, neuf prestations sont proposées : VTC, VTC e-learning, TAXI, TAXI e-learning, TAXI passerelle, VTC passerelle, formation continue TAXI/VTC, mobilité TAXI. Le choix figure sur le PDF, y compris en complément des lignes nominatives d’une facture commune.

Le destinataire de facturation doit être explicitement renseigné : il n’est pas déduit d’un apprenant supplémentaire ni du nom d’une entreprise. L’adresse est conservée pour les prochaines modifications.

**Enregistrer et envoyer** conserve l’ancienne et la nouvelle version avant le mail :
- modification : PDF de la nouvelle facture, sujet « Facture modifiée », message indiquant qu’elle remplace l’ancienne facture avec les deux numéros exacts ;
- statut Annulée : « Facture annulée », sans envoyer une nouvelle demande de paiement ;
- brouillon : sauvegarde sans email, une facture émise ne peut pas redevenir un brouillon.

Les montants d’une facture individuelle restent modifiables par l’admin ; ceux d’une facture commune et ses lignes figées sont conservés. Les paiements et apprenants rattachés ne sont pas réécrits. Annulation ne supprime pas la facture.

## Traçabilité et sécurité
Modification administrateur seule, référence d’opération et vérification de la version précédemment lue ; refus si une autre modification est intervenue. Historique avant/après immuable avec date/auteur/destinataire, résultat d’envoi et PDF privé. Les envois sont déclenchés seulement après enregistrement et relecture de la version exacte.

Un résultat déjà envoyé n’est pas renvoyé. Un échec avant le début de l’envoi peut être repris depuis « Versions et envois » sans remodifier la facture. Un résultat inconnu après appel du transport reste à vérifier, sans rejeu automatique. Une version devenue ancienne ne peut pas être envoyée par ce circuit. Un résultat négatif n’affiche pas « envoyé ».

Le circuit FTRANSPORT existant est réutilisé ; clé d’envoi présente, aucun secret ajouté au client. Lovable Emails n’a pas de domaine configuré, mais ce lot utilise le transport historique déjà configuré, sans migration email ni nouvelle configuration DNS.

## Contrôles
- 19 tests Vitest PASS (prestations, notifications, réessais, factures communes/rattachements/fournisseurs).
- Contrats PostgreSQL jetables versions et rattachements PASS : admin/RLS, refus autre compte/anon, concurrence CAS, versions originales conservées, paiements/rattachements inchangés, annulation sans suppression, claim unique et résultat terminal non rejouable.
- `deno check` PASS.
- Parcours PC/mobile simulé PASS : neuf choix, PDF joint, sauvegarde/relecture, erreur sans faux succès, reprise du même envoi, annulation sans PDF, historique après rechargement ; zéro erreur runtime.
- Build OK après génération des nouveaux types.
- Service déployé et appel sans connexion refusé HTTP 401 « Session expirée ».
- Lecture réelle finale : facture 20260724001 toujours payée, 600 € HT/TTC, updated_at 15:01:43.716899 UTC, prestation/email non renseignés ; **zéro révision réelle créée par ce lot**.

**Non prouvé :** enregistrement et réception email réels par un compte administrateur. Aucun client contacté, aucun faux ticket/facture créé. Le parcours navigateur utilise un transport fictif, pas une élévation de droits en production. La réception effective et la validité de l’adresse client doivent être vérifiées lors du premier usage réel.

## Déploiement
Migration `0296_facture_revisions_notifications.sql`, bucket privé `factures-revisions` et service `facture-notifier-revision` actifs sur le service partagé. L’interface reste en aperçu ; aucune publication frontend effectuée.

Fichiers principaux : `ComptabilitePage.tsx`, `src/lib/pdf/draft-facture.ts`, `prestationsFacture.ts`, `_shared/factureRevisionRegles.ts`, service `facture-notifier-revision/index.ts`, candidat SQL et deux nouveaux tests. Règles techniques dans les AGENTS comptabilité et envoi partagé.