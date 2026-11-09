import unittest,concurrent.futures,json,uuid
from fixture import Fixture,EXAMS,DAY,EVENING,LEARNER,ADMIN,literal
class Contracts(unittest.TestCase):
 def setUp(self): self.f=Fixture(); self.addCleanup(self.f.pg.stop)
 def test_24_exams_seven_subjects_and_two_sessions(self):
  for exam in EXAMS:
   for matter in 'ABCDEFG': self.f.historical(exam,matter)
   self.f.native(exam,'native')
  before=self.f.fingerprint()
  rows=self.f.rows(limit=1000)
  self.assertEqual(len(rows),192)
  for exam in EXAMS:
   with self.subTest(exam=exam):
    copies=self.f.rows(exam=exam)
    self.assertEqual(8,len(copies)); self.assertEqual(set('ABCDEFG'),{r['subject_id'] for r in copies if r['origin']=='historical'})
    for r in copies:
     if r['origin']=='historical': self.f.grade(r,str(uuid.uuid4()))
  self.assertEqual(192,len(self.f.rows(session=DAY,limit=1000)))
  self.assertEqual(192,len(self.f.rows(session=EVENING,limit=1000)))
  self.assertEqual(before,self.f.fingerprint())
  self.assertEqual(168,sum(r['origin']=='historical' and r['etat']=='corrigee' for r in self.f.rows(limit=1000)))
 def test_pagination_1205_no_hidden_limit(self):
  self.f.pg.sql("INSERT INTO apprenant_quiz_results SELECT gen_random_uuid(),'11111111-1111-4111-8111-000000000001','EB2','examen_blanc','A',i,'{\"questions\":[{\"id\":\"q1\",\"type\":\"QRC\",\"enonce\":\"figé\"}],\"reponses\":{\"q1\":\"réponse\"}}',now(),12 FROM generate_series(1,1205)i")
  pages=[]; after=''
  while True:
   page=self.f.rows(after=after,limit=500); pages+=page
   if not page: break
   after=page[-1]['identity']
  self.assertEqual(1205,len(pages)); self.assertEqual(1205,len({r['identity'] for r in pages}))
 def test_exact_link_excludes_only_matching_native(self):
  rid=self.f.historical(); self.f.native(linked=rid)
  self.assertEqual(['native'],[r['origin'] for r in self.f.rows()])
  # Wrong exam link cannot erase the historical row.
  self.f.pg.sql("UPDATE exam_attempts_v2 SET exam_id='EB2-TAXI'")
  self.assertEqual(2,len(self.f.rows()))
 def test_divergent_native_link_keeps_original_and_refuses_merge(self):
  rid=self.f.historical(); self.f.native(linked=rid)
  self.f.pg.sql("UPDATE exam_attempts_v2 SET snapshot=jsonb_set(snapshot,'{source_historique,details}','{}')")
  rows=self.f.rows(); self.assertEqual(2,len(rows))
  r=next(r for r in rows if r['origin']=='historical')
  self.assertEqual('lien_natif_a_verifier',r['issue'])
  with self.assertRaisesRegex(RuntimeError,'proof refused'): self.f.grade(r,'no-merge')
 def test_already_corrected_partial_and_final_notes_never_regraded(self):
  for i,note in enumerate([0,1,2]):
   rid=self.f.historical(matter=str(i))
   self.f.pg.sql(f"UPDATE apprenant_quiz_results SET details=details||'{json.dumps({'correctionsIA':{'q1':{'pointsObtenus':note}}})}'::jsonb WHERE id='{rid}'")
  before=self.f.fingerprint()
  for r in self.f.rows():
   self.assertEqual('correction_existante_a_preserver',r['issue'])
   with self.assertRaisesRegex(RuntimeError,'proof refused'): self.f.grade(r,str(uuid.uuid4()))
  self.assertEqual(before,self.f.fingerprint())
  self.assertEqual('0',self.f.pg.sql('SELECT count(*) FROM qrc_history_events'))
 def test_submission_timestamp_must_match_original_result(self):
  self.f.historical(); self.f.pg.sql("UPDATE reponses_apprenants SET submitted_at=submitted_at+interval '1 day'")
  r=self.f.rows()[0]; self.assertEqual('remise_non_prouvee',r['issue'])
  with self.assertRaisesRegex(RuntimeError,'proof refused'): self.f.grade(r,'wrong-passage')
 def test_no_text_or_time_dedup_tentatives_preserved(self):
  self.f.historical(tentative=1); self.f.historical(tentative=2)
  self.assertEqual(2,len(self.f.rows())); self.assertEqual({1,2},{r['tentative'] for r in self.f.rows()})
 def test_ambiguous_same_tentative_kept_not_gradeable(self):
  self.f.historical(); self.f.historical()
  rows=self.f.rows(); self.assertEqual(2,len(rows))
  for r in rows:
   self.assertEqual('passage_ambigu',r['issue'])
   with self.assertRaisesRegex(RuntimeError,'proof refused'): self.f.grade(r,str(uuid.uuid4()))
 def test_incomplete_snapshot_missing_bareme_and_unproven(self):
  cases=[({'id':'q1','type':'QRC','enonce':'x','reponseQRC':'x'},'bareme_absent'),({'id':'q1','type':'QRC','points':2},'corrige_absent')]
  for i,(q,issue) in enumerate(cases):
   self.f.historical(matter=str(i),questions=[q]); row=next(r for r in self.f.rows() if r['subject_id']==str(i))
   self.assertEqual(issue,row['issue'])
   with self.assertRaisesRegex(RuntimeError,'proof refused'): self.f.grade(row,str(uuid.uuid4()))
  self.f.historical(matter='amb',ambiguous=True); self.f.historical(matter='draft',submitted=False)
  issues={r['subject_id']:r['issue'] for r in self.f.rows()}
  self.assertEqual('snapshot_ambigu',issues['amb']); self.assertEqual('remise_non_prouvee',issues['draft'])
 def test_duplicate_question_identity_and_no_snapshot(self):
  q={'id':'q1','type':'QRC','points':2,'reponseQRC':'x'}
  self.f.historical(questions=[q,q]); self.assertEqual({'identite_ambigue'},{r['issue'] for r in self.f.rows()})
  self.f.historical(matter='missing',questions=[])
  # Missing question inventory cannot be invented. This is explicitly a rollout blocker.
  self.assertEqual(2,len(self.f.rows()))
 def test_double_click_concurrent_lost_ack_retry(self):
  self.f.historical(); row=self.f.rows()[0]; before=self.f.fingerprint()
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as p:
   events=list(p.map(lambda _:self.f.grade(row,'same-operation'),range(2)))
  self.assertEqual(events[0],events[1])
  for _ in range(12): self.assertEqual(events[0],self.f.grade(row,'same-operation'))
  self.assertEqual('1',self.f.pg.sql('SELECT count(*) FROM qrc_history_events'))
  self.assertEqual(before,self.f.fingerprint()); self.assertEqual(1,self.f.rows()[0]['note'])
 def test_concurrent_different_intents_and_cas(self):
  self.f.historical(); row=self.f.rows()[0]
  def call(op):
   try: return self.f.grade(row,op)
   except RuntimeError: return 'refused'
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as p: out=list(p.map(call,['one','two']))
  self.assertEqual(1,out.count('refused')); self.assertEqual('1',self.f.pg.sql('SELECT count(*) FROM qrc_history_events'))
  refreshed=self.f.rows()[0]; self.f.grade(refreshed,'revision',note=2)
  self.assertEqual('2',self.f.pg.sql('SELECT count(*) FROM qrc_history_events'))
  with self.assertRaisesRegex(RuntimeError,'operation conflict'): self.f.grade(row,'revision',note=0)
 def test_rollback_after_event_insertion(self):
  self.f.historical(); row=self.f.rows()[0]; before=self.f.fingerprint()
  self.f.pg.sql("CREATE FUNCTION injected_fail() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'interruption'; END$$; CREATE TRIGGER injected AFTER INSERT ON qrc_history_events FOR EACH ROW EXECUTE FUNCTION injected_fail()")
  with self.assertRaisesRegex(RuntimeError,'interruption'): self.f.grade(row,'fails')
  self.assertEqual('0',self.f.pg.sql('SELECT count(*) FROM qrc_history_events')); self.assertEqual(before,self.f.fingerprint())
 def test_permissions_direct_writes_and_append_only(self):
  self.f.historical(); row=self.f.rows()[0]
  for uid in [LEARNER,'']:
   with self.assertRaisesRegex(RuntimeError,'admin required'): self.f.grade(row,'unauthorized',uid=uid)
   with self.assertRaisesRegex(RuntimeError,'admin required'): self.f.admin("SELECT count(*) FROM qrc_unified_read()",uid)
   self.assertEqual('0',self.f.admin('SELECT count(*) FROM qrc_history_events',uid))
  with self.assertRaisesRegex(RuntimeError,'permission denied'): self.f.pg.sql('SET ROLE anon; SELECT * FROM qrc_unified_read()')
  with self.assertRaisesRegex(RuntimeError,'permission denied'): self.f.admin('INSERT INTO qrc_history_events(operation_id) VALUES(\'forged\')')
  self.f.grade(row,'legit')
  for statement in ['UPDATE qrc_history_events SET note=0','DELETE FROM qrc_history_events']:
   with self.assertRaisesRegex(RuntimeError,'append-only'): self.f.pg.sql(statement)
 def test_in_progress_native_unchanged_and_grade_range(self):
  self.f.native(state='en_cours'); self.f.historical(); before=self.f.fingerprint()
  rows=self.f.rows(); self.assertEqual('en_cours',next(r for r in rows if r['origin']=='native')['issue'])
  r=next(r for r in rows if r['origin']=='historical')
  for n in [-1,3]:
   with self.assertRaisesRegex(RuntimeError,'out of range'): self.f.grade(r,str(uuid.uuid4()),note=n)
  self.assertEqual(before,self.f.fingerprint())
if __name__=='__main__': unittest.main(verbosity=2)
