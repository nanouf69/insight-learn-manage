# Réinscription et réactivation — 30 octobre 2026

## Périmètre autorisé
Plan approuvé : modification administrative Oui/Non par examen et onglet de réactivation d’un mois calendaire, sans publication globale.

## Livré
- Badge cliquable, y compris sans réponse ; historique administratif séparé des signatures, mêmes choix dans les listes d’examen.
- Proposition calculée par le serveur en heure Paris ; expired = aujourd’hui + un mois, actif = fin actuelle + un mois, fin de mois bornée.
- Périodes supplémentaires indépendantes des dates originales ; aucun changement des modules, relevés figés, réponses, notes ou documents.
- Autorité serveur via has_role/public.user_roles, accès admin seul aux journaux, commandes idempotentes, concurrence refusée ; refus pour compte inexistant/banni/dossier archivé/abandonné/supprimé.
- Après erreur réseau, conserver le même identifiant et la même proposition ; réussite seulement après relecture du reçu.
- Écran cours et garde IA TAXI reconnaissent l’extension par RPC authentifiée ; aucune logique de notation ou question modifiée.
- Migration0227 appliquée ; déploiement ciblé qrc-taxi-ia accepté (empreinte384b6ffa…). Frontend non publié.

## Vérifications réellement exécutées
- PASS : huit tests PostgreSQL jetable, pas de mutation hébergée : Oui/Non/historique, rattachement examen, idempotence/CAS, non-admin, dates initiales conservées, fin2030-01-31→2030-02-28, compte banni/archivé/absent, lecture propriétaire et immutabilité/grants.
- PASS :27 tests Vitest (4commandes individuelles,3badge,5révisions,6accès/convocation,9IA), dont double clic et reprise réseau même identité.
- PASS : aperçu CRM authentifié, fiche Naim DREID en lecture seule : date examen2026-09-29, proposition31octobre→30novembre ; ouverture Oui/Non et onglet.
- PASS : confirmations/readback écran sous session admin avec transports d’écriture interceptés et fictifs : badge Oui(administration), historique extension. Aucune écriture réelle.
- PASS : contrôle automatique build OK10:32:55UTC ; empreintes complètes apprenants et documents_a_signer identiques avant/après ; journaux réinscription/extensions vides0/0.
- NON PROUVÉ : véritable réactivation hébergée puis connexion du même élève expiré, lecture après rechargement sur Cloud ; aucun compte réel modifié ni donnée technique ajoutée pour forcer cette vérification.
- NON PROUVÉ : contrôle de chaque formation/quiz sur chaque appareil ; contenus pédagogiques et calculs hors périmètre non édités.

## Fichiers
crmActionsEleve.ts ; ModifierReinscription.tsx ; ReactiverPlateformeTab.tsx ; ChoixPratiqueBadges.tsx ; ApprenantDetailPage.tsx ; CompteStatutBadge.tsx ; ReinscriptionExamenBadge.tsx ; CoursPublic.tsx ; qrc-taxi-ia/index.ts ; tests dédiés ; migration0227 ; AGENTS.md.

## Restrictions maintenues
Aucun mail/SMS/appel IA, aucune publication frontend, aucune nouvelle inscription officielle déduite du choix, aucune signature fabriquée. La déclaration signée reste affichée dans son historique original, distincte de l’administration.