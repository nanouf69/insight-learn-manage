# Rétablir la vue apprenant

## Diagnostic en lecture seule
L’erreur enregistrée montre que la fiche administrateur et la vue apprenant utilisent le même abonnement de suivi des heures. Le deuxième affichage tente de réutiliser un abonnement déjà démarré, ce qui bloque toute la vue.

## Correction proposée
- Donner à chaque affichage son propre abonnement, correctement retiré à sa fermeture.
- Conserver les mêmes calculs d’heures et les mêmes chiffres élève/administrateur.
- Tester deux affichages simultanés, fermeture/réouverture et mises à jour de signatures sur données fictives.
- Contrôler les tests existants et consigner le résultat.

## Fichiers prévus
- `src/hooks/useApprenantTauxRealisation.ts`
- `src/test/presentiel-taux-hook.test.tsx`
- `AGENTS.md`, `roadmap.md`, `docs/journal-modifications.md`

## Garanties
Aucune écriture dans les dossiers élèves, aucune modification des réponses, notes, signatures, accès ou règles de calcul ; aucun envoi et aucune publication.

## Détail technique
Nom de canal Realtime unique par exécution d’effet afin d’éviter la réutilisation d’un canal déjà abonné, y compris lors des doubles montages React. Test reproduisant le comportement réel de réutilisation des canaux.