UPDATE email_templates 
SET body_template = REPLACE(
  body_template, 
  'IBAN : FR76 3000 4014 1800 0101 2475 357<br>BIC : BNPAFRPPXXX', 
  'Destinataire : SERVICES PRO<br>Adresse : 86 ROUTE DE GENAS, 69003, LYON, France<br>IBAN : FR76 2823 3000 0185 7527 9099 426<br>BIC : REVOFRP2'
),
updated_at = now()
WHERE body_template ILIKE '%FR76 3000%' OR body_template ILIKE '%BNPAFRPP%';