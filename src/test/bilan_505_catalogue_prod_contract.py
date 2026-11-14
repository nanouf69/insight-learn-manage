"""Remise 505 sur PostgreSQL JETABLE chargé avec le catalogue de PRODUCTION figé en lecture seule
(src/test/fixtures/bilan505_catalogue_prod.sql : 30 fonctions, 18 déclencheurs, droits et RLS réels).
Données 100 % fictives ; les écarts reproduisent la forme des 4 copies réelles (ordre, retard, désélection,
copie vide), jamais leurs identités ni leurs réponses. Aucune connexion à la base réelle.
Usage : python3 src/test/bilan_505_catalogue_prod_contract.py
"""
import json, pathlib, sys, unittest, uuid
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from core_correction_securite_contract import Pg, as_ctx
ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / 'src/test/fixtures'
B = ROOT / 'src/test/bilan-505-remise-browser'
COMPLETE = json.loads((B / 'snapshot-complete.json').read_text())
MISSING = json.loads((B / 'snapshot-missing.json').read_text())
ANS = {q['cle']: sorted(c['lettre'] for c in q['choix'] if c.get('correct')) for q in COMPLETE['questions']}
OPTS = {q['cle']: [c['lettre'] for c in q['choix']] for q in COMPLETE['questions']}
PRELUDE = """CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT; GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(coalesce(current_setting('request.jwt.claim.sub', true),(nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub')),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'role') $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claims', true),'')::jsonb $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;"""

def j(x): return "'" + json.dumps(x, ensure_ascii=False).replace("'", "''") + "'::jsonb"
def autre(cle, base):
    o = [l for l in OPTS[cle] if l not in base]
    return sorted(base[:1] + o[:1])

def load_db():
    pg = Pg()
    for part in [PRELUDE, (FIX / 'bilan505_catalogue_prod.sql').read_text(), (ROOT / 'docs/candidats-sql/bilan_505_remise.sql').read_text()]:
        c, o = pg.sql(part)
        if c: pg.stop(); raise AssertionError(o[-2000:])
    return pg

class Eleve:
    def __init__(self, t, copie, journal, snapshot=COMPLETE, seq=40):
        self.t, self.app, self.uid, self.rid = t, str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
        t.sql(f"""INSERT INTO apprenants(id,nom,prenom,auth_user_id) VALUES('{self.app}','FICTIF','Test-{self.app[:8]}','{self.uid}');
          INSERT INTO reponses_apprenants(id,apprenant_id,user_id,exercice_id,exercice_type,reponses,tentative,write_seq,status,completed)
            VALUES('{self.rid}','{self.app}','{self.uid}','module_5_exo_505','quiz',{j(copie)},1,{seq},'in_progress',false);
          INSERT INTO bilan_passage_snapshots(apprenant_id,module_id,exercice_id,filiere,matiere,tentative,passage_cle,questions,nb_questions,empreinte,empreinte_source)
            VALUES('{self.app}',5,505,'VTC','Développement commercial',1,'fictif-{self.app}',{j(snapshot['questions'])},49,'{snapshot['empreinte']}','fictif');""")
        for q, v, app_t, srv_t in journal: self.clic(q, v, app_t, srv_t)
    def clic(self, q, v, app_t, srv_t):
        self.t.sql(f"INSERT INTO reponses_apprenants_journal(event_id,apprenant_id,user_id,module_id,exercice_id,exercice_type,question_id,valeur,tentative,client_saved_at,created_at) VALUES('{uuid.uuid4()}','{self.app}','{self.uid}',5,'module_5_exo_505','quiz','{q}',{j(v)},1,'{app_t}','{srv_t}')")
    def rpc(self, call, who=None):
        return self.t.pg.sql(as_ctx('authenticated', {'sub': who or self.uid, 'role': 'authenticated'}, call))
    def prepare(self):
        c, o = self.rpc(f"SELECT bilan_505_remise_prepare('{self.app}');"); self.t.assertEqual(c, 0, o)
        return json.loads(o.splitlines()[-1])
    def commit(self, p, answers=None, confirm=False, fn='bilan_505_remise_commit'):
        a = p['reponses'] if answers is None else answers
        return self.rpc(f"SELECT {fn}('{self.app}','{p['id']}',{p['tentative']},{p['write_seq']},{j(a)},{str(confirm).lower()});")
    def row(self):
        return json.loads(self.t.sql(f"SELECT to_jsonb(r) FROM reponses_apprenants r WHERE id='{self.rid}'"))

