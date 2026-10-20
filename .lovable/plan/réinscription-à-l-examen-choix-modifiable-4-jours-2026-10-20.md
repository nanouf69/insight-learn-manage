# Réinscription à l'examen + choix modifiable 4 jours

## Ce qui change pour l'élève
1. **Nouvelle question dans le document à signer** (nouveaux envois uniquement, nouvelle version du modèle) :
   « Je me réinscris à l'examen théorique : ☐ Oui ☐ Non ». Rien n'est coché d'avance ; une réponse est obligatoire pour signer.
   Les documents déjà envoyés ou signés gardent leur texte d'origine (sans cette question).
2. **Page d'accueil élève** : un encadré « Votre choix pour l'entraînement pratique » affiche le choix signé, la date de signature et, pour les nouveaux documents, la réponse sur la réinscription.
3. **Modifier son choix pendant 4 jours** après la première signature : bouton « Modifier mon choix » (dans l'encadré et sur la page du lien). L'élève coche et signe à nouveau. Après 4 jours, le bouton disparaît et le serveur refuse.

## Ce qui change dans le CRM (fiche élève)
- À côté de « Théorie : non réussie » / « Pratique : en attente », deux badges :
  - **Choix pratique** : Maintenant / Plus tard / Renonce / En attente de réponse.
  - **Réinscription examen** : Oui / Non / Non demandée (anciens documents) / En attente.
- Au survol ou au clic : historique complet (première signature + chaque modification, avec date et heure).

## Garanties
- La première signature n'est **jamais modifiée** : chaque modification est une nouvelle ligne conservée, la plus récente est celle affichée.
- Délai de 4 jours contrôlé par le serveur, pas par le navigateur.
- Aucun mail envoyé, aucun dossier existant modifié, aucune conséquence administrative automatique.
- Aucune question, réponse, note, signature d'émargement ou relevé figé touché ; Ismail AMAR exclu.

## Détails techniques
- Nouvelle table append-only `documents_a_signer_revisions` (document_id, apprenant_id, choix, reinscription_examen, signature, signe_le, user_agent), RLS : admin lecture, élève lecture de ses propres lignes ; écriture uniquement par la fonction serveur. Trigger refusant UPDATE/DELETE.
- Colonne nullable `reinscription_examen` sur `documents_a_signer` (null = ancien document).
- `modeleEchecChoixPratique.ts` : version `v4-2026-10-20` avec la question réinscription ; `soumettre` exige la réponse seulement si le texte figé la contient.
- `document-signature-public` : action `reviser` (même lien, délai 4 jours depuis `signed_at`, insertion append-only).
- Encadré élève dans la page d'accueil de l'espace élève, lecture via RLS par `apprenant_id` du compte connecté.
- Badges dans `ApprenantDetailPage.tsx`, lecture du dernier état (signature d'origine + dernière révision).
- Tests : délai 4 jours (J+3 accepté, J+5 refusé), réponse réinscription obligatoire en v4 / absente en v3, première signature inchangée après révision, état affiché = dernière révision.
- Non publié avant votre accord.
