# QRC déjà réalisés et plafonds budgétaires — 30 octobre 2026

## Conclusion et état réellement livré

La correction IA préparée est accessible depuis la correction finale d’un quiz déjà réalisé, sans cliquer sur Recommencer. Cela exige que la réponse soit encore présente dans le stockage du même navigateur et compte, et que l’accès aux modules TAXI/TA soit encore autorisé. Aucune récupération inter-appareils des anciennes réponses n’est prouvée. L’interface IA n’est pas publiée ; les élèves du site public ne bénéficient donc pas encore de cette nouvelle correction. Aucun retraitement automatique des anciens quiz.

**Aucun plafond de 20 € ou 300 € n’a été activé lors de cette intervention.** La conversion financière propre au client est indisponible et aucun plafond natif bloquant correspondant n’a été trouvé. Inventer un prix par crédit donnerait une fausse garantie. L’implémentation budgétaire IA est suspendue comme demandé jusqu’à l’établissement de cette conversion et des postes couverts. Aucun appel IA payant, aucune migration, aucun déploiement ou publication pendant ce diagnostic. Seuls le présent rapport, la feuille de route et les exigences mémorisées ont été ajoutés/modifiés.

## Coûts enregistrés du projet

Source : relevé autorisé, du **1 octobre 2026 00:00 UTC au 30 octobre 2026 10:37:11 UTC**. Journée du 30 partielle ; enregistrement susceptible de retard. Ce ne sont ni des factures ni des euros payés.

| Poste | Crédits demandés | Déductions de crédits enregistrées |
| --- | ---: | ---: |
| Construction, plan et surveillance projet | 2 953,900000000 | 2 953,900000000 |
| Base / calcul Cloud | 122,085600000 | 122,085600000 |
| Fonctions | 3,706130000 | 3,706130000 |
| IA Gateway, tous modèles du projet | 6,892573360 | 6,892573360 |
| Transfert réseau | 31,451404797 | 31,451404797 |
| Realtime | 0,090662500 | 0,090662500 |
| Stockage fichiers | 1,172672258 | 1,172672258 |
| **Total projet enregistré** | **3 119,299042915** | **3 119,299042915** |

Partie fonctionnement enregistrée hors construction : **165,399042915 crédits**, sans prétendre couvrir abonnement, hébergement non attribué ou services externes. Les paiements en euros, TVA, factures, conditions de financement des crédits et coût affectable de l’abonnement ne sont pas disponibles. Les marqueurs de couverture dans le relevé ne permettent pas de les reconstituer.

### Preuve IA ciblée existante

Les trois requêtes Astra existantes totalisent **0,06828 crédit** dans les logs ; aucune nouvelle requête émise pour ce diagnostic :

| Log | Horodatage UTC | État | Coût enregistré |
| --- | --- | --- | ---: |
| 01a18c4e-be6b-7236-821c-919fdd81fd16 | 30/10 10:15:36 | HTTP 200 | 0,02596 crédit |
| 01a18c4f-37cf-7f09-bc6b-ce45f690c208 | 30/10 10:16:07 | HTTP 200 | 0,02272 crédit |
| 01a18c4f-49d6-7f25-8c49-3dd201091bf7 | 30/10 10:16:12 | HTTP 200 | 0,01960 crédit |

Payloads expurgés : les corps complets ne sont pas disponibles dans cette consultation. Ces trois succès ne prouvent ni un tarif futur maximal ni le fonctionnement de tous les anciens comptes. Le relevé agrégé distingue entrée Astra0,03928 et sortie0,029 crédit ; les unités des quantités sont inconnues dans ce relevé, elles ne servent pas à déduire un prix contractuel.

## Contrôles de compte réellement consultés

- Abonnement : **Pro actif** depuis le12 mars2026. Montant, palier, périodicité, TVA et factures non fournis par cet outil.
- Vérification complémentaire demandée (« regarde toi ») : solde workspace consulté, période de consommation7octobre–7novembre2026 ;1751,77 crédits restants, grant billing4000 crédits, rollover4000 crédits et top-up597,72 crédits. Ce relevé confirme des allocations de crédits, **pas leur prix payé**. Les outils de facturation accessibles ne lisent ni les factures ni les paiements TTC ; aucun montant euro fiable n’a pu être établi, même après cette vérification. Ne pas redemander les mêmes montants à l’utilisateur.
- Recharge automatique : **activée**, seuil25 crédits, recharge50 crédits, maximum mensuel100 crédits ; consommation de recharge automatique actuelle0 crédit, période1octobre–1novembre UTC. Ces100 crédits ne sont pas100€ et ce réglage ne plafonne ni l’abonnement ni la totalité des achats/dépenses. Aucun réglage modifié.
- Recherche d’un plafond natif mensuel **bloquant IA pour le projet** : aucun plafond correspondant trouvé, aucune mise à jour faite.
- Recherche d’un plafond natif mensuel **bloquant général workspace** : aucun plafond correspondant trouvé, aucune mise à jour faite.
- Les outils disponibles mettent à jour des règles existantes en crédits, pas un plafond global en euros ; aucune règle créée, aucun autre plafond abaissé arbitrairement.

