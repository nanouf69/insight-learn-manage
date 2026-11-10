# Performance Correction QRC V2 — vérification du 10 novembre 2026

## Décision : NO-GO publication

Aucune publication, migration, modification de configuration ni écriture pédagogique réelle effectuée pendant cette vérification. Seuls trois tests de régression ont été ajoutés et le délai d'un test existant adapté au regroupement de cinq secondes. Aucun code fonctionnel du correcteur ou de « refaire les questions fausses » n'a été modifié.

## Résultats exécutés

| Contrôle | Résultat |
|---|---|
| Régressions correcteur, surveillance, finalisation et notes | PASS : 122 tests, 14 fichiers |
| Contrats PostgreSQL fictifs | PASS : 15 tests, 76,793 s |
| Compilation de l'aperçu | PASS : journal `build OK`, dernière entrée observée 20:12:16 UTC |
| Vérification types autonome | NON PROUVÉ : non exécutée ; compilation Vite ne remplace pas ce contrôle |
| Lint du correcteur et de son dossier | FAIL : 90 erreurs et 8 avertissements, principalement `no-explicit-any` existants ; pas de neutralisation de règles |
| Admin connecté aperçu et production | PASS : grille et EB3 accessibles, aucun POST autre que la lecture `has_role`, aucune erreur JavaScript |
| Bandeau supprimé | PASS : absent sur les deux écrans visités |
| Survol et scroll au repos | PASS : zéro appel de données supplémentaire sur six secondes, aperçu et production |
| Largeur globale mobile en lecture seule | PASS : document de 390 px pour écran 390 px ; la grille utilise son défilement horizontal |
| Sauvegarde fictive PC puis relecture | PASS : un POST de note et une lecture de copie, double clic, largeur inchangée |
| Correction externe fictive et rafale de dix signaux | PASS PC : une seule lecture des copies affichées, aucun scan du catalogue, note 1,5 relue |
| Coupure réseau puis bouton Actualiser et rechargement | PASS PC : copie conservée avec erreur ; double clic = une lecture catalogue ; note 1,5 relue après rechargement |
| Interaction complète mobile | FAIL : clic d'une autre cellule intercepté par le nom candidat fixé à gauche ; parcours non terminé |

### Mesures réseau réelles (pas une comparaison avant/après)

Même parcours et navigateur Chromium, largeur 1280 px, hauteur 1800 px. Comptage des requêtes vers les données, y compris les lectures d'authentification et le contrôle d'inventaire ; aucun contenu de réponses ni identifiant personnel dans le rapport.

| Mesure | Aperçu | Site publié |
|---|---:|---:|
| Navigation vers le correcteur → première grille visible | 20,189 s | 14,133 s |
| Requêtes de données déclenchées jusque-là | 59 | 56 |
| Changement session soir puis EB3 : requêtes dans la fenêtre observée | 34 | 34 |
| Fenêtre de scénario soir EB3 (inclut une attente fixe de 10 s) | 11,942 s | 11,660 s |
| Survol session/EB + scroll, observation 6 s | 0 requête | 0 requête |
| Première grille, total QRC | 298/298 | 298/298 |
| EB3 soir, total QRC | 262/268 | 262/268 |

Les captures montrent aussi l'inventaire achevé : 4480 attendues, 4480 visibles, zéro manquante. Ce contrôle d'inventaire conserve ses lectures exhaustives à l'ouverture. La première session choisie était la session VTC du soir, et non une session journée : aucune mesure de session JOURNÉE réelle ne doit être déduite de ce test.

Point important : le site publié présente déjà le bouton Actualiser et l'absence du bandeau. Il n'est donc PAS un témoin « avant correctif ». Les chiffres 20,189/14,133 s ne prouvent aucun gain avant/après et ne permettent pas d'attribuer une différence au code. Aucun ancien paquet n'a été réinstallé ou publié pour les mesures.

### Mesures isolées PC

Le vrai écran est relié par un transport de test à PostgreSQL local jetable. Données exclusivement synthétiques EB1/EB2/EB3 VTC/TAXI. Les commandes SQL testées sont celles du prototype isolé, pas les RPC de production ; ne pas extrapoler leur latence à la notation hébergée. Le bloc des commentaires prédéfinis est remplacé dans ce navigateur pour isoler la mesure, et reste couvert par les régressions applicatives.

