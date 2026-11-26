# Corbeille réversible des factures — 26 novembre 2026

## Périmètre
- Confirmation « Êtes-vous sûr de supprimer cette facture ? », Annuler et Supprimer.
- Corbeille : onglet Remettre et historique des actions.
- La suppression devient un retrait de la liste/export comptable, par événement ajouté au registre administratif existant `factures_supprimees`. Aucune suppression ni mise à jour de `factures`, `facture_paiements` ou des rattachements ; les totaux financiers restent fondés sur les originaux.
- Remettre ajoute une trace référant exactement la suppression, puis confirme par relecture que la facture n’a plus de suppression active. Les montants, numéros, statuts, identités et paiements restent intacts.
- Lecture paginée, erreur bloquante, double clic verrouillé. Aucun mail, aucune migration, aucune publication.

## Limite historique
Les anciennes suppressions physiques n’avaient conservé qu’un instantané, pas les paiements effacés. Elles restent dans Historique, avec mention de restauration non garantie ; aucun original ni paiement n’est fabriqué. Le bouton Remettre concerne les nouvelles mises en corbeille réversibles.

## Vérifications exécutées
- PASS : 28 tests Vitest (corbeille : 5 ; révisions : 8 ; rattachements : 3 ; facture collective : 6 ; destinataire : 6).
- PASS : aperçu, dernière entrée `build OK` à 16:14:32 UTC.
- PASS : parcours Playwright isolé à 1647×846 et 390×846 : confirmation, Annuler sans écriture, Supprimer, rechargement, Remettre visible, retour de la même facture fictive de 200 €, deux traces historiques, absence d’erreur JavaScript. Toute requête externe est interceptée ; seules deux insertions fictives au registre sont autorisées. Aucune mutation réelle.
- NON PROUVÉ : utilisation sur facture réelle et politiques de production exécutées ; aucun test financier réel n’a été demandé ni réalisé.

## Fichiers
- `src/components/comptabilite/ComptabilitePage.tsx`
- `src/lib/comptabilite/corbeilleFactures.ts`
- `src/test/corbeille-factures.test.ts`
- `AGENTS.md` : règle de conservation dans le bloc agent.