# Activation initiale 24 h — 04/11/2026 10:09 UTC

## Résultat effectif
L'accord de 24 h remplace les 48 h. Cette réduction supprime la limite maximale, mais ne résout pas la séparation de l'activation initiale et de la récupération ordinaire.

Aucun code applicatif, email, compte, accès ou réglage hébergé n'a été modifié. Aucune migration, fonction déployée, publication ou émission d'email. Seuls mémoire, feuille de route et ce rapport ont changé. L'activation autonome demandée n'est pas implémentée.

## Lecture effective des paramètres
- `supabase.project_info` confirme que les outils ciblent l'instance Live commune au site publié et à l'aperçu ; cet outil ne retourne pas l'expiration des liens.
- `lovable auth settings show --json` a réellement été exécuté. Réponse : `not_found`, `Lovable Auth is not enabled for this project`. Cette commande concerne le service Lovable Auth, et ne donne pas les paramètres Cloud Auth de ce projet ; elle ne prouve pas que la connexion de l'application est désactivée.
- Catalogue de commandes et routes officielles consulté : aucun accès exploitable à `Email OTP expiration` identifié.
- Valeur hébergée réelle : **NON VÉRIFIÉE**, ni 1 h, ni 3 h, ni 24 h ne peuvent être annoncées comme durée effective.
- Aucun appel `configure_auth` : il n'expose pas l'expiration OTP et écrirait d'autres réglages sans résoudre le besoin.

## Cause persistante
`create-apprenant-account` crée les comptes avec mot de passe aléatoire non communiqué et `email_confirm: true`. `generateSetPasswordLink` dans `_shared/credential-secrets.ts` émet `type: recovery`, redirigé vers `/reset-password`. Le renvoi existant utilise ce même circuit. L'email affiche 60 minutes, seulement depuis une constante de présentation ; le fournisseur applique la véritable expiration dès émission.

Le réglage natif documenté `Email OTP expiration (seconds)` est commun aux liens email. Le porter à **86400** rendrait également la récupération ordinaire valable **24 h**, au lieu des **10800 secondes / 3 h demandées** (dont la configuration effective reste à vérifier). Aucun changement global n'est autorisé dans cette demande. Passer de recovery à invite ne constitue pas une preuve d'expiration indépendante : aucun paramètre distinct n'a été établi.

Ni `email_confirmed_at` (confirmation forcée à la création), ni `last_sign_in_at`, ni une session navigateur ne prouvent la définition initiale du mot de passe. Un renvoi public recovery ne peut donc pas être annoncé comme limité aux comptes non activés. Ajouter simplement un bouton et un texte 24 h exposerait un parcours trompeur et ne satisferait ni la durée ni la séparation exigées.

## Vérifications réellement exécutées
| Vérification | Résultat |
|---|---|
| Lecture du circuit émission / email / page / renvoi | Exécutée ; recovery commun confirmé |
| Lecture officielle de la configuration | Tentée ; durée non disponible via outils accessibles |
| Lien valide / expiration exacte 24 h | NON PROUVÉ ; aucun lien émis ou consommé |
| Renvoi indépendant / anti-abus / usage unique | NON IMPLÉMENTÉ, NON PROUVÉ |
| Compte déjà activé inchangé | Aucun appel de mutation de compte ; parcours spécifique NON PROUVÉ |
| Tests ciblés de nouvelle fonctionnalité | Non exécutés : aucune fonctionnalité compatible implémentée ; pas de PASS simulé |

## Blocages et prochaine décision
1. Lire la valeur réelle : propriétaire, **More → Users → Auth settings → Email → Email OTP expiration (seconds)**. Aucun changement n'est demandé à cette étape ; transmettre la valeur affichée suffit.
2. Pour garantir simultanément activation 24 h et récupération 3 h, il faut une capacité native de durée séparée qui n'est pas établie. Sinon une modification globale toucherait volontairement la récupération et exigerait un accord distinct, sans suffire à résoudre l'état initial/activé.
3. La distinction sûre exige une preuve serveur de définition initiale et un traitement adapté des comptes historiques, sans déduire l'état de leur dernière connexion. Aucun reclassement des comptes historiques n'a été effectué.

Aucun générateur OTP, stockage de jeton ou expiration parallèle n'a été créé pour contourner le fournisseur. Aucun bouton factice n'a été ajouté. La demande reste bloquée ; la durée 24 h acceptée est enregistrée, mais pas présentée comme implémentée.