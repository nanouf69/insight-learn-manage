# Intégrité des montants — 29 octobre 2026

## Résultat vérifié
- Question identifiée : module **12**, exercice **306**, question **4**, choix **A**, UUID **a7b304f9-ca65-4a61-b621-310dcdcbf0bd**.
- Le JSON serveur et `quiz_questions` contiennent **` 8€`**, choix A correct, dernière modification canonique **10:08:49.881665 UTC**. Aucun montant n'a été réécrit pendant cette intervention.
- La capture « A. € ✓ » correspond au rendu compact de l'éditeur ; celui-ci affiche directement le texte enregistré. Pas de suppression des chiffres dans le champ, RichText ou le rendu QCM trouvée.
- Journal humain/authenticated : `8 € → €` à **10:05:58**, plusieurs transitions `€ / _€ / 8€` entre **10:06 et 10:08**, puis `_€ → 8€` à **10:08:48.789055**. Le journal ne prouve pas qui a produit chaque caractère dans le navigateur ; il ne prouve pas une mutation par IA.
- Deux chemins de retour asynchrone appliquaient inconditionnellement la confirmation JSON puis canonique dans l'éditeur. Le retour d'un brouillon précédent pouvait remplacer une modification locale plus récente : défaut de concurrence constaté dans le code et couvert par un test de réponse lente isolée. La causalité exacte de chaque transition historique n'est pas démontrée.

## Correction minimale
Fichiers : `ModuleDetailView.tsx`, `editorSaveAcknowledgement.ts`, son test, `src/lib/AGENTS.md`.
- Révision locale capturée avec le lot de sauvegarde : son accusé ne remplace l'éditeur que si aucune saisie plus récente n'est survenue, indépendamment des horloges serveur/navigateur.
- Choix `€`, `_€`, `euros` sans nombre : conservé localement, signalé incomplet, pas envoyé par l'autosauvegarde ; Enregistrer désactivé jusqu'à saisie d'un montant. Aucun montant inventé.
- Enregistrer annule le minuteur de brouillon encore en attente.
- Réponses/notes élève, sources pédagogiques, corrigés, indices et lettres, snapshots et protections serveur inchangés. Aucune IA, aucun mail/SMS, aucune écriture Cloud effectués.

## Audit lecture seule
| Périmètre | Mesure |
|---|---:|
| Choix dans les exercices JSON de la plateforme | 31 848 |
| Choix contenant € / euros | 2 259 |
| Choix JSON actuellement réduits à € / _€ / euros | 0 |
| Questions canoniques actives | 2 261 |
| Choix canoniques actifs réduits à un symbole monétaire | 0 |
| QCM canoniques actifs sans choix correct | 0 |
| Module 12 | 11 exercices / 62 questions |
| Module 6 | 1 exercice / 84 questions |
| QCM modules 6/12 sans choix correct | 0 |
| Questions modules 6/12 avec plusieurs choix corrects | 6, pas assimilées à des erreurs : plusieurs réponses autorisées |
| Copies élève exercice306 | 29 ordinaires + 14 révisions ; aucune chaîne « 8 euros / 8euros » |

La question signalée est un **QCM**, corrigé par sélection de lettres, pas une réponse ouverte monétaire. Il ne faut pas changer sa correction en rapprochement textuel de `8`, `8.00`, `8,00` ni retoucher ses copies. La preuve de choix repose sur les lettres du contenu associé ; une migration vers des UUID de choix/révisions ne serait pas un correctif minimal et n'a pas été réalisée.

Deux sources statiques contiennent encore **4 €** pour 306/4/A, tandis que les sources actives enregistrées contiennent **8€**. Elles n'ont pas été modifiées : aucun barème source fourni ici n'autorise une correction de leur contenu. Le défaut de somme statique n'est pas une preuve tarifaire suffisante.

Le scan ne couvre pas exhaustivement les questions dans cours.quiz, documents, passages figés, overrides et toutes les anciennes révisions ; il ne peut donc pas certifier l'absence de toute ancienne corruption. L'audit de tous les historiques de modifications de réponses et de toute normalisation QRC monétaire reste **NON PROUVÉ**. `corriger-qrc` retourne un résultat distinct et ne contient pas d'écriture de réponse originale dans le chemin lu ; aucun appel IA exécuté.

Empreinte module12 après contrôle : **71847e7f29381e3f291ad639d5edc9ef**, date de modification **10:08:54.550536 UTC**, antérieure à l'intervention. Une comparaison exhaustive avant/après de toutes les tables élève n'a pas été exécutée ; aucune commande mutante Cloud n'a été appelée.

## Tests réellement exécutés
- **PASS : 66 tests / 7 fichiers** : accusés de sauvegarde, intentions admin, choix corrects, conflits canoniques, suppressions persistantes, affichage source unique, module13.
- **PASS : 31 tests / 3 fichiers** : source unique de référence, persistance des réponses et accusés (18 tests communs à la première série ; **79 tests distincts**, pas 97).
- **PASS navigateur, copie totalement isolée** : vrais composants éditeur/élève, aucune mutation réseau non interceptée ; `€` bloqué, `8 euros` inchangé, réponse lente d'un ancien lot pendant nouvelle saisie, Enregistrer `8€`, lecture côté quiz, vrai clic A, montant après rechargement. 14 requêtes/actions locales interceptées, zéro erreur de page.
- Les tests JSON conservent exactement `8`, `8€`, `8 euros`, `8.00`, `8,00`, espaces ; ils ne prétendent pas tester une notation de réponse ouverte.
- **PASS module13 isolé** : question2 réellement cochée avant actualisation `online`, retrait fictif question1, question2 toujours cochée, compteur courant 3→2. Capture vérifiée. Ancien rapport imprimait une conservation non assertée ; cette preuve la remplace uniquement pour le scénario isolé exécuté.
- Compilation automatique : **build OK**, dernière entrée consultée **10:22:56 UTC**.
- Scripts et captures : `/tmp/browser/money-integrity/` ; aucune page de test ajoutée au site.

## Limites et production
- **NON PROUVÉ** : connexion autonome d'un compte technique hébergé, vrai aller-retour Cloud de sauvegarde, soumission finale, validation QRC `8/8.00/8,00` versus `2/80`, deux profils autonomes, temps réel réel module13, historique complet des modifications IA. Aucun compte réel usurpé.
- **Non publié.** L'outil publie le projet complet et ne sélectionne pas des fichiers ; des travaux inachevés recensés dans la feuille de route seraient embarqués. Aucun déploiement global risqué demandé. Le **8€ enregistré existe déjà en production** ; la nouvelle protection de l'éditeur est seulement dans l'aperçu.