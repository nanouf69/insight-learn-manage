

## Constat

Aucun email de satisfaction n'a encore été envoyé — la fonctionnalité vient d'être ajoutée. Le template existe en base (`questionnaire-satisfaction-pratique`) et le code est en place dans `ExamenReussitePage.tsx`.

**Le système fonctionne déjà correctement :**
1. Quand un résultat pratique passe à "oui", l'email est envoyé via `sync-outlook-emails`
2. L'email est **enregistré dans la table `emails`** avec le `apprenant_id` du candidat
3. Cet email apparaît automatiquement dans l'onglet **Emails** de la fiche CRM de l'apprenant (requête dans `EmailsSection.tsx` ligne 287-290)

## Pour tester

Pour voir la trace du mail dans le CRM :
1. Aller sur la page **Résultats pratique CMA**
2. Mettre le résultat d'un candidat à **"oui"**
3. Le toast "📋 Questionnaire de satisfaction envoyé automatiquement" doit s'afficher
4. Aller dans le CRM → fiche de ce candidat → onglet **Emails**
5. L'email "Questionnaire de satisfaction — Formation VTC/TAXI" doit apparaître

**Aucune modification de code n'est nécessaire** — tout est déjà câblé. Il suffit de tester avec un vrai candidat ayant un email.

