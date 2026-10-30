# Objets oubliés TAXI — audit et corrections limitées — 30 octobre 2026

## Résultat : harmonisation PARTIELLE, non publiée
Deux feedbacks facultatifs précisés (local20/local29), une réponse de secours corrigée (Contrôle57 :24→72 heures). Aucune clé de banque partagée ni donnée Cloud modifiée. L’uniformisation de toutes les réponses n’est PAS terminée : copies ouvertes et divergences territoriales empêchent une substitution générale sûre.

## Sources officielles effectivement lues
Page : https://mobilites.grandlyon.com/espace-pros/conducteurs-taxi , rubrique **Objets trouvés** :
> Après chaque course et avant que les clients se soient éloignés, le conducteur du taxi doit s’assurer que ceux-ci n’ont rien oublié dans son véhicule.
> Tout objet découvert après le départ des clients doit être signalé immédiatement et déposé obligatoirement dans la limite de 72h au Service Taxis de la Métropole de Lyon.

Arrêté **2024-11-27-R-0871**, objet : réglementation des taxis sur l’ensemble du territoire de la Métropole, article6 **page5** :
> Tout objet oublié dans le véhicule par un client doit être déposé dans un délai de 72h au guichet de l’unité taxis de la Métropole.

PDF officiel téléchargé, scan lu par OCR puis page5 contrôlée visuellement : https://api.mobilites.grandlyon.com/fileadmin/user_upload/media/PDF/PROs/Taxis/Taxis_arrete_Metropolitain_20241127.pdf

SHA256 : `edd5d03cc182b23218607317b25f23e895d8573b69ffbc3bbd3f3668a40c705e`.

**Distinction :** le contrôle avant éloignement et le signalement immédiat sont explicites sur la page officielle ; ils ne figurent pas dans la phrase de l’article6. « Avant descente » n’est PAS la citation officielle. Aucun texte lu n’établit qu’un dépôt au lieu de prise en charge remplace la procédure après départ.

Arrêté préfectoral du **21/09/2026**, article9, PDF autonome **pages2–3** (recueil pages16–17) :
> Après chaque course et avant que les clients ne se soient éloignés du véhicule, le conducteur de taxi s’assure qu’ils n’ont laissé aucun objet à l’intérieur du véhicule.
> Les objets oubliés dans le véhicule par le client après son départ sont déposés le plus rapidement possible, sans excéder72 heures, au service des objets trouvés de la mairie de dépose ou auprès de l’autorité de délivrance de l’autorisation de stationnement.

PDF officiel fraîchement téléchargé et extrait : https://api.mobilites.grandlyon.com/fileadmin/user_upload/media/PDF/PROs/Taxis/ARRETE_PREFECTORAL_21092026_relatif_%C3%A0_la_r%C3%A9glementation_des_taxis_dans_le_d%C3%A9partement_du_Rh%C3%B4ne.pdf

SHA256 : `1ee927caf966347189f8a43fffe559f33960f713e0f7806e45ad219d0f8ff9e4`.

**Divergence réelle :** guichet Métropole vs mairie de dépose/autorité ADS. Le texte2026 abroge l’arrêté préfectoral2018, pas explicitement l’arrêté métropolitain2024. La page officielle présente les deux. Leur articulation pour une ADS Villefranche ou une dépose Tarare reste à arbitrer ; aucune généralisation départementale du destinataire Métropole n’a été appliquée.

Supports projet déjà lus : Locale1 pages3/7, Locale2 page6, livre TAXI PDF33 : guichet/service Métropole sous72h ; ces supports sont conservés sans remplacer leurs fichiers.

## Inventaire code avant/après — seules lignes applicatives changées
| Fichier / emplacement | Avant | Après |
|---|---|---|
| `src/components/cours-en-ligne/controle-connaissances-taxi-data.ts`, Q57, choixA, ligne628 | mairie de dépose ou autorité ADS, **24 heures**, correctA | même texte/lettre/clé, **72 heures** ; aligné sur la ligne serveur déjà72h |
| `src/lib/quizQrcTaxi/correctionsLocalesVerifiees.ts`, Q20 | pas de feedback spécifique | citation officielle Métropole complète, référence article6/p5 ; distinction explicite avec ancien choixB préfectoral ; cléB conservée |
| même fichier, Q29 | alerte2026 et ambiguïté du lieu | citation Métropole vérifiée + référence2024 ; réserve ADS Villefranche et lieu non établi ; cléA conservée |

Trois constantes ajoutées dans le même helper : énoncé exactQ20, citation commune et référence officielle. Q35 garde exactement son code/feedbackD précédent. `QuizQrcTaxiIntegre.tsx` n’a pas été modifié : ses appels existants rendent ces feedbacks après soumission. Tests ajoutés dans `src/test/objets-oublies-taxi.test.ts` ; documentation/règles/feuille de route mises à jour uniquement.

