# Habib BEN MOHAMED — examen blanc VTC n°2 bloqué « En attente de correction des QRC »

## Diagnostic (lecture seule, rien n'a été modifié)

Toutes les QRC de cet examen sont corrigées dans le nouveau système. Le blocage vient d'un ancien registre de QRC, qui n'a jamais été mis à jour.

Preuves (élève 4f289012…, EB2) :

| Matière | Nouveau système (copie / note / QRC) | Ancien registre QRC |
|---|---|---|
| A T3P | 7c3271ee : 18 définitif, 5/5 corrigées | 5 « en attente » |
| B Gestion | f2f0e2f2 : 20 définitif, 2/2 corrigées | 2 « en attente » |
| C Sécurité routière | aucune copie (QCM seulement), ancienne note 19 | aucune |
| D Français | 213e195c : 17,5 définitif, 3/3 corrigées | 3 « en attente » |
| E Anglais | aucune copie (QCM seulement), ancienne note 19 | aucune |
| F(V) | 28724266 : 18,5 définitif, 4/4 corrigées | 4 « en attente » |
| G(V) | 2be74bfa : 20 définitif, 2/2 corrigées | 2 « en attente » |

Les 7 notes affichées correspondent exactement à ces copies : 5 notes du nouveau système, plus C et E de l'ancien.

Ce que fait l'écran :
- C et E n'existent que dans l'ancien système, donc l'examen n'est pas entièrement dans le nouveau.
- Dans ce cas, l'écran demande à l'ancien registre s'il reste des QRC en attente **pour tout l'examen**. Il trouve les 16 anciennes lignes de A, B, D, F, G, des doublons déjà corrigés dans le nouveau système, et il bloque la note.
- Cela contredit la règle déjà en place : une matière qui a une copie dans le nouveau système est jugée seulement sur cette copie.

Ce n'est pas un cas isolé : 16 élèves ont des anciennes lignes « en attente » sur un examen qui a aussi des copies dans le nouveau système (220 lignes). Je n'ai pas vérifié lesquels sont réellement bloqués à l'écran.

## Correction minimale proposée (affichage seulement, aucune donnée touchée)

On interroge l'ancien registre **matière par matière**, et seulement pour les matières qui n'ont pas de copie dans le nouveau système. On ne lui demande plus d'avis global sur l'examen.
- Les matières du nouveau système restent jugées sur leur état serveur, comme aujourd'hui.
- Une QRC réellement en attente, dans l'un ou l'autre système, bloque toujours la note.
- Aucune ligne ancienne n'est modifiée, fusionnée ni supprimée. Aucune note ni réponse ne change.

Écrans concernés : la carte de l'examen dans la liste des examens blancs, et la page des résultats (côté élève).

## Tests prévus avant publication

1. Cas Habib reproduit avec des données fictives : 5 matières corrigées dans le nouveau système, ancien registre « en attente » sur ces matières, C/E anciens sans QRC → note finale affichée.
2. Une QRC réellement en attente dans le nouveau système → toujours bloqué.
3. Une matière seulement dans l'ancien système, avec une QRC ancienne en attente → toujours bloqué.
4. Examen entièrement dans le nouveau système → comportement inchangé.
5. Tests existants des aides de calcul des examens et des corrections → toujours OK.
6. Vérification en lecture seule de l'écran d'Habib dans l'aperçu, puis publication seulement avec votre accord.

## Détails techniques

- Fichiers : `src/components/cours-en-ligne/ExamenBlancsListe.tsx` (lignes ~600-604) et `ExamenBlancsResultats.tsx` (ligne ~123). Remplacer `qrcEngine.isExamPending(examId)` par `scores.some(s => !s.__core && qrcEngine.isMatierePending(examId, s.matiere_id) === true)`.
- `useQrcEnginePending.isMatierePending` existe déjà ; `isExamAttemptPublicationPending` n'est pas modifiée.
- Nouveau test : `src/test/eb-pending-mixte-core-ancien.test.ts`.
