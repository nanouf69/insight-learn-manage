INSERT INTO public.email_templates (id, label, icon, subject_template, body_template)
VALUES (
  'instructions-connexion-formative',
  '💻 Instructions connexion Formative',
  '💻',
  'Vos identifiants de connexion Formative - {{prenom}} {{nom}}',
  '<p>Bonjour {{prenom}},</p>

<p>Merci de nous avoir choisi.</p>

<p>Tous nos cours et exercices sont sur la plateforme <strong>Formative</strong>.</p>

<p>Merci de vous connecter sur le site <a href="https://www.formative.com" target="_blank">www.formative.com</a> en cliquant sur <strong>Logins (Sign in)</strong> ou <strong>Connexion</strong>.</p>

<p><strong>Votre identifiant de connexion :</strong> votre adresse e-mail<br/>
<strong>Votre mot de passe :</strong> Ftransport69!</p>

<p>Nous vous conseillons de suivre ces étapes :</p>
<ol>
<li>Commencez par lire l''introduction</li>
<li>Effectuez les cours et les exercices</li>
<li>Puis les bilans exercices</li>
<li>Puis les examens blancs</li>
<li>Et enfin les bilans examen</li>
</ol>

<p>Lorsque vous aurez fini d''effectuer vos examens blancs, merci de nous envoyer un mail pour que nous puissions corriger, de même si vous avez des questions ou des remarques.</p>

<p><strong>Réalisez bien le Bilan QCM examen</strong> et <strong>révisez bien les QRC examen</strong>, ce sont des questions types examens.</p>

<p>En cas de difficultés de connexion, merci de bien vouloir nous contacter par mail à <a href="mailto:contact@ftransport.fr">contact@ftransport.fr</a></p>

<p>Cordialement,<br/><strong>FTRANSPORT</strong></p>'
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  updated_at = now();