delete from public.emargements_fc
where apprenant_id in (
  select apprenant_id
  from public.session_apprenants
  where session_id = '24356dfe-30ca-47f3-a200-4b26a6963e1d'
)
and date_emargement between '2026-05-11' and '2026-05-24'
and demi_journee not in ('soir_1', 'soir_2');