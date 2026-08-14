UPDATE public.sessions
SET heure_debut = '09:00',
    heure_fin = '16:00',
    creneaux = ARRAY['9h-16h'],
    updated_at = now()
WHERE id IN ('e0ce913c-702e-4389-acd2-b8035026c0bf','06e64521-2a8f-4b65-b532-edd4b2b2a83b');