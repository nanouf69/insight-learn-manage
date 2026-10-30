# Deux quiz QRC TAXI : sauvegarde durable — 30/10/2026

## Diagnostic
L’ancienne interface conservait seulement les réponses dans le navigateur. Le passage en fin de liste affichait les corrections même en cas de réponses absentes ; aucune soumission globale atomique ni reprise inter-appareils n’existait. L’ancien bouton Recommencer remplaçait le brouillon local.

## Changements ciblés livrés
- Deux quiz uniquement, placement TAXI étape8 et TA étape3 inchangé ; aucun pont vers les notes, matières, modules ou jalons obligatoires.
- Nouvelle frontière privée `qrc_practice_attempts` / `qrc_practice_answer_events`, propriétaire issu de la session authentifiée. Lecture RLS propriétaire, aucune écriture directe navigateur, commandes dédiées pour ouvrir/relire/sauvegarder/soumettre. Installation0228 confirmée dans Cloud, nouvelles tables initialement vides.
- Chaque réponse produit un événement durable horodaté/versionné. Aucun événement remplacé/supprimé. Projection de dernière réponse, identité idempotente par opération et version globale de tentative ; conflit multi-appareils signalé au lieu d’écrasement silencieux.
- Soumission et sauvegarde verrouillent la même tentative. Soumission complète atomique : réponses figées, date serveur et identité de soumission. Retard de brouillon refusé ; réessai de même opération ne double pas l’écriture. Nouvelle tentative distincte préserve la précédente.
- Interface : sauvegarde en attente/envoi/horodatage par réponse, reprise compte/quiz/tentative, saisie hors connexion conservée puis réessayée, questions manquantes avec liens. Aucune correction finale avant confirmation et relecture serveur.
- Ancien stockage conservé intact : bouton explicite reprend uniquement les réponses manquantes compatibles, comme brouillon. Ancien drapeau terminé jamais transformé en soumission. Champs inconnus signalés, aucun import ou retraitement automatique.

### Obligations précisément appliquées
- Complet :39 QCM +37 QRC affichées +2 exercices Métropole =78 champs. QRC1 et17 restent absentes comme avant, sans nouvelle question créée.
- Spécialités :20 QCM +20 QRC +40 QCM locaux +4 exercices zones =84 champs.
- QCM : un choix reconnu ; QCM locaux/cases : au moins une sélection parmi les propositions autorisées, jamais un champ vide. Une mauvaise réponse reste une réponse et n’empêche pas de soumettre.
- QRC : texte non blanc,4000 caractères maximum ; correctness ne conditionne pas soumission.
- Liste libre « toute la liste » : au moins58 éléments distincts pour Métropole ou24 pour ZUPC (23 communes+aéroport),8000 caractères maximum. Les fautes/noms erronés sont conservés et évalués ensuite ; il n’est pas exigé d’avoir58/58 justes pour soumettre. Les doublons textuels seuls ne remplissent pas la liste.

## IA et budget
- Correction QRC désormais accessible après soumission seulement ; endpoint vérifie même propriétaire/quiz/question/texte dans les réponses figées. QCM/cases/communes sans IA. Anciennes corrections restent relisibles sans nouvel appel modèle.
- **Appels IA payants facultatifs bloqués côté serveur** tant qu’un plafond monétaire20€/mois fiable ne peut être établi. Refus402 explicite, sans note ; sauvegarde et soumission continuent de fonctionner. Ce n’est pas un compteur20€ actif, mais une suspension préventive. Références Q5/Q6/Q13 inchangées, arbitrage sans note conservé.
- Fonction `qrc-taxi-ia` seule redéployée, empreinte8b34d148… ; aucun modèle appelé pendant cette intervention. L’appel de contrôle a atteint le refus budgétaire avant le fournisseur.
- Objectif300€/mois total toujours non garanti : factures TTC/conversion crédits, abonnement/externes et plafonds globaux non disponibles. Pas de modification des recharges/abonnement ni promesse financière.

