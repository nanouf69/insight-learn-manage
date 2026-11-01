# Préparation ciblée28 VTC — 01/11/2026

## Reprise autorisée — 01/11/2026, contrôle 16:50–16:56 UTC
- Aucun compte créé, aucune feuille ajoutée ou modifiée pendant cette reprise ; aucune écriture Cloud, migration, fonction déployée, publication, mail/SMS, changement de rôle ou appel IA fournisseur.
- Environnement : `LOVABLE_BROWSER_AUTH_STATUS=signed_out`. Le test intégré sans session a reçu401 « Authorization header manquant » (requestId00ff16f3-85a7-4f56-8e53-d1e8d711eb43).
- Une session nominative du demandeur obtenue par le flux autorisé `--self` correspond à naoufal.guenichi@gmail.com, UUID89354720-37ec-4431-8f29-77108e0657e0. Test sans IDs apprenant/email, donc sans possibilité de créer un compte :403 « Réservé aux administrateurs », requestId0add6975-a940-46f7-a42e-97408ce12472. Les logs serveur16:50:41Z confirment cet UUID à Step5 puis arrêt au contrôle Step6. `has_role(UUID,'admin')` cherche dans `user_roles` ; seul rôle enregistré=user.
- Compte CRM distinct vérifié en base : contact@ftransport.fr, UUIDd9d42e89-e386-4b22-af96-ec866fee98db, rôle serveur=admin, dernière connexion01/11 16:13:43UTC. Son profil affiché porte full_name=Naoufel ; le texte Bienvenue est construit depuis ce nom et ne transmet aucun jeton à l'environnement. La session nominative demandée pour CE compte a été refusée par Lovable : « Minting a session as a specific auth user requires user approval, which is unavailable in this context. » Aucun rôle élargi et aucune identité remplacée.
- Blocage réel : l'environnement n'a pas de session autorisée contact@ftransport.fr ; l'autorisation technique nominative ne peut pas être présentée dans cette conversation. Aucun moyen direct de contacter le personnel Lovable n'est disponible parmi les outils. Intervention nécessaire côté Lovable pour permettre la transmission autorisée de cette session ou son approbation nominative ; ouvrir de nouveau le CRM ne constitue pas une preuve de transmission. Ne pas conseiller le bouton CRM ordinaire : ses appels ne passent pas preparation_vtc_novembre et peuvent modifier les dates puis envoyer un mail.
- Lecture base :28dossiers,10comptes liés existants,18manquants ;0compte auth de même email non lié pour les18. Les10 liens sont uniques, emails concordants et comptes non bannis. Aucun test de connexion élève effectué.
- Feuilles :200vides pour10élèves,20chacun ;20feuilles lundi02/11 (2chacun),360manquantes pour les18. Dates exactes02–06 et09–13,11nov inclus, aucun weekend, doublon, image ou absence. Aucun changement des horaires personnalisés.
- Horaires dans la définition SQL active : session journée09–12/13–16 par défaut, session soir17–18:30/18:30–21, ouverture30min avant. L'exécution directe de emargement_theorie_inscrite par l'outil de lecture est refusée par ses droits existants ; aucun élargissement EXECUTE tenté. Signabilité réelle/UI publiée NON PROUVÉE, pas de signature test en production.
- SMAIL Sifeddine : creneau_horaire=en-ligne, type=vtc, formation=vtc-exam, inscription_validee, liste_attente=false, emargements_exclus=false. La0236 déjà appliquée contourne le marqueur en-ligne pour ces deux sessions :20feuilles existent malgré ce mode. Écart explicite, aucune conversion présentiel ni invitation à signer ; aucune suppression/masquage historique. Ce cas ne peut pas être déclaré conforme sans résolution ciblée.
- Conservation pendant cette reprise :3091feuilles globales, même empreinte avant/après25c114491db8f03f32ec8b1fc9c8566f ;3053feuilles créées avant16:11 ont empreinte actuellec58333170ddb03460872122166b94b90. Cette sélection/empreinte ne reconstitue pas la capture de l'ancien rapport94e2f83a... : ne pas les présenter comme une comparaison identique. Aucun changement pédagogique exécuté ; empreinte globale réponses/notes non comparée pendant cette reprise.
- RLS toujours activée sur apprenants/session_apprenants/emargements_fc ;politiques feuille propriétaire user_id+auth_user_id et administration via has_role conservées. Aucun nouveau test PostgreSQL/Vitest : tests cités plus bas sont ceux de la préparation précédente.
- Déploiement inchangé :0235/0236 et mode silencieux déjà actifs avant reprise ;aucun site publié. Affichage/compteurs publiés et accès novembre de Bekkis restent non prouvés en connexion réelle. Ses dates janvier restent inchangées.