def base_journal(values, day='2026-11-13T18:00'):
    return [(k, v, f'{day}:{i:02d}+00', f'{day}:{i:02d}.3+00') for i, (k, v) in enumerate(sorted(values.items()))]

class CatalogueProd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pg = load_db(); cls.addClassCleanup(cls.pg.stop)
    @classmethod
    def sql(cls, s):
        c, o = cls.pg.sql(s)
        if c: raise AssertionError(o)
        return o

    def test_00_loaded_code_is_production_code(self):
        man = json.loads((FIX / 'bilan505_catalogue_prod.json').read_text())
        for f in man['functions']:
            got = self.sql(f"SELECT string_agg(md5(pg_get_functiondef(oid)),',' order by oid) FROM pg_proc WHERE proname='{f}' AND pronamespace='public'::regnamespace")
            self.assertEqual(got, man['md5'][f], f)
        self.assertEqual(self.sql("SELECT count(*) FROM pg_trigger WHERE tgrelid='public.reponses_apprenants'::regclass AND NOT tgisinternal"), '14')

    def test_cabral_like_concordant_submits_server_grade(self):
        e = Eleve(self, ANS, base_journal(ANS))
        p = e.prepare(); self.assertEqual((p['revue'], p['grading_status']), ([], 'verifiable'))
        for k in ('score', 'questions', 'choix', 'bonnes_reponses'): self.assertNotIn(k, p)
        c, o = e.commit(p); self.assertEqual(c, 0, o)
        r = e.row(); self.assertEqual((r['status'], float(r['score']), r['bonnes_reponses'], r['total_questions'], r['tentative']), ('submitted', 100.0, 49, 49, 1))
        c, o = e.commit(p); self.assertEqual(c, 0, o); self.assertEqual(e.row()['score'], r['score'])

    def test_abdelhak_like_review_required_then_latest_clicks(self):
        divergent = ['505-32', '505-34', '505-35', '505-38', '505-45', '505-51', '505-56']
        copie = {**ANS, **{k: autre(k, ANS[k]) for k in divergent}}
        j0 = base_journal(copie, '2026-11-13T18:10')
        # 505-32: offline batch arrives late (server order ≠ device order for OLD events only).
        j0 += [('505-32', copie['505-32'], '2026-11-13T18:10:26+00', '2026-11-13T18:10:58+00'),
               ('505-32', [], '2026-11-13T18:10:28+00', '2026-11-13T18:10:59.5+00')]
        j0 += [(k, ANS[k], '2026-11-13T18:53:53+00', '2026-11-13T18:53:53.2+00') for k in divergent]
        e = Eleve(self, copie, j0)
        p = e.prepare()
        self.assertEqual([x['question_id'] for x in p['revue']], divergent)
        self.assertTrue(all(x['certitude'] == 'certain' and x['dernier'] == ANS[x['question_id']] for x in p['revue']))
        before = e.row()
        c, o = e.commit(p); self.assertNotEqual(c, 0); self.assertIn('revue_requise', o)
        self.assertEqual(e.row(), before)
        c, o = e.commit(p, confirm=True); self.assertEqual(c, 0, o)
        r = e.row(); self.assertEqual((r['status'], r['reponses'], r['bonnes_reponses']), ('submitted', ANS, 49))

    def test_reordered_final_click_is_ambiguous_never_restored(self):
        copie = {**ANS, '505-3': autre('505-3', ANS['505-3'])}
        j0 = base_journal(copie) + [('505-3', ANS['505-3'], '2026-11-13T19:00:05+00', '2026-11-13T19:00:01+00'),
                                    ('505-3', ['A'], '2026-11-13T19:00:02+00', '2026-11-13T19:00:09+00')]
        e = Eleve(self, copie, j0)
        p = e.prepare(); self.assertEqual(p['ambiguous_questions'], ['505-3']); self.assertEqual(p['reponses']['505-3'], copie['505-3'])
        self.assertNotEqual(e.commit(p, confirm=True)[0], 0)
        e.clic('505-3', ANS['505-3'], '2026-11-13T19:30:00+00', '2026-11-13T19:30:00.2+00')  # new explicit click
        p = e.prepare(); self.assertEqual(p['ambiguous_questions'], [])
        c, o = e.commit(p, confirm=True); self.assertEqual(c, 0, o)

    def test_alpha_like_missing_key_recovers_answers_without_grade(self):
        div = {'505-38': sorted(ANS['505-38'] + [l for l in OPTS['505-38'] if l not in ANS['505-38']][:1]), '505-45': ANS['505-45'], '505-56': ANS['505-56']}
        copie = {**ANS, **{k: autre(k, ANS[k]) for k in div}}
        j0 = base_journal(copie, '2026-11-12T12:17') + [(k, v, '2026-11-12T12:21:34+00', '2026-11-12T12:21:36+00') for k, v in div.items()]
        e = Eleve(self, copie, j0, snapshot=MISSING)
        p = e.prepare()
        self.assertEqual((p['grading_status'], p['unresolved_questions']), ('corrige_snapshot_incomplet', ['505-7']))
        self.assertEqual(len(p['revue']), 3)
        c, o = e.commit(p, confirm=True); self.assertNotEqual(c, 0); self.assertIn('corrige_snapshot_incomplet', o)
        self.assertEqual(e.row()['status'], 'in_progress')
        c, o = e.commit(p, fn='bilan_505_recuperer_reponses'); self.assertIn('revue_requise', o)
        c, o = e.commit(p, confirm=True, fn='bilan_505_recuperer_reponses'); self.assertEqual(c, 0, o)
        r = e.row(); self.assertEqual((r['status'], r['score'], r['submitted_at'], r['reponses']), ('in_progress', None, None, {**copie, **div}))
        self.assertGreater(r['write_seq'], p['write_seq'])
        self.assertEqual(e.prepare()['revue'], [])

    def test_malki_like_empty_copy_restored_from_evening_click(self):
        copie = {**ANS, '505-37': []}
        j0 = base_journal({**ANS, '505-37': ['D']}, '2026-11-12T12:18') + [
            ('505-37', [], '2026-11-12T12:18:13+00', '2026-11-12T12:18:22.6+00'),
            ('505-37', ANS['505-37'], '2026-11-12T20:38:09+00', '2026-11-12T20:38:09.9+00')]
        e = Eleve(self, copie, j0, snapshot=MISSING)
        p = e.prepare(); self.assertEqual([(x['question_id'], x['copie'], x['certitude']) for x in p['revue']], [('505-37', [], 'certain')])
        c, o = e.commit(p, confirm=True, fn='bilan_505_recuperer_reponses'); self.assertEqual(c, 0, o)
        self.assertEqual(e.row()['reponses']['505-37'], ANS['505-37'])

    def test_click_after_prepare_is_never_overwritten(self):
        copie = {**ANS, '505-9': autre('505-9', ANS['505-9'])}
        e = Eleve(self, copie, base_journal(copie) + [('505-9', ANS['505-9'], '2026-11-13T19:00:00+00', '2026-11-13T19:00:00.1+00')])
        p = e.prepare()
        e.clic('505-9', copie['505-9'], '2026-11-13T19:05:00+00', '2026-11-13T19:05:00.1+00')
        before = e.row()
        c, o = e.commit(p, confirm=True); self.assertNotEqual(c, 0); self.assertIn('unresolved', o)
        self.assertEqual(e.row(), before)

    def test_stale_sequence_owner_and_internal_functions(self):
        e = Eleve(self, ANS, base_journal(ANS))
        p = e.prepare()
        self.sql(f"UPDATE reponses_apprenants SET write_seq=write_seq+1 WHERE id='{e.rid}'")
        c, o = e.commit(p); self.assertIn('stale', o)
        self.assertNotEqual(e.rpc(f"SELECT bilan_505_remise_prepare('{e.app}');", who=str(uuid.uuid4()))[0], 0)
        for call in [f"SELECT bilan_505_snapshot_grade('{e.app}',1,{j(ANS)})",
                     f"SELECT bilan_505_journal_revue('{e.app}','{e.uid}',1,{j(ANS)})",
                     f"SELECT bilan_505_reconcilier('{e.app}','{e.rid}',1,1,{j(ANS)},true)"]:
            self.assertIn('permission denied', e.rpc(call + ';')[1])

    def test_other_rows_untouched(self):
        e = Eleve(self, ANS, base_journal(ANS))
        self.sql(f"INSERT INTO reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,reponses,score,status) VALUES('{e.app}','{e.uid}','module_5_revision_exo_505','quiz','{{}}',72,'submitted'),('{e.app}','{e.uid}','module_5_exo_506','quiz','{{}}',83,'submitted')")
        h = lambda: self.sql(f"SELECT md5(string_agg(to_jsonb(r)::text,'' ORDER BY exercice_id)) FROM reponses_apprenants r WHERE apprenant_id='{e.app}' AND exercice_id<>'module_5_exo_505'")
        before = h(); c, o = e.commit(e.prepare()); self.assertEqual(c, 0, o); self.assertEqual(before, h())

if __name__ == '__main__':
    unittest.main(verbosity=2)
