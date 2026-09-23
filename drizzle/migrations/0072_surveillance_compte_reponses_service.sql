create or replace function public.surveillance_compte_reponses_service(p_attempt_ids uuid[])
returns table(attempt_id uuid, nb_reponses integer)
language sql stable security definer set search_path = public
as $$
  select s.attempt_id, count(distinct s.question_id)::int
  from public.answer_state s where s.attempt_id = any(p_attempt_ids) group by s.attempt_id
$$;
revoke all on function public.surveillance_compte_reponses_service(uuid[]) from public, anon, authenticated;
grant execute on function public.surveillance_compte_reponses_service(uuid[]) to service_role;