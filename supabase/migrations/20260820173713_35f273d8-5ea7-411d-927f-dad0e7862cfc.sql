UPDATE public.module_editor_state
SET module_data = replace(
      replace(module_data::text, 'G_Marketing_1.pdf?v=20260819-1732', 'G_Marketing_1.pdf'),
      'G_Marketing_1.pdf', 'G_Marketing_1.pdf?v=20260820-1736'
    )::jsonb,
    updated_at = now()
WHERE module_data::text ilike '%G_Marketing_1.pdf%';

UPDATE public.module_editor_state
SET module_data = replace(module_data::text, 'PDF HD Marketing', 'PDF HD Développement Commercial')::jsonb,
    updated_at = now()
WHERE module_data::text ilike '%PDF HD Marketing%';