## Modifications précises
- `src/lib/quizQrcTaxi/manifest.ts` : IDs/obligations, contrôles de présence, import ancien brouillon.
- `durable.ts` : journal isolé, commandes authentifiées, validation des accusés.
- `useDurablePractice.ts` : file sérialisée, sauvegarde/reprise/conflits/soumission.
- `QuizQrcTaxiIntegre.tsx` : écran questions/exercices, manquants, sauvegardes et résultat confirmé.
- `CorrectionQrcTaxiIA.tsx`, `aiCorrection.ts`, `supabase/functions/qrc-taxi-ia/index.ts` : transmission/vérification de tentative soumise et pause des appels payants.
- Migration0228 et copie de travail `docs/qrc-durable-schema.sql` ; tests nouveaux/adaptés, règles AGENTS et feuille de route.

## Résultats réellement exécutés
**PASS :40 tests Vitest** (6 durables+9 IA+22 quiz+3 alertes).
**PASS :8 groupes PostgreSQL jetable** : propriétaire/RLS/module11vs28 ; incomplétude ; double clic simultané ; version périmée deux appareils ; champs inconnus/blancs ; passage complet/relecture/retard ; nouvelle tentative ; concurrence réelle sauvegarde/soumission, expiration et mutations interdites.
**PASS navigateur Cloud sur compte technique vérifié côté serveur** :
- Complet : sauvegarde réelleQCM/QRC, refus de bouton Soumettre incomplet, réponse relue dans deuxième contexte navigateur sans ancien stockage ;78 réponses fictives sauvegardées par commandes réelles, soumission/relecture écran après rechargement.
- Spécialités : saisie hors connexion maintenue puis sauvegarde à reconnexion ;84 réponses fictives préparées par commandes réelles ; clic du vrai bouton Soumettre, accusé et relecture, corrections affichées. Contrôle390px sans débordement horizontal.
- Endpoint réel : refus budget402 sur réponse figée, aucun résultat0 et aucune correction modèle nouvelle.
- Captures `/tmp/browser/qrc-durable/` inspectées : reprise appareil2, soumis, soumis-interface, téléphone.
- Build automatique dernier contrôle disponible **OK11:03:11UTC** (erreur temporaire de propriété corrigée ; problème bindingRPC découvert dans navigateur puis corrigé avant vérification réussie).

## Données et limites de preuve
- Deux tentatives nouvelles appartiennent uniquement au compte technique enregistré ; aucune tentative nouvelle sur apprenant réel. Preuves fictives conservées, pas supprimées.
- Compteurs avant/après : validations modules1324→1324, snapshots216→216, reçus IA3→3. Réponses officielles11058→11059 pendant le travail : activité concurrente non attribuée, **pas présenté comme empreinte inchangée** ; aucun nouveau chemin de ce chantier n’écrit cette table.
- Source39 questions MD5 `68c4e0ca8fbaf934211b8c55dde37a68` inchangée ; copie40QCM locaux conservée (MD5`ef7b3e8bde9448c6104f4caa152aaa52`). Avertissements réglementaires copiés mot pour mot.
- **NON PROUVÉ** : navigation complète portail TAXI/TA depuis étapes8/3 (compte technique formationVTC, aucun changement d’attribution pour contourner), appareil physique, toutes formations exhaustivement, conflit UI deux appareils avec choix des deux versions, soumission réseau perdue réelle. Ces règles ont des contrôles isolés mais ne sont pas toutes exercées hébergées.
- Saisie locale non synchronisée ne peut être récupérée sur autre appareil avant son enregistrement serveur. Si stockage navigateur inaccessible, bandeau demande de garder la page ouverte ; sauvegarde non annoncée à tort.
- Les sauvegardes automatiques sont temporisées550ms et sérialisées. Au premier échec elles s’arrêtent jusqu’à action/reconnexion ; pas de boucle immédiate illimitée. Hors connexion conserve le journal ; aucun zéro technique.
- Obligations figées par tentative ; cette version conserve les sources statiques existantes et n’ajoute aucun mécanisme de publication pédagogique.
- **Interface non publiée**, autorisation distincte nécessaire. Backend partagé : sauvegarde dédiée et garde budgétaire déployées ; seuls les quiz facultatifs sont concernés.

Compétence utilisée pour la garde IA : **ai-apps-gateway-sdk**. Aucun test fournisseur payant requis pour prouver ce refus préventif.