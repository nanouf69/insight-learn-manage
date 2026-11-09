# Correction QRC V2
- EB2 VTC copies without a V2 QRC record appear in the same V2 grid via eb2Consultation (ids `consultation:<result_id>`), read-only: no grading, no IA/verification reads, pending stays pending, submission shown as proven only by an identical submitted learner record; why: the old corrector stays closed and core_correct_qrc requires a real V2 record.
- Consultation passage and submission reads use deterministic primary-key pagination, including all enrollment-proof pages; why: a valid submission beyond the first 1000 records must not disappear from the displayed copy.
