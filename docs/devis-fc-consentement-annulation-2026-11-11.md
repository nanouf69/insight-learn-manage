# Devis de formation continue — information annulation/remboursement, 11/11/2026

## État

**Préparé et testé en aperçu, non déployé en production.** Aucune fonction Edge n’a été déployée, aucune migration n’a été appliquée et aucun devis réel n’a été créé ou modifié.

Pour empêcher une signature réelle sans preuve pendant cette attente, le nouvel aperçu vérifie la version de la fonction de lecture publique. Si les deux fonctions candidates ne sont pas actives, l’envoi FC reste bloqué avec un message explicite. La production publiée est inchangée.

## Cohérence contractuelle

- Les CGV existantes contiennent déjà leurs propres règles, notamment le dédit et les clauses d’annulation ; le régime particulier des devis valant contrat conserve ses règles existantes.
- Aucune clause, aucun délai et aucun document existant n’a été modifié.
- La nouvelle case renvoie uniquement aux délais contractuels et à la réglementation applicable, sans créer de délai supplémentaire.
- L’adresse reprise est celle déjà présente dans les documents : **FTRANSPORT, 86 route de Genas, 69003 Lyon**.
- Le texte précise identité, session et motif pour l’email à **contact@ftransport.fr**, ou la lettre recommandée avec accusé de réception. Il distingue l’appel téléphonique d’une demande écrite traçable.
- La case indique expressément qu’elle ne vaut pas renonciation aux droits légaux et ne supprime aucun droit impératif de rétractation ou de remboursement.

## Périmètre

Sont reconnus comme formation continue : `fc_vtc`, `fc_taxi`, les libellés « Formation continue VTC/TAXI », `continue-vtc`/`continue-taxi` et la formation à la mobilité TAXI. Les parcours initiaux VTC/TAXI, TA/VA et la seule pratique TAXI ne reçoivent pas cette nouvelle case.

Les devis déjà signés ne sont pas soumis rétroactivement à cette case et ne reçoivent aucun bandeau de preuve s’ils n’en possèdent pas.

## Changements préparés

- `devisConsentementFc.ts` : source unique du texte, de la version, de la détection FC, du refus serveur et de la preuve.
- `DevisPublic.tsx` : case non précochée, obligatoire, verticale et pleine largeur ; bouton désactivé sans case ; contrôle avant envoi ; version serveur exigée avant tout envoi réel.
- `upload-devis-signe` : nouvelle vérification serveur avant dépôt, identité relue depuis le devis/apprenant, refus si identité introuvable ou case absente, preuve horodatée serveur et conservation des protections contre le double envoi.
- `get-devis-public` : exposition de la seule version de consentement supportée, sans donnée nouvelle sur le stagiaire.
- Preuve enregistrée dans `devis_envois.consentements`, colonne existante déjà protégée contre toute modification après écriture. Aucune migration nécessaire.
- Preuve également incluse dans le document complété existant lors de la signature.
- `PreuveConsentementFc.tsx` : affichage admin du texte exact, de sa version, de la date/heure serveur, de l’identité, du devis et de la session, dans l’historique CRM et dans les devis d’organisme.

Version du texte : `fc-annulation-remboursement-2026-11-11-v1`.

## Tests réellement exécutés

- **92/92 tests PASS** sur 11 fichiers de tests de devis : nouveau consentement, contrats, dates, durées, tampon, programme/calendrier, RIB et régressions associées.
- `deno check` réussi pour `upload-devis-signe` et `get-devis-public`.
- Build de l’aperçu observé : **build OK**.
- Diff ciblé : `git diff --check` sans erreur.
- Parcours Chromium sur devis entièrement fictif, avec lectures et envoi serveur simulés :
  - case visible, complète et non précochée ;
  - bouton bloqué sans case malgré CGV, mention et signature ;
  - bouton autorisé après case et signature lorsque le serveur fictif est compatible ;
  - envoi simulé contenant `consentement_annulation_remboursement_fc=true` ;
  - formation initiale sans nouvelle case ;
  - devis FC historique signé sans case rétroactive ni bouton d’envoi ;
  - serveur non activé : envoi bloqué, aucun appel supplémentaire ;
  - aucune erreur JavaScript.
- Preuve admin rendue sur fixture : version, identité, devis et texte exact affichés ; historique sans preuve inchangé.

Aucun appel au serveur réel, aucun email, aucun paiement, aucune signature ou donnée historique n’a été effectué/modifié pendant les tests.

## Étape restante, soumise à accord

Déployer ensemble `get-devis-public` et `upload-devis-signe`, puis tester un devis technique réel sans email. Tant que cette activation n’est pas autorisée, la production reste inchangée et le nouvel aperçu bloque l’envoi FC par sécurité.
