# Corrections ciblées révision / QRC — 08 novembre 2026

## État au 08/11 21:52 UTC : contrôles complétés, mise en service NO-GO

### Complément exécuté dans ce tour

- Ancien processus absent après reprise du sandbox. Une suite détachée avec fichiers de sortie persistants a terminé : **424 fichiers PASS, 2 ignorés ; 3 706 tests PASS, 13 ignorés, zéro échec**, 244,81 s. Après renforcement du candidat, une unique suite finale : mêmes chiffres, **223,42 s**, sortie 0. Logs `/tmp/revision-final/global-tests.log` et `final-global-tests.log` ; les fichiers `.exit` confirment la fin.
- **9 tests PostgreSQL privés PASS**, 5,34 s : concurrence/ACK perdu, propriétaire/expiration, admin, anon refusé, autre apprenant sans lecture de reçu, insertion de reçu interdite, conflit historique préservé, score falsifié refusé, source multiple sans identité refusée puis identité explicite acceptée, QRC sans clé refusée sans faux zéro.
- Vrai handler Deno/PostgREST/PostgreSQL privé réexécuté : **1 PASS**, 56,24 s (501 événements et contrôles de persistance). Aucun appel Cloud d'écriture.
- Vrai RevisionFausses mobile 390 × 844, file réelle, sauvegarde interceptée localement et finalisation réellement SQL : QCM B+C, QRC « texte », commit suivi d'ACK perdu puis reload : **un résultat**, UUID de reçu identique `854ef05e-c69c-46a7-b13f-ea2edc9a8260`. Erreur réseau volontaire affichée dans la console, succès uniquement après relecture du reçu. Captures sous `/tmp/browser/revision-final/mobile-ack-lost.png` et `mobile-receipt.png`. Cette première capture n'avait pas la CSS chargée : elle prouve le DOM/fonctionnement, pas l'aspect mobile final.
- NotesView/EcranResultats mobiles avec CSS du projet : SQL fictif 6,67 → 11,67 en attente → 18,33 définitif ; événement final volontairement non envoyé, reprise `online` locale : **18.3 / 20 visible sans reload après 2,242 s**. Changement d'apprenant : ancienne note définitive absente. Captures `qrc-mobile-pending/partial/final/other.png`. Transport local, lectures SQL réelles de fixtures, **pas Realtime hébergé** ; la correction n'est pas effectuée par le handler QRC dans ce harnais.
- Compilation automatique **OK** 21:47:50 UTC ; scan 21:40:04 : **0 critique, 6 avertissements, 2 infos**, connecteur non configuré donc analyse connecteur ignorée, aucun finding contourné.

### Défaut supplémentaire corrigé dans le candidat, mais bloquant pour mise en service

La finalisation préparée utilisait `reponses_apprenants.score`, envoyé par le navigateur. La propriété seule ne garantissait pas le score. Le candidat vérifie maintenant le score contre les réponses/corrigés de la copie initiale et stocke l'identifiant de résultat source pour chaque question dans les nouveaux états de révision. Les copies historiques restent inchangées. Les conflits et corrigés absents refusent la clôture au lieu de fabriquer une note.

**Le candidat ne peut pas encore être déployé sans régression** : seulement **1 278 / 6 009** résultats initiaux disposent du snapshot complet recherché ; **11 / 23** révisions identifiées ont au moins un tel snapshot (cela ne prouve pas que toutes leurs matières sont couvertes). Les **124 révisions fermées** ne portent aucune identité de résultat source. Imposer maintenant ce nouveau contrôle à l'ancien INSERT bloquerait des parcours légitimes ; le retirer réintroduirait le score falsifiable. De plus, les politiques INSERT/UPDATE propriétaire du résultat initial et le trigger de protection des corrections admin examinés ne prouvent pas que son JSON snapshot est une source serveur non falsifiable. Il faut raccorder la vérification au snapshot serveur immuable de la tentative avec identité prouvée, et assurer le chemin des anciens clients, sans utiliser les banques courantes ni inventer les clés QRC absentes. Cette garantie reste **NON PROUVÉE** ; aucun durcissement risqué n'a été appliqué.

