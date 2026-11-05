# Convocations FC après paiement — 05/11/2026

## État réel
Développement préparé dans l'aperçu et dans les fichiers serveur, **aucune migration appliquée, aucune fonction déployée, aucun cron créé, aucun email envoyé, aucun réglage activé**. La base de production est commune à l'aperçu et au site : elle n'a pas servi aux tests d'écriture.

## Diagnostic confirmé
- L'ancien écran Comptabilité contient bien un automatisme client, contrairement à la conclusion précédente « jamais existé ». Il cherchait seulement nom **ou** prénom, ignorait les résultats de certaines écritures/envois, utilisait un ensemble local non durable et pouvait traiter d'anciens imports.
- Ce bloc a été retiré **de l'aperçu seulement**. Le site publié reste inchangé : ne pas considérer son ancien mécanisme sécurisé ou neutralisé avant publication autorisée.
- Le circuit `fc-paiements` existant est un circuit **d'accès plateforme**, avec configuration désactivée. Il n'est ni activé ni réutilisé pour les convocations.
- Le modèle officiel actuel `confirmation-formation-continue` existe en base. Ses heures sont figées à 8h45–12h / 13h–17h et sa date ne couvre qu'un jour ; la nouvelle personnalisation remplace ces lignes par les dates/heures/lieu de l'inscription/session, sans changer le modèle enregistré ni ses autres consignes.
- `transactions_bancaires` ne fournit pas d'identifiant fiable de stagiaire/session. Catégorisation ou nom affiché ne prouvent pas la relation ; la nouvelle preuve est explicitement confirmée par un administrateur et enregistrée séparément.

## Dossiers de novembre, lecture seule
|Session|Inscrits|Prix inscrit|Dates et horaires enregistrés|
|---|---:|---:|---|
|FC VTC|7|200 € chacun|17–18/11/2026, 09:00–17:00|
|FC TAXI|2|299 € chacun|19–20/11/2026, 09:00–17:00|
Lieu des deux sessions : **86 route de Genas, 69003 Lyon**. Aucune valeur changée. Ces horaires ne sont pas recalculés à partir des standards ou de l'agenda.