## État : partiel, pas prêt pour les28
-10 comptes préexistants vérifiés :compte auth existant, non banni, lien unique.18 comptes manquants non créés.
-La session administrateur disponible correspond au propriétaire mais porte seulement le rôle `user`. Appel protégé create-apprenant-account refusé403 « Réservé aux administrateurs » avant toute création. Aucun élargissement de rôle, aucune usurpation. Il faut une session administrateur reconnue pour terminer les18 créations.
-Mode silencieux ajouté au flux existant et déployé seul ; aucun site publié. Ce mode vérifie VTC/inscription des deux sessions/email exact, écrit seulement le rattachement conditionnel, confirme l’unicité et retourne avant toute date, lien recovery ou transport email.
-38 feuilles vides ajoutées :200 feuilles pour les10 comptes existants,20 chacun,0 image/absence,0 weekend. Rejeu identique0 insertion.360 feuilles restent non créées faute des18 comptes.
-SMAIL Sifeddine avait un marqueur en-ligne malgré inscription VTC réelle :exception limitée aux deux sessions, pas de changement de son champ ni des autres parcours.

## SQL et site
-Migration0236_vtc_november_enrollment_attendance appliquée à la base partagée :seule emargement_theorie_inscrite modifiée. La0235 était déjà active avant ce chantier :le diagnostic agenda/zéro annoncé n’est plus celui du serveur observé.
-02–06 et09–13/11 ;11nov inclus. Matin09–12/après-midi13–16, soir17–18:30/18:30–21, ouverture08:30/12:30/16:30/18:00. Dates personnalisées conservées. FC13–17 inchangée. Aucune pratique ajoutée.
-Le site publié utilise les fenêtres/contrôle serveur conservés :signabilité serveur corrigée sans publication du site ; affichage/compteurs locaux non publiés. Aucun test E2E authentifié élève exécuté :compatibilité d’affichage production non prouvée, ne pas déclarer les28 prêts.
-Bekkis conserve fenêtre12–25janvier2026 ; fonction d’accès existante reconnaît sa session02–13novembre et ses dates de formation sans réécriture. Test isolé PASS, connexion réelle non prouvée faute de compte.

## Preuves
-25/25 tests PostgreSQL isolé PASS sur0235+0236 ;181/181 tests Vitest PASS sur20 fichiers ;buildOK.
-Empreinte3053 feuilles préexistantes strictement conservée :94e2f83a9866307d229aa9afc9b9f903.
-Les empreintes globales réponses/quiz/progression ont évolué durant le contrôle (11330→11332 réponses,5605→5606 quiz ;élèves actifs). Aucune écriture pédagogique exécutée par ce chantier ; il n’est pas possible d’affirmer empreinte globale inchangée dans une base vivante sans capture transactionnelle. Aucun historique restauré ou modifié.
-RLS activée apprenants/session_apprenants/emargements_fc ;lecture/insert élève contrôlent user_id et propriétaire, garde horaires commune. Test SQL d’autre compte refusé. Aucun changement de politique/RLS/rôle.
-Aucun mail/SMS/IA envoyé par ce chantier ;aucun appel de masse auto-send-credentials. Liens personnels non générés :remise d’accès aux18 à préparer après création, envoi exige autorisation distincte.
-Les nouvelles feuilles vides héritent du signed_at NOT NULL existant ;absence d’image/présence signifie non signées, timestamp seul jamais preuve.

## Fichiers de ce chantier
-`supabase/functions/create-apprenant-account/index.ts` et nouveau `silentProvision.ts` ;fonction seule déployée.
-`drizzle/migrations/0236_vtc_november_enrollment_attendance.sql` ;types régénérés automatiquement.
-`src/lib/emargementSessionSlots.ts`, `src/test/emargement_fenetre_sql_contract.py`, nouveaux tests vtc-novembre-acces/silent-provision, AGENTS/roadmap.
-Aucun autre chantier repris.