### Déploiement et données

- **Migration non appliquée ; publication non appelée**, faute de garantie score/source et compatibilité historique. Ce n'est pas une approbation outil manquante. Les deux correctifs ne sont pas déclarés résolus en production.
- Candidat code/test : `92530ca9e040e2bc7d76942b385367abf40600af`, 21:47:49 UTC, avant ce complément documentaire. Public relu : `assets/index-Dy9_Awa8.js`, SHA256 `89ac7fd6c8ae9f8eb806294de183b5497adf4d114946e5cd6d2d91e63081a14a`, ne contient pas `finaliser_revision_fausses` ; commit public non déterminable depuis ce paquet seul.
- SELECT avant/après de ce tour : **118 révisions**, empreinte `0a6c635f44d8566a4b150c55a8bb7630` inchangée ; modules 5/11 `026ecdf81d2a5a3ced71c723a65108cd` inchangée. Les empreintes antérieures ci-dessous étaient obtenues avec une autre représentation et ne sont pas comparées à celles-ci. Zéro groupe doublonné avec identité explicite. Aucun résultat, réponse, snapshot, signature, jalon ni contenu pédagogique écrit.
- Veille OS réelle, session réellement expirée, Realtime hébergé et matrice Data API hébergée restent NON PROUVÉS. Les timers testés sont événementiels 400 ms puis une reprise à 2,4 s, pas une garantie réseau ni un polling périodique.

## Historique du tour précédent (ne décrit pas la version actuelle)

Pas de migration appliquée ni de publication demandée dans ce tour. Paquet public relu : `assets/index-Dy9_Awa8.js`. Révision candidate relevée avant rédaction : `8df8427e34398aee2445a65f283d7fb8581d5700` (20:32:34 UTC), suivie des edits du harnais/rapport ; ne pas présenter ce hash comme version déployée.

## Causes et corrections

- Ancien Terminer insérait à nouveau après perte du retour réseau ; le trigger attribuait une nouvelle tentative. Nouveau candidat : RPC atomique, verrou transactionnel par apprenant/examen/révision, reçu indépendant, même résultat au rejeu. Les matières/questions restent dans `questionOrder` de la preuve serveur. Aucun changement des tentatives initiales.
- Protection INSERT également pour un ancien client avec identité de révision. Anciens résultats sans identité conservés ; conflit historique explicite, jamais fusionné. Timeout de verrou : 3 s. Retour arrière : révocation du RPC, reçus conservés, aucun retour vers l'ancien INSERT non idempotent.
- Réabonnement/online/focus/visibility : rattrapage regroupé à 400 ms puis une seule lecture supplémentaire à 2,4 s. Aucun polling périodique. Pas de garantie temporelle lorsqu'aucun événement de reprise n'arrive ou réseau indisponible.
- NotesView : valeur par défaut de liste vide instable provoquait des relectures à chaque rendu ; référence stabilisée. Réponses obsolètes et état d'un autre compte écartés. EcranResultats conserve l'état pendant une relecture du même compte mais l'efface lors d'un changement.

## Résultats exécutés