- VTC : AUGROS Olivier, FERSI Amir, HASNAT Mustapha, IMAUJI Chika, JEBABLI Haythem, LANGUER younes, LAZARO ROSA Antonio.
- TAXI : AKSU Harun et AKSU Jean Cedric.
- Les neuf inscriptions ont `montant_paye=0`, alors que les dossiers HASNAT (50 €), JEBABLI (200 €) et LANGUER (200 €) indiquent d'autres montants. Ces valeurs ne sont pas corrigées ni assimilées à une preuve bancaire de cette session.
- Deux emails historiques existent : LANGUER le 28/09 (« Confirmation d'inscription formation continue »), JEBABLI le 30/10 (« Convocation à la formation VTC »). Ils ne sont pas liés de manière certaine à la session : revue obligatoire, aucune déduction ni nouvel envoi.
- Deux références AKSU du 28/10 représentent chacune un acompte de 50 € importé trois fois : **pas 150 €**. Statut bancaire `non_justifie`. Le libellé « AKSU MUHAMMED HARUN » n'autorise aucune association arbitraire à Harun. Les deux paiements sont anciens et exclus d'une future activation, sauf demande spécifique ultérieure hors de ce circuit.
- Le prix total n'est pas nécessairement le montant exigible d'un acompte. Aucun contrat ou échéancier prouvant un seuil de convocation n'a été établi pour ces neuf dossiers ; le nouveau circuit refuse sans référence contractuelle et confirmation du montant exigible. **Aucun seuil universel de 50 € n'a été inventé.**

## Ce qui est développé
- `supabase/functions/_shared/fcConvocationsRegles.ts` : décisions pures, référence bancaire stable banque+référence, montants en centimes, dédoublonnage, association explicite à l'inscription, exclusions, personnalisation du modèle officiel et échappement des données.
- `docs/convocations-fc-preparees.sql` : six tables séparées (configuration, rapprochements, exigibles, envois, journal — cinq tables ; aucune table pédagogique), droits admin lecture / serveur écriture, preuves et journal append-only ; confirmation admin transactionnelle ; préparation par triggers lors de rapprochement/confirmation du contrat ; unicité stagiaire+session ; réservation `FOR UPDATE SKIP LOCKED` ; clôture avec jeton de réservation ; journal et historique email atomiques.
- `supabase/functions/fc-convocations/index.ts` : validation JWT et rôle admin ou secret du planificateur ; confirmation d'association ; traitement d'un envoi ; contrôle avant réservation et relecture avant transport ; configuration désactivée = aucun envoi. Aucun appel aux comptes, mots de passe ou accès plateforme.
- `supabase/functions/_shared/fcConvocationsEnvoi.ts` : signature commune, clé fournisseur d'idempotence stable, une seule tentative HTTP. Seul un succès avec identifiant fournisseur donne « envoyé ». 429 refusé : réessai borné ; 5xx, réseau interrompu, réponse illisible ou sans ID : **indéterminé**, jamais réessayé aveuglément. Autres refus : revue.
- Journal durable et alerte admin sur échec/indéterminé. Trois essais maximum pour les seuls refus 429, délais 5 puis 10 minutes ; interruption d'un traitement >10 minutes = quarantaine, pas de nouvelle réservation.
- `src/components/dashboard/ConvocationsFcSimulation.tsx` + `src/pages/Index.tsx` : bouton « Simuler sans envoyer ». Lecture des inscriptions FC à venir uniquement ; tant que les preuves/configuration ne sont pas installées, il affiche honnêtement activation non autorisée, sans prétendre un rapprochement réel.
- `src/components/comptabilite/RapprochementBancaire.tsx` : suppression du seul bloc automatique dangereux dans l'aperçu ; import, rapprochement manuel et données financières inchangés.
- `AGENTS.md`, mémoire et feuille de route : périmètre et frontières consignés.

## Tests réellement exécutés
- **61/61 Vitest PASS** : 31 nouveaux tests convocations + 18 paiements existants + 7 convocations existantes + 5 verrou attestations FC. Montants 50/150/200/supérieurs, contrat explicite, doublons, cumuls, remboursements, association multi-session, destinataire bloqué, historique, modèle, transport simulé.
- **14/14 PostgreSQL isolé PASS** : triggers, double confirmation, refus non-admin, RLS, huit réservations concurrentes → une seule, clôture idempotente et relecture via connexion distincte, journal immuable, retry borné, crash, remboursement, blocage email relu, exclusion historique, empreintes financières/inscription/stagiaire inchangées.
- **Navigateur PASS sur écran isolé fictif ordinateur 1280×1800 et téléphone 390×844** : clic simulation, deux inscriptions fictives, état désactivé ; toutes requêtes d'écriture/fonction bloquées, zéro POST/PATCH/PUT/DELETE et zéro erreur d'exécution. Ce test ne remplace pas une vérification CRM authentifiée complète.
- Dernier contrôle automatique de l'aperçu : **build OK**, erreurs transitoires du banc corrigées.
- Empreintes live avant/après identiques : 2 047 transactions `a2a1a07a63f4422f8768b3277e98d138` ; neuf inscriptions `6e455bd9a2d0365b99928b43cb1688cf` ; trois sessions du périmètre dates (dont session examen hors FC) `71ae5fd89ddd93016eaee2eb93943115`.
- Aucune écriture effectuée sur les émargements, progressions, questions, réponses, comptes ou dossiers ; ces tables ne sont pas utilisées par le nouveau workflow (hors lecture des identités nécessaires).

## Avant activation — tâches bloquées par autorisation et preuves
1. Valider le montant exigible contractuel et les preuves paiement→stagiaire→session ; le nouveau circuit ne rapproche pas seul les noms ambigus. Prévoir une saisie/revue CRM de ces preuves (API de confirmation préparée ; formulaire de confirmation et journal réel non encore raccordés).
2. Autorisation distincte d'appliquer le SQL et déployer la fonction **en gardant les envois coupés** ; vérifier ensuite droits, données et simulation CRM authentifiée complète. Non exécuté : aucun déploiement actif autorisé.
3. Autorisation de publication du retrait de l'ancien bloc et du bouton aperçu. Non publiée.
4. Autorisation explicite des emails réels, secret dédié de planification, installation du rappel HTTP protégé et activation avec date de coupure. Aucun cron et aucune création de secret effectués aujourd'hui. Ne pas lancer de balayage historique à l'activation.
5. Validation du transport réel et de sa livraison : **NON PROUVÉE**, seulement simulations. Le réseau peut changer entre dernière relecture et envoi ; une livraison exactement une fois ne peut pas être garantie atomiquement avec un service email externe. L'unicité SQL et la quarantaine des issues inconnues évitent le renvoi aveugle.

Le développement est préparé et testé, **pas un automatisme déjà actif**. Les dossiers réels ne sont pas déclarés admissibles tant que leurs preuves ne sont pas fournies.