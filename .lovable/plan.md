# PDF des signatures dans le ZIP Contrôle

## Modification
- Pour les formations présentielles, ajouter au ZIP « Tout télécharger » le PDF « Signatures session + pratique », identique à celui du bouton montré.
- Réutiliser la lecture des signatures limitée au planning et le générateur PDF existants, sans reconstituer de signatures ni d’horaires.
- Conserver les autres documents du ZIP. Si les signatures ne peuvent pas être lues, afficher une erreur plutôt que fournir silencieusement un dossier incomplet.

## Périmètre et protection
- Fichier principal : `src/components/crm/apprenant-sections/ControleQualiteTab.tsx`.
- Tests ciblés dans `src/test/`, journal daté dans `docs/`, règle dans `AGENTS.md` et suivi dans `roadmap.md`.
- Aucun changement des signatures, heures, notes ou données enregistrées ; aucun mail/SMS, aucun test sur un véritable apprenant.
- Les exports e-learning restent inchangés. Aucune publication dans cette étape.

## Vérifications
- Tester avec des données fictives les formations présentielles VTC/TAXI et les autres types concernés, la présence du PDF dans le ZIP, la pratique incluse, les erreurs de lecture et l’absence de remplacement d’autres pièces.
- Télécharger un ZIP fictif depuis le bouton, inspecter ses fichiers et le PDF généré.

## Détails techniques
Le ZIP utilise actuellement ses propres feuilles hebdomadaires et pratiques ; le bouton demandé utilise `chargerSignaturesRassemblees(apprenant.id, true)` et `generateSignaturesRassembleesPdf`. Le raccordement réutilisera ce même circuit en lecture seule.