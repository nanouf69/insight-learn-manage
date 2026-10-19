# Avertissement e-learning : seuil de 50 %, sans blocage

## Ce qui sera ajouté

1. **Accueil élève** : un bandeau visible lorsque les heures réalisées sont strictement inférieures à la moitié des heures e-learning prévues pour son dossier.
   - Texte demandé : « Pour valider votre formation, vous devez effectuer au moins 50 % du temps de formation en ligne prévu (X h / Y h). Il vous reste Z h à réaliser. »
   - **X** = heures réellement effectuées ; **Y** = durée e-learning prévue ; **Z** = heures restantes pour atteindre la moitié de Y, et non la totalité.
   - Exemple : 20 h réalisées sur 60 h prévues → seuil 30 h, reste 10 h.
   - À 30 h sur 60 h, le bandeau disparaît. Les minutes seront conservées dans l'affichage.

2. **Dernier jalon terminé** : rappeler ce même message au retour à l'accueil après le dernier jalon, après relecture des validations par le serveur et actualisation des heures, si le seuil reste non atteint. Le rappel sera refermable et ne bloquera ni la sortie ni la fin de formation. Une simple demande de validation ou un compteur en attente ne déclenchera pas ce rappel ; il ne sera pas répété à chaque affichage.

3. **Fiche CRM** : ajouter en rouge « Seuil 50 % non atteint » sous **TAUX E-LEARNING**, sans remplacer les heures ou le taux actuels.

4. **Liste CRM** : ajouter un filtre à cocher « Seuil e-learning 50 % non atteint », compatible avec la recherche et les filtres existants. Les heures indisponibles ne seront jamais considérées comme zéro : un état distinct sera indiqué.

## Fichiers concernés

| Fichier | Intervention prévue |
|---|---|
| `src/components/cours-en-ligne/StudentHoursTracker.tsx` | Bandeau près de « Mes heures e-learning », avec les heures déjà lues. |
| `src/pages/CoursPublic.tsx` | Rappel à la confirmation du dernier jalon du parcours attribué ; observation seulement, sans changer la validation. |
| `src/components/crm/ApprenantDetailPage.tsx` | Indicateur rouge dans TAUX E-LEARNING. |
| `src/components/crm/CRMDashboard.tsx` | Filtre dans la liste CRM et états chargement/indisponibilité. |
| `src/lib/seuilElearning.ts` — nouveau | Calcul commun d'avertissement : seuil, heures restantes et état indisponible. |
| `src/hooks/useSeuilsElearningCRM.ts` — nouveau | Lecture groupée et paginée des heures nécessaires au filtre, sans charger une fiche complète par stagiaire. |
| `src/lib/elearningHoursEvidence.ts` — nouveau, et `src/hooks/useApprenantTauxRealisation.ts` | Réutilisation à l'identique du calcul actuel des heures e-learning pour la lecture groupée : aucun changement de formule, de période ou de preuves retenues. |
| `src/test/seuil-elearning.test.ts`, `src/test/crm-seuil-elearning.test.tsx` — nouveaux | Vérifications fictives des nouvelles règles, du rappel final, du filtre et de la parité des heures. |
| `roadmap.md`, journal daté dans `docs/`, `AGENTS.md` | Périmètre, résultats des contrôles et règle de source commune. |

## Ce qui restera strictement inchangé

- Validation des jalons, progression des modules et calcul actuel des taux.
- Heures prévues/enregistrées, dates d'accès et règles de comptabilisation des heures.
- Questions, réponses, notes, tentatives, snapshots, signatures et relevés figés.
- Bloc « Mon dossier de formation », documents et mails existants.
- Aucun envoi de mail/SMS, aucune création de compte ou signature, aucune modification de données élève.
- Aucun blocage ajouté : même si tous les jalons sont validés avec moins de 50 % du temps prévu, l'élève peut terminer.

## Détails techniques

- Comparer les heures réelles non arrondies à `durée e-learning prévue × 0,5`, et non le pourcentage affiché arrondi.
- Lire la durée depuis la même source contractuelle que le suivi actuel ; exclure les heures pratiques/présentielles. Aucun nouveau volume horaire ne sera inventé.
- N'afficher l'avertissement que pour un parcours e-learning avec une durée positive et une lecture des heures réussie. Durée inconnue, erreur ou chargement : état indisponible, pas de faux « seuil non atteint ».
- Réutiliser les preuves de validation et les modules réellement attribués pour détecter le dernier jalon ; aucun ajout de règle serveur de validation.
- Pour le filtre, partager le calcul existant plutôt que recréer un second calcul divergent ; lectures paginées/groupées et mises à jour par les mécanismes existants, sans interrogation périodique ajoutée.

## Contrôles avant livraison

- 20/60 → avertissement, reste 10 h ; 30/60 → aucun avertissement ; juste sous 30 h → avertissement même si le taux affiché arrondit à 50 %.
- Vérifier les autres durées contractuelles et les parcours VTC/TAXI/TA/VA concernés ; les formations pratiques seules ne sont pas ciblées.
- Lecture impossible ou durée inconnue ≠ zéro heure ; aucune fuite lors d'un changement de compte.
- Tous les jalons validés sous le seuil → rappel, mais validation et sortie toujours possibles ; validation en attente → pas de fausse confirmation.
- Parité des heures élève/fiche CRM/filtre ; tests existants sur heures et progression toujours réussis.
- Contrôles visuels ordinateur/téléphone sur données fictives, sans test d'écriture sur un vrai élève ; compilation automatique et journal des résultats.

**Cette étape présente le périmètre uniquement : aucun code applicatif n'a été modifié. Mise en œuvre après votre accord ; publication uniquement sur instruction explicite.**