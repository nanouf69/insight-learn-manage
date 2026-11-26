# Rattachement de plusieurs apprenants à une facture

## Utilisation et garanties
Comptabilité → Toutes les factures → Modifier la facture : chercher les apprenants, cocher plusieurs noms puis utiliser « Rattacher N apprenants ». Cette action enregistre uniquement des rattachements administratifs. L’apprenant initial et les lignes de facturation collective sont conservés, sans changement de montant, de paiement, de statut, de document signé, de formation ni de droits apprenants.

Les ajouts sont persistants, datés et attribués à l’administrateur, sans doublons au réessai. Le succès ne s’affiche qu’après relecture. La recherche des factures inclut les noms supplémentaires. Les associations ne réécrivent pas les PDF de factures déjà émises ni leur répartition financière.

## Vérifications exécutées
- **PASS :** 9 tests Vitest (`rattachements-facture.test.ts` et `facture-commune.test.ts`).
- **PASS :** `python3 src/test/rattachements_facture_sql_contract.py` dans PostgreSQL jetable : ajouts multiples, réessai, identité initiale/montants inchangés, auteur/date, accès admin seulement, lecture apprenant/anon refusée, insert direct interdit, historique non modifiable/non supprimable, erreur atomique si apprenant absent.
- **PASS SIMULÉ :** PC/mobile, sélection de deux noms, relecture en échec sans faux succès, réessai sans doublon, affichage après recharge. Droits d’affichage, factures, apprenants et écritures interceptés ; aucune création réelle envoyée par le test. Ce contrôle ne prouve pas une connexion administrative réelle.
- **PASS :** dernière construction de l’aperçu `build OK`.
- **Lecture réelle avant/après :** facture 20260724001, apprenant initial 28c03975-da72-421b-9c06-6653762da31d, HT/TTC 200 € et lignes collectives vides inchangés. Une association Farouk BENABBAD a été enregistrée pendant les travaux à 15:01 UTC par un autre compte administrateur, et conservée. Elle ne provient pas des requêtes du test intercepté.

## Activation
Ajouts de structure appliqués au service partagé aperçu/site. Interface visible dans l’aperçu ; aucune publication effectuée. Aucun mail ni modification de données de formation.