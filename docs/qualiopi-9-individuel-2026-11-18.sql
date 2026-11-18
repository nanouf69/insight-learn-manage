-- Références documentaires seulement. Sources intactes, aucun statut de conformité.
WITH actifs AS (
 SELECT a.* FROM public.apprenants a WHERE a.deleted_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.id)
 AND (coalesce(a.nom,'')||' '||coalesce(a.prenom,'')) !~* '\m(test|demo|debug)\M'
), ins AS (
 SELECT sa.id,sa.apprenant_id,sa.session_id,coalesce(sa.date_debut,s.date_debut) debut,
 coalesce(sa.date_fin_personnalisee,sa.date_fin,s.date_fin) fin,s.date_debut session_debut,s.heure_debut
 FROM public.session_apprenants sa JOIN public.sessions s ON s.id=sa.session_id JOIN actifs a ON a.id=sa.apprenant_id
 WHERE NOT coalesce(sa.liste_attente,false) AND s.type_session IS DISTINCT FROM 'examen'
), mails AS (
 SELECT e.*,coalesce(e.apprenant_id,(SELECT min(a.id::text)::uuid FROM actifs a
 WHERE lower(trim(a.email))=ANY(SELECT lower(trim(r)) FROM unnest(e.recipients)r) HAVING count(*)=1)) aid,
 lower(translate(regexp_replace(coalesce(e.body_html,e.body_preview,''),'<[^>]*>',' ','g'),'éèêëàâäôöûüùîïç','eeeeaaaoouuuiic')) texte
 FROM public.emails e WHERE e.type='sent' AND e.sent_at<=now()
 AND NOT EXISTS(SELECT 1 FROM public.email_accuses ac WHERE ac.id=e.email_accuse_id AND ac.failed_at IS NOT NULL)
), org AS (
 SELECT *,split_part(split_part(split_part(coalesce(substring(texte FROM '(?:deroulera|recapitulatif de votre formation|dates\s+du)(.*)'),''),'vous passerez',1),'examen theorique',1),'examen pratique',1) organisation
 FROM mails WHERE subject ~* 'convocation' AND subject ~* 'formation' AND subject !~* 'examen'
), matches AS (
 SELECT i.*,m.id email_id,m.sent_at FROM ins i JOIN org m ON m.aid=i.apprenant_id
 WHERE EXISTS(SELECT 1 FROM (VALUES(i.debut),(i.session_debut))v(d) WHERE
 m.organisation LIKE '%'||v.d::text||'%'
 OR m.organisation LIKE '%'||to_char(v.d,'DD/MM/YYYY')||'%'
 OR m.organisation LIKE '%'||extract(day FROM v.d)::int||' '||(ARRAY['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'])[extract(month FROM v.d)::int]||' '||extract(year FROM v.d)::int||'%'
 OR (i.fin IS NOT NULL AND date_trunc('month',i.fin)=date_trunc('month',v.d) AND m.organisation LIKE '%'||extract(day FROM v.d)::int||' et '||extract(day FROM i.fin)::int||' '||(ARRAY['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'])[extract(month FROM v.d)::int]||' '||extract(year FROM v.d)::int||'%'))
), conv AS (
 SELECT email_id,min(sent_at) date_evt,count(*) nb_ins,
 jsonb_agg(jsonb_build_object('inscription_id',id,'apprenant_id',apprenant_id,'session_id',session_id,'debut',debut,'fin',fin,'heure_debut',heure_debut,
 'chronologie_jour_Paris',CASE WHEN (sent_at AT TIME ZONE 'Europe/Paris')::date<debut THEN 'avant' WHEN (sent_at AT TIME ZONE 'Europe/Paris')::date>debut THEN 'après' ELSE 'jour du début : horaire exact à vérifier' END) ORDER BY id) inscriptions
 FROM matches GROUP BY email_id
), accueil AS (
 SELECT DISTINCT ON(aid) mails.id,aid,sent_at FROM mails JOIN actifs a ON a.id=mails.aid
 WHERE subject ~* '(bienvenue|information)' AND texte LIKE '%formation%' AND (texte LIKE '%contact%' OR texte LIKE '%04%')
 ORDER BY aid,sent_at DESC,mails.id
), suivi AS (
 SELECT DISTINCT ON(aid) mails.id,aid,sent_at FROM mails JOIN actifs a ON a.id=mails.aid
 WHERE subject ~* '(module.*termin|suivi|accompagnement|révision|revision)' AND texte LIKE '%module%' AND texte ~ '(termin|difficulte|aide)'
 ORDER BY aid,sent_at DESC,mails.id
), formes AS (
 SELECT d.*,CASE WHEN d.type_document='cgv-ri-acceptation' THEN d.donnees->>'signed_at' ELSE d.donnees->>'date_completion' END evenement
 FROM public.apprenant_documents_completes d JOIN actifs a ON a.id=d.apprenant_id
 WHERE (d.type_document='cgv-ri-acceptation' AND d.donnees->>'cgv_accepted'='true' AND d.donnees->>'ri_accepted'='true')
 OR (d.type_document='dossier-bienvenue' AND coalesce(d.donnees->>'signature',d.donnees->>'signature_stagiaire',d.donnees->>'_signature_image','') LIKE 'data:image%')
), evaluations AS (
 SELECT d.id,d.apprenant_id,jsonb_array_length(d.donnees->'parties') nb_matieres,
 (SELECT count(*) FROM jsonb_array_elements(d.donnees->'parties')p CROSS JOIN LATERAL jsonb_array_elements(p->'competences')c) criteres
 FROM public.apprenant_documents_completes d JOIN actifs a ON a.id=d.apprenant_id
 WHERE d.type_document='evaluation-acquis' AND d.donnees->>'_status'='completed'
 AND jsonb_typeof(d.donnees->'parties')='array'
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(d.donnees->'parties')p CROSS JOIN LATERAL jsonb_array_elements(p->'competences')c)
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d.donnees->'parties')p CROSS JOIN LATERAL jsonb_array_elements(p->'competences')c WHERE c->'value' IS NULL OR c->'value'='null'::jsonb)
), candidats(ref_key,titre,source_table,source_id,date_evt,metadata,indicateur,limite) AS (
 SELECT 'q9i-20261118-email-'||email_id,'Convocation formation — envoi daté vérifié','emails',email_id::text,date_evt,
 jsonb_build_object('inscriptions_candidates',inscriptions,'liaison',CASE WHEN nb_ins=1 THEN 'identité et date de formation rapprochées' ELSE 'plusieurs inscriptions compatibles : aucune session principale attribuée' END),9,
 'Envoi et contenu enregistrés, pas réception. Date de formation retrouvée dans le contenu, pas dans la seule date d’émission. Plusieurs inscriptions compatibles restent candidates. Version des pièces remises et réception non prouvées.' FROM conv
 UNION ALL
 SELECT 'q9i-20261118-email-'||id,'Information accueil — envoi au dossier','emails',id::text,sent_at,
 jsonb_build_object('apprenant_id',aid),9,'Formation et informations de contact présentes. Portée dossier uniquement : session et antériorité non prouvées, ne vaut pas convocation complète ni réception.' FROM accueil WHERE NOT EXISTS(SELECT 1 FROM conv WHERE email_id=accueil.id)
 UNION ALL
 SELECT 'q9i-20261118-form-'||id,CASE WHEN type_document='cgv-ri-acceptation' THEN 'Acceptation CGV et règlement intérieur enregistrée' ELSE 'Dossier de bienvenue finalisé signé' END,
 'apprenant_documents_completes',id::text,evenement::timestamptz,
 jsonb_build_object('apprenant_id',apprenant_id,'type_document',type_document,'champ_evenement',CASE WHEN type_document='cgv-ri-acceptation' THEN 'donnees.signed_at' ELSE 'donnees.date_completion' END),9,
 CASE WHEN type_document='cgv-ri-acceptation' THEN 'Deux acceptations et date de l’action enregistrées ; aucune signature manuscrite ni version remise présumées.' ELSE 'Image de signature et date de finalisation du dossier présentes ; aucune date de création technique utilisée, aucune admission ou réussite déduite.' END||' Preuve au dossier : lien de cette action à une session précise non documenté.'
 FROM formes WHERE evenement ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T' AND evenement::timestamptz<=now()
 UNION ALL
 SELECT 'q9i-20261118-email-'||id,'Suivi pédagogique — rappel individuel envoyé','emails',id::text,sent_at,jsonb_build_object('apprenant_id',aid),10,
 'Contenu pédagogique effectivement enregistré : modules à terminer et aide proposée. Envoi seulement, session non prouvée, ni réception ni efficacité ni adaptation formalisée. Les mentions juridiques du mail ne sont pas validées par cet audit.' FROM suivi
 UNION ALL
 SELECT 'q9i-20261118-question-'||q.id,'Accompagnement — question et réponse du centre','apprenant_questions',q.id::text,q.answered_at,
 jsonb_build_object('apprenant_id',q.apprenant_id,'lecture_enregistree',q.read_by_apprenant),10,
 'Question pédagogique et réponse du centre réellement présentes. Aucun texte personnel copié. Session et efficacité non documentées, aucune adaptation formalisée déduite.'
 FROM public.apprenant_questions q JOIN actifs a ON a.id=q.apprenant_id WHERE coalesce(q.reponse,'')<>'' AND q.answered_at<=now() AND q.question NOT LIKE '[examen-corrige:%'
 UNION ALL
 SELECT 'q9i-20261118-evaluation-'||id,'Évaluation des acquis — formulaire complété','apprenant_documents_completes',id::text,NULL::timestamptz,
 jsonb_build_object('apprenant_id',apprenant_id,'criteres_renseignes',criteres,'matieres',nb_matieres),11,
 'Toutes les compétences du formulaire sont renseignées et statut completed enregistré. Date pédagogique, session et évaluateur non documentés : date_preuve reste vide. Aucun niveau individuel, note ou verdict copié ou modifié.' FROM evaluations
), nouvelles AS (
 INSERT INTO public.qualiopi_preuves(ref_key,titre,source_type,source_table,source_id,date_preuve,description,ce_que_demontre,emplacement,source_libelle,remarque_interne,fichiers)
 SELECT ref_key,titre,'reference',source_table,source_id,(date_evt AT TIME ZONE 'Europe/Paris')::date,limite,limite,
 'CRM / source '||source_table||' / identifiant '||source_id,'Audit individuel lecture des sources — 18/11/2026',
 (metadata||jsonb_build_object('controle_le','2026-11-18','evenement_le',date_evt,'statut_audit','preuve vérifiée avec limites, pas conformité','piece_jointe',false))::text,'[]'::jsonb
 FROM candidats c WHERE NOT EXISTS(SELECT 1 FROM public.qualiopi_preuves p WHERE p.ref_key=c.ref_key OR (p.source_table=c.source_table AND p.source_id=c.source_id)) RETURNING id,ref_key
), liens AS (
 INSERT INTO public.qualiopi_preuve_liens(preuve_id,indicateur,justification)
 SELECT n.id,c.indicateur,c.limite FROM nouvelles n JOIN candidats c USING(ref_key)
 WHERE NOT EXISTS(SELECT 1 FROM public.qualiopi_preuve_liens l WHERE l.preuve_id=n.id AND l.indicateur=c.indicateur)
 RETURNING indicateur
)
SELECT (SELECT count(*) FROM nouvelles) preuves_ajoutees,(SELECT count(*) FROM liens WHERE indicateur=9) liens_9,(SELECT count(*) FROM liens WHERE indicateur=10) liens_10,(SELECT count(*) FROM liens WHERE indicateur=11) liens_11;
