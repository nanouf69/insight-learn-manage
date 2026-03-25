INSERT INTO email_templates (id, label, icon, subject_template, body_template)
VALUES (
  'relance-paiement-fc',
  '💸 Relance paiement Formation Continue',
  '💸',
  'URGENT – Inscription non validée sans paiement - {{prenom}} {{nom}}',
  'Bonjour {{prenom}},<br><br>Nous faisons suite à votre demande d''inscription à la <strong>{{formation}}</strong>.<br><br><span style="color: red; font-size: 16px; font-weight: bold;">⚠️ ATTENTION : À ce jour, nous n''avons reçu aucun règlement de votre part. Votre inscription n''est donc PAS validée et vous ne pourrez PAS accéder à la formation.</span><br><br>Pour confirmer définitivement votre place, vous devez effectuer un <strong>virement bancaire immédiat</strong> aux coordonnées suivantes :<br><br><strong>RIB - SASU SERVICES PRO F TRANSPORT</strong><br><br>Destinataire : SERVICES PRO<br>Adresse : 86 ROUTE DE GENAS, 69003, LYON, France<br>IBAN : FR76 2823 3000 0185 7527 9099 426<br>BIC : REVOFRP2<br><br>Sans réception du virement, votre place sera automatiquement libérée et attribuée à un autre candidat.<br><br>Une fois le virement effectué, merci de nous envoyer le justificatif par retour de mail afin que nous puissions valider votre inscription.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>📧 contact@ftransport.fr'
) ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  updated_at = now();