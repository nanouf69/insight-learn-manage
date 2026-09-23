-- Surveillance : comptage des réponses serveur par tentative, calculé en base (lecture seule).
create or replace function public.surveillance_compte_reponses(p_attempt_ids uuid[])
returns table(attempt_id uuid, nb_reponses integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.attempt_id, count(distinct s.question_id)::int
  from public.answer_state s
  where s.attempt_id = any(p_attempt_ids)
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'))
  group by s.attempt_id
$$;
revoke all on function public.surveillance_compte_reponses(uuid[]) from public, anon;
grant execute on function public.surveillance_compte_reponses(uuid[]) to authenticated, service_role;