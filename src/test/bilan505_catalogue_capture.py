"""Capture LECTURE SEULE du catalogue de production utile à la remise 505.

Écrit src/test/fixtures/bilan505_catalogue_prod.sql + bilan505_catalogue_prod.json (empreintes md5).
Seules des requêtes SELECT sur pg_catalog sont exécutées ; aucune donnée élève n'est lue.
Usage : python3 src/test/bilan505_catalogue_capture.py [--verify]
  --verify : compare les empreintes figées avec le catalogue actuel, sans rien écrire.
"""
import json, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT_SQL = ROOT / 'src/test/fixtures/bilan505_catalogue_prod.sql'
OUT_JSON = ROOT / 'src/test/fixtures/bilan505_catalogue_prod.json'
TRIG_TABLES = ['reponses_apprenants', 'reponses_apprenants_journal', 'bilan_passage_snapshots']
ROOTS = ['persist_answer_batch_v2', 'submit_quiz_attempt', 'bilan_corriger_snapshot']

def live(q):
    return subprocess.check_output(['psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', 'BEGIN READ ONLY;' + q + ';COMMIT;'], text=True).strip().removeprefix('BEGIN').removesuffix('COMMIT').strip()

def deps():
    tables = set(live("select string_agg(relname,' ') from pg_class where relnamespace='public'::regnamespace and relkind in ('r','v','m','p')").split())
    procs = set(live("select string_agg(distinct proname,' ') from pg_proc where pronamespace='public'::regnamespace").split())
    start = list(ROOTS)
    for t in TRIG_TABLES:
        start += live(f"select coalesce(string_agg(distinct p.proname,' '),'') from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='public.{t}'::regclass and not t.tgisinternal").split()
    seen, todo, T = set(), start, set(TRIG_TABLES) | {'apprenants'}
    while todo:
        f = todo.pop()
        if f in seen: continue
        seen.add(f)
        body = re.sub(r'--[^\n]*', '', live(f"select string_agg(pg_get_functiondef(oid),E'\\n') from pg_proc where proname='{f}' and pronamespace='public'::regnamespace"))
        for w in set(re.findall(r'\b([a-z_][a-z0-9_]*)\b', body)):
            if w in tables: T.add(w)
            if w in procs and w != f and re.search(r'\b' + w + r'\s*\(', body): todo.append(w)
    return sorted(seen), sorted(T)

def manifest(fns):
    m = {}
    for f in fns:
        m[f] = live(f"select string_agg(md5(pg_get_functiondef(oid)),',' order by oid) from pg_proc where proname='{f}' and pronamespace='public'::regnamespace")
    for t in TRIG_TABLES:
        m['triggers:' + t] = live(f"select md5(coalesce(string_agg(pg_get_triggerdef(oid)||tgenabled,'|' order by tgname),'')) from pg_trigger where tgrelid='public.{t}'::regclass and not tgisinternal")
    m['columns:reponses_apprenants'] = live("select md5(string_agg(attname||format_type(atttypid,atttypmod)||attnotnull,'|' order by attnum)) from pg_attribute where attrelid='public.reponses_apprenants'::regclass and attnum>0 and not attisdropped")
    return m

def table_ddl(t):
    kind = live(f"select relkind from pg_class where oid='public.{t}'::regclass")
    cols = live(f"""select string_agg(format('%I %s%s%s', a.attname, format_type(a.atttypid,a.atttypmod),
        case when d.adbin is not null and pg_get_expr(d.adbin,d.adrelid) !~ 'nextval' then ' DEFAULT '||pg_get_expr(d.adbin,d.adrelid) else '' end,
        case when a.attnotnull and '{kind}'='r' then ' NOT NULL' else '' end), E',\\n  ' order by a.attnum)
        from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
        where a.attrelid='public.{t}'::regclass and a.attnum>0 and not a.attisdropped""")
    out = [f'-- {t} ({"vue réduite à ses colonnes" if kind != "r" else "table"})', f'CREATE TABLE public.{t} (\n  {cols}\n);']
    if kind == 'r':
        for line in live(f"select coalesce(string_agg(conname||E'\\t'||pg_get_constraintdef(oid),E'\\n' order by contype desc,conname),'') from pg_constraint where conrelid='public.{t}'::regclass and contype in ('p','u','c')").splitlines():
            if line: n, d = line.split('\t', 1); out.append(f'ALTER TABLE public.{t} ADD CONSTRAINT {n} {d};')
    return out

def capture():
    fns, tabs = deps()
    out = ['-- Catalogue de production capturé en lecture seule. Ne jamais appliquer à la base réelle.',
           "DO $$BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); EXCEPTION WHEN duplicate_object THEN NULL; END$$;"]
    for t in tabs: out += table_ddl(t)
    for f in fns:
        out.append(live(f"select string_agg(pg_get_functiondef(oid),E';\\n' order by oid) from pg_proc where proname='{f}' and pronamespace='public'::regnamespace") + ';')
        for line in live(f"select coalesce(string_agg(pg_get_function_identity_arguments(oid)||E'\\t'||coalesce(proacl::text,''),E'\\n'),'') from pg_proc where proname='{f}' and pronamespace='public'::regnamespace").splitlines():
            args, acl = line.split('\t', 1)
            if not acl: continue
            out.append(f'REVOKE ALL ON FUNCTION public.{f}({args}) FROM PUBLIC;')
            for g in acl.strip('{}').split(','):
                who = g.split('=')[0] or 'PUBLIC'
                if who in ('PUBLIC', 'anon', 'authenticated', 'service_role'):
                    out.append(f'GRANT EXECUTE ON FUNCTION public.{f}({args}) TO {who};')
    for t in TRIG_TABLES:
        out.append(live(f"select coalesce(string_agg(pg_get_triggerdef(oid)||';'||case when tgenabled='D' then format(' ALTER TABLE public.%I DISABLE TRIGGER %I;',tgrelid::regclass::text,tgname) else '' end,E'\\n' order by tgname),'') from pg_trigger where tgrelid='public.{t}'::regclass and not tgisinternal"))
    out.append("ALTER TABLE public.reponses_apprenants ENABLE ROW LEVEL SECURITY;")
    out.append(live("""select coalesce(string_agg(format('CREATE POLICY %I ON public.reponses_apprenants AS %s FOR %s TO %s%s%s;', polname,
        case when polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end,
        case polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
        coalesce((select string_agg(quote_ident(rolname),',') from pg_roles where oid=any(polroles)),'public'),
        coalesce(' USING ('||pg_get_expr(polqual,polrelid)||')',''), coalesce(' WITH CHECK ('||pg_get_expr(polwithcheck,polrelid)||')','')),E'\\n'),'')
        from pg_policy where polrelid='public.reponses_apprenants'::regclass"""))
    OUT_SQL.write_text('\n'.join(x for x in out if x) + '\n')
    OUT_JSON.write_text(json.dumps({'functions': fns, 'tables': tabs, 'md5': manifest(fns)}, indent=1, ensure_ascii=False) + '\n')
    print(f'{len(fns)} fonctions, {len(tabs)} tables capturées')

if __name__ == '__main__':
    if '--verify' in sys.argv:
        frozen = json.loads(OUT_JSON.read_text())
        now = manifest(frozen['functions'])
        diff = {k: (v, now.get(k)) for k, v in frozen['md5'].items() if now.get(k) != v}
        print('IDENTIQUE à la production' if not diff else f'DIFFÉRENT : {diff}')
        sys.exit(1 if diff else 0)
    capture()
