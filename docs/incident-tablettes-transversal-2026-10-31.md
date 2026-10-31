# Incident transversal mobile/tablettes — 31 octobre 2026

## Changements effectués sans données apprenant
- `slides/SlideViewer.tsx` : suppression de la navigation tactile implicite (un geste −110 px horizontal/+500 px vertical tournait auparavant la page). Navigation par boutons/clavier ; flèches ignorées dans les champs ; hauteur normale indépendante de la barre navigateur.
- `ImageCarouselViewer.tsx` : identité de source, page/zoom/déplacement réinitialisés seulement pour des images différentes ; déplacement tactile disponible en zoom ; gestes ordinaires laissés au navigateur hors zoom.
- `ImageLightbox.tsx`, `ExamQuestionImage.tsx`, `ModuleDetailView.tsx` : cadre de largeur réservée pour images de cours et questions pendant chargement/affichage/erreur. Images communes aux cours, Bilans et examens blancs ; contenu et notes intacts.
- `ModuleDetailView.tsx` : suppression des rappels de scroll à180/420ms de révision ; animation annulable au démontage/remplacement, pas de retour global en haut si cible disparue.
- Protection des sources et gestes par deux nouveaux fichiers de tests. Règle enregistrée dans AGENTS local.

## Résultats réellement exécutés
| Contrôle | Résultat |
|---|---|
| Suite globale Vitest finale | 3249 PASS,13 ignorés,0 erreur non gérée ;362 fichiers réussis |
| Gestes SlideViewer et source carousel |2 PASS |
| PDF + reprise connexion + source carousel |20 PASS avant le dernier changement de scroll |
| Écrans réels ModuleDetailView 6/8/12, VTC/TAXI/TA/VA/CAS, iPad WebKit |5 passages locaux ; QCM envoyés, relus et soumis ;aucune erreur JS |
| Mêmes écrans sur tablette Android Chromium |5 passages locaux ;aucune erreur JS |
| Lecteurs SlideViewer/carousel/ImageLightbox, iPad et Android |2 scénarios PASS : diagonal, flèches dans champ QRC, portrait/paysage, changement de hauteur, texte conservé |
| Cadre image retardée2s iPad |607,5→607,5px, décalage0px |
| Cadre image retardée2s Android |534→534px, décalage0px |
| Compilation preview |dernier signal build OK |

Les cinq parcours pratiques utilisent trois modules communs, et non cinq moteurs indépendants. Les réponses de test existent seulement dans un transport local Map ; aucune connexion Cloud, mail, signature ou validation réelle. Les tests de gestes synthétiques ne prouvent pas une interaction tactile physique.

## Couverture et limites explicites
Les lecteurs de cours et images des questions sont protégés globalement par leurs composants partagés. Les tests globaux incluent banques/ordre, réponses, sessions, examens, Bilans et émargements mais ne représentent pas un passage autonome sur tablette de chaque écran.

NON PROUVÉS : tous modules/parcours complets ; Bilans/examens blancs et signature autonome sur tablette ; sauvegarde QRC dans le Cloud ; réseau réel, clavier iPad physique/ITP/PWA ; PowerPoint/Google intégré et PDFs réels en plein écran ; tous breakpoints ; sauvegarde multiappareil hébergée. Aucun compte TEST hébergé créé, exclusion totale des automatismes non garantie.

## Sécurité et publication
Le dernier scan signale4 alertes critiques de lecture de tables de configuration (`bilan_future_opening`, `bilan_identite_flags`, `bilan_snapshot_flags`, `module_regles_validation`). La lecture du catalogue de développement indique des paramètres partagés sans données élèves, et non les copies privées. Alertes non supprimées ; cela n'est pas un contrôle général de production. Aucun changement de permissions effectué.

Non publié : conditions de validation complète demandées non satisfaites sur les scénarios autonomes hébergés/tablettes et composants externes. Aucun déploiement ni vérification de la nouvelle version en production revendiqués. Le précédent blocage16 échecs/10 erreurs est levé, pas les limites de couverture.