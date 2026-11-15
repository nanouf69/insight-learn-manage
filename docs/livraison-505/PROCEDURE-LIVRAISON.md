# Livraison ciblée 505 — procédure (préparée le 15/11/2026, RIEN d'installé)

## Contenu exact du lot
| Fichier | Rôle | SHA-256 |
|---|---|---|
| `front-505-depuis-publie-e136eba47.patch` | 4 fichiers front seulement (écran module, file de réponses lecture seule, remise 505, panneau de revue) | voir `sha256sum` |
| `bilan_505_remise.sql` | fonctions 505 + **interrupteur serveur éteint** + liste d'autorisation vide | idem |
| `bilan_505_lot_4_copies.sql` | inscrit les 4 copies exactes (Cabral/Abdelhak = remise ; Alpha/Malki = récupération seule). N'allume rien. Échoue en bloc si une copie a changé | idem |

Le front ne s'active **jamais seul** : il demande au serveur `bilan_505_remise_eligible`. Fonction absente (état actuel), erreur, autre élève, interrupteur éteint = écran habituel inchangé.

## Ordre d'installation (chaque étape est réversible par l'interrupteur, aucune ne remet de copie)
0. Prérequis bloquants : restauration indépendante prouvée (voir rapport) + accord explicite.
1. SELECT avant : 4 copies `in_progress`, séquences 59/67/73/100, empreintes du rapport.
2. Migration `bilan_505_remise.sql` (interrupteur à `false`).
3. `bilan_505_lot_4_copies.sql` (refus total si une des 4 copies n'est plus exactement en cours/tentative 1).
4. Livrer le front (chemin ci-dessous). Tant que l'interrupteur est éteint, aucun élève ne voit de différence.
5. GO : un administrateur connecté exécute `select bilan_505_remise_basculer(true, 'go remise 505 – <nom>')`.
6. Chaque élève clique lui-même « Valider les QCM » (Abdelhak : revue des 7 choix + case à cocher). Aucune remise automatique.
7. **ARRÊT IMMÉDIAT** à tout moment : `select bilan_505_remise_basculer(false, 'arrêt – <motif>')`. Les clics en cours attendent la fin de la transaction, tous les suivants sont refusés ; l'écran affiche « remise momentanément suspendue », copie intacte.
8. SELECT après : seules ces 4 lignes peuvent avoir changé ; Alpha/Malki restent `in_progress` sans note (Q7 = décision du centre).

## Livrer le front seul sur le site publié
Lovable publie toujours l'état courant du projet, pas une branche ni un patch. Chemins possibles :
- **A. Branche GitHub** (Paramètres du projet → Git → GitHub → sélecteur de branche) : branche créée depuis `e136eba47` + ce patch, basculer le projet dessus, publier, revenir sur la branche principale. Nécessite de connecter GitHub (non connecté aujourd'hui : seuls les dépôts internes Lovable existent).
- **B. Historique** : Revert vers la version publiée `e136eba47`, appliquer uniquement ces 4 fichiers, publier, puis revenir à la dernière version.
- **Point de vigilance (A et B)** : selon la documentation, un retour en arrière **redéploie aussi les fonctions serveur correspondant au code**. Le code actuel contient des fonctions préparées NON activées (émargements : `save-emargement-apprenant`, `send-regularisation-emargement`, rappels théoriques). Revenir ensuite à la dernière version pourrait les déployer. Avant A ou B : relever les versions réellement déployées de ces fonctions et prévoir de les redéployer à l'identique ; sinon ne pas utiliser B.
- Non vérifiable depuis cet espace : je n'ai aucun outil pour publier une branche ou un retour en arrière ; ces étapes se font dans l'interface.

## Vérifications à rejouer
```
python3 src/test/bilan_505_activation_contract.py        # 8 tests interrupteur/lot
python3 src/test/bilan_505_catalogue_prod_contract.py    # 9 tests, catalogue production figé
python3 src/test/bilan_505_remise_sql_contract.py        # 13 tests
bunx vitest run src/test/bilan-505-activation-client.test.ts src/test/bilan-505-remise.test.ts src/test/rattrapage-dernier-clic.test.ts src/test/envoi-onglet-accuse-perdu.test.ts
# arbre isolé : git archive e136eba47 | tar -x -C /tmp/t && cd /tmp/t && patch -p1 < .../front-505-depuis-publie-e136eba47.patch && vite build --mode production
B505_BASE=http://localhost:4180 python3 src/test/bilan-505-remise-browser/parcours_reel.py   # sur le build production du harness
```
