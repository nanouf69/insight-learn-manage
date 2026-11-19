-- Déclaration explicite du dirigeant, reçue le 19/11/2026 à 12:04 UTC.
-- Écritures exclusivement documentaires Qualiopi. Aucun appel de fonction d'envoi.
WITH declaration AS (
 INSERT INTO public.qualiopi_preuves
 (ref_key,titre,description,ce_que_demontre,emplacement,source_type,source_libelle,date_preuve,remarque_interne)
 VALUES ('qualiopi-perimetre-dirigeant-20261119',
 'Déclaration du dirigeant — aucune alternance ni apprentissage — 19/11/2026',
 'Confirmation explicite du dirigeant le 19/11/2026 : « Notre organisme ne dispense AUCUNE formation en alternance et AUCUNE formation en apprentissage. »',
 'Périmètre déclaré par le dirigeant, non preuve de conformité. RNQ : décret n° 2026-728 du 1er août 2026, article 1, critère 3, page 6, applicable au 01/11/2026. Indicateur 13 : formations en alternance ; indicateurs 14 et 15 : seule colonne L. 6313-1, 4° (apprentissage) cochée. Non-applicabilité des seuls 13, 14, 15 dans le périmètre confirmé. Les obligations générales 9, 10, 11, 12 et les conditions de certification 16 ne sont pas écartées.',
 'Qualiopi — déclaration de périmètre du dirigeant', 'reference',
 'Message explicite du dirigeant du 19/11/2026 à 12:04 UTC', DATE '2026-11-19',
 'Déclaration transcrite du message ; aucun PDF signé ni pièce jointe inventé. Source RNQ : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054608509 ; copie relue : https://www.psppaca.fr/IMG/pdf/decret_no_2026-728_du_1er_aout_2026_relatif_au_referentiel_national_sur_la_qualite_des_actions_concourant_au_developpement_des_competences_-_legifrance.pdf ; SHA-256 f417b50db115262e371839f7c8b5947077a19c2ae6f7bf0b566a1b6dddb2a783. Réexaminer si le périmètre évolue. Intitulés actuels 13–15 de la plateforme inexacts, non modifiés : décision fondée sur le numéro et le texte RNQ, pas sur ces intitulés.')
 ON CONFLICT (ref_key) WHERE ref_key IS NOT NULL DO NOTHING
 RETURNING id
), preuve AS (
 SELECT id FROM declaration UNION ALL
 SELECT id FROM public.qualiopi_preuves WHERE ref_key='qualiopi-perimetre-dirigeant-20261119'
)
INSERT INTO public.qualiopi_preuve_liens (preuve_id,indicateur,justification)
SELECT p.id,n,'Déclaration explicite de périmètre du 19/11/2026 ; justification de non-applicabilité selon le RNQ vérifié, aucune conformité présumée.'
FROM preuve p CROSS JOIN generate_series(13,15) n
ON CONFLICT (preuve_id,indicateur) DO NOTHING;

INSERT INTO public.qualiopi_indicateurs_etat
 (indicateur,statut,applicable,date_verification,remarques)
SELECT n,'non_applicable',false,DATE '2026-11-19',
 'Confirmation explicite du dirigeant — 19/11/2026 : « Notre organisme ne dispense AUCUNE formation en alternance et AUCUNE formation en apprentissage. »' || E'\n' ||
 CASE n
 WHEN 13 THEN 'Indicateur 13 RNQ : « Pour les formations en alternance, le prestataire, en lien avec l’entreprise, anticipe avec l’apprenant les missions confiées, à court, moyen et long terme, et assure la coordination et la progressivité des apprentissages réalisés en centre de formation et en entreprise. » Non applicable : aucune formation en alternance dispensée, y compris hors apprentissage.'
 WHEN 14 THEN 'Indicateur 14 RNQ : accompagnement socio-professionnel, éducatif et citoyenneté, procédure de traitement sans délai des ruptures liées aux difficultés, violences ou discriminations. Le tableau réglementaire ne coche que L. 6313-1, 4° (apprentissage), pas les actions de formation du 1°. Non applicable : aucune formation en apprentissage dispensée. L’accompagnement général et la prévention/traitement des violences restent à examiner sous 10 et 12.'
 WHEN 15 THEN 'Indicateur 15 RNQ : information des apprentis sur droits/devoirs, santé/sécurité, prévention/signalement, médiateur de l’apprentissage et inspection du travail. Seule colonne L. 6313-1, 4° (apprentissage) cochée. Non applicable : aucun apprentissage dispensé. Les obligations générales de santé/sécurité et d’information des stagiaires ne sont pas supprimées.'
 END || E'\n' ||
 'Source vérifiée : décret n° 2026-728 du 1er août 2026, article 1, critère 3, page 6, entrée en vigueur 01/11/2026 ; https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054608509. Décision limitée au périmètre confirmé ; réexaminer en cas d’évolution. Aucun statut Conforme attribué. Attention : intitulés actuels 13–15 de la plateforme inexacts ; texte officiel et numéro prévalent, intitulés non modifiés dans cette demande.'
FROM generate_series(13,15) n
ON CONFLICT (indicateur) DO NOTHING;