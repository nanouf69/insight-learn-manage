# « Mes notes » : même note et même statut que l'écran admin

Pour l'instant, seul ce plan est écrit. Aucun fichier n'est modifié et rien n'est publié.

## 1. Chiffres relevés en lecture seule (30 derniers jours, comptes de test exclus)

- 1 675 résultats d'examens blancs, dont 641 ont une copie dans le nouveau moteur.
- **220 résultats s'affichent différemment** entre « Mes notes » et l'écran admin :
  - 30 : l'admin voit « En attente de correction », mais l'élève voit déjà une note ;
  - 137 : l'élève voit « En attente », mais l'admin voit une note ;
  - 53 : les deux écrans affichent une note, mais pas la même.
- 5 exemples (les plus récents) :
  1. Élève 8313311b, EB VTC N°4, Sécurité, 26/09 : l'élève voit 18/20, l'admin voit 11/20.
  2. Élève 950627bd, EB VTC N°1, Sécurité, 26/09 : l'élève voit 12/20, l'admin voit 5/20.
  3. GOUEPO (95e2ec25), EB VTC N°6, Anglais, 25/09 : l'élève voit 19/20, l'admin voit 18/20.
  4. GOUEPO, EB VTC N°6, Sécurité, 25/09 : l'élève voit 15/20, l'admin voit 9/20.
  5. GOUEPO, EB VTC N°5, Sécurité, 25/09 : l'élève voit 12/20, l'admin voit 8/20.
- Ces chiffres sont des estimations. La requête reproduit les règles des deux écrans, mais ne les exécute pas vraiment. Le chiffre exact sera recompté après la correction, avec la fonction commune.

## 2. Ce qui va changer

- « Mes notes » lira la même source que l'écran admin. Si un passage existe dans le nouveau moteur, la note et le statut « En attente de correction » viendront uniquement de ce passage. Sinon, rien ne change.
- Une **seule fonction commune** donnera la note et le statut pour un résultat. L'écran admin et « Mes notes » l'utiliseront tous les deux, pour qu'ils ne puissent plus diverger.
- Si le nouveau moteur ne peut pas être lu, « Mes notes » affichera « Note en attente » plutôt qu'une note qui pourrait être fausse.
- Uniquement de l'affichage : aucune écriture, aucune note ni réponse modifiée, « Refaire les fausses » intact, synchronisation intacte.

## 3. Essais

- Tests automatiques : un passage publié affiche la note serveur ; un passage non corrigé affiche « En attente » ; sans passage nouveau moteur, l'affichage reste identique ; si la lecture échoue, « Note en attente » s'affiche.
- Sur le compte TEST : comparer « Mes notes » et l'écran admin.
- Recompter les 220 écarts en lecture seule avec la fonction commune : le résultat attendu est 0.

## Fichiers touchés

- `src/lib/noteExamenAffichee.ts` (nouveau) : la fonction commune, qui s'appuie sur les règles déjà existantes.
- `src/components/cours-en-ligne/NotesView.tsx` : lit l'état du nouveau moteur et utilise la fonction commune pour la note et le statut.
- `src/components/crm/apprenant-sections/ResultatsApprenantTab.tsx` : utilise la même fonction commune, sans changer ce que voit l'admin.
- `src/test/notes-view-source-unique.test.ts` (nouveau) : les tests ci-dessus.

Pas de publication. Arrêt après les essais.