## Protections IA existantes, et leurs limites

Inspection : `QuizQrcTaxiIntegre.tsx`, `CorrectionQrcTaxiIA.tsx`, `aiCorrection.ts`, `qrc-taxi-ia/index.ts` et contrat0226.

- Authentification serveur, références versionnées, reçus privés sans réponses brutes, identité compte/quiz/version/question/réponse ; correction et relecture distinctes.
- Claim SQL sérialisé par compte, une correction active par compte,60 reçus/heure et200/24h glissantes, au plus3 tentatives pour erreurs transitoires connues avec délai. Ce sont des limites d’abus **par compte**, pas un plafond financier global.
- Budget de sortie1800 tokens, réponse limitée à4000 caractères ; les caractères ne prouvent pas le nombre de tokens d’entrée. Le coût maximal facturable doit encore être établi selon le catalogue et la conversion du client.
- Résultat inconnu non rejoué, pause persistante après402/403, erreur sans faux zéro. Ces pauses ne remplacent pas une réservation financière préventive.
- QCM/checkbox/communes sans IA ; Q5/Q6/Q13 à arbitrer sans note et sans appel IA. Aucun contenu ou preuve officiel touché.

## Plafond20 € : travail bloqué et conditions de reprise

Le propriétaire doit fournir la pièce de facturation établissant une borne conservatrice **euros TTC par crédit** applicable à ces consommations, y compris recharges/conditions du plan. Aucun secret, identifiant de paiement ou donnée bancaire n’est nécessaire ; masquer ces informations.

Une fois cette base connue, préparer puis vérifier :
1. Mois civil calculé exclusivement serveur en Europe/Paris ; budget **global**20€, partagé entre élèves et deux quiz.
2. Réservation monétaire conservatrice avant chaque vrai appel, verrou global et réservation idempotente dans la même transaction que le claim ; refus si réserve+consommation dépasserait20€.
3. Borne documentée sur entrée/sortie et prix applicables ; bloquer si prix/configuration non vérifiés, jamais conserver une ancienne conversion arbitraire.
4. En l’absence d’accès fiable à la facturation par appel, conserver toute la provision, y compris résultats inconnus ; ne jamais libérer une réserve sur la seule déconnexion. Pas de dépense prévue en double sur un même reçu.
5. Seuils50/80/100% visibles administrateur, événements sans données personnelles ; aucun mail/SMS sans accord.
6. Relecture gratuite au sens absence de nouvel appel modèle, mais fonctions/réseau Cloud peuvent toujours consommer des crédits ; affichage sans note si plafond atteint, réponse conservée.
7. Tests isolés : concurrence entre comptes, mois Paris/fin de mois, seuil20€, idempotence/retry, panne et anciennes réponses terminées. Test payé seulement après établissement du contrôle.

**Ce mécanisme n’est pas encore mis en place ; aucune alerte50/80/100% nouvellement active.** Il couvrira les appels de cette fonction seulement, pas les autres IA du projet ni l’ensemble des frais Cloud.

## Objectif300 € : ce qui doit être établi par le propriétaire

Le propriétaire peut consulter **Settings → Plans & credits** pour relever les factures, le montant TTC de l’abonnement, sa périodicité et les achats/recharges ; il peut y modifier ou désactiver les recharges automatiques. Cette intervention n’en a changé aucun. Un plafond de recharge n’est pas un plafond de consommation et n’empêche pas des achats manuels ; une facturation annuelle payée d’avance n’est pas un débit mensuel.

Il faut aussi inventorier les factures d’hébergement éventuel, domaine, SMS, mail et services externes. Ni le relevé de ce projet ni son endpoint QRC ne prouve leurs montants, leur activité ou l’absence d’autres dépenses. Leur paramétrage reste propre à chaque fournisseur.

Aucun outil consulté ne fournit un plafond ferme qui englobe abonnement+construction+Cloud+IA+externes en euros. L’objectif300€ reste donc **non garanti**. Ne pas couper toute la plateforme ou les mails, réduire les fréquences, changer de modèle, supprimer des données, redimensionner ou mettre Cloud en pause sans décision explicite. L’inventaire de factures et la borne euros/crédit sont les prochaines pièces manquantes.

## Vérifications et limites

- Lecture des anciens quiz : chemin de correction finale prouvé dans la source, sans reset obligatoire ; parcours complet ancien apprenant hébergé **NON PROUVÉ** lors de cette intervention.
- Logs Gateway : trois succès existants consultés ; aucun nouveau test IA.
- Aucun test des plafonds20€/300€ exécuté puisqu’ils ne sont pas implémentés ; **NON PROUVÉS**, pas PASS.
- Données élèves, questions/corrigés, snapshots, notes, jalons et signatures : aucune écriture effectuée.
- Aucun changement de code applicatif, aucune migration/déploiement, aucune publication.

Méthode utilisée : **cost-optimization** (séparation coûts enregistrés, paiements réels, contrôles et diagnostics manquants).