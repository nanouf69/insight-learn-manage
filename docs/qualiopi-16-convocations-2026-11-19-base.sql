-- Lecture uniquement : périmètre explicite, contrôle du corps, identité destinataire et absence d'échec connu.
WITH actifs AS (
 SELECT a.* FROM public.apprenants a WHERE a.deleted_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.id)
 AND (coalesce(a.nom,'')||' '||coalesce(a.prenom,'')) !~* '\m(test|demo|debug)\M'
), corps AS (
 SELECT e.*,lower(translate(regexp_replace(coalesce(nullif(e.body_html,''),e.body_preview,''),'<[^>]*>',' ','g'),'éèêëàâäôöûüùîïç','eeeeaaaoouuuiic')) texte,
 coalesce(e.apprenant_id,(SELECT min(a.id::text)::uuid FROM actifs a
 WHERE lower(trim(a.email))=ANY(SELECT lower(trim(r)) FROM unnest(e.recipients)r) HAVING count(*)=1)) aid
 FROM public.emails e WHERE e.type='sent' AND e.sent_at<=TIMESTAMPTZ '2026-11-19 12:18:00+00'
 AND (e.subject ~* 'convocation' OR e.subject ~* '(inscription obligatoire.*examen|réinscription.*T3P|reinscription.*T3P|photo.*manquante.*examen)')
), qualifies AS (
 SELECT c.*,a.formation_choisie,a.type_apprenant,a.date_examen_theorique,a.date_examen_pratique,
 a.date_debut_cours_en_ligne,a.date_fin_cours_en_ligne,
 CASE WHEN subject ~* 'convocation' THEN 'convocation' WHEN subject ~* 'photo' THEN 'pièce demandée'
 WHEN subject ~* '(réinscription|reinscription)' THEN 'réinscription examen' ELSE 'inscription examen' END famille,
 texte ~ '(chambre des metiers|\mcma\M)' mention_cma,
 texte ~ 'exament3p' portail_inscription,
 texte ~ '(piece d.identite|photo d.identite|permis de conduire|documents.*(depos|apport|transm))' pieces,
 texte ~ '(reussite.*examen theorique|inscription.*valid|non.presentation)' conditions,
 texte ~ '(\{\{|a completer|date a definir)' valeurs_non_resolues,
 EXISTS(SELECT 1 FROM email_accuses ac WHERE ac.id=c.email_accuse_id AND ac.failed_at IS NOT NULL) echec,
 EXISTS(SELECT 1 FROM email_accuses ac WHERE ac.id=c.email_accuse_id AND ac.delivered_at IS NOT NULL AND ac.failed_at IS NULL) remis_provider,
 EXISTS(SELECT 1 FROM email_confirmations_reception cr WHERE cr.accuse_id=c.email_accuse_id AND cr.confirmed_at IS NOT NULL) reception_confirmee,
 lower(trim(a.email))=ANY(SELECT lower(trim(r)) FROM unnest(c.recipients)r) destinataire_verifie
 FROM corps c LEFT JOIN actifs a ON a.id=c.aid
 WHERE texte ~ '(examen theorique|examen pratique|exament3p|chambre des metiers)'
 AND texte !~ 'attestation de formation continue'
), retenus AS (
 SELECT q.*,
 (SELECT jsonb_agg(jsonb_build_object('inscription_id',sa.id,'session_id',s.id,'apprenant_id',sa.apprenant_id,
 'debut',coalesce(sa.date_debut,s.date_debut),'fin',coalesce(sa.date_fin_personnalisee,sa.date_fin,s.date_fin),
 'type_session',s.type_session) ORDER BY sa.id)
 FROM session_apprenants sa JOIN sessions s ON s.id=sa.session_id
 WHERE sa.apprenant_id=q.aid AND NOT coalesce(sa.liste_attente,false)
 AND ((s.type_session='examen' AND EXISTS(SELECT 1 FROM (VALUES(s.date_debut))v(d) WHERE
 q.texte LIKE '%'||to_char(v.d,'DD/MM/YYYY')||'%'
 OR q.texte LIKE '%'||v.d::text||'%'
 OR q.texte LIKE '%'||extract(day FROM v.d)::int||' '||(ARRAY['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'])[extract(month FROM v.d)::int]||' '||extract(year FROM v.d)::int||'%'))
 OR EXISTS(SELECT 1 FROM qualiopi_preuves p WHERE p.source_table='emails' AND p.source_id=q.id::text
 AND p.remarque_interne LIKE '%rapprochement_20261118_2008%'
 AND p.remarque_interne::jsonb->'rapprochement_20261118_2008'->'session_verifiee'->>'inscription_id'=sa.id::text
 AND p.remarque_interne::jsonb->'rapprochement_20261118_2008'->'session_verifiee'->>'session_id'=s.id::text
 AND p.remarque_interne::jsonb->'rapprochement_20261118_2008'->'session_verifiee'->>'apprenant_id'=q.aid::text))) sessions_candidates
 FROM qualifies q WHERE aid IS NOT NULL AND destinataire_verifie AND NOT echec AND NOT valeurs_non_resolues
), candidats AS (
 SELECT r.*,CASE WHEN jsonb_array_length(sessions_candidates)=1 THEN sessions_candidates->0 ELSE NULL END session_verifiee
 FROM retenus r
)
SELECT famille,count(*) envois,count(distinct aid) dossiers,
 count(*) filter(where session_verifiee IS NOT NULL) session_unique,
 count(*) filter(where coalesce(jsonb_array_length(sessions_candidates),0)=0) sans_session,
 count(*) filter(where jsonb_array_length(sessions_candidates)>1) session_ambigue,
 count(*) filter(where mention_cma) cma,count(*) filter(where portail_inscription) portail,
 count(*) filter(where pieces) pieces,count(*) filter(where conditions) conditions,
 count(*) filter(where remis_provider) remis_provider,count(*) filter(where reception_confirmee) reception_confirmee,
 count(*) filter(where has_attachments) pieces_jointes_signalees,min(sent_at),max(sent_at)
FROM candidats GROUP BY famille ORDER BY famille;