# Zine DAKHLI — contrôle du 09/11/2026

## Identité et résultat prouvé
- Dossier `8441a1b2-f20f-496e-b2c9-b2a914d9c8e3`, distinct d'Ilyes Dakhlaoui.
- EB1 VTC, tentative enregistrée 1, matières remises le 06/11/2026.
- Notes V2 définitives A/B/C/D/E/F/G : 15,5 / 10 / 7 / 14 / 11 / 12,5 / 6.
- Coefficients configurés : 3/2/3/2/1/3/3. Somme pondérée 181, somme coefficients 17 ; moyenne affichée 10,7/20.
- Seuils 6/20, anglais 4/20 ; G=6 est non éliminatoire. 16 QRC corrigées, aucune en attente. Verdict : réussi.
- Ancienne ligne G `ebd20bff-7208-4468-a654-cab72844cf73` : 5,5/20, reussi=false ; passage V2 `18acf3f0-723a-4833-8622-f0ee8af99148` : 6/20 définitif, révision 3. Ces valeurs n'ont pas été modifiées.

## Contrôle public et limites
- À 16:02:27 UTC : `https://gestion.ftransport.fr/assets/index-BNKO-425.js` contient les marqueurs du correctif a5945bd815c2d5e5f89b74f542310e020408d89a.
- Navigation publique authentifiée admin → dossier exact → Résultats → Vue apprenant → Notes → Examens → Voir mes résultats : CRM réussi ; sept badges Notes réussis ; carte et détail réussis 10,7.
- Il s'agit de la consultation admin du véritable dossier, PAS d'une session authentifiée en tant que Zine. Son écran déjà ouvert et son ancien bundle sont non vérifiables ici.
- La contradiction signalée n'est donc pas reproduite sur la version publique actuelle. L'ancien statut G et un écran périmé sont des explications possibles, pas une cause démontrée du screenshot absent.
- Notes conserve un encadré « À revoir » pour les matières sous 10 (C7 et G6), sans les qualifier d'échec dans les badges actuels. Ce bloc n'a pas été modifié.

## Défaut partagé prouvé et correction préparée
`useCoreChangeTick` n'écoutait que les résultats V2 et QRC V2, contrairement à Notes qui écoutait aussi les résultats historiques. Une correction historique ne déclenchait donc pas la même relecture sur carte/détail/CRM. Le hook utilise désormais le même abonnement événementiel complet ; aucun polling ajouté. Cela corrige une lacune de rafraîchissement prouvée, sans prétendre qu'elle a causé cette capture.

## Tests réellement exécutés
- 74 tests PASS : Zine, matrice 24 EB et 108 matières des définitions source, frontière de chaque matière, réussite/échec/attente, identité native, copie identique, notes QRC, événement de correction historique et reprise de connexion.
- Les 108 matières testées sont celles des définitions source importées ; les 112 matières mentionnées dans l'audit précédent incluent une configuration différente. Ce test ne certifie pas une matrice de configuration live complète.
- Parcours tablette 894×578 en aperçu sur le dossier réel consulté : détail réussi 10,7. Rechargement effectué, mais retour vers `/cours-public` : restauration du même détail après rechargement NON PROUVÉE.
- Aucun test de correction n'a écrit en production, aucune note/barème/réponse/historique modifié, aucune nouvelle publication.

## À autoriser / non vérifiable
- Publication du seul correctif de rafraîchissement : attend validation explicite.
- Session personnelle et ancien écran de Zine : non vérifiés ; aucun verdict de sa session personnelle affirmé.
- Blocages historiques de l'audit précédent : inchangés, hors incident.