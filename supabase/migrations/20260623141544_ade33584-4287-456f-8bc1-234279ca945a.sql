INSERT INTO public.email_templates (id, label, icon, subject_template, body_template)
VALUES (
  'equivalence-carte-chauffeur-vtc',
  '🪪 Dossier équivalence carte chauffeur VTC',
  '🪪',
  'Dossier équivalence carte professionnelle VTC - {{prenom}} {{nom}}',
  '<p>Bonjour,</p>
<p>Pour la demande de carte professionnelle, merci de nous envoyer les documents suivants :</p>
<ul>
<li>Pièce d''identité</li>
<li>Permis de conduire</li>
<li>Justificatif de domicile de moins de 3 mois (si hébergé : pièce d''identité de l''hébergeant + attestation d''hébergement)</li>
<li>Photo</li>
<li>Certificat médical agréé conduite (voir liste médecins)</li>
<li>Application Identité Numérique validée à La Poste</li>
<li>Bulletins de salaire (minimum 1 607 heures travaillées)</li>
<li>Contrat(s) de travail</li>
<li>Attestation(s) employeur(s)</li>
<li>Carte qualification conducteur (si prévue par la réglementation)</li>
<li>Relevé de carrière</li>
</ul>
<p>👉 <a href="https://www.demarches-simplifiees.fr/commencer/obligations-visite-medicale-ou-formation-continue-rhone" target="_blank">Lien démarches simplifiées</a></p>
<p>Nous reprendrons contact très prochainement.</p>
<p>Cordialement,</p>
<p><strong>FTRANSPORT</strong><br/>
Centre de formation<br/>
86 Route de Genas 69003 Lyon<br/>
📞 04.28.29.60.91<br/>
De 9h à 17h sur rendez-vous</p>'
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  updated_at = now();