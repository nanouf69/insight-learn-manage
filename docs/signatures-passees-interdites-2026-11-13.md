# Interdiction des signatures apprenant passées

## Diagnostic réel en lecture seule
Le contrôle `emargement_controle_creneau` n’autorise que la date du jour Europe/Paris et l’ouverture réelle du créneau. Mais `garde_emargement_fenetre`, lu dans la base réelle, possède une exception `regularisation_id` : une autorisation valide permet une nouvelle signature passée. La route `regularisation.ts` et le lien personnel utilisent cette exception. L’existence d’un bouton désactivé dans l’espace cours ne protège donc pas tous les accès.

## Correctif préparé, non déployé
- Régularisation retirée : refus 403 P0541, y compris action liste, sans lecture ni écriture de dossiers.
- Envoi de lien retiré : aucun appel au service d’envoi ni écriture dans l’historique.
- Page personnelle : aucun cadre de signature ni action d’enregistrement. Message de gestion administrative distincte.
- Écran de confirmation tardive : aucun bouton pour continuer vers une signature passée.
- Route normale : contrôle de date serveur Europe/Paris, indépendant des dates transmises par l’appareil.
- Candidat SQL : retire uniquement l’exception rétroactive du contrôle existant, conserve l’immuabilité des preuves et le contrôle des horaires. Horodatage par clock_timestamp ; franchissement de minuit contrôlé à l’écriture, même si la requête a commencé avant.
- Ancien candidat SQL de signature tardive désactivé et marqué RETIRED. Ne jamais l’installer.

## Vérifications exécutées
- 40 tests Vitest réussis : date passée, jour actuel, minuit hiver/été Paris, dates invalides, parcours VTC/TAXI/TA/VA/FC/pratique, signatures historiques et fenêtres existantes.
- 6 tests Deno : ancien adaptateur ne déclenche aucun RPC, y compris avec une signature renseignée.
- 6 tests sur PostgreSQL jetable : INSERT direct authenticated/service_role refusé, ancienne case vide non remplissable, ancienne preuve intacte, remplacement refusé, jour courant horodaté réellement, futur refusé, frontières Paris et changements saisonniers.
- Page en aperçu vérifiée avec session injectée, sur 1280×1800, 800×1280 et 360×800 : aucun cadre de signature, aucune commande de signature, aucun débordement. Simulation Chromium tablette, pas test matériel Samsung réel.
- Aperçu : compilation OK.

## Production et activation
Aucune migration, aucun déploiement de fonction, aucune publication et aucune mutation de données réalisés dans ce lot. L’exception en production demeure donc présente : ne pas annoncer la protection comme active partout.
Ordre d’activation isolée : vérifier sauvegarde et restauration sur environnement indépendant ; installer le contrôle préparé en base ; déployer seulement save-emargement-apprenant et send-regularisation-emargement ; tester les refus authentifiés sans créer de preuve réelle ; relire les preuves de référence. La page visuelle ne nécessite pas une publication globale pour que le refus serveur fonctionne.

## Cases anciennes manquantes
Uniquement présence/absence administrative justifiée et auditée, avec auteur, date réelle et justificatif, sans signature fabriquée ni nom de l’élève utilisé comme signataire. Aucun lien rétroactif ne doit être créé ni envoyé. Aucune présence de CABRAL ni d’un autre dossier n’a été modifiée.

Le P0 Bilan Développement commercial reste un chantier séparé, inchangé par ce correctif.