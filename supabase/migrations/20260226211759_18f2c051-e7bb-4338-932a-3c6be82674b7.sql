
CREATE TABLE public.email_templates (
  id text PRIMARY KEY,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '📧',
  subject_template text NOT NULL,
  body_template text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email_templates" ON public.email_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.email_templates (id, label, icon, subject_template, body_template) VALUES
('bienvenue', '📄 Document de bienvenue', '📄', 
 'Bienvenue chez Ftransport - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}} {{nom}},\n\nNous avons le plaisir de vous confirmer votre inscription à la formation {{formation}}.\n\n⚠️ IMPORTANT : Afin de valider définitivement votre inscription à l''examen, merci de cliquer sur le lien ci-dessous et de suivre les étapes. Sans cela, vous ne serez pas inscrit à l''examen.\n\n👉 CLIQUEZ ICI POUR VOUS INSCRIRE : {{onboarding_url}}\n\nPour toute question, contactez-nous :\n📞 Tél : 04 28 29 60 91\n📧 Email : contact@ftransport.fr\n\nCordialement,\nL''équipe Ftransport\n86 Route de Genas, 69003 Lyon'),

('rappel-documents', '📋 Rappel documents manquants', '📋',
 'Rappel : Documents manquants - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}},\n\nNous vous rappelons que certains documents nécessaires à la finalisation de votre dossier d''inscription sont encore manquants.\n\nMerci de nous transmettre les pièces manquantes dans les plus brefs délais afin que nous puissions procéder à votre inscription à l''examen.\n\nVous pouvez compléter votre dossier en ligne : {{onboarding_url}}\n\nN''hésitez pas à nous contacter si vous avez des questions.\n\nCordialement,\nL''équipe Ftransport\n📞 04 28 29 60 91'),

('convocation-examen', '🎓 Convocation examen', '🎓',
 'Convocation à l''examen - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}},\n\nNous avons le plaisir de vous informer que votre inscription à l''examen a bien été validée.\n\n📅 Date de l''examen : [À compléter]\n📍 Lieu : [À compléter]\n🕐 Heure de convocation : [À compléter]\n\nDocuments à apporter le jour de l''examen :\n- Pièce d''identité en cours de validité\n- Convocation (ce mail)\n\nNous vous souhaitons bonne chance !\n\nCordialement,\nL''équipe Ftransport\n📞 04 28 29 60 91'),

('confirmation-inscription', '✅ Confirmation d''inscription', '✅',
 'Confirmation d''inscription - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}},\n\nNous vous confirmons que votre inscription à la formation {{formation}} est bien enregistrée et votre dossier est complet.\n\nVotre formation débutera prochainement. Nous vous transmettrons les informations pratiques (dates, horaires, lieu) par email.\n\nEn attendant, n''hésitez pas à nous contacter pour toute question.\n\nCordialement,\nL''équipe Ftransport\n📞 04 28 29 60 91\n📧 contact@ftransport.fr'),

('relance-paiement', '💰 Relance paiement', '💰',
 'Relance paiement - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}},\n\nNous vous contactons au sujet du règlement de votre formation. À ce jour, nous n''avons pas encore reçu votre paiement.\n\nMerci de procéder au règlement dans les meilleurs délais ou de nous contacter pour convenir d''un échéancier.\n\nCordialement,\nL''équipe Ftransport\n📞 04 28 29 60 91\n📧 contact@ftransport.fr'),

('repassage-examen', '🔄 Repassage examen théorique', '🔄',
 'Réinscription à l''examen théorique T3P - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}},<br><br>Suite à votre précédent examen théorique {{formation}}, vous devez procéder à une nouvelle inscription pour repasser l''examen théorique.<br><br>📌 <strong>ÉTAPES À SUIVRE :</strong><br><br><strong>1️⃣ Rendez-vous sur le site :</strong><br>👉 <a href="https://www.exament3p.fr" target="_blank">www.exament3p.fr</a><br><br><strong>2️⃣ Connectez-vous avec :</strong><br>• Login : votre adresse email<br>• Mot de passe : cliquez sur "Mot de passe oublié" pour en créer un nouveau<br><br><strong>3️⃣ Une fois connecté(e), procédez à votre réinscription à l''examen théorique</strong> en suivant les instructions du site.<br><br>⚠️ <strong>IMPORTANT — Département 69 obligatoire :</strong><br><span style="color: red; font-size: 16px; font-weight: bold;">🔴 ATTENTION : Lors de votre réinscription, vous devez IMPÉRATIVEMENT sélectionner le département 69 (Rhône).</span><br><br>📞 Tél : <strong>04 28 29 60 91</strong><br>📧 Email : contact@ftransport.fr<br><br>Cordialement,<br><strong>L''équipe Ftransport</strong><br>86 Route de Genas, 69003 Lyon'),

('echec-theorique', '❌ Échec examen théorique', '❌',
 'Suite à votre examen T3P - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}},<br><br>Nous avons bien pris connaissance des résultats de votre examen théorique {{formation}} et nous tenons d''abord à vous encourager : <strong>l''échec n''est qu''une étape, pas une fin</strong>.<br><br><strong>1️⃣ Rendez-vous sur le site officiel :</strong><br>👉 <a href="http://www.exament3p.fr">www.exament3p.fr</a><br><br><strong>2️⃣ Connectez-vous à votre espace</strong><br><br><strong>3️⃣ Procédez à votre réinscription</strong><br><br>⚠️ <strong>Département 69 obligatoire</strong><br><br>📞 <strong>04 28 29 60 91</strong><br>📧 contact@ftransport.fr<br><br>Cordialement,<br><strong>FTRANSPORT</strong><br>86 Route de Genas, 69003 Lyon'),

('felicitations-vtc-pratique', '🎉 Félicitations VTC - Choix date pratique', '🎉',
 'Félicitations - Choix de votre date de formation pratique VTC - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}},<br><br>Félicitations, vous venez de réussir votre épreuve d''admissibilité.<br><br>Vous devrez choisir une journée complète d''entraînement pratique (de 9h à 17h).<br><br>👉 <a href="{{booking_url}}">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : vous ne pouvez choisir qu''UNE SEULE date.<br><br>📚 Merci de bien réviser le cours sur la pratique.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon<br><br>⏰ <strong>Convocation : merci d''être présent(e) 15 minutes avant.</strong><br><br>Cordialement,<br>FTRANSPORT<br>📞 04.28.29.60.91'),

('felicitations-taxi-pratique', '🎉 Félicitations TAXI - Choix date pratique', '🎉',
 'Félicitations - Choix de votre date de formation pratique TAXI - {{prenom}} {{nom}}',
 E'Bonjour {{prenom}},<br><br>Félicitations, vous venez de réussir votre épreuve d''admissibilité.<br><br>Vous devrez choisir une journée complète d''entraînement pratique.<br><br>👉 <a href="{{booking_url}}">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : vous ne pouvez choisir qu''UNE SEULE date.<br><br>📚 Merci de bien réviser le cours sur la pratique.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon<br><br>⏰ <strong>Convocation : merci d''être présent(e) 15 minutes avant.</strong><br><br>Cordialement,<br>FTRANSPORT<br>📞 04.28.29.60.91'),

('confirmation-formation-continue', '📩 Confirmation formation continue', '📩',
 'Confirmation d''inscription formation continue - {{prenom}} {{nom}}',
 E'{{civilite}} {{prenom}} {{nom}}<br><br>{{adresse}}<br>{{code_postal}} {{ville}}<br><br><br>Lyon, le {{date_jour}}<br><br>Bonjour,<br><br>Nous avons le plaisir de vous convier pour la formation :<br><br><strong>{{formation}}</strong><br><br>Le <strong>{{date_debut}}</strong><br><br>Horaires : de 8h45 a 12h et de 13h a 17h<br><br>Adresse : 86 route de Genas 69003 Lyon<br><br><br>A l''issue des quatorze heures de formation, une attestation de formation continue vous sera delivree.<br><br><span style="color: red; font-size: 18px; font-weight: bold;">⚠️ IMPORTANT : Nous vous rappelons que votre présence est obligatoire. En cas d''absence et/ou de retard, l''attestation de formation continue ne vous sera pas remise.</span><br><br>Pour les personnes qui n''ont pas réglé leur formation, merci de préparer l''appoint.<br><br><strong>RIB - SASU SERVICES PRO F TRANSPORT</strong><br><br>IBAN : FR76 3000 4014 1800 0101 2475 357<br>BIC : BNPAFRPPXXX');
