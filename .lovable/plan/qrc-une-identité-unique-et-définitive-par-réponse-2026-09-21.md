# QRC : une identité unique et définitive par réponse

## Le principe

On arrête de « retrouver » à quelle correction correspond quelle réponse.
Dès qu'un élève répond à une question ouverte (QRC) d'un examen blanc, cette réponse reçoit
un identifiant unique et définitif. Cet identifiant ne change plus jamais : ni après un F5,
ni après une reprise, une déconnexion, une finalisation ou une correction.

Ensuite, trois choses lisent exactement le même identifiant :
- la liste des QRC à corriger,
- le compteur de QRC restantes,
- le blocage ou la publication de la note.

Plus de rapprochement par texte de réponse, date, nom, position de la question ou anciennes clés.

## Ce qui ne bouge pas

- Aucune ancienne réponse, correction, note, tentative ou résultat n'est modifié.
- Aucune migration de l'historique. Les milliers de QRC existantes continuent de fonctionner
  avec le système actuel, en parallèle, tant que vous n'avez pas donné votre accord.
- Le nouveau système ne s'applique d'abord qu'à un compte de test et un examen blanc de test.

## Cycle de vie d'une QRC

```text
l'élève répond  ->  identifiant unique créé (EN_ATTENTE)
                    |
                    +-- F5 / reprise / double envoi -> même identifiant, aucun doublon
                    |
le formateur valide ->  CORRIGÉE (une seule correction active)
                    |
                    +-- "Précédent" -> modifie la même correction, jamais une deuxième QRC

l'élève refait l'examen -> nouveau passage -> 10 nouveaux identifiants distincts
```

Publication de la note d'un passage : publiable uniquement quand toutes les QRC répondues
de ce passage sont à l'état CORRIGÉE. Sinon « En attente de correction QRC ».

## Détails techniques

Nouvelle table `qrc_instances` (aucune table existante modifiée) :

- `id` uuid, `apprenant_id`, `quiz_id`, `attempt_id`, `matiere_id`, `question_id`
- `reponse_eleve` text, `points_max` numeric
- `etat` enum `en_attente` | `corrigee`
- `points_obtenus`, `commentaire`, `corrected_by`, `corrected_at`
- `created_at`, `updated_at`
- Contrainte `UNIQUE (apprenant_id, quiz_id, attempt_id, matiere_id, question_id)`
  → le double envoi, le double F5 et la double finalisation ne peuvent pas créer deux lignes.
- `attempt_id` est un uuid propre au passage : une nouvelle tentative = un nouvel `attempt_id`,
  donc de nouvelles instances même si la réponse est identique.
- GRANT + RLS : lecture/écriture de ses propres lignes pour l'apprenant, lecture et correction
  pour admin/formateur, ALL pour service_role.

Écriture serveur : une fonction `upsert_qrc_instances(attempt_id, [questions])` en
`security definer`, idempotente (`ON CONFLICT DO UPDATE` sur la réponse uniquement tant que
l'état est `en_attente` ; une instance `corrigee` n'est jamais réécrite par l'élève).
Appelée à la sauvegarde des réponses d'examen blanc, pas depuis le navigateur seul.

Validation formateur : `validate_qrc_instance(id, points, commentaire)` — passe l'état à
`corrigee`. Rappel sur la même instance = mise à jour de la même correction, jamais une
nouvelle ligne.

Lecture unique : la file de correction = `etat = 'en_attente' AND reponse_eleve <> ''`.
Le blocage de note = « existe-t-il une instance `en_attente` pour ce passage ? ». Même requête,
même source.

Cohabitation : un drapeau par examen (`qrc_instances_enabled`) active le nouveau moteur pour
l'examen blanc de test uniquement. Les autres examens gardent le moteur actuel, inchangé.

## Plan de test (compte TEST, examen blanc de test)

1. L'élève répond à 10 QRC → exactement 10 identifiants → le formateur en voit exactement 10.
2. Corriger 1 → 9 restantes. F5 → toujours 9. Réactualiser, déconnexion/reconnexion → 9.
3. Corriger les 9 → 0 restante → le résultat devient publiable.
4. Refaire l'examen → 10 nouveaux identifiants, distincts des précédents.
5. Robustesse : double-clic d'enregistrement, coupure réseau puis reprise, double finalisation,
   F5 en plein examen → jamais 9, jamais 11, jamais de doublon.
6. Vérification en base : nombre de lignes et unicité contrôlés après chaque étape.

Le résultat de ces tests vous est envoyé avant tout déploiement.
Aucune activation sur de vrais apprenants et aucune migration de l'historique sans votre accord.