## Audit nominatif28 dossiers
|ID apprenant|ID inscription|Nom|Prénom|Compte avant/après|Feuilles après|Accès à remettre|
|---|---|---|---|---|---|---|
|4d676c71-f298-44c4-b504-ad2f64334114|adb0b26b-831d-41ad-9662-b49f1047a6e5|ABDELHAK|MOHAMMED|existant / existant|20|non vérifié|
|18d7f8fb-613d-439b-a793-c56c56817818|fdc31684-1966-4744-a819-077d8fc41724|ADYAHYA|Kamal|absent / absent|0|création bloquée, puis remise à préparer|
|14f7a8be-587b-4277-bf1e-60062509ea29|3fde6609-cd86-4771-81ae-727f4543443d|AIT BALLAGH|SAMI|absent / absent|0|création bloquée, puis remise à préparer|
|f582fc9d-3003-4d8d-a619-d6373e70684c|53a9471b-5e19-4754-b1a8-64f830ffb1c3|Alpha|Barry|existant / existant|20|non vérifié|
|5bed600d-6dcb-4538-bb26-62e104b6f0ab|5a6479c7-c7f2-47f3-8fe7-a05c21b6539a|Bekkis|Abdessamad|absent / absent|0|création bloquée, puis remise à préparer|
|bba53239-a98d-4de6-b64c-d4e8aee74b7f|80441734-133a-4f80-8ca8-e326eaafc23a|BENAKKI|Ayoub|absent / absent|0|création bloquée, puis remise à préparer|
|7b8498de-0102-47c2-a90d-d22344c5af1f|38a53e93-cafa-4bbb-a565-f12c1115b8ee|BENCHAKR|ANISS|absent / absent|0|création bloquée, puis remise à préparer|
|63940579-542d-48f7-ab1e-fd0ee8101a6b|14e057fd-2e55-421a-bcfc-8ff7ffbaaebd|BENNANI|Meriem|absent / absent|0|création bloquée, puis remise à préparer|
|e117ed6e-db12-4de2-b9e0-5858e41a8c50|3b6c25b8-e393-4c20-af62-2555839bfc30|Berhane Gebremedhin|Samson|existant / existant|20|non vérifié|
|a12b358b-d833-4022-a956-5e3d7d0d5200|db191451-608a-4cf8-afc0-d68b4de46d2f|CABRAL DE SOUSA FURTADO|José|existant / existant|20|non vérifié|
|8441a1b2-f20f-496e-b2c9-b2a914d9c8e3|e5a09d1b-a8e8-4568-9376-52902b5e125e|DAKHLI|Zine|absent / absent|0|création bloquée, puis remise à préparer|
|a0df3f1e-d538-4955-9529-d950b5816634|e20c9824-b4e9-4bc6-90ec-f344f8db3a1a|DIABY|Mohamed|existant / existant|20|non vérifié|
|317750c9-5976-4fde-ad37-0de4a57d2ccb|70e60626-86da-4e1d-b0a2-7d17b7dafaf2|DIALLO|Kama|absent / absent|0|création bloquée, puis remise à préparer|
|1a143496-f384-4143-acb9-9f81d4f1e942|8a5439b8-cd58-431a-a0d0-541736919626|DIANE|Mohamed|absent / absent|0|création bloquée, puis remise à préparer|
|ac865e87-2a5c-4209-9486-215a1f3627df|3df7480c-7988-4d0c-9fe3-e8d1f8b5aaf1|HABLANIS|Anis|absent / absent|0|création bloquée, puis remise à préparer|
|9734d067-a16f-4c57-82c1-c57a0ce097cf|8434365e-8f48-4d5b-9b8c-20c9a1de2e92|Haddouche|Djamel|absent / absent|0|création bloquée, puis remise à préparer|
|b78b5391-9f8f-4f11-9add-2e86078363e1|6d8bfda4-7372-4d47-a628-0db7653222f5|HADJ ALI|Arezki|absent / absent|0|création bloquée, puis remise à préparer|
|86eebfff-3714-4acb-bb9f-e808f516fbbe|37056671-26a1-4295-a2f8-d2784be2a8f3|HASNAT|MEHDI|absent / absent|0|création bloquée, puis remise à préparer|
|c097d086-8a76-4ec2-8bfe-75c7ae112d11|5d79239d-1410-4b0f-9706-bebd17a93089|KOUGBE TE BIBANGA|Vianney|absent / absent|0|création bloquée, puis remise à préparer|
|e048502c-eeaa-48e3-aeb9-2b9dce4cf2f2|84a30945-d6c5-4053-9451-ac59fdf9ac5a|MAHROUG|Mohamed Amin|existant / existant|20|non vérifié|
|10c15d2c-221f-428d-8076-fe9b1f43f7ab|0702c14e-0fe6-4bd2-b8d6-75597a8d6fec|MALKI|Ahmed|absent / absent|0|création bloquée, puis remise à préparer|
|c3b3b7c0-0a45-4ba0-81c6-2d05e051711b|225caef6-278e-4410-b69a-fb8bfc397a4d|Mfouemo|Rodrigue Rodrigue Etienne|existant / existant|20|non vérifié|
|4354a667-522a-4461-9ecc-1100a06ebf22|04d9370d-ccbd-4d04-a28b-aeee92311ada|MLIKI|Mohamed|absent / absent|0|création bloquée, puis remise à préparer|
|b233f0db-9e28-47c4-8721-80d591b2287c|2ff51fcf-ac11-4198-89ee-46d3af637af7|NAZARYAN|KAREN|existant / existant|20|non vérifié|
|22dd8bcf-1b79-4968-b408-2deea64524b9|9d9d2c96-a666-4e76-9f71-2b135d083319|SAIDI|Aymen|absent / absent|0|création bloquée, puis remise à préparer|
|e912ca30-7d7f-4fa9-87ba-e4755fcad023|ee63d884-d8ee-4546-8a65-c2cecefc8f48|SELMI|KAIS|absent / absent|0|création bloquée, puis remise à préparer|
|bcb6b59b-098f-449e-aa4c-23940c528c16|dc0b55c2-2b5d-44b6-8074-8c6e8c98cc9d|SENE|Mamadou|existant / existant|20|non vérifié|
|d04a9639-a7a6-47b0-a1c4-6d7871521f79|5dfb3a33-3c2a-4408-b6e6-7960edee1988|SMAIL|Sifeddine|existant / existant|20|non vérifié|
