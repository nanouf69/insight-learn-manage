"""Equivalence + timing of propagate_shared_exercices (old vs new) on a DISPOSABLE Postgres only (PGHOST=/tmp/pgt, port 5499).
Setup (read-only on live): pg_dump -s -n public + data of tables <60 MB into a local initdb; save old definition to /tmp/pgt2/old.sql.
Usage: python3 src/test/propagation_partagee_equivalence.py /tmp/pgt2/new.sql  -- never point it at the live database."""
import subprocess,re,hashlib,time,sys
env=dict(PGHOST='/tmp/pgt',PGPORT='5499',PGUSER='postgres',PGDATABASE=__import__('os').environ.get('PGT_DB','t'),PATH='/bin:/usr/bin:'+__import__('os').environ['PATH'])
def q(sql):
    r=subprocess.run(['psql','-X','-At','-q'],input=sql,capture_output=True,text=True,env=env); return r.stdout,r.stderr
TS=re.compile(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:\d{2})?)?')
E="'{exercices,%d,questions,%d,enonce}'"
cases={
 'm10 enonce q0 exo0':(10,"jsonb_set(d,'{exercices,0,questions,0,enonce}',to_jsonb((d#>>'{exercices,0,questions,0,enonce}')||' FICTIF'))"),
 'm2 enonce exo1 q1':(2,"jsonb_set(d,'{exercices,1,questions,1,enonce}',to_jsonb((d#>>'{exercices,1,questions,1,enonce}')||' FICTIF'))"),
 'm10 add question exo0':(10,"jsonb_set(d,'{exercices,0,questions}',(d#>'{exercices,0,questions}')||jsonb_build_array(jsonb_build_object('id','fictif-999','enonce','FICTIF','choix','[]'::jsonb)))"),
 'm10 titre exo0':(10,"jsonb_set(d,'{exercices,0,titre}',to_jsonb((d#>>'{exercices,0,titre}')||'x'))"),
 'm10 remove last exo':(10,"jsonb_set(d,'{exercices}',(d->'exercices')-(jsonb_array_length(d->'exercices')-1))"),
 'm11 enonce':(11,"jsonb_set(d,'{exercices,0,questions,0,enonce}',to_jsonb((d#>>'{exercices,0,questions,0,enonce}')||' FICTIF'))"),
 'm5 enonce':(5,"jsonb_set(d,'{exercices,2,questions,0,enonce}',to_jsonb((d#>>'{exercices,2,questions,0,enonce}')||' FICTIF'))"),
 'm28 enonce':(28,"jsonb_set(d,'{exercices,0,questions,0,enonce}',to_jsonb((d#>>'{exercices,0,questions,0,enonce}')||' FICTIF'))"),
 'm2 inchangé':(2,"d"),
 'm10 supprime 1 question exo0':(10,"jsonb_set(d,'{exercices,0,questions}',(d#>'{exercices,0,questions}')-0)"),
 'm2 choix exo0 q0':(2,"jsonb_set(d,'{exercices,0,questions,0,choix}','[{\"lettre\":\"A\",\"texte\":\"FICTIF\",\"correct\":true}]')"),
 'm2 cas réel 15h18 exo82 q18 enonce':(2,"jsonb_set(d,'{exercices,7,questions,17,enonce}',to_jsonb((d#>>'{exercices,7,questions,17,enonce}')||' FICTIF'))"),
 'm10 cas réel exo82 q18 enonce':(10,"jsonb_set(d,'{exercices,7,questions,17,enonce}',to_jsonb((d#>>'{exercices,7,questions,17,enonce}')||' FICTIF'))"),
 'm15 cas réel exo82 q18 enonce':(15,"jsonb_set(d,'{exercices,2,questions,17,enonce}',to_jsonb((d#>>'{exercices,2,questions,17,enonce}')||' FICTIF'))"),
 'm2 exo82 q18 bonne réponse':(2,"jsonb_set(d,'{exercices,7,questions,17,choix}',(select jsonb_agg(c||jsonb_build_object('correct',not coalesce((c->>'correct')::boolean,false))) from jsonb_array_elements(d#>'{exercices,7,questions,17,choix}') c))"),
 'm13 enonce':(13,"jsonb_set(d,'{exercices,0,questions,0,enonce}',to_jsonb((d#>>'{exercices,0,questions,0,enonce}')||' FICTIF'))"),
}
def run(fn,name):
    m,expr=cases[name]
    sql=f"""\\i {fn}
begin; set local request.jwt.claim.sub='d9d42e89-e386-4b22-af96-ec866fee98db';
create temp table x on commit drop as select module_data d,* from module_editor_state where module_id={m};
select 'T0'||clock_timestamp();
select 'R'||coalesce((select 1 from save_module_editor_state({m},(select {expr} from x),(select deleted_cours from x),(select deleted_exercices from x),(select source_fingerprint from x),(select updated_at from x)) limit 1)::text,'null');
select 'T1'||clock_timestamp();
select 'F'||string_agg(module_id||':'||md5(module_data::text)||':'||(updated_at=now()),',' order by module_id) from module_editor_state;
select 'D'||string_agg(module_id||':'||module_data::text,'|' order by module_id) from module_editor_state where updated_at=now();
select 'L'||count(*) from question_change_log where created_at=now();
rollback;"""
    o,e=q(sql)
    lines={l[0]:l[1:] for l in o.splitlines() if l[:1] in 'TRFDL' and len(l)>1 and not l.startswith('T0') or l.startswith('T')}
    t0=[l for l in o.splitlines() if l.startswith('T0')]; t1=[l for l in o.splitlines() if l.startswith('T1')]
    import datetime
    dt=(datetime.datetime.fromisoformat(t1[0][2:])-datetime.datetime.fromisoformat(t0[0][2:])).total_seconds()*1000 if t0 and t1 else -1
    err=[l for l in e.splitlines() if 'ERROR' in l]
    F=[l for l in o.splitlines() if l.startswith('F')]; D=[l for l in o.splitlines() if l.startswith('D')]; L=[l for l in o.splitlines() if l.startswith('L')]
    touched=[p.split(':')[0] for p in (F[0][1:].split(',') if F else []) if p.endswith('true')]
    norm=hashlib.md5(TS.sub('TS',(D[0] if D else '')).encode()).hexdigest()
    fpu=hashlib.md5(','.join(p for p in (F[0][1:].split(',') if F else []) if not p.endswith('true')).encode()).hexdigest()
    return dict(ms=round(dt),touched=touched,d=norm,untouched=fpu,log=L,err=err[:1])
NEWF=sys.argv[1] if len(sys.argv)>1 else '/tmp/pgt2/new.sql'
ok=True
for name in cases:
    a=run('/tmp/pgt2/old.sql',name); b=run(NEWF,name)
    same=(a['touched'],a['d'],a['untouched'],a['log'],a['err'])==(b['touched'],b['d'],b['untouched'],b['log'],b['err'])
    ok&=same
    print('PASS' if same else 'FAIL',name,'| modules écrits',b['touched'],'| avant',a['ms'],'ms → après',b['ms'],'ms',b['err'] or '')
print('ALL','PASS' if ok else 'FAIL')
