# 12/10/2026 — Points de pondération des Jalons

- Périmètre autorisé : affichage admin de la fiche apprenant, carte « Jalons pondérés » uniquement.
- Ajout de la colonne « Points du module » calculée depuis les volumes déjà utilisés par les poids : 4 × pages + questions actives.
- Ajout du total formation, égal au dénominateur exact du calcul des poids ; les introductions et alias ne sont comptés qu’une fois.
- Les jalons obligatoires sans poids affichent 0 point et conservent leur règle existante.
- Distinction affichée entre points de pondération, note/score et contribution à la progression globale.
- Aucun changement de contenu, question, note, progression, donnée élève, règle de validation, heure, email ou SMS.
- Limite conservée : questions actualisées automatiquement ; pages issues de l’audit et limites de supports affichées.

## Objectifs pédagogiques — ajout éditorial autorisé

- Mapping partagé `src/lib/objectifsJalons.ts`, fondé sur les identifiants permanents et limité aux modules effectivement présents dans les quatre parcours e-learning.
- Affichage admin dans Contrôle : `ObjectifsJalonsSection.tsx`, option explicite de `JalonsPonderesCard.tsx`, activée uniquement par `ControleQualiteTab.tsx`.
- PDF `src/lib/pdf/releve-jalons-pedagogiques.ts` : page d'objectifs, texte enveloppé, lignes non coupées entre pages, pagination conservée. Largeur de la colonne Source ajustée à la largeur disponible pour supprimer l'avertissement de table, sans changer les valeurs.
- Exemple Bilan examen : « S'entraîner sur des questions types des épreuves d'examen. » Aucune revendication d'annales officielles ni de conformité CDC.
- Tests : 137 ciblés (dont les 109 initiaux) et 123 critiques réussis ; extraction des objectifs et textes des quatre PDF ; 16 pages fictives inspectées, aucun mot hors page selon les coordonnées PDF.
- Empreintes SHA-256 inchangées pour `jalonsPonderes.ts`, `jalonsPedagogiques.ts`, `jalonsVolumes.ts` et `modules-config.ts`.
- Aucun appel de correction IA, aucune migration, aucune écriture de données élèves, questions, réponses, notes, heures, signatures ou statuts.
- Journaux et PDF de vérification conservés sous `/tmp/jalons-objectifs` et `/tmp/releve-jalons-pedagogiques-fictif-*.pdf`.
- Publication demandée via l'outil Lovable pour `https://gestion.ftransport.fr`. Au contrôle du 12/10/2026 à 19:03:25 UTC, le domaine sert encore `index-BSUytDnT.js`, sans les nouveaux objectifs : publication non confirmée. L'outil ne fournit aucun journal de compilation de production ; modules compilés et servis correctement par Vite en prévisualisation. Preuves conservées dans `/tmp/jalons-objectifs/publication-proof.json` et les captures HTML/headers. La case publication reste ouverte.