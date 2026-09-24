ALTER TABLE public.bilan_question_identites DROP CONSTRAINT bilan_question_identites_etat_initial_check;
ALTER TABLE public.bilan_question_identites ADD CONSTRAINT bilan_question_identites_etat_initial_check CHECK (etat_initial IN ('actif','masque','supprime','litigieux','reserve_introuvable'));
ALTER TABLE public.bilan_question_identite_etats DROP CONSTRAINT bilan_question_identite_etats_etat_check;
ALTER TABLE public.bilan_question_identite_etats ADD CONSTRAINT bilan_question_identite_etats_etat_check CHECK (etat IN ('actif','masque','supprime','litigieux','reserve_introuvable','retire'));