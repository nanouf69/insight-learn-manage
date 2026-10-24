# Dossier de bienvenue : dates d’accès et engagements e-learning

## À l’étape 12, pour les formations e-learning uniquement

- Afficher les dates de début et de fin d’accès enregistrées dans la fiche élève, en français long : **mardi 3 novembre 2026**.
- Juste avant les boutons de confirmation et de téléchargement, ajouter deux cases obligatoires, non précochées :
  1. **« Si vous n’avez pas reçu vos accès par mail à la date de début indiquée, merci de nous recontacter. Je confirme avoir pris connaissance de cette consigne. »**
  2. **« Je m’engage à être présent à une journée d’entraînement pratique après avoir passé l’examen théorique. Cette journée aura lieu dans les trois semaines à compter du lendemain de l’examen théorique. »**
- Ne permettre la confirmation et la génération du PDF qu’après ces deux confirmations pour les élèves concernés.
- Si les dates sont manquantes ou leur lecture impossible, l’indiquer clairement et demander de contacter le centre, sans inventer de date ; ne pas permettre une confirmation portant sur des dates inconnues.

## Dossier et PDF

- Conserver les dates présentées et les deux confirmations dans le nouveau dossier de bienvenue et son récapitulatif PDF.
- Utiliser les mêmes textes à l’écran et dans le PDF ; rendre ces informations lisibles dans le téléchargement depuis le CRM.
- Ne pas réécrire les anciens documents signés, ni précocher les nouveaux engagements d’un dossier antérieur.
- Aucun changement aux dates enregistrées, accès effectifs aux cours, réservations, signatures de présence, heures ou progression ; aucun mail envoyé pendant les contrôles.
- Les formations présentielles et continues restent inchangées. Aucune publication de l’application dans ce travail.

## Détails techniques — fichiers prévus

- `src/pages/onboarding/steps/Step12.tsx` : lecture des dates, affichage, cases et contrôle avant les actions.
- Nouveau module ciblé sous `src/lib/` : règles et textes communs pour l’écran et le PDF.
- `src/hooks/useOnboardingPersistence.ts` : intégrer les confirmations au circuit de reprise existant, sans nouveau circuit d’envoi.
- `src/lib/pdf/recapitulatif-inscription.ts` et `src/lib/pdf/document-individuel.ts` : dates et engagements des futurs documents seulement.
- `supabase/functions/onboarding-invitation/index.ts` : lecture limitée au dossier autorisé par le lien personnel existant, pour récupérer les dates actuelles sans élargir les droits.
- Tests ciblés sous `src/test/`, règles `AGENTS.md`, feuille de route et journal daté.

## Vérifications

- Données fictives : VTC/TAXI/VA/TA e-learning, présentiel et formation continue.
- Dates exactes, dates absentes, lecture échouée et deux cases requises ; une seule case cochée ne suffit pas.
- Reprise des confirmations, génération et lecture du PDF, rendu ordinateur/téléphone, sans écrire dans un dossier élève réel ni envoyer de mail.
- Contrôle de la compilation automatique ; limites non vérifiées signalées explicitement.
