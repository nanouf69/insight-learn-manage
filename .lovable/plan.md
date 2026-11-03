# Accès automatiques après virement — Formation continue TAXI / VTC

## Diagnostic (lecture seule, rien modifié)

- Les virements sont dans `transactions_bancaires` (imports CSV, PDF, XLS et API Revolut). **Aucune colonne ne relie un virement à un stagiaire** : seul le libellé libre permet de deviner le payeur.
- Le tableau « Virements reçus formation continue » du tableau de bord filtre uniquement sur les montants **exactement 50, 150 ou 200 €** : 71 lignes, mais seulement 45 références distinctes et 8 sans référence. **Doublons avérés** : le même virement est importé plusieurs fois (ex. « Chika IMAUJI 200 € » ×3, « Acompte 50,00 formation continue Taxi Mr AK… » ×3), via des sources différentes.
- Les libellés sont souvent tronqués (« pour Mr AK… »), parfois sans nom, parfois au nom d'un tiers payeur.
- Seuls **10 dossiers** ont un type « continue-vtc / continue-taxi ».
- Envois d'accès existants : `auto-send-credentials` (envoi programmé, génère encore un mot de passe dans son code) et `resend-credentials`. Règle permanente du projet : jamais de mot de passe par e-mail, uniquement lien sécurisé.

Conclusion : une correspondance **entièrement automatique** payeur → stagiaire n'est pas fiable aujourd'hui. Le plan envoie automatiquement seulement les cas certains ; tout le reste part en revue manuelle.

## Ce qui sera construit

1. **Registre des paiements FC** (nouveau, append-only) : un enregistrement par paiement *réel* (doublons d'import regroupés par date + montant + libellé normalisé + référence), avec statut : `a_revoir`, `rapproche`, `acces_envoye`, `echec_envoi`, `ignore`, `rembourse`. Jamais de suppression.
2. **Détection** : uniquement virements entrants ≥ 50 € dont le libellé mentionne explicitement la formation continue (« formation continue », « FC », « continue taxi/vtc ») **ou** dont le payeur correspond à un dossier FC. Les autres virements ne sont jamais touchés. Montants négatifs = remboursement → passe le paiement lié en `rembourse`, aucun envoi.
3. **Correspondance certaine** seulement si : exactement **un** dossier FC (TAXI ou VTC) dont nom + prénom figurent entiers dans le libellé, avec e-mail valide, inscrit à une session FC en cours ou à venir. Homonymes, nom partiel, plusieurs candidats, e-mail manquant, payeur tiers → `a_revoir`.
4. **Écran « Paiements FC à valider »** (Comptabilité) : liste des paiements, candidat proposé, bouton « Associer à ce stagiaire » / « Ignorer ». L'admin choisit lui-même pour les cas incertains.
5. **Envoi des accès** (une seule fois par stagiaire et par paiement, clé unique en base) :
   - sans compte : création silencieuse du compte + **lien sécurisé de création de mot de passe** ;
   - compte existant : réutilisé, **lien de réinitialisation** + rappel de l'adresse de connexion ;
   - e-mail avec instructions de connexion, aucun mot de passe en clair.
   Si un 2e virement (ex. 50 € puis 150 €) arrive pour le même stagiaire déjà servi : enregistré, **aucun nouvel envoi**. Échec d'e-mail = statut honnête + bouton « Renvoyer » sans recréer de compte.
6. **Interrupteur d'activation** désactivé par défaut : tant que vous ne l'activez pas, le système classe et propose, mais **n'envoie rien**.
7. **Les 71 virements existants** : marqués « historique », jamais envoyés automatiquement ; envoi possible ensuite seulement un par un, sur votre validation.

## Tests (données fictives, base isolée)

50 €, 150 €, 200 €, 350 €, 49 € (refusé), virement non FC (ignoré), même virement importé 3 fois (1 seul paiement), 50 € puis 150 € du même stagiaire (1 seul mail), remboursement, deux homonymes (revue manuelle), nom partiel/tronqué (revue), compte déjà existant (réutilisé, pas de doublon), e-mail manquant, échec d'envoi + renvoi, double clic. Aucun vrai mail envoyé pendant les tests.

## Points à confirmer avant de coder

- Seuil : tout virement FC **≥ 50 €** (pas seulement 50/150/200) — je pars sur ce choix.
- Faut-il exiger une inscription à une session FC, ou un dossier FC suffit-il ?
- Activation : uniquement les virements reçus **après** l'activation.

## Détails techniques

- Migration : table `fc_paiements` (+ index unique sur l'empreinte de dédoublonnage), table `fc_acces_envois` (unique `apprenant_id` + statut envoyé), flag `fc_auto_acces_actif` (false). RLS admin, pas de DELETE.
- Fonction serveur `fc-paiements-classer` (appelée après `revolut-sync-cron` et les imports) : dédoublonnage, détection, correspondance stricte, pagination.
- Fonction `fc-envoyer-acces` : admin ou serveur, vérifie flag + unicité, réutilise la logique de provision silencieuse existante et les liens de récupération ; aucun mot de passe généré envoyé.
- UI : nouvel onglet dans `RapprochementBancaire`.
- Tests Vitest (règles de correspondance/dédoublonnage) + tests PostgreSQL isolés pour l'unicité.
- Aucune publication, aucun envoi réel avant votre accord.
