"""Equivalence old/new bilan_sync_router_editeur on a DISPOSABLE Postgres only.
Setup (read-only on live): pg_dump -s -n public + data of module_editor_state, bilan_* , quiz_question_* into a local initdb,
then install the previous definition as bilan_sync_router_editeur_old. Never point PGHOST at the live database."""
import subprocess, json
def q(sql):
    r=subprocess.run(['psql','-X','-At','-q','-v','ON_ERROR_STOP=1'],input=sql,capture_output=True,text=True)
    return r.stdout.strip(), r.stderr.strip()
# pick a liee TAXI link and a liee VTC link
taxi=q("select taxi_exercice_id||','||taxi_question_id from bilan_sync_liens where statut='liee' order by id limit 1")[0].split(',')
vtc=q("select vtc_exercice_id||','||vtc_question_id from bilan_sync_liens where statut='liee' order by id offset 5 limit 1")[0].split(',')
def path_set(mod, ex, qid, field, val):
    return f"""jsonb_set(d, array['exercices',(select (o-1)::text from jsonb_array_elements(d->'exercices') with ordinality e(v,o) where v->>'id'='{ex}' limit 1),'questions',
     (select (o-1)::text from jsonb_array_elements((select v from jsonb_array_elements(d->'exercices') v where v->>'id'='{ex}' limit 1)->'questions') with ordinality q(v,o) where v->>'id'='{qid}' limit 1),'{field}'], '{val}')"""
def remove(ex,qid):
    return f"""jsonb_set(d, array['exercices',(select (o-1)::text from jsonb_array_elements(d->'exercices') with ordinality e(v,o) where v->>'id'='{ex}' limit 1),'questions'],
      (select jsonb_agg(v order by o) from jsonb_array_elements((select v from jsonb_array_elements(d->'exercices') v where v->>'id'='{ex}' limit 1)->'questions') with ordinality q(v,o) where v->>'id'<>'{qid}'))"""
cases=[
 ('11 inchangé',11,'d','u'),
 ('11 Q2 606 3,10',11,path_set(11,'606','2','choix','[{"texte":"3,10 €","lettre":"A","correct":true},{"texte":"5 €","lettre":"B"}]'),'u'),
 ('11 lien modifié',11,path_set(11,taxi[0],taxi[1],'enonce','"Énoncé FICTIF modifié"'),'u'),
 ('11 lien modifié stale',11,path_set(11,taxi[0],taxi[1],'enonce','"Énoncé FICTIF modifié"'),"u - interval '1 hour'"),
 ('11 lien modifié sans version',11,path_set(11,taxi[0],taxi[1],'enonce','"Énoncé FICTIF modifié"'),'null::timestamptz'),
 ('11 lien supprimé',11,remove(taxi[0],taxi[1]),'u'),
 ('11 champ non synchronisé',11,path_set(11,taxi[0],taxi[1],'_editedAt','"2030-01-01"'),'u'),
 ('11 lien: copie client ancienne',11,path_set(11,taxi[0],taxi[1],'choix','[]'),'u'),
 ('5 inchangé',5,'d','u'),
 ('5 lien modifié',5,path_set(5,vtc[0],vtc[1],'enonce','"VTC FICTIF"'),'u'),
 ('5 lien supprimé',5,remove(vtc[0],vtc[1]),'u'),
 ('28 hors périmètre',28,'d','u'),
]
fp_old="(select md5(string_agg(module_id||md5(module_data::text)||updated_at,',' order by module_id)) from module_editor_state where module_id in (5,11))||'|'||(select md5(coalesce(string_agg(row_to_json(j)::text,',' order by row_to_json(j)::text),'')) from bilan_sync_journal j)||'|'||(select md5(string_agg(row_to_json(l)::text,',' order by id)) from bilan_sync_liens l)"
fp="(select string_agg(module_id||':'||module_data::text||':'||deleted_exercices::text,',' order by module_id) from module_editor_state where module_id in (5,11))||'|'||(select coalesce(string_agg(row_to_json(j)::text,',' order by j.created_at, row_to_json(j)::text),'') from bilan_sync_journal j)||'|'||(select string_agg(row_to_json(l)::text,',' order by id) from bilan_sync_liens l)"
import re, hashlib
TS=re.compile(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:\d{2})?)?')
UU=re.compile(r"\"id\": ?\"[0-9a-f-]{36}\"")
ok=True
for name,mod,expr,ver in cases:
    outs=[]
    for fn in ['bilan_sync_router_editeur_old','bilan_sync_router_editeur']:
        sql=f"""begin; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000aa';
        create temp table x on commit drop as select module_data d, updated_at u from module_editor_state where module_id={mod};
        create temp table r on commit drop as select coalesce({fn}({mod}, (select {expr} from x), (select {ver} from x))::text,'NULL') h;
        select (select h from r)||'#'||{fp}; rollback;"""
        o,e=q(sql)
        err=[l for l in e.splitlines() if 'ERROR' in l]
        line=([l for l in o.splitlines() if '#' in l] or [''])[0]
        norm=UU.sub('"id": U', TS.sub('TS', line))
        outs.append(( hashlib.md5(norm.encode()).hexdigest() if line else '', err[0].split('ERROR:')[1].strip()[:90] if err else ''))
    same = outs[0]==outs[1]
    ok &= same
    print('PASS' if same else 'FAIL', name, '|', outs[1][0][:12] or outs[1][1], '| old:', outs[0][0][:12] or outs[0][1][:60])
print('ALL', 'PASS' if ok else 'FAIL')

import difflib, sys
if len(sys.argv)>1:
  name,mod,expr,ver=[c for c in cases if c[0]==sys.argv[1]][0]
  res=[]
  for fn in ['bilan_sync_router_editeur_old','bilan_sync_router_editeur']:
    sql=f"""begin; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000aa';
        create temp table x on commit drop as select module_data d, updated_at u from module_editor_state where module_id={mod};
        create temp table r on commit drop as select coalesce({fn}({mod}, (select {expr} from x), (select {ver} from x))::text,'NULL') h;
        select '##R'||(select h from r); select '##M'||(select string_agg(module_id||':'||module_data::text,',' order by module_id) from module_editor_state where module_id in (5,11)); select '##J'||(select coalesce(string_agg(row_to_json(j)::text,E'\n' order by j.created_at),'') from bilan_sync_journal j where created_at > now() - interval '1 minute'); rollback;"""
    o,e=q(sql); res.append(UU.sub('"id": U', TS.sub('TS', o)))
  for tag in ['##R','##M','##J']:
    a=[l for l in res[0].split('\n') if l.startswith(tag)]; b=[l for l in res[1].split('\n') if l.startswith(tag)]
    if a!=b:
      A=a[0].replace('}, {','},\n{').split('\n'); B=b[0].replace('}, {','},\n{').split('\n')
      print(tag, 'DIFF'); print('\n'.join(list(difflib.unified_diff(A,B,lineterm='',n=0))[:12]))
    else: print(tag,'same')
