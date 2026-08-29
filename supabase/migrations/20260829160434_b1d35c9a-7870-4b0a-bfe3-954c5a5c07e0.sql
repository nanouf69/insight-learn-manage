-- Titre unique à la seconde près (devis multiples la même minute)
create or replace function public.sync_devis_to_documents_completes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_est_signe boolean := (new.statut = 'signe' or new.signed_at is not null);
  v_user_id uuid;
  v_date_txt text := to_char(coalesce(new.created_at, now()), 'DD/MM/YYYY HH24:MI:SS');
  v_titre text;
begin
  if new.apprenant_id is null then
    return new;
  end if;

  select p.user_id into v_user_id
  from public.apprenants a
  join public.profiles p on lower(p.email) = lower(a.email)
  where a.id = new.apprenant_id
  limit 1;

  v_titre := 'Devis' || coalesce(' — ' || new.formation, '') || ' du ' || v_date_txt
             || case when v_est_signe then ' (signé)' else '' end;

  if tg_op = 'INSERT' then
    insert into public.apprenant_documents_completes
      (apprenant_id, user_id, type_document, titre, donnees, completed_at)
    values (
      new.apprenant_id,
      v_user_id,
      'devis-personnel',
      v_titre,
      jsonb_build_object(
        'devis_envoi_id', new.id,
        'modele', new.modele,
        'formation', new.formation,
        'montant', new.montant,
        'dates_formation', new.dates_formation,
        'date_devis', new.date_devis,
        'statut', case when v_est_signe then 'Signé' else 'Rempli (non signé)' end,
        'signe', v_est_signe,
        'fichier_url', coalesce(new.devis_signe_url, new.fichier_url)
      ),
      coalesce(new.signed_at, new.created_at, now())
    )
    on conflict (apprenant_id, type_document, titre) do nothing;
  elsif tg_op = 'UPDATE' then
    update public.apprenant_documents_completes
       set user_id = coalesce(user_id, v_user_id),
           donnees = donnees || jsonb_build_object(
             'devis_envoi_id', new.id,
             'formation', new.formation,
             'montant', new.montant,
             'dates_formation', new.dates_formation,
             'statut', case when v_est_signe then 'Signé' else 'Rempli (non signé)' end,
             'signe', v_est_signe,
             'fichier_url', coalesce(new.devis_signe_url, new.fichier_url)
           ),
           completed_at = coalesce(new.signed_at, completed_at)
     where apprenant_id = new.apprenant_id
       and type_document = 'devis-personnel'
       and donnees->>'devis_envoi_id' = new.id::text;
  end if;
  return new;
end $$;

revoke execute on function public.sync_devis_to_documents_completes() from public, anon, authenticated;

-- Rattrapage final
insert into public.apprenant_documents_completes (apprenant_id, user_id, type_document, titre, donnees, completed_at)
select d.apprenant_id,
       (select p.user_id from public.apprenants a2
         join public.profiles p on lower(p.email) = lower(a2.email)
        where a2.id = d.apprenant_id limit 1),
       'devis-personnel',
       'Devis' || coalesce(' — ' || d.formation, '')
         || ' du ' || to_char(coalesce(d.created_at, now()), 'DD/MM/YYYY HH24:MI:SS')
         || case when (d.statut = 'signe' or d.signed_at is not null) then ' (signé)' else '' end,
       jsonb_build_object(
         'devis_envoi_id', d.id,
         'modele', d.modele,
         'formation', d.formation,
         'montant', d.montant,
         'dates_formation', d.dates_formation,
         'date_devis', d.date_devis,
         'statut', case when (d.statut = 'signe' or d.signed_at is not null) then 'Signé' else 'Rempli (non signé)' end,
         'signe', (d.statut = 'signe' or d.signed_at is not null),
         'fichier_url', coalesce(d.devis_signe_url, d.fichier_url)
       ),
       coalesce(d.signed_at, d.created_at, now())
from public.devis_envois d
where d.apprenant_id is not null
  and not exists (
    select 1 from public.apprenant_documents_completes c
    where c.apprenant_id = d.apprenant_id
      and c.type_document = 'devis-personnel'
      and c.donnees->>'devis_envoi_id' = d.id::text
  )
on conflict (apprenant_id, type_document, titre) do nothing;