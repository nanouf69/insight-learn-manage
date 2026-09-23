# Remise à zéro administrative ciblée de l’EB1

## Objectif
Permettre uniquement à Thierno BAH et Kevin FERNANDES de recommencer intégralement l’EB1 depuis la matière A, sans supprimer ni recopier aucune ancienne réponse, note ou tentative.

## Mise en œuvre
- Ajouter un journal append-only des remises à zéro d’examen, avec la date de coupure et la liste figée des anciennes tentatives/résultats.
- Ajouter une opération serveur atomique réservée aux administrateurs : elle archive les passages V2 EB1 existants, clôt les passages encore ouverts comme abandonnés, conserve les résultats, et accorde la dérogation au délai de 48 h.
- Adapter l’écran apprenant pour que la progression et les résultats antérieurs à la dernière remise à zéro restent dans l’historique mais ne comptent plus dans le nouveau passage.
- Ne créer la tentative V2 de la matière A qu’au clic de l’élève, afin que son chrono complet commence réellement à cet instant. Les matières suivantes resteront non commencées.
- Exécuter l’opération uniquement pour les identifiants vérifiés de Thierno et Kevin.

## Contrôles
- Vérifier en lecture seule l’archivage de toutes leurs anciennes tentatives et de tous leurs résultats EB1.
- Vérifier que chacun obtient un EB1 actif à 0 %, sans blocage de 48 h, avec la matière A disponible.
- Tester avec un compte TEST que le premier enregistrement V2 du nouveau passage est accepté et que le chrono est neuf.
- Confirmer qu’aucune donnée n’a été supprimée et qu’aucun autre candidat ni examen n’a été modifié.

## Détails techniques
- Aucune modification du contenu pédagogique ou des snapshots historiques.
- Aucun `DELETE`, aucune copie d’ancienne réponse, aucun recalcul de note.
- Journalisation inaltérable et opération idempotente pour empêcher une double remise à zéro.
