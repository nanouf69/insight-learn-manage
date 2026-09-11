-- Rétablit les modules TA manquants (dont 12 = CAS PRATIQUE TAXI)
UPDATE public.apprenants
SET modules_autorises = ARRAY[3,6,7,12,13,27,28,31,37,40,52,62,64,72,84]
WHERE id IN (
  '793e2b5e-c527-492e-b113-587553282bfa',
  '91075ae0-a8e5-4eae-9a1c-95b48be6c659',
  '93db5385-c295-4ecc-ad50-fd5dfc103714'
);

UPDATE public.apprenants
SET modules_autorises = ARRAY[3,6,7,12,13,27,28,32,37,40,52,62,64,72]
WHERE id = '7672a90a-023b-4ee7-b0da-fdcb8bf36f09';