- Note 1/2 : **0,558 s** entre double clic et fin de la fenêtre de confirmation, dont **0,5 s d'attente de test fixe**. Ce chiffre n'est pas la latence SQL seule.
- Appels : **1 `/grade` + 1 `/rows?session`**, zéro `/rows?catalogue`.
- Largeur du panneau avant/après : **637/637 px**.
- Dix signaux QRC : **1 `/rows?session`**.
- Double clic Actualiser : **1 `/rows?catalogue`**.
- Nouvelle lecture après rechargement : note externe fictive **1,5/2** confirmée.
- Aucune connexion de données extérieure ; polices externes également bloquées.
- Le parcours mobile a enregistré la première note puis s'est arrêté sur le chevauchement lors du clic suivant : ce n'est pas un PASS mobile complet.

### Base jetable : couverture des 15 contrats

24 examens fictifs VTC/TAXI/TA/VA, sept matières, deux sessions ; pagination 1205 éléments ; permissions ; conflits CAS ; doubles intentions simultanées et rejeu après accusé perdu ; rollback après insertion d'événement ; anciennes notes et liens divergents protégés ; barème absent, remise non prouvée et question ambiguë refusés. Ces contrats ne prouvent pas la propagation IA dans le navigateur ni la disponibilité de nouveaux passages sur le site réel.

## Points techniques restant ouverts

1. **Mobile :** le nom candidat sticky intercepte une cellule dans le panneau rétréci. Reproduction Playwright sans clic forcé ; ne pas contourner le défaut pour déclarer PASS.
2. **Bouton Actualiser :** relit le catalogue, mais si les identités affichées ne changent pas, ne force pas systématiquement la lecture des notes. Une note modifiée pendant une déconnexion Realtime pourrait rester ancienne. Couverture bout en bout de ce cas NON PROUVÉE.
3. **Ancien circuit :** absence d'abonnement direct aux changements des résultats historiques dans cet écran ; apparition d'une nouvelle copie historique et nouvelles notes IA/humaines historiques NON PROUVÉES.
4. **Changement rapide session/EB :** chargement asynchrone sans génération de requête visible dans `recharger` ; le risque d'une réponse tardive d'une ancienne session reste à reproduire, pas déclaré corrigé.
5. **Compteur 0/0 :** affiché pour certaines matières sans QRC, même après chargement complet. Ce n'est pas la preuve d'un catalogue temporairement vide. Le 0/0 pendant chargement/changement doit être testé distinctement.
6. Tests complets JOURNÉE/SOIRÉE, nouvelles copies, origine IA, déconnexion Realtime, zoom/scroll avec panneau mobile, deux administrateurs navigateur et comparaison avant/après du même paquet restent NON PROUVÉS.
7. Les erreurs lint et la vérification types autonome empêchent un bilan « tous contrôles verts ».

## Retour arrière et coordination

Aucun retour arrière de production à effectuer : aucune livraison pendant cette intervention. Le correcteur actif, la finalisation des révisions et le drapeau `CORRIGES_TROIS_SURFACES_ACTIFS` n'ont pas été modifiés.

Pour une future correction : préparer une modification frontend ciblée de la lecture/pagination/notification, préserver les appels de notation et leurs accusés, conserver les tests ajoutés, identifier le paquet public courant et sa version avant toute publication, puis valider le paquet précédent et le retour à ce paquet sur environnement isolé. **Retour arrière de paquet NON EXÉCUTÉ**, pas de prétention de rollback vert. Ne jamais utiliser un rollback SQL ancien pour ce chantier de présentation/réseau.

Preuves locales : captures `preview-first`, `preview-SOIR`, `preview-mobile`, équivalents production et `isolated-desktop-saved`, `isolated-desktop-offline` sous `/tmp/browser/qrc-performance/`. Les captures réelles contiennent des noms d'élèves et ne sont pas exportées comme pièces publiques. Tests persistants ajoutés dans le test de navigation du correcteur ; journaux détaillés temporaires sous `/tmp`.

**Conclusion : progrès mesurés et tests réellement exécutés, mais aucune autorisation de publication déduite ; poursuivre les corrections ciblées des blocages avant un GO.**