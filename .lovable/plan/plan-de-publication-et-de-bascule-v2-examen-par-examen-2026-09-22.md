# Plan de publication et de bascule V2 — examen par examen

Rien n'est publié ni basculé tant que vous n'avez pas validé. EB3 et les 12 resynchronisations restent hors périmètre.

## Ce que l'inventaire change

Le code ne tire aucune question au sort : le sujet servi est lu à chaque ouverture dans l'éditeur admin. Les « variantes » sont donc des **versions successives** du même sujet (retouches d'une ou deux questions au fil des mois), pas des sujets alternatifs distribués aux élèves.

Conséquence : publier le sujet actuel comme version officielle V2 **ne change rien** à ce que voient les élèves aujourd'hui. Les anciennes variantes ne doivent pas être publiées — elles n'ont plus cours ; elles restent figées dans les passages historiques déjà copiés.

Un point à lever avant EB1 : la variante `a114303d` de EB1 / Réglementation VTC 2 (1 passage du 11/09) ne partage aucune question avec les autres. À vérifier avant publication.

## Principe de publication

Pour chaque examen, dans l'ordre :

1. Lire le contenu actif de l'éditeur admin pour les 7 matières (lecture seule).
2. Comparer question par question avec la dernière variante réellement servie. Si écart : arrêt et rapport, aucune publication.
3. Publier une version officielle V2 (numéro 1) avec empreinte, sans toucher au contenu.
4. Contrôle après publication : l'empreinte publiée correspond exactement au contenu servi.

La publication n'active rien par elle-même : un passage ne bascule en V2 que si l'apprenant est raccordé par le serveur.

## Ordre proposé

| Vague | Examens | Pourquoi |
|---|---|---|
| 0 | EB99TEST | Répétition complète sur l'examen de test |
| 1 | EB4, EB5, EB6 (VTC) | Peu de passages, aucun depuis le 18/09 |
| 2 | EB1, EB2 (VTC) | Volume élevé, après validation de la vague 1 |
| 3 | EB1-TAXI → EB6-TAXI | Filière TAXI |
| 4 | eb1-ta → eb5-ta, eb1-va → eb6-va | Filières TA et VA, faibles volumes |
| — | EB3 et EB3-TAXI | Exclus jusqu'à la fin de session |

## Bascule des élèves

Après chaque vague : raccordement des comptes TEST uniquement, vérification d'un passage complet, puis élargissement progressif par apprenant. Aucun élève réel n'est raccordé sans votre accord vague par vague.

## Retour arrière

- Une version publiée peut être retirée : les nouveaux passages repartent sur l'ancien circuit.
- Le raccordement d'un apprenant se coupe individuellement, sans effet sur ses passages déjà enregistrés.
- L'ancien circuit reste en place et fonctionnel pendant toute la migration ; aucun code ancien n'est supprimé.
- Aucune donnée n'est effacée ni recalculée à aucune étape.

## Décisions déjà actées

- Les 3 270 résultats sans questions/réponses conservées restent dans l'ancien historique, jamais présentés comme des passages V2.
- Origine de correction : vert = correction humaine vérifiée, orange = correction automatique historique. Aucune requalification rétroactive. À appliquer à l'écran de correction QRC V2 — travail d'affichage uniquement, à faire avant la vague 1.

## Prochaine étape exacte

Vérifier la variante `a114303d` de EB1 / Réglementation VTC 2, puis exécuter la vague 0 (EB99TEST) de bout en bout.
