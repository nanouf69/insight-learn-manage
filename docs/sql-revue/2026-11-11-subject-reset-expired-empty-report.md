# Déblocage ciblé d’une copie V2 expirée et vide — 11/11/2026

## Verdict

**Installé et vérifié.** La migration `0270_subject_reset_expired_empty_v2` est appliquée. Le bouton admin existant est compatible ; aucun frontend n’a été modifié ou publié.

Aucune remise à zéro réelle n’a été exécutée. En particulier, aucune confirmation, autorisation, neutralisation, nouvelle tentative, note, réponse ou clôture n’a été créée pour Arezki HADJ ALI ou un autre apprenant réel.

## Règle serveur

Une copie V2 `en_cours` devient éligible uniquement si toutes les preuves suivantes sont réunies :

- son instantané immuable contient exactement la matière demandée et une durée strictement positive ;
- l’échéance calculée depuis `started_at` et cette durée est dépassée ;
- aucune `answer_state`, aucun `answer_events`, aucun résultat V2 et aucune neutralisation préexistante ;
- aucune réponse ni aucun résultat historique correspondant à la même identité de passage.

Une copie active, répondue, ayant reçu un événement, déjà terminée ou dont la correspondance ancien/V2 est ambiguë reste verrouillée.

Lors d’une confirmation admin ultérieure, la ligne de tentative est verrouillée dans la même transaction que les écritures de réponse. Toutes les preuves sont revérifiées avant :

1. une neutralisation append-only rattachée à l’opération admin ;
2. le passage technique de la copie vide à `abandonnee`, sans note ;
3. une autorisation ciblée.

L’ancienne copie reste consultable. La nouvelle tentative et son chronomètre ne sont créés que lorsque l’élève démarre lui-même la matière. Le démarrage exige la neutralisation exacte de cette opération et refuse toute ancienne copie contenant une preuve de réponse.

## Tests réellement exécutés

- `python3 src/test/admin_subject_reset_sql_contract.py` : **9/9 PASS**.
- `python3 src/test/admin_subject_reset_live_contract.py` : **14/14 PASS**.
- Base PostgreSQL jetable avec le catalogue et les déclencheurs réels des tables touchées.
- Cas couverts : expiration vide, copie active vide, réponse présente, événement seul reçu, résultat présent, provenance ambiguë, rejeu, double exécution, concurrence réponse/admin, ancien et V2 importé, droits et identité.
- Scénario complet fictif : admin autorise et neutralise ; envoi tardif et finalisation de l’ancienne copie refusés ; reprise sans nouvelle écriture ; élève ouvre une nouvelle tentative, répond et soumet ; le résultat appartient à la nouvelle tentative et l’ancienne copie n’a ni réponse ni note.
- Un défaut du harnais initial omettait les déclencheurs du catalogue de base. Il a été corrigé ; avec le verrou réel `core_enforce_answer_context`, l’envoi tardif est refusé et le scénario passe.

## Vérifications réelles sans mutation

Catalogue relu après migration :

- `exam_subject_reset_expired_empty(uuid,text)` : présente, SECURITY DEFINER, non exécutable par `anon` ni `authenticated` ;
- `exam_subject_reset_context(uuid,text,text)` : présente, exécutable par `authenticated`, pas par `anon` ;
- `admin_authorize_exam_subject_reset(...)` : présente, exécutable par `authenticated`, pas par `anon` ;
- `start_exam_subject_retake(...)` : présente, exécutable par `authenticated`, pas par `anon`.

Aperçu Chromium admin, route CRM d’Arezki, EB3 VTC, matière A–T3P :

- bouton « Réinitialiser la matière » ouvert ;
- identité affichée : Arezki HADJ ALI / Examen Blanc 3 — VTC / A–T3P ;
- bouton « Confirmer cette matière » actif ;
- dialogue annulé ; tout appel de confirmation ou de démarrage était bloqué par le harnais navigateur.

Empreintes avant/après strictement identiques pour Arezki :

- tentatives V2 : `5d81b68825f630b0fcd8cd4091c96307` ;
- réponses V2 : `b312311d9f5511d1e073242356d4303c` ;
- résultats V2 : `bc5fbc15909a9b375cd6831261396e4c` ;
- résultats historiques : `92f3e6e1f840d60f112e2aa4c1b97f9e` ;
- autorisations ciblées : 0 ; reçus de nouvelle matière : 0 ; neutralisations : 0.

Le bouton global n’a pas été appelé. Aucun email, appel IA, recalcul de note, changement de questions ou autre chantier n’a été déclenché.

## Build et sécurité

- Dernier journal de build observé : **build OK**.
- Scan de sécurité exécuté : aucun finding sur les fonctions installées. Huit avertissements/informations préexistants concernent d’autres tables et règles de stockage ; ils n’ont pas été modifiés dans ce chantier ciblé.

## État pour Arezki

Sa copie initiale reste intacte, sans réponse et sans note. Désormais, un admin peut confirmer explicitement la seule matière A–T3P : cette action neutralisera la copie expirée vide, puis Arezki devra lui-même démarrer la nouvelle tentative. Cette action n’a volontairement pas été faite pendant la vérification.
