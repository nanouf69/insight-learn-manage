# QRC bloquées — corrections sur références vérifiées (16/10/2026, ~15 h 20 Paris)

Autorisation : « Corrige les pb » + références vérifiées par l'utilisateur. Aucun appel IA. Marqueur `admin:references_verifiees_utilisateur_16_10_2026`, rattrapage `qrc_references_verifiees_16_10_2026`.

- Appliqué (anciennes corrections archivées dans `correctionsIA_historique`, journal dans `rattrapageIA_journal`, écriture refusée si la copie avait changé depuis la lecture) :
  - CATANIA EB4 T3P Q3 (d75a208c) 0 → 2/2 ; copie 13 → 15/20. Corrigé figé « LA ma » conservé, complément « La maraude ».
  - CATANIA EB5 français Q4 (ee1dd8a4) 2 → 1,5/2 (3 caractéristiques distinctes du texte support figé, git 1b7b8a84c) ; copie 10,5 → 10/20.
  - VALENTIN EB5-TAXI TAXI 2 Q1 = 4/4, Q2 = 3/4 sur les passages dd3c1d94 (copie acb75cf1) et 32fffff3 (copie 5c055e6d) : 18 → 17/20, nouveau moteur définitif 17.
  - VALENTIN EB6-TAXI TAXI 2 Q2 = 4/4 (88e4fab5 / ef72f5a0) ; Q1 reste en attente.
- Nouveau moteur : 5 QRC passées par `core_correct_qrc_publish` (identifiants d'opération déterministes). Exclusion G(T) globale inchangée.
- Restent en attente : VALENTIN EB6 Q1 (tarif de 2022 : un arrêté Rhône de revalorisation infra-annuelle en 2022 n'est pas exclu, et la répartition des bagages n'est pas connue) ; VTC2 Q1 Thierno t1/t2 et CATANIA EB4 (question abîmée dans toutes les versions archivées, y compris la sauvegarde du 21/09 : énoncé d'origine introuvable).
- Empreintes identiques avant/après : 5 231 autres résultats, 4 213 autres QRC v2, 1 760 passages/snapshots, réponses/snapshots des copies ciblées, 14 lignes d'Ismail Amar.

## Suite — VALENTIN EB6-TAXI TAXI 2 Q1 (16/10/2026, 15 h 30 Paris)

- Références : arrêté 69-2022-04-22-00004 (RAA 69-2022-062 du 26/04/2022, art. 1-2 : prise en charge 2,50 €) ; art. 6 de l'arrêté RAA 69-2022-014 non modifié (2,50 € par passager à partir du 5e ; bagages seulement dans des conditions précises).
- Raisonnement : prise en charge attendue 5 € (2,50 + 2,50 du 5e passager) ; aucun supplément bagage exigé (répartition des 15 bagages inconnue) ; frais km hors prise en charge. Réponse « 2,50 € + frais km » : base correcte, supplément omis → 2/4.
- Écriture unique gardée (copie ef72f5a0 / instance aac84649, passage 88e4fab5) : ancienne correction automatique 2/4 archivée, correction validée 2/4, journal complété, drapeau d'attente de cette copie levé. Copie 16/20 inchangée (16 → 16), réussie ; nouveau moteur 14 provisoire → 16 définitif, 0 QRC restante.
- Empreintes identiques : 5 235 autres résultats, 4 217 autres QRC v2, 1 723 autres résultats du nouveau moteur, 1 760 passages, 14 lignes d'Ismail Amar, réponses/questions de la copie.
- Restent en attente : VTC2 Q1 EB4 (Thierno t1/t2, CATANIA), énoncé corrompu, non neutralisées.
