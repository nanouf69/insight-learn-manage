# Qualiopi 16 — date d’examen dans l’espace apprenant

## Référence technique ajoutée

Une fiche `q16-20261119-date-examen-espace-apprenant`, un lien vers 16. Compteur **494 → 495**, sans modification du statut manuel.

## Chaîne de source effectivement examinée

- `src/pages/CoursPublic.tsx:1092-1099` : lecture du dossier par `auth_user_id = user.id`, avec `date_examen_theorique` et `resultat_examen`.
- `src/lib/parcoursSessionFC.ts:26-43` : projection de formation conserve les autres champs, dont date.
- `CoursPublic.tsx:2406-2418` : date centrale passée à `StudentHoursTracker`, même dossier que les heures/modules.
- `src/components/cours-en-ligne/StudentHoursTracker.tsx:204-238` : date renseignée affichée sous « Date d’examen théorique ». Une date vide donne une prochaine session indicative et le badge « Aucune date à votre dossier », sans écrire de date.
- Badge « Date passée » : date enregistrée antérieure au jour local du navigateur, sans résultat reconnu. Ni passage réel ni validation CMA démontrés. Résultat reconnu : badge Admis/Ajourné distinct.
- `StudentHoursTracker.tsx:101-107` : carte absente pendant chargement, sans dossier ou si heures requises et réalisées valent zéro. Pas de garantie d’affichage à tous les dossiers.
- `:197-202` : 100 % est le taux d’heures affiché plafonné, pas certification ; statut Formation terminée exige aussi les modules (`:33-38`).

## Renseignement et actualisation

1. `src/pages/onboarding/steps/Step12.tsx:325-355` écrit la date centrale par id de dossier, puis `:376-407` sauvegarde le document bienvenue avec date. Deux opérations, pas transaction unique démontrée.
2. Fonction **déployée** `sync_cma_from_dossier_bienvenue`, relue au catalogue, trigger `trg_sync_cma_from_dossier_bienvenue` après insertion/modification du document : date non vide du document remplace date centrale ; vide conserve existante. Cette synchronisation ne prouve pas la signature de chaque document.
3. `src/components/apprenants/ApprenantEditForm.tsx:355-369` : champ vide prérempli depuis document bienvenue, sinon calendrier. Extraction `src/lib/dossierBienvenueDepot.ts:52-58` ne contrôle pas la signature ; lecture limit(1), non triée. Sélecteur `:1092-1110`, payload `:582`, écriture dossier `:615-620`.
4. `src/components/sessions/SessionDetail.tsx:5191-5198` : modification individuelle centrale par sélecteur.
5. RPC **déployée** `decaler_examen_theorique` relue : admin, ancienne valeur attendue, identité dossier, opération idempotente, date centrale/session et journal. 12 événements enregistrés ; aucun appel exécuté par cet audit.
6. Chargement dossier `CoursPublic.tsx:1181-1186` ; aperçu intégré relit par id `:1206-1225`. Abonnements progression `:1328-1342` ne relisent pas la date. **Actualisation instantanée d’une date modifiée depuis le CRM non prouvée.**

## Catalogue réel — lecture seule

Hors registre technique, dossiers actifs : **3359** ; date non vide **371**, dont **270** avec compte authentifié ; au 17 novembre **81**, dont **78** avec compte (77 libellés français, 1 ISO). Date non vide n’est pas systématiquement une date valide ni un affichage effectivement consulté.

**118** documents bienvenue comportent une date, pour 118 dossiers ; pas assimilés à 118 documents signés. **12** événements de report présents ; aucun report réalisé.

## Capture du dirigeant et limites

La capture décrite (17 novembre 2026 / Date passée / 100 %) correspond au mécanisme trouvé. Le fichier original, dossier et horodatage exacts de cette capture ne sont pas identifiés dans cette demande ; zéro capture jointe ou reconstruite. Pas de consultation d’un compte élève provoquée pour ne pas créer de trace pédagogique artificielle. Vérification connectée limitée à la fiche admin Qualiopi et à la lecture des sources réelles.

La fiche documente une capacité d’information individualisée. Elle ne prouve ni accès effectif, lecture, convocation officielle reçue, inscription CMA acceptée, ni respect intégral des conditions de certification.

## Contrôles

Relecture base et fiche admin connectée, onglet Nos preuves et référence technique visibles. État Sans preuve / Jamais vérifié conservé, aucune conformité automatique.

Empreintes avant/après : dates actives `940d6ff70d3adf61426d3e3ad85a9e4f` ; documents `974ca675a1fb8be93b9c92c2a086382d` ; journal reports `b78da8194a96624db5824663f1cf7ce2`. Contrôle doublons et référence orpheline : zéro.

SHA256 code : StudentHoursTracker `da53e78783067781ffce5ae6090f2aa586280cb28e187e62178379e236a3e1e7`, CoursPublic `7fb417c8e7189dc04e5030fc582bb19addbaf2b749a7c2beff4c72b792da39c0`. Aucun code applicatif modifié, aucun test métier inventé, aucune date/note/source modifiée ; aucun envoi ni publication.