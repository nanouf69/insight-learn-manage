# Arezki — EB3 VTC A/T3P — 11/11 12:32 UTC

## Cause confirmée et correction d’aperçu
Le dialogue CRM désactivait « Confirmer cette matière » dès qu’une autorisation existait, mais gardait ce bouton visible. Cela donnait une impression d’échec alors que l’autorisation était déjà enregistrée.

Le dialogue affiche maintenant explicitement « Autorisation déjà enregistrée pour cette matière » et seulement « Fermer ». La confirmation demeure inchangée quand aucune autorisation n’existe. Aucun nouvel appel d’autorisation au simple affichage/fermeture.

## Preuves Cloud en lecture seule
- Dossier Arezki HADJ ALI `b78b5391-9f8f-4f11-9add-2e86078363e1`, EB3, t3p.
- Autorisation `1a6f9efd-9c91-46ed-8c7f-7d49098fdd20`, créée 11/11 12:26:40.292874 UTC ; source `EB3__t3p`, copie `5b7ca25e-ed8b-45b7-8bc4-690385e21c50`.
- Empreinte source recalculée depuis les mêmes identités source/cop ie/résultat/réponse/timer : concordante. Empreinte version recalculée depuis la composition admin + fingerprint publié : concordante.
- Autorisation inutilisée, zéro reçu de démarrage ; source abandonnée, zéro réponse et zéro résultat. Même état au dernier SELECT après tests.

## Bouton élève et reprise
`AuthorizedSubjectRetakes`, présent sur la sélection non-admin d’ExamensBlancsPage, lit les autorisations du dossier et exclut celles ayant un reçu de démarrage. Pour cette ligne inutilisée il affiche EB3/T3P non notée et « Refaire la matière ».

`startSubjectRetake` relit le contexte source avant le clic de démarrage effectif ; la route serveur contrôle propriétaire, source et version puis renvoie une nouvelle identité ciblée. `activateSubjectRetake` ouvre seulement la matière du reçu. La reprise du pont V2 ne sélectionne que les copies en cours ; une copie abandonnée n’est pas reprise comme nouvelle composition. Les copies et résultats historiques restent dans les lectures d’historique existantes.

## Tests exécutés
- 22 tests Vitest PASS : dialogue déjà autorisé/Fermer, confirmation unique, intégration admin puis CTA élève sur fixtures, aucun démarrage avant clic, doubles clics, ancien/V2, reçu ciblé non noté, autorisation consommée masquée, historique/navigation.
- 14 contrats live PostgreSQL jetables PASS + 9 contrats serveur jetables PASS : neutralisation vide, tokens réutilisables, démarrage élève t2, résultat seulement après soumission, copies actives/ambiguës refusées, envoi tardif/concurrence, original et autre matière intacts, droits, absence IA.
- Vrai PassageMatiere via navigateur sur base jetable : EB3 ordinateur et EB4-TAXI téléphone, démarrage, réponse QCM confirmée serveur, rechargement du même chrono, soumission. Captures vérifiées. Ce parcours utilise le harness existant et non le compte d’Arezki.
- Dialogue corrigé : capture réelle du composant avec contexte fictif, message et « Fermer » vérifiés.
- Compilation aperçu : build OK.

## Limite de vérification / publication
Vue apprenant réelle d’Arezki NON PROUVÉE : création de sa session dédiée refusée car l’approbation requise n’est pas disponible dans ce contexte. Aucun contournement, aucune connexion usurpée ni demande de mot de passe. Le rendu CTA est donc prouvé par code et fixtures, pas par observation de son écran réel.

Correctif présentation livré en aperçu uniquement, aucune publication ni modification serveur ou donnée réelle. Le serveur partagé est déjà prêt et son autorisation valide ; le nouveau feedback CRM n’est pas annoncé servi en production.