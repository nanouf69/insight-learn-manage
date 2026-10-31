# Incident iPhone — vérifications du 31/10/2026

## Compte hébergé : non créé
L'autorisation demandait zéro email externe et zéro contamination des statistiques.
Le registre `comptes_test_techniques` existe, avec exclusions restrictives sur apprenants, réponses, complétions et résultats quiz. Deux relances consultent ce registre, mais toutes les fonctions d'envoi ne l'utilisent pas : `auto-send-credentials` et `create-apprenant-account` contiennent un envoi automatique. Le déclencheur de modification d'une fiche peut aussi appeler l'envoi d'accès. Un simple nom TEST ou une adresse fictive ne garantit donc pas les exclusions demandées.
Ne pas utiliser le pilote existant ni `core_purge_donnees_test()` : cette dernière purge tous les examens test et désactive globalement des triggers, au-delà du périmètre autorisé. Aucune création, migration, suppression ou connexion à un élève réel effectuée.

## Correctif effectivement appliqué
`src/hooks/useConnexionEleveConfirmee.ts` :
- Les appels de lecture auth ne commencent plus à l'intérieur du callback `onAuthStateChange`, où le SDK peut encore détenir son verrou de session.
- Les événements auth/retour/réseau sont regroupés dans une fenêtre150ms ; une seule vérification en cours.
- Contrôle de correspondance entre compte attendu, session locale et utilisateur confirmé serveur.
- Le contrôle périodique de révocation reste à60s, et les deux lectures espacées2,5s restent nécessaires pour déclarer l'absence.
- Erreur réseau ou timeout ne démonte pas la saisie ; expiration et refus401/403 restent détectés.
- Timers et écouteurs nettoyés au démontage.
Cela établit une cause vérifiable de vérifications rapprochées et un risque de verrou SDK ; ce n'est pas la preuve que toutes les requêtes `/user` de l'iPhone de Seltiou provenaient de ce hook. D'autres composants/autosaves appellent aussi getUser.

Fichiers permanents modifiés : hook ci-dessus, `src/test/connexion-eleve-resume.test.tsx`, `AGENTS.md`, `roadmap.md`, ce rapport. Le précédent correctif de hauteur PDF n'a pas été modifié dans ce lot.

## Tests réellement exécutés
- Vitest ciblé :5 fichiers,31 tests PASS (connexion7, maintien session7, hauteur PDF2, sauvegarde documents6, courses validation/brouillon9).
- Cas concrets : regroupement initial/auth/retour, pas de lecture synchrone depuis le callback, révocation périodique, refus d'un autre compte,401, réseau absent, cleanup.
- WebKit Playwright, profil iPhone13,390×664 CSS pixels, viewport mobile : vrais composants PDF, hook de connexion et useAutoSave, mais auth/écritures interceptées vers un transport local fictif. Tout accès réseau externe bloqué.
- Diapositive initiale rendue :25 mesures espacées100ms, largeur372px constante.
- Rafale pageshow/visibility/online/auth :1 vérification simulée supplémentaire et delta scroll0.
- QCM coché et QRC « Brouillon TEST conservé » : relus après rechargement puis navigation arrière/avant. Il s'agit d'une preuve locale, pas de persistance Cloud.
- Captures conservées dans `/tmp/browser/iphone-isole/` ; page temporaire supprimée du projet et contexte navigateur détruit. Aucun compte hébergé à supprimer, aucun email/SMS/IA/EDOF/facture/attestation/signature produit.
- Deux erreurs d'accès au worker PDF sont apparues dans WebKit après navigation ; rendu initial effectué, mais le parcours PDF complet n'est donc pas déclaré sans erreur. Aucun contournement de sécurité appliqué.

## Contrôle global et limites
Suite complète exécutée :345 fichiers PASS,13 FAIL,2 skipped ;3218 tests PASS,16 FAIL,13 skipped ;10 erreurs non gérées liées notamment à des mocks de signatures. Ces échecs restent hors correctif auth ciblé ; aucune retouche de questions ou de règles métier pour rendre la suite verte.
Derniers contrôles automatiques disponibles : build OK09:49:57 et09:50:40UTC.
NON PROUVÉ : authentification réelle, refresh réel/expiration réelle sur iOS, fermeture/réouverture Safari physique, icône d'accueil/PWA, Safari ITP, réseau mobile, autosave QCM/QRC du parcours complet en Cloud, déconnexion/reconnexion hébergée et tous les écrans élèves. Un événement navigateur synthétique n'est pas une véritable mise en arrière-plan iOS.

## Statut
Non publié. Création du compte hébergé et tests réels restent bloqués par les garanties d'isolation des envois/statistiques non établies ; publication bloquée par les contrôles globaux non satisfaisants.