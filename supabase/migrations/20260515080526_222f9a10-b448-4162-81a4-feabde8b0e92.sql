DROP TRIGGER IF EXISTS trg_protect_manually_edited_questions ON public.module_editor_state;
DROP FUNCTION IF EXISTS public.protect_manually_edited_questions();