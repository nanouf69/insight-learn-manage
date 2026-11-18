WITH actifs AS (
 SELECT a.id FROM public.apprenants a WHERE a.deleted_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM comptes_test_techniques t WHERE t.apprenant_id=a.id)
 AND (coalesce(a.nom,'')||' '||coalesce(a.prenom,'')) !~* '\m(test|demo|debug)\M'
), ins AS (
 SELECT sa.id,sa.apprenant_id,sa.session_id,coalesce(sa.date_debut,s.date_debut) debut,
 coalesce(sa.date_fin_personnalisee,sa.date_fin,s.date_fin) fin
 FROM session_apprenants sa JOIN sessions s ON s.id=sa.session_id JOIN actifs a ON a.id=sa.apprenant_id
 WHERE NOT coalesce(sa.liste_attente,false) AND s.type_session IS DISTINCT FROM 'examen'
), tests AS (
 SELECT d.*, (SELECT count(*) FROM jsonb_array_elements(d.donnees->'sectionItems') WITH ORDINALITY sec(items,si)
 CROSS JOIN LATERAL jsonb_array_elements(sec.items) WITH ORDINALITY it(item,ii)) attendu,
 NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d.donnees->'sectionItems') WITH ORDINALITY sec(items,si)
 CROSS JOIN LATERAL jsonb_array_elements(sec.items) WITH ORDINALITY it(item,ii)
 WHERE coalesce(d.donnees->'answers'->>((si-1)::text||'-'||(ii-1)::text),'')='') complet
 FROM apprenant_documents_completes d JOIN actifs a ON a.id=d.apprenant_id
 WHERE d.type_document='test-competences' AND d.donnees->>'_status'='completed'
 AND jsonb_typeof(d.donnees->'sectionItems')='array' AND jsonb_typeof(d.donnees->'answers')='object'
), exercices AS (
 SELECT m.id source_module_id,m.module_id,m.module_data->>'nom' module_nom,e->>'id' exercice_id,e->>'titre' titre,
 md5(e::text) empreinte_actuelle
 FROM module_editor_state m CROSS JOIN LATERAL jsonb_array_elements(coalesce(m.module_data->'exercices','[]')) e WHERE m.module_id<90000
), remises AS (
 SELECT r.*,substring(r.exercice_id from '^module_([0-9]+)_')::int module_id,
 substring(r.exercice_id from '_exo_(.+)$') exercice_num
 FROM reponses_apprenants r JOIN actifs a ON a.id=r.apprenant_id
 WHERE r.exercice_type='quiz' AND r.status='submitted' AND r.completed AND r.submitted_at<=now()
 AND jsonb_typeof(r.reponses)='object' AND r.reponses<>'{}'::jsonb
), rapprochees AS (
 SELECT r.id,r.apprenant_id,r.exercice_id,r.module_id,r.submitted_at,r.tentative,
 e.source_module_id,e.module_nom,e.titre,e.empreinte_actuelle,
 (SELECT count(*) FROM ins i WHERE i.apprenant_id=r.apprenant_id AND (r.submitted_at AT TIME ZONE 'Europe/Paris')::date BETWEEN i.debut AND i.fin) sessions_compatibles
 FROM remises r LEFT JOIN exercices e ON e.module_id=r.module_id AND e.exercice_id=r.exercice_num
), retenues AS (
 SELECT DISTINCT ON(apprenant_id,module_id) * FROM rapprochees WHERE source_module_id IS NOT NULL
 ORDER BY apprenant_id,module_id,submitted_at DESC,id
), candidats(ref_key,titre,source_table,source_id,apprenant_id,date_evt,meta,indicateurs,limite) AS (
 SELECT 'qctrl-20261118-test-'||id,'Contrôle / Formulaires — test de compétences renseigné',
 'apprenant_documents_completes',id::text,apprenant_id,
 CASE WHEN coalesce(donnees->>'_signed_at',donnees->>'signature_stagiaire_date','')~'^20[0-9]{2}-[0-9]{2}-[0-9]{2}T' THEN coalesce(donnees->>'_signed_at',donnees->>'signature_stagiaire_date')::timestamptz ELSE NULL END,
 jsonb_build_object('criteres_renseignes',attendu,'objectifs_sections',donnees->'sections','date_nature','signature si documentée, pas date évaluation','session','non documentée'), '[10,11]'::jsonb,
 'Auto-positionnement initial : critères du formulaire et réponses non vides vérifiés, statut completed. Documente le diagnostic des compétences, pas une évaluation finale, ni réussite ni adaptation mise en œuvre. Session et évaluateur non documentés ; aucune réponse personnelle copiée.'
 FROM tests WHERE complet AND attendu>0
 UNION ALL
 SELECT 'qctrl-20261118-form-'||d.id,'Contrôle / Formulaires — analyse ou projet signé',
 'apprenant_documents_completes',d.id::text,d.apprenant_id,
 coalesce(d.donnees->>'_signed_at',d.donnees->>'signature_stagiaire_date')::timestamptz,
 jsonb_build_object('type_document',d.type_document,'session','non documentée','date_nature','signature enregistrée, pas mise en œuvre'), '[10]'::jsonb,
 'Formulaire completed avec image de signature et date enregistrée ; trace de recueil des besoins/projet, pas preuve d’adaptation mise en œuvre ou efficace. Aucun besoin sensible ni texte personnel copié ; liaison à session non documentée.'
 FROM apprenant_documents_completes d JOIN actifs a ON a.id=d.apprenant_id
 WHERE d.type_document IN('analyse-besoin','projet-professionnel') AND d.donnees->>'_status'='completed'
 AND coalesce(d.donnees->>'_signature_image',d.donnees->>'signature_stagiaire',d.donnees->>'signature','') LIKE 'data:image%'
 AND coalesce(d.donnees->>'_signed_at',d.donnees->>'signature_stagiaire_date','')~'^20[0-9]{2}-[0-9]{2}-[0-9]{2}T'
 UNION ALL
 SELECT 'qctrl-20261118-remise-'||id,'Contrôle — quiz remis, objectif pédagogique référencé',
 'reponses_apprenants',id::text,apprenant_id,submitted_at,
 jsonb_build_object('module_id',module_id,'source_module_id',source_module_id,'exercice_id',exercice_id,'titre_actuel',titre,'module_actuel',module_nom,'empreinte_exercice_actuel',empreinte_actuelle,'tentative',tentative,'objectif_source','src/lib/objectifsJalons.ts + intitulé exercice actuel','sessions_compatibles_dates',(SELECT coalesce(jsonb_agg(jsonb_build_object('inscription_id',i.id,'session_id',i.session_id,'debut',i.debut,'fin',i.fin)),'[]') FROM ins i WHERE i.apprenant_id=retenues.apprenant_id AND (submitted_at AT TIME ZONE 'Europe/Paris')::date BETWEEN i.debut AND i.fin),'liaison_session','compatibilité chronologique seulement, attribution pédagogique non prouvée'), '[11]'::jsonb,
 'Remise serveur submitted et completed avec réponses présentes, identité exercice/module retrouvée dans la banque actuelle. Dernière remise par apprenant/module référencée, autres copies conservées. Objectif du module et titre actuel documentent le dispositif d’évaluation ; corrigé/version historique et résultat d’acquisition non certifiés. Les inscriptions compatibles en dates restent candidates, même si une seule. Aucun score, réponse ou verdict recopié/recalculé.'
 FROM retenues
)
SELECT jsonb_build_object('inscriptions',(select count(*) from ins),'test_complets',(select count(*) from tests where complet and attendu>0),'test_incomplets',(select count(*) from tests where not complet or attendu=0),'remises',(select count(*) from remises),'remises_rapprochees',(select count(*) from rapprochees where source_module_id is not null),'remises_non_rapprochees',(select count(*) from rapprochees where source_module_id is null),'par_sessions',(select jsonb_agg(t) from(select sessions_compatibles,count(*) n from rapprochees where source_module_id is not null group by 1 order by 1)t),'retenues',(select count(*) from retenues),'apprenants_quiz',(select count(distinct apprenant_id) from retenues),'controle13',(select count(*) from rapprochees where module_id=13),'candidats',(select jsonb_agg(t) from(select source_table,indicateurs,count(*) n from candidats group by 1,2)t),'nouvelles',(select count(*) from candidats c where not exists(select 1 from qualiopi_preuves p where p.ref_key=c.ref_key or (p.source_table=c.source_table and p.source_id=c.source_id)))) audit;
