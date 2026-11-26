# Avis au destinataire après suppression — aperçu uniquement

## Choix utilisateur
26 novembre 2026, 16:22 UTC : « Garder en aperçu ». Aucun déploiement de fonction, publication, migration ou envoi réel.

## Préparation
- Confirmation affiche l’adresse enregistrée et « Supprimer et avertir ». Adresse absente/invalide : refus avant suppression ; aucune adresse de remplacement inventée.
- Après placement confirmé et relecture de la corbeille, appel du circuit existant `facture-notifier-revision` avec `suppressionId`.
- Branche serveur protégée par le contrôle admin existant ; vérifie la suppression native, l’absence de remise, la facture originale/version/adresse. Le message « Facture supprimée » décrit un retrait de la liste, pas un avoir ni une annulation comptable ; paiements conservés.
- Prise d’envoi par insertion d’un identifiant déterministe unique dans le registre existant, puis reçu distinct après acceptation. Concurrence : un seul envoi ; résultat inconnu ou accusé local impossible : jamais de renvoi automatique.
- Corbeille : état de l’avis et destinataire, traces techniques regroupées dans la ligne de suppression. « Envoyer l’avis » seulement si aucun envoi engagé et suppression toujours active. Originaux, montants, paiements, rattachements inchangés.
- Aucun nouveau service email ni nouvelle table. Transport FTRANSPORT existant avec signature commune conservé.

## Vérifications
- PASS : 47 tests Vitest, dont 12 ciblés avis/envoi (preuve, destinataire, reprise, concurrence, réponse inconnue, reçu impossible, changement d’adresse).
- PASS : `deno check supabase/functions/facture-notifier-revision/index.ts`.
- PASS : aperçu `build OK` du 26/11 à 16:23:19 UTC, après retrait des imports Deno du chemin de tests navigateur.
- PASS : scénario isolé PC 1647×846 et mobile 390×846 : Annuler sans insertion/appel, Supprimer et avertir, un appel simulé après preuve, historique Envoyé après rechargement, remise du même original fictif de 200 €, aucun second avis, aucune erreur JavaScript. Toutes les requêtes externes interceptées, aucun mail ou écriture réel.
- NON PROUVÉ : envoi réel et accusé fournisseur, droits réels exécutés. La fonction active n’a pas été modifiée : l’avis restera non confirmé tant que cette préparation n’est pas activée sur accord distinct.

## Fichiers
`ComptabilitePage.tsx`, `facture-notifier-revision/index.ts`, partages `factureSuppressionAvis.ts` / `factureSuppressionEnvoi.ts`, tests `facture-suppression-avis.test.ts` / `facture-suppression-envoi.test.ts`.