# Pratiques TAXI/VTC/TA/VA — 31/10/2026

## Diagnostic et couverture
TAXI et TA partagent le module6 PRATIQUE et le12 CAS PRATIQUE. VTC et VA partagent le module8 PRATIQUE. Lecture Cloud des trois configurations sans écriture ; cartographie des consommateurs dans le code.
Module6 enregistré : six images Lyon dans les cours3–8 ; module8 : PDF de grille, PPTX PRATIQUE_VTC_v3 **sans PDF compagnon**, image carte Lyon, PDF modèle devis et facture. Les supports supplémentaires TAXI/VTC Lyon comportent19 pages chacun et utilisent des images, pas le lecteur PDF. Le module12 n'a pas de fichier/image dans la projection interrogée. Les cadres de photos de cours ont déjà des hauteurs fixes48/64 et les galeries48 : pas de correction aveugle.

L'ancien correctif de hauteur s'applique à TOUS les consommateurs PdfSlideViewer, mais pas aux images ni aux iframes Office/Google. Il n'était donc pas suffisant pour toutes les pratiques.

## Causes corrigées dans les éléments partagés
1. PDF mobile : la largeur restait influencée par innerHeight. Hors plein écran, elle dépend désormais uniquement de la largeur disponible ; les variations de barre Safari/clavier ne redimensionnent plus la slide. Détection tactile initialisée dès le premier rendu, chargement avec espace réservé.
2. PDF : tout déplacement horizontal>=48px pouvait tourner une page, même pendant un défilement diagonal/pan/pinch. Suppression de cette navigation tactile : boutons et clavier explicites seulement.
3. PDF : même-source rechargée conservait mal sa page ; page retenue lors d'une relecture, nouvelle source réinitialisée et Document identifié par URL/retry. Métadonnées asynchrones protégées du changement de source. Navigation desktop limitée au scroll interne, touches gérées sans scroll navigateur parasite.
4. Images Lyon : hauteur auparavant dépendante du chargement et limite75vh. Nouveau cadre commun StableReadingImage3/4, image contenue sans découpe, zoom interne ; aucune obligation/validation ajoutée. Carousel d'images : hauteur68vh remplacée par cadre4/3.
5. Auth : timeout getSession était assimilé à session absente ; il reste désormais inconnu et ne déclenche pas une fausse déconnexion. Session explicitement absente, compte différent et401/403 restent refusés. Les vérifications serveur existantes sont conservées, pas d'affaiblissement de session unique.
6. ModuleDetailView : callback CLOSED d'un canal volontairement démonté pouvait programmer un reconnect. Drapeau de fermeture, timer unique et annulé lors du démontage. Ce risque est établi dans le code ; son incidence exacte sur les traces réelles n'est pas prouvée.

## Fichiers
- src/components/cours-en-ligne/PdfSlideViewer.tsx
- src/components/cours-en-ligne/StableReadingImage.tsx (nouveau)
- src/components/cours-en-ligne/PratiqueTaxiLyonSupport.tsx
- src/components/cours-en-ligne/PratiqueVtcLyonSupport.tsx
- src/components/cours-en-ligne/ImageCarouselViewer.tsx
- src/components/cours-en-ligne/ModuleDetailView.tsx (cleanup canal uniquement)
- src/hooks/useConnexionEleveConfirmee.ts
- src/test/pdf-pratique-mobile.test.tsx (nouveau), src/test/connexion-eleve-resume.test.tsx
- AGENTS cours, roadmap et ce rapport.

## Preuves exécutées
43 tests ciblés PASS :6 fichiers (PDF partagé10, connexion9, hauteur2, maintien session7, autosave15). Les tests PDF couvrent cinq étiquettes d'usage avec le même lecteur, pas cinq banques pédagogiques distinctes.
Matrice Playwright :5 usages (TAXI/TA/VTC/VA/CAS12) ×2 moteurs (WebKit iPhone13 et Chromium Pixel7), chacun en contexte frais, compte/auth local fictif. PDF démonstration et images fictives, accès externe bloqué. Modules complets non montés ; il s'agit des composants partagés.

|Mesure|iPhone13 tous usages|Pixel7 tous usages|
|---|---|---|
|Largeur PDF lors de variations hauteur610/760/664 à largeur constante|372→372px|375→375px|
|Cadre image avant/après page suivante|520→520px|524→524px|
|Geste diagonal seul|page1 conservée|page1 conservée|
|Bouton suivant puis rerender parent|page2 conservée|page2 conservée|
|Rafale auth/pageshow/online|1 vérification|1 vérification|
|Scroll à la reprise synthétique|delta0|delta0|
|Saisie locale|conservée|conservée|
|Erreurs JS dans cette matrice|0|0|

Les captures sous /tmp/browser/iphone-isole ont été consultées. Page temporaire retirée et contextes fermés. Le précédent essai local avait confirmé les brouillons avec useAutoSave après reload/arrière/avant via transport fictif ; aucune preuve Cloud annoncée.
Avant : comportement X-only démontré dans le source (tourne page au geste diagonal), images sans espace réservé, dépendances68/75vh. Les anciennes mesures PDF280→356 concernent le ticket précédent, pas chaque support actuel : aucune mesure avant fabriquée pour les fichiers réels.

## Contrôle global et blocages précis
Suite complète relancée :3230 PASS,16 FAIL,13 skipped ;346 fichiers PASS,13 FAIL,2 skipped ;10 erreurs non gérées. Même nombre d'échecs que le contrôle précédent,12 tests supplémentaires PASS. Échecs : candidats-a-payer, canonical-question-deletion-persistence, devis-durees-elearning(3), email-sender-branding, examen-session-selector, examens-relecture-jeton-renouvele, formation-order-regression, formation-terminee, jalons-ponderes-compte, pratique-apprenant-link, presentiel-heures-validees(2), quiz-module-validation-serveur, verrouillage-moteur-examen. Ne pas modifier leurs règles/questions hors périmètre pour cacher ces échecs.
Dernier build automatique connu après correctif code : OK10:05:51UTC.

NON PROUVÉ : tous les PDF réels, Office/Google embarqué (PPTX VTC sans compagnon), lecteurs en plein écran/rotation réelle, Safari physique/PWA/ITP, véritables arrière-plan/reconnexion/réseau, comptes hébergés et réponses Cloud. CAS12 dans la matrice utilise les mêmes composants fictifs, pas son écran complet. Aucun compte TEST hébergé réutilisable n'a été créé : absence de tous les emails/statistiques automatiques non garantie. Aucun élève réel connecté, aucune donnée pédagogique modifiée.

## Déploiement
NON PUBLIÉ : contrôle global non concluant et flux hébergés non vérifiés. Le site publié n'a donc pas reçu ces correctifs ; impossible d'annoncer « réglé chez tout le monde » ou un déploiement réel vérifié. Les correctifs sont partagés dans l'aperçu et non spécifiques à Seltioui.