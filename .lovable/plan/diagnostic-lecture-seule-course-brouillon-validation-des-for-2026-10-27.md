# Diagnostic lecture seule : course brouillon / validation des formulaires élève

Aucune donnée ni aucun code n'ont été modifiés.

## 0. Le signalement lui-même

- PREUVE : l'identifiant `eaef577b-92b3-58eb-98ff-270e585378c6` ne figure ni dans les résultats d'analyse de sécurité enregistrés (12 signalements actuels, aucun sur ce sujet), ni dans le code, ni dans l'historique de conversation consultable. Je n'ai pas pu relire son texte original.
- HYPOTHÈSE : il concerne le mécanisme décrit ci-dessous (le seul du projet où un brouillon automatique et une validation finale écrivent dans la même ligne). Merci de me transmettre son texte si un autre formulaire est visé.

## 1. Fichiers, table et flux concernés (preuves, code lu)

- Table : `apprenant_documents_completes`, une ligne par (apprenant, type de document, titre).
- `src/hooks/useAutoSave.tsx` : brouillon automatique (2 s après chaque saisie, toutes les 30 s, avant fermeture) ET envoi final, via la même fonction `triggerSave`, par un upsert sans condition.
- Formulaires qui valident en appelant ce même `triggerSave` avec `_status: "completed"` : `AnalyseBesoinForm.tsx`, `SatisfactionForm.tsx`, `ProjetProfessionnelForm.tsx`, `CompetencesChecklist.tsx` (et `EvaluationAcquisForm.tsx`, qui utilise aussi le hook).
- Solution de secours sans session : `supabase/functions/save-public-form/index.ts`, qui met à jour la même ligne sans condition.
- Base de données (lecture du catalogue) : seuls deux déclencheurs existent sur cette table (synchronisation CMA et refus de suppression). **Aucune protection n'empêche un brouillon de remplacer une version validée.**

## 2. La course est-elle encore possible ? Oui (preuve par lecture du code)

Scénarios constatés dans le code :

1. **Brouillon remis en file après la validation** : chaque saisie place le brouillon dans la file d'attente. Au clic sur Valider, la version validée est enregistrée, mais le brouillon reste en file (il n'est vidé que s'il est identique à la version validée, ce qui n'est jamais le cas). Le code relance alors immédiatement la sauvegarde de ce brouillon : la ligne repasse sans `_status: "completed"` ni signature.
2. **Minuteurs restants** : le délai de 2 s et la sauvegarde toutes les 30 s ne sont pas annulés à la validation ; s'ils se déclenchent après, ils réécrivent le brouillon.
3. **Validation pendant une sauvegarde de brouillon en cours** : la validation est mise en attente et renvoie « échec ». L'élève voit « Erreur lors de la sauvegarde », mais l'écran passe quand même à l'étape suivante (`onComplete()` est appelé sans condition).
4. **Brouillon qui arrive en retard** : en cas de délai réseau, la requête du brouillon peut toujours aboutir après la validation. Le serveur l'accepte, puisqu'il n'y a ni numéro de version ni refus.

Hypothèses non prouvées : je n'ai pas encore vérifié en base combien de lignes ont réellement perdu leur `_status: "completed"`. C'est une vérification en lecture seule, à faire avant tout correctif. Je ne connais pas non plus l'effet sur le « Dossier de bienvenue », qui utilise un autre circuit (`useOnboardingPersistence`, type `onboarding_state`, ligne séparée) et n'est donc pas concerné par le scénario 1.

## 3. Correction minimale proposée (à appliquer seulement après votre accord)

Côté navigateur (`useAutoSave.tsx`) :
- Une validation finale annule les minuteurs et vide la file du brouillon avant d'envoyer, puis bloque tout brouillon suivant pour ce document.
- Si une sauvegarde de brouillon est en cours, la validation attend sa fin puis s'envoie (elle n'est plus mise en attente avec un faux échec).
- Dans les formulaires, `onComplete()` n'est appelé qu'après confirmation du serveur.

Côté serveur (ajout seul, sans réécrire aucune donnée) :
- Un déclencheur BEFORE UPDATE sur `apprenant_documents_completes` : si la ligne existante est validée (`_status = completed`) et que la nouvelle n'a pas ce statut, l'écriture est refusée sans erreur bloquante et le refus est journalisé. Une nouvelle validation reste acceptée, et l'administration n'est pas concernée.
- Le serveur est ainsi l'autorité finale, même pour un brouillon tardif ou envoyé depuis un autre appareil.

## 4. Test de non-régression proposé

- Vitest (`src/test/auto-save-documents.test.ts`) :
  - saisie, puis validation, puis exécution des minuteurs : le dernier envoi doit être la version validée ;
  - brouillon bloqué en vol, validation, puis le brouillon se termine : le dernier état reste validé, l'écran n'avance qu'après confirmation et aucun faux message d'erreur ne s'affiche.
- Test SQL sur une base PostgreSQL jetable, avec les déclencheurs réels : on insère une ligne validée, on applique un UPDATE de brouillon tardif, puis on vérifie que la ligne est toujours validée et que le refus est journalisé.
- Aucun vrai élève, aucun mail.

## Technique

Points précis : `useAutoSave.tsx` l.258-273 (seul `pendingDataRef === data` vide la file, puis l.271 relance le brouillon) ; l.236-240 (renvoi de false pendant une sauvegarde en cours) ; aucun `clearTimeout` lors de la validation ; `AnalyseBesoinForm.tsx` l.220-238 (`onComplete()` appelé sans condition).
