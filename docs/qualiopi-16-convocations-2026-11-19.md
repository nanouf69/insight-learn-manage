# Indicateur 16 — audit des convocations du 19 novembre 2026

## Exigence officielle relue

Décret 2026-728 applicable au 01/11/2026, pages 6–7 : « Lorsque le prestataire met en œuvre des formations conduisant à une certification professionnelle, il s'assure que les conditions de présentation des bénéficiaires à la certification respectent les exigences formelles de l'autorité de certification. »

Source : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054608509 ; copie téléchargée et texte relu depuis https://www.psppaca.fr/IMG/pdf/decret_no_2026-728_du_1er_aout_2026_relatif_au_referentiel_national_sur_la_qualite_des_actions_concourant_au_developpement_des_competences_-_legifrance.pdf ; SHA-256 `f417b50db115262e371839f7c8b5947077a19c2ae6f7bf0b566a1b6dddb2a783`.

L’information envoyée est une preuve partielle pertinente, pas la preuve de toutes les conditions de présentation. Aucune conformité déclarée.

## Contenu effectivement contrôlé

- Modèles stockés : `convocation-vtc`, `convocation-vtc-soir`, `convocation-taxi`, `convocation-ta`, `convocation-examen`, `urgent_inscription_exament3p`, `repassage-examen`, `rappel-documents`, `relance-photo-identite`, `relance-permis-conduire`, `relance-piece-identite`.
- VTC/TAXI/TA : CMA organisatrice, date/lieu théorique, réussite théorique avant pratique, période entraînement et examen pratique, possibilité de changement par CMA.
- Modèle examen : pièce d’identité valide et convocation à apporter ; date, lieu, heure encore « À compléter ». Pas assimilé à un envoi complet.
- Inscription T3P : portail, inscription obligatoire, documents déposés et contact centre. Réinscriptions : étapes portail, département 69, paiement/contact. Modèles de pièces : permis recto-verso valide, photo fond blanc, identité valide recto-verso.
- Corps historiques effectivement envoyés inspectés, distincts du modèle actuel : mars à Clermont-Ferrand, mai/juillet à Villeurbanne, septembre/novembre au Double Mixte avec adresse et « après-midi », janvier 2027 ParcExpo. Les écarts de ville/lieu ne sont pas corrigés ni validés sans convocation CMA.
- Les déclarations sur CPF, frais, département et entraînement obligatoire sont du contenu réel, pas des règles juridiquement approuvées par cet audit.

## Résultats

| Contrôle | Nombre |
|---|---:|
| Envois qualifiés au filtre de contenu | 537 |
| Envois retenus, corps/destinataire/date contrôlés | 492 |
| Dossiers distincts | 224 |
| Convocations | 223 |
| Informations inscription | 72 |
| Réinscriptions | 197 |
| Envois avec CMA mentionnée | 223 |
| Envois avec portail Examen T3P | 269 |
| Envois avec mention de documents | 82 |
| Inscription/session unique prouvée | 101 |
| Plusieurs inscriptions compatibles, aucune choisie | 104 |
| Sans session prouvée | 287 |
| Archives Outlook identifiées | 79 |
| Pièces jointes signalées dans le lot | 0 |
| Remises provider / réceptions confirmées | 0 / 0 |

Exceptions : 7 messages à valeurs non résolues, 35 destinataires non vérifiés, 4 dossiers actifs non retrouvés ; catégories non additives. Exclusion des comptes techniques et noms de test. Une absence de session ne prouve pas une absence de formation : e-learning ou ancien dossier possible, sans inventer de session.

## Enregistrements

288 nouvelles fiches email ; 204 références antérieures réutilisées ; 492 nouveaux liens indicateur 16. Les justifications des liens contiennent les identifiants email/apprenant, date d’envoi, empreinte du corps, inscription/session unique ou candidats ambigus. Aucun texte personnel, jeton ni identifiant de connexion copié.

Une synthèse complémentaire expose les lacunes et le texte officiel dans la fiche 16. Compteur final attendu puis relu : **1 → 494**, dont 492 références email et deux références d’audit. Aucun original ni pièce jointe inventé.

## Lacunes réelles

1. Les mails ne prouvent ni la validation effective de l’inscription CMA, ni la vérification individuelle de toutes les conditions et pièces.
2. Convocations officielles CMA et confirmation date/heure définitives non jointes dans le lot. Certaines annonces indiquent seulement une ville ou l’après-midi.
3. Rapprochements exacts restant à documenter : 104 cas ambigus, 287 sans session. Aucun choix arbitraire.
4. Modèles actuels sans version historique attribuable à chaque envoi : aucune attribution silencieuse. Sept valeurs non résolues nécessitent une vérification, sans renvoi automatique.
5. Recevabilité et liste exhaustive des pièces doivent être confrontées aux exigences actuelles de l’autorité ; les mails seuls ne permettent pas de déclarer cette concordance.

## Contrôles d’intégrité

Empreintes intégrales avant/après identiques : emails `940c1b6c486a8ff1c5fe6151aa593e7a` (15970), modèles `ecbdb62dab8a741a0db6573aca7a1cae` (39), inscriptions `6cca73d7e1a3a7624624344662db26e0` (804), notes `64103ebd818925cadb97095e63339175` (7740), états Qualiopi `cd3a38e178287e0d849728cd6d31f5ad` (11).

Relecture SQL : zéro doublon source, zéro doublon lien, zéro référence orpheline, zéro empreinte de corps modifiée. Interface connectée : onglet Nos preuves ouvert et compteur vérifié ; état manuel Sans preuve / Jamais vérifié conservé, pas de conformité automatique. Aucune modification du code de l’application, aucun test métier artificiel. Journal de compilation OK.

Premier rapprochement monolithique trop lent : délai dépassé, relecture activité puis fin de requête vérifiée sans écriture ; traitement documentaire matérialisé exécuté ensuite, puis contexte session ajouté uniquement aux nouveaux liens. Ne pas rejouer l’ancien rapprochement lent.

Aucun email/dossier/inscription/note/résultat modifié, aucun envoi ni publication.