# Parcours de signature Albert AKONO — préparation du 24/11/2026

## État : APERÇU NON ACTIVÉ

- Aucun email, aucune publication, aucun déploiement de fonction et aucune migration appliquée.
- Le lien individuel de justification des compétences déjà transmis est conservé. Aucun doublon d’email n’est prévu.
- La déclaration source `8b944d42-aa7d-4f19-83d9-bc4ef10c0b07` n’est pas réécrite. Les signatures sont prévues dans des preuves nouvelles.
- Le troisième document n’a pas été identifié dans l’existant : aucun intitulé ni contenu n’a été inventé. Confirmation humaine indispensable.

## Documents préparés

1. **Bilan et justification des compétences** : signature possible seulement après remise de la déclaration et de ses justificatifs. La signature atteste de la déclaration, sans validation automatique des compétences.
2. **Contrat-cadre de prestation de formation — anglais** : aperçu PDF non signé joint aux livrables. Identités et conditions demandées intégrées : SERVICES PRO SAS, SIRET 82346156100016, 86 route de Genas 69003 Lyon, Naoufal GUENICHI ; Albert AKONO (DJIOFACK), EI, SIRET 83881665000017, 27 rue Joseph Brenier 38200 Vienne ; 50 € TTC/h ; missions ponctuelles libres, sans minimum ni exclusivité ; durée indéterminée ; préavis de 30 jours ; qualité, confidentialité, indépendance, facturation et vérification CPF par mission.
   - « Courant 2021 » reste une déclaration du centre à confirmer expressément par Albert.
   - Aucune heure historique n’est attestée et aucune date n’est antidatée.
   - La signature de SERVICES PRO n’est pas recueillie ni présumée ; elle devra être réalisée séparément par une personne habilitée.
3. **Troisième document** : non généré, intitulé exact à confirmer.

## Protections préparées

- Consentement et signature manuscrite distincts pour chaque document ; confirmation 2021 séparée pour le contrat.
- Empreinte du texte relu et contrôle de l’intégrité du texte source avant signature ; refus si le contenu change.
- PNG manuscrit validé côté serveur ; date et heure réelles du serveur ; PDF privé avec empreinte SHA-256.
- Relecture du fichier stocké avant confirmation ; preuve append-only ; une preuve par document et une opération UUID par tentative.
- Reprise après erreur avec la même opération ; aucune confirmation si le PDF ou la preuve n’est pas confirmé.
- Lien individuel avec expiration conservée ; aucune action par simple identifiant de document hors du lien.
- Actions de préparation et de rattachement réservées à un administrateur vérifié côté serveur.
- Remontée dans la fiche formateur et rattachement manuel à I21 pour les compétences ou I27 pour le contrat après signature et relecture ; aucun statut Qualiopi modifié automatiquement.
- Aucun bouton ni appel d’envoi dans ce circuit.

## Fichiers de préparation

- `supabase/functions/intervenant-signature/index.ts`
- `supabase/functions/_shared/parcoursIntervenant.ts`
- `supabase/functions/_shared/parcoursIntervenantPdf.ts`
- `src/components/documents/ParcoursSignatureIntervenant.tsx`
- `src/components/formateurs/ParcoursFormateurAdmin.tsx`
- `docs/sql-revue/2026-11-24-parcours-signature-intervenant.sql` — **candidat non appliqué**.

## Tests réellement exécutés

- **PASS — 17/17 scénarios Deno** : 12 tests du formulaire historique et 5 nouveaux scénarios fictifs ; préparation admin, absence de troisième document, refus non admin, déclaration obligatoire, altération du texte, deux signatures séparées, PDF privés, intégrité, idempotence et rattachement sans doublon.
- **PASS — 8/8 règles Vitest** : identités, tarif, clauses, 2021, consentements, aperçu/final et UUID.
- **PASS — 7/7 contrats SQL sur PostgreSQL jetable** : droits minimaux, lecture admin seule, anonyme refusé, modification/suppression refusées, unicité et absence d’effet sur les autres modèles.
- **PASS — aperçu local réel en lecture seule** : formulaire et contrat visibles, signatures désactivées tant que le service n’est pas activé. La prévisualisation externe demande une connexion Lovable et n’a pas été contrôlée au-delà de cette redirection.
- **PASS — souris et mobile tactile avec transport entièrement fictif** : tracé, erreur visible, nouvel essai avec le même identifiant, statut signé simulé et absence de débordement horizontal. Ces tests ne prouvent pas une signature en production.
- **PASS — compilation Deno et TypeScript**.
- PDF d’aperçu : 2 pages A4, texte extrait et rendu visuel contrôlés ; filigrane et mentions « non signé » présents.

## Reste avant activation

1. Confirmer l’intitulé et le contenu du troisième document.
2. Faire relire et valider le contrat et le parcours par SERVICES PRO.
3. Vérifier une restauration indépendante, puis appliquer le schéma candidat et déployer la fonction isolée.
4. Vérifier en environnement publié les droits, le lien réel et les parcours sans signature de test réelle.
5. Publier et envoyer uniquement après accord explicite ; aucun renvoi automatique à Albert.
