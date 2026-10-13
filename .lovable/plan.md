# Audit heures/taux — Ismail Amar (lecture seule, aucune écriture)

## Constats prouvés (lectures du 13/10)
1. **Le « 97 % » n'est stocké nulle part.** Aucune colonne taux/pourcentage/forçage manuel dans la base (seuls `tva_taux`). C'est un résultat **calculé à l'affichage** : taux global pondéré des jalons (capture : 64h03 couvertes / 66h). Il ne peut donc pas être « préservé » ni « figé » : il bougera si une source change. Aucun code ne le ramène à 100.
2. **Contrat de la fiche** : VTC e-learning, 60 h e-learning + 6 h présentiel = 66 h, formation du 28/04 au 30/09/2026. Le 66 h vient de la fiche, pas seulement du catalogue.
3. **6 h validées par l'admin** : une seule ligne, 6,00 h, saisie le 12/10 à 20:03 UTC par un compte admin, **motif vide**. La table n'a **ni date de présence réelle ni catégorie** (théorie/pratique) : seule la date de saisie existe, et elle tombe après la fin de formation.
4. **Émargements** : 0 ligne. Aucune signature théorie ni pratique. Aucun doublon possible entre heures admin et émargements.

## Cohérence entre écrans (version en attente)
| Écran | Présence retenue | Source | État |
|---|---|---|---|
| Taux présentiel / total (fiche) | 6 h → 100 % | signatures + heures admin | déjà en ligne |
| Jalons pondérés / Contrôle | 6 h → jalon 100 %, global ~97 % | même règle | en attente |
| Relevé de connexions PDF, dossier PDF, rapport d'activité | 6 h | même règle (corrigée) | en attente, PDF non rendus |
| E-learning 57h15 | même calcul de connexions bornées au 30/09 | inchangé | à revérifier sur l'aperçu |

Les taux diffèrent volontairement : taux de connexion = heures réelles / 66 h ; jalons = progression pondérée des modules (EB3 soumis sans note, EB4-6 incomplets ne comptent pas à 100). Les heures prévisionnelles des jalons ne sont jamais ajoutées aux heures réelles.

## Problèmes réels et correctifs recommandés (non appliqués)
- **Heures admin sans date de présence ni catégorie** (`presentiel_heures_validees`) : elles sont comptées comme présence générique et datées de la saisie. Recommandé : afficher « date de présence non renseignée — saisie le 12/10 » et ne pas les qualifier de pratique ; à terme, ajouter date + catégorie à la saisie (nécessite votre accord, changement de base).
- **Motif vide** : la saisie devrait l'exiger (`HeuresPresentielValidees.tsx`).
- **Lecture en échec = 0** : `heuresValideesAdmin.ts` est appelé avec repli silencieux à 0 dans certains écrans ; recommandé : afficher « lecture impossible ».
- **Saisie après fin de formation** : à signaler à l'affichage, sans la retirer.

## Prêt à livrer / à corriger avant
- Prêt : comptage identique des 6 h sur jalons, Contrôle, rapport d'activité, relevé PDF, dossier PDF ; 4 correctifs du bilan 13/10.
- À corriger avant livraison : mention « date de présence non renseignée » et repli silencieux à 0.

## Étapes de validation (si vous approuvez)
1. Ouvrir l'aperçu connecté (lecture seule) sur Amar et relever chaque écran ci-dessus.
2. Générer les 3 PDF localement (aucun envoi) et vérifier 6 h, 57h15, 66 h.
3. Appliquer seulement les 2 corrections d'affichage, tests ciblés, puis vous demander l'accord de publication.