**Pas de modification de `quizData`, copie40QCM TA, énoncés, distracteurs hors choixA du Contrôle57, manifeste, sauvegarde, IA, examens blancs, notes ou réponses élèves.** Le feedback d’une copie facultative soumise peut afficher la précision actuelle ; ses réponses et aucune note enregistrée ne sont réécrites. Aucun snapshot historique modifié.

## Inventaire des sources actives lu en base, inchangées
`module_editor_state` :
- Délai72h Métropole : modules9/Q73002 ;10,24,40,42/Q2 ;27/Q2.
- Dépôt oublié général, mairie/ADS72h :11/Q20,28/Q20,13/Q96.
- Villefranche/Lyon8 :11/Q29 (**A+B dans JSON**),28/Q29 (**A**),13/Q105 (**B+D**),27/Q143 (**A**).
- Tarare :27/Q134 (**B**, mairie/ADS72h).
- Copies annexes90014/90016 :Q20 (**B**),Q29 (**A**). Non modifiées.

`quiz_questions` :
- `reglementation-locale/73/2` :C72h.
- `bilan-exercices-taxi/204/2` et `/73002` :C72h, deux identités distinctes conservées.
- `bilan-exercices-ta/251/2` :C72h, choix `admin_locked` conservés.
- `bilan-exercices-taxi/204/134`, TA251/134 :TarareB72h.
- `bilan-examen-taxi/606/20`, TA701/20 :B72h, mairie/ADS.
- `controle-connaissances-taxi/5/57` :A72h, Givors, déjà corrigé en base ; différent de l’ancien secours24h.
- TAXI606/29 et204/143 :B+D ; TA701/29 et251/143 :A. **Ne pas harmoniser par remplacement global sans arbitrage et protection des copies.**

`canonical_questions` : aucun match pertinent aux recherches énoncé/choix/réponse/explication.

## Inventaire code conservé / hors sujet
- QRC TAXI complet : aucune question sur objets oubliés dans la banque39 ; aucune réponse à modifier.
- Spécialités : seuls locaux20/29 concernés ; les20QRC nationales n’abordent pas ce thème.
- Exercices réglementation73/Q2 :C72h déjà conforme ; conservé.
- Mobilité TAXI/Q5 :« Oui », respecter réglementation locale ; pas de délai/destinataire divergent.
- Examens blancs Q20/Q29 : mêmes sujets trouvés, **inchangés** ; toute évolution exige une nouvelle version protégée, pas une réécriture.
- Q24 « Service Taxis » :adresse, pas procédure ; inchangée.
- Anglais « Lost property office », textes français et portefeuille VTC (`DEV_COMMERCIAL_VA`) :hors réglementation taxis, inchangés.
- «3 jours ouvrés» permis de circuler :autre obligation, inchangée.
- Fixtures historiques de tests :conservées, aucune modification pour les faire artificiellement correspondre au présent.
- Supports PDF/PPTX :originaux conservés. Exhaustivité de toutes les pages image de tous les supports TAXI/TA :**NON PROUVÉE** ; sources textuelles et supports locaux ciblés inspectés.

## Pourquoi les remplacements serveur restent bloqués
Copies enregistrées non terminées au moment du contrôle :10/exo73=11 +6révisions ;11/exo606=9 +5révisions ;13/exo13100=6 +1révision ;28/exo701=5 +8révisions. « Non terminé » n’est pas une preuve d’absence de réponses.13snapshots locaux11/606 contiennent le sujet. Les circuits hérités TA/Contrôle ne prouvent pas partout une référence initiale figée ; changer les choix utilisés à la correction pourrait modifier une copie déjà commencée. STOP sur ces écritures, conformément à la demande.

## Tests et preuves
- **39 tests PASS** :2objets,4Q29/Q35,22quiz intégré,6durable,5membership Contrôle.
- **14 tests PASS** :3alertesQ5/Q6/Q13,9IA,2snapshots EB. Total **53** effectivement exécutés ; aucun appelIA payant.
- Aperçu compte technique déjà soumis :feedbacks20/29 lus sur ordinateur1280 et téléphone390, captures inspectées, aucun débordement ; aucune saisie/soumission/nouvelle tentative demandée.
- Contrôle automatique :buildOK11:36:37UTC.
- Avant/après :2 317 lignes `quiz_questions`, empreinte identique `164155ed936ba0cd89d76b7f7c7c91c5` ; JSON des modules9/10/11/13/24/27/28/40 empreintes identiques.
- SHA256 sources banques/Q35-support/sauvegarde/IA/EB vérifiés ; seul écart attendu :fichier Contrôle24→72. Diff helper conservé dans l’inventaire ci-dessus. Pas d’écritureCloud, mail/SMS/IA ni publication.
- Harmonisation complète des destinations, protection future-only de tous circuits hérités et affichage de chaque formation :**BLOQUÉ/NON PROUVÉ**, pas annoncés comme réalisés.