- PASS : 4 contrats PostgreSQL jetables (deux finalisations concurrentes, retour perdu/rejeu identique, ancien INSERT doublon refusé, clôture non confirmée refusée, autre propriétaire/session sans identité refusés). Résultat final unique ; empreinte de note initiale inchangée.
- PASS : 21 tests ciblés révision/rattrapage, dont vrai composant QCM/QRC et file durable simulée, double clic, reload, reconnexion, timers/callbacks obsolètes ; 11 autres tests note/source/snapshot/rattrapage passés (deux tests rattrapage communs aux séries).
- PASS : vrai handler réponses + PostgREST + PostgreSQL (1 test intégration, 501 événements et rejeu/concurrence) ; vrai handler QRC avec fournisseur HTTP fictif local (5 tests, aucune IA payante).
- PASS navigateur : vrais RevisionFausses/NotesView/EcranResultats ; transport local intercepté, finalisation et état des notes dans PostgreSQL jetable. QCM multiple B+C et QRC, commit puis ACK perdu, reload puis reçu identique : **1 résultat**, même UUID aux deux appels. Captures `1-ack-lost`, `2-reload-receipt`, `3-qrc-pending`, `4-qrc-partial`, `5-qrc-final-no-reload`, `6-other-learner` sous `/tmp/browser/qrc-revision`.
- Note SQL fictive 6,67 → 11,67 provisoire → 18,33 définitive. L'écran reste « en attente » pendant le provisoire (comportement existant), puis affiche **18,3/20 sans reload** après `online` local. Capture partielle à ~711 ms après SQL ; capture définitive à ~3,01 s après SQL (attente imposée au test, pas latence minimale mesurée).
- Build du harnais automatique : OK au dernier signal 20:36:15 UTC. Suite globale lancée mais interrompue par limite d'exécution avant résumé : **NON PROUVÉ**, aucun total global PASS revendiqué.
- Scan 20:36:21 UTC : 0 critique, 6 avertissements, 2 informations ; analyse connecteur non exécutée faute connecteur configuré. Aucun finding supprimé/ignoré.

## Données et limites

SELECT avant/après préparation : 118 résultats révision, empreinte `5fb009561a202f3a4da9e75aa263b16a` inchangée ; modules 5/11 : `d78e0738186ee71ca594eced80c263e6`. 95 anciens résultats sans identité, sept groupes répétés sans identité : pas une preuve de doublon même opération ; aucune mutation.

Realtime hébergé, vraie veille OS, expiration réelle de session et mobile complet non vérifiés. Le harnais navigateur n'est pas le handler Deno couplé : ses réponses de sauvegarde sont locales ; le handler est testé séparément avec PostgREST. Finalisation navigateur réellement exécutée en SQL mais transport RPC local, pas Data API authentifiée réelle. QRC navigateur utilise état SQL fictif, corrections réelles/handlers vérifiés séparément. Aucune copie réelle utilisée en écriture, mail/SMS/IA/export/restauration.

Publication non engagée : suite globale complète et matrice complète admin/RLS/conflits historiques à finir avant application serveur ; ne pas annoncer les deux défauts résolus en production. Le lot public diffère du candidat.
## 08/11 22:10 UTC — Publication isolée
- Publié : rattrapage QRC (regroupement 400 ms, relecture bornée 2 s après reprise `online`/`visibilitychange`, pas de polling). Paquet public `assets/index-XoqG3L5A.js`, SHA256 `5e8d6420fd4a5a123663d442c782ab05bbfb918548ccdedf46612e46e9d2d938`, commit `b8acec0377490af058077b6dbe63c07fc2dc0f79` ; ancien `index-Dy9_Awa8.js`.
- Isolé : `REVISION_FINALISATION_SERVEUR_ACTIVE=false` ; paquet public contient `const uoe=!1`, la fin de révision suit le chemin déjà publié (insertion directe, reprise d'un brouillon ouvert seulement). Code candidat conservé, testé avec le commutateur forcé à vrai. Seule RPC appelée absente en base : `finaliser_revision_fausses`, désormais inatteignable.
- Tests : 24 révision/rafraîchissement + 77 écrans résultats PASS ; nouveau `revision-fausses-chemin-publie.test.tsx` (0 appel RPC, 1 insertion). Scan frais 22:07 : 0 critique, 6 avertissements, 2 infos (préexistants). L'alerte critique `bilan_future_opening` citée par l'outil de publication est périmée : politique actuelle admin seul.
- Bloqué : finalisation atomique non falsifiable. Novembre : 358/509 copies EB avec snapshot structuré ; 151 n'ont qu'un résumé (`reponseCorrecte` texte, sans choix/clé), insuffisant pour vérifier un score sans inventer. Migration non appliquée. Décision requise : (a) refuser la clôture serveur de ces révisions avec message « revue admin », ou (b) dissocier : reçu technique sans note pour ces révisions, note seulement si snapshot prouvé.
