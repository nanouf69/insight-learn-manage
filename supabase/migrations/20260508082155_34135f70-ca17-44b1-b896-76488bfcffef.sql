INSERT INTO public.email_templates (id, label, icon, subject_template, body_template) VALUES (
  'modeles-devis-facture-examen-vtc',
  'Modèles devis & facture - Examen VTC',
  '🧾',
  'Modèles de devis et facture à présenter à l''examen VTC',
  'Bonjour {{prenom}},<br><br>Vous trouverez ci-joint, en pièces jointes, deux documents indispensables à présenter le jour de votre <strong>examen pratique VTC</strong> :<br><br>📄 <strong>Modèle de devis</strong> (Modele_Devis_Examen_VTC.pdf)<br>🧾 <strong>Modèle de facture</strong> (Modele_Facture_Examen_VTC.pdf)<br><br>Ces modèles correspondent au format attendu par l''examinateur lors de l''épreuve. Nous vous recommandons de :<br><br>• Les <strong>imprimer en plusieurs exemplaires</strong> et de les apporter le jour de l''examen.<br>• Vous <strong>entraîner à les remplir</strong> à l''avance (mention du tarif, du trajet, du client, de la TVA, etc.).<br>• Avoir un <strong>stylo</strong> sur vous le jour de l''épreuve.<br><br>L''examinateur peut vous demander d''établir un devis et/ou une facture pour une course fictive : être préparé sur ce point est essentiel pour valider l''épreuve.<br><br>Si vous avez la moindre question, n''hésitez pas à nous contacter.<br><br>Bon courage pour votre examen !<br><br>Cordialement,<br><strong>L''équipe FTransport</strong><br>📞 09 70 70 99 60<br>✉️ contact@ftransport.fr'
) ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template;