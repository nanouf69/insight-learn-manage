# QRC historiques notables — préparation du 09/11 à 17:16 UTC

## État réel
Préparation isolée renforcée, aucune migration appliquée et aucune publication. Le bouton de notation des copies en consultation reste donc indisponible en production. Il ne peut pas être activé honnêtement par un changement de bouton : `core_correct_qrc` exige une vraie identité QRC serveur.

Le candidat est volontairement hors `supabase/migrations`, dans `src/test/qrc-global-isolated/candidate.sql`. Il propose des corrections historiques séparées, pas une création opportuniste de copies natives. Ce SQL n’est **pas une migration production prête à appliquer** : formats réels des reçus historiques, catalogue complet et publication de notes restent à intégrer.

## Prévisualisation réelle en lecture seule
Les 24 identités EB1–EB6 VTC/TAXI/TA/VA ont été inventoriées par SELECT. Les comptes sont des résultats de matière, pas nécessairement des examens complets.

### EB2 VTC, toutes dates
- 1 098 résultats matière ; 432 portent un lien V2 ; 529 n’ont aucun tableau de questions exploitable.
- Parmi les résultats sans lien V2 comportant des QRC : **81 copies / 261 QRC** ont des IDs, des points et un corrigé enregistré ; **5 autres copies / 16 QRC** n’ont pas d’ID/corrigé/barème exploitable.
- Les 261 QRC portent toutes une valeur numérique dans `correctionsIA`, alors que la copie est marquée `qrc_pending_correction=true`. Cela ne démontre PAS une correction définitive : il existe notamment des zéros pouvant être des valeurs d’attente. Le candidat les place en revue, sans les convertir en notes humaines ni effacer la trace.
- **139 des 261 QRC** ont une fiche élève remise avec exercice/tentative/réponses identiques et une date de soumission renseignée. Mais **0/261** satisfont également l’égalité stricte entre `submitted_at` et `completed_at` exigée par le candidat jetable renforcé.
- **Nombre autorisé automatiquement par ce contrat conservateur : zéro.** Ce n’est pas une absence de copies corrigeables : les 139 QRC constituent un groupe concret à qualifier par un reçu serveur ou une attestation admin explicite de rattachement. Les autres ne sont pas fusionnées.

Le contrat ne doit pas assimiler deux horodatages égaux à une identité ni accepter arbitrairement une fenêtre de temps. L’écart d’horodatage observé nécessite un adaptateur de preuve du circuit historique exact, ou un rattachement manuel journalisé. Les 16/167 divergences des audits précédents ne sont pas réparées ni rattachées automatiquement ; leur nombre concernait d’autres comparaisons et ne doit pas être confondu avec les 16 QRC sans ID ci-dessus.

## Déblocage concret proposé, soumis à validation spécifique
### 1. Prévisualisation sans écriture
Une commande admin renvoie, par `result_id` et question : learner/exam/matière/tentative, IDs du reçu et de la copie native éventuelle, empreintes de tous les JSON originaux, sources de note/correction et motif d’éligibilité. Les questions ne sont jamais prises dans la banque courante.

### 2. Deux chemins dans le même correcteur V2
- **Identité, contenu figé et remise entièrement certifiés** : créer seulement les fiches manquantes, avec unicité de provenance `(result_id, question_id)` et lien immuable au reçu. Aucune création pour QRC déjà corrigée, ni pour résultat final protégé. Les natives existantes ne sont jamais remplacées.
- **Lien/horodatage/correction historique à vérifier, original complet disponible** : afficher la copie originale et ses preuves côte à côte ; l’admin confirme explicitement le `result_id`, la question et la source de remise, avec motif obligatoire. L’autorisation est append-only et empreintée, séparée d’une note. La notation historique reste un événement distinct sur l’original, sans fabriquer un snapshot natif. Deux intentions concurrentes exigent une nouvelle lecture.
- **ID ou corrigé/barème original manquant** : l’admin doit fournir la pièce historique originale et un rattachement documenté avant notation. Aucun ajout de question ni reconstitution depuis le cours actuel. On ne bloque pas les copies prouvées à cause des copies ambiguës.

### 3. Notes et remontée
La correction humaine enregistrée prévaut ; une note partielle conserve exactement ses points. Une correction existante n’est modifiée qu’au travers d’une action de révision explicitement confirmée et journalisée. Une note finale déjà enregistrée n’est jamais écrasée par l’import.

Après correction : publier une nouvelle révision de résultat, distincte de la ligne originale, seulement si tous les QCM/QRC et paramètres figés de la matière sont prouvés ; sinon montrer la correction et conserver le global en attente. La carte, le CRM et l’espace élève doivent lire la même révision par identité exacte. Événement de changement puis relecture confirmée avant succès/navigation ; pas de polling. Ce volet résultat/Realtime n’est pas réalisé dans ce candidat et ne doit pas être annoncé comme actif.

### 4. Migration additive à autoriser ultérieurement
Provenance unique, journal d’autorisations manuelles, journal de corrections, éventuelles nouvelles fiches V2 et révisions de résultat : tables protégées par rôle admin côté serveur, lectures élève limitées à leur propre résultat, grants explicites/RLS, CAS, unicité opération, empreintes et verrous. Aucune migration ne doit être appliquée avant prévisualisation nominative validée et test avec le catalogue réel complet sur PostgreSQL jetable.

## Modifications préparées et tests réellement exécutés
Le prototype existant a été renforcé : égalité stricte de remise, exclusion native seulement avec détails historiques identiques, conservation des liens divergents, quarantaine des traces de correction existantes et verrou du résultat original pendant la notation.

- **15 contrats PostgreSQL PASS**, nouveaux clusters locaux 127.0.0.1, ports hors 5432, variables PG réelles retirées : 24 examens × sept matières, 1 205 QRC paginées, correction partielle, correction existante 0/1/2 protégée, lien divergent, horodatage différent, double clic/concurrence, réponse réseau perdue/retry, CAS, rollback, permissions et append-only. Empreintes des sources fictives inchangées.
- **Navigateur Chromium PASS** : même écran V2 → API locale → PostgreSQL jetable ; 168 corrections synthétiques et une révision, 24 identités, panne après commit puis retry sans doublon, réouverture tablette/téléphone, aucune erreur JS. La capture téléphone montre bien la note 2/2 restaurée, mais la matrice est étroite et les menus tronqués : ergonomie mobile non entièrement certifiée.
- La réouverture testée est celle du **correcteur admin**. Aucun compte élève réel, aucune correction réelle, aucune nouvelle note matière/globale, aucune remontée Realtime hébergée n’ont été testés.

## Prochaine validation nécessaire
Valider d’abord la règle de qualification des **139 QRC EB2 VTC avec remise identique mais dates distinctes**, et le traitement des valeurs `correctionsIA` en attente. Ensuite implémenter l’autorisation manuelle et la publication révisée, rejouer le catalogue réel complet en jetable, présenter le manifeste nominatif et seulement alors demander l’autorisation d’appliquer les migrations. Aucune demande de publication n’est faite à ce stade.