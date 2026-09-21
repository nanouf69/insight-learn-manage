-- 1) Nouvelles rubriques du dossier d'audit (additif, aucune donnée existante touchée)
ALTER TABLE public.qualiopi_indicateurs_etat
  ADD COLUMN IF NOT EXISTS script_auditeur text,
  ADD COLUMN IF NOT EXISTS points_vigilance text,
  ADD COLUMN IF NOT EXISTS remarques text;

ALTER TABLE public.qualiopi_preuves
  ADD COLUMN IF NOT EXISTS source_libelle text,
  ADD COLUMN IF NOT EXISTS ce_que_demontre text,
  ADD COLUMN IF NOT EXISTS emplacement text,
  ADD COLUMN IF NOT EXISTS remarque_interne text,
  ADD COLUMN IF NOT EXISTS ref_key text;

CREATE UNIQUE INDEX IF NOT EXISTS qualiopi_preuves_ref_key_uniq
  ON public.qualiopi_preuves (ref_key) WHERE ref_key IS NOT NULL;

-- 2) État documenté des indicateurs 1 à 5 (aucun indicateur déclaré conforme automatiquement)
INSERT INTO public.qualiopi_indicateurs_etat
  (indicateur, statut, applicable, responsable, commentaire_auditeur, date_verification, maj_annuelle, script_auditeur, points_vigilance, remarques)
VALUES
 (1, 'documente', true, 'Direction FTRANSPORT', NULL, CURRENT_DATE, true,
  'FTRANSPORT met à disposition du public, avant l''inscription, les caractéristiques essentielles de ses formations. Pour la formation VTC, le bénéficiaire peut notamment consulter les prérequis, objectifs, durée de 66 heures, modalités et délais d''accès, tarifs, moyens pédagogiques, évaluations et informations relatives à l''accessibilité. Une page dédiée présente également notre dispositif d''accessibilité et notre référent handicap.',
  'Conserver une capture ou un PDF daté des pages publiques afin de pouvoir démontrer ce qui était effectivement publié à la date de l''audit.',
  'Travail réalisé sur l''information publique : page /formation-vtc et page /qualite-accessibilite.'),
 (2, 'documente', true, 'Direction FTRANSPORT', NULL, CURRENT_DATE, true,
  'Nous diffusons publiquement des indicateurs de résultats. Pour la satisfaction, nous avons choisi une donnée directement traçable provenant de Mon Compte Formation/EDOF : 4,58/5. Nous conservons la capture et l''export permettant de justifier cette donnée. Nous disposons également d''un rapport d''activité interne et d''indicateurs complémentaires.',
  'Ne jamais afficher ou déclarer un chiffre qui ne peut pas être relié à une source conservée. L''ancien « 97 % de satisfaction client » et la mention « rapport qualité-prix imbattable » ont été retirés et ne doivent plus servir de preuve.',
  'Statut documenté après publication des nouveaux indicateurs (mise à jour septembre 2026).'),
 (3, 'a_completer', true, 'Direction FTRANSPORT', NULL, CURRENT_DATE, true,
  'Pour les prestations concernées, nous identifions publiquement la certification préparée et renvoyons vers sa fiche France compétences. Nous indiquons également la possibilité ou non de validation partielle, les passerelles et les débouchés. Les informations réglementaires obsolètes ont été retirées de nos supports.',
  'Élément restant à traiter : diffusion du taux d''obtention demandé par l''indicateur 3.',
  'Indicateur à ne pas présenter comme totalement couvert tant que la question de la diffusion du taux d''obtention n''est pas traitée.'),
 (4, 'documente', true, 'Responsable pédagogique', NULL, CURRENT_DATE, false,
  'Avant l''entrée en formation, nous réalisons une analyse individualisée. Nous étudions la situation du candidat, son expérience, son projet professionnel, ses éventuels besoins spécifiques et son niveau initial. Un positionnement sur 50 compétences permet d''identifier ce qui est déjà maîtrisé et ce qui reste à acquérir. L''analyse est rattachée au dossier du bénéficiaire et aboutit à une décision de l''organisme, avec signatures.',
  'Lorsqu''un besoin spécifique est identifié, conserver également la trace de la réponse ou de l''aménagement proposé par FTRANSPORT.',
  'Parcours de pré-information nominatif : analyse du besoin + projet professionnel + test de positionnement + signatures.'),
 (5, 'documente', true, 'Responsable pédagogique', NULL, CURRENT_DATE, false,
  'Nos objectifs ne sont pas uniquement généraux : ils sont déclinés en compétences opérationnelles dans nos programmes. Les cours correspondent à ces compétences et les acquis sont évalués au moyen de quiz et d''exercices. Les réponses, scores et progressions sont enregistrés, ce qui nous permet de démontrer le caractère évaluable des objectifs.',
  'Veiller à ce que le programme diffusé reste aligné avec les contenus et évaluations réellement disponibles sur la plateforme.',
  'Exemple : développement commercial — marketing, valorisation de la prestation VTC, fidélisation/prospection, communication, réseau de partenaires ; compétences travaillées et évaluées sur la plateforme.')
ON CONFLICT (indicateur) DO UPDATE SET
  statut = EXCLUDED.statut,
  applicable = EXCLUDED.applicable,
  responsable = COALESCE(public.qualiopi_indicateurs_etat.responsable, EXCLUDED.responsable),
  date_verification = COALESCE(public.qualiopi_indicateurs_etat.date_verification, EXCLUDED.date_verification),
  maj_annuelle = EXCLUDED.maj_annuelle,
  script_auditeur = COALESCE(public.qualiopi_indicateurs_etat.script_auditeur, EXCLUDED.script_auditeur),
  points_vigilance = COALESCE(public.qualiopi_indicateurs_etat.points_vigilance, EXCLUDED.points_vigilance),
  remarques = COALESCE(public.qualiopi_indicateurs_etat.remarques, EXCLUDED.remarques);

-- 3) Preuves référencées (références vers l'existant, aucune duplication de données pédagogiques)
WITH seed(ref_key, indicateur, titre, ce_que_demontre, emplacement, lien_url, source_libelle) AS (
  VALUES
  ('ind1-01',1,'Page publique /formation-vtc','Diffusion publique des caractéristiques essentielles de la formation VTC','Site public — /formation-vtc','/formation-vtc','Site FTRANSPORT'),
  ('ind1-02',1,'Prérequis de la formation','Conditions d''accès portées à la connaissance du public','Page /formation-vtc — bloc Prérequis','/formation-vtc','Site FTRANSPORT'),
  ('ind1-03',1,'Objectifs de la formation','Objectifs annoncés avant inscription','Page /formation-vtc — bloc Objectifs','/formation-vtc','Site FTRANSPORT'),
  ('ind1-04',1,'Durée : 2 semaines et une journée, soit 66 heures','Durée exacte publiée','Page /formation-vtc — bloc Durée','/formation-vtc','Site FTRANSPORT'),
  ('ind1-05',1,'Modalités d''accès','Modalités d''inscription et d''accès publiées','Page /formation-vtc','/formation-vtc','Site FTRANSPORT'),
  ('ind1-06',1,'Délai d''accès publié (dont délai CPF)','Délai d''accès annoncé au public, notamment via CPF','Page /formation-vtc — délai CPF','/formation-vtc','Site FTRANSPORT'),
  ('ind1-07',1,'Tarifs','Transparence tarifaire avant inscription','Page /formation-vtc — bloc Tarifs','/formation-vtc','Site FTRANSPORT'),
  ('ind1-08',1,'Coordonnées et contact','Accessibilité du contact de l''organisme','Page /formation-vtc — bloc Contact','/formation-vtc','Site FTRANSPORT'),
  ('ind1-09',1,'Méthodes et moyens pédagogiques','Information sur les méthodes mobilisées','Page /formation-vtc','/formation-vtc','Site FTRANSPORT'),
  ('ind1-10',1,'Modalités d''évaluation','Information sur les évaluations','Page /formation-vtc','/formation-vtc','Site FTRANSPORT'),
  ('ind1-11',1,'Informations relatives à l''accessibilité PSH','Prise en compte des personnes en situation de handicap','Page /formation-vtc et /qualite-accessibilite','/qualite-accessibilite','Site FTRANSPORT'),
  ('ind1-12',1,'Page /qualite-accessibilite — référent handicap','Dispositif d''accessibilité et identification du référent handicap','Site public — /qualite-accessibilite','/qualite-accessibilite','Site FTRANSPORT'),
  ('ind1-13',1,'Rubrique « Certification préparée »','Identification de la certification visée lorsqu''elle est pertinente','Page /formation-vtc — bloc Certification préparée','/formation-vtc','Site FTRANSPORT'),

  ('ind2-01',2,'Note moyenne avis stagiaires CPF : 4,58/5','Indicateur de satisfaction traçable auprès du financeur','Mon Compte Formation / EDOF',NULL,'Mon Compte Formation / EDOF'),
  ('ind2-02',2,'Capture du tableau de bord EDOF','Justification de la note 4,58/5 à la date de la capture','Preuve interne — à téléverser dans cette fiche',NULL,'EDOF'),
  ('ind2-03',2,'Export EDOF disponible','Traçabilité de la donnée de satisfaction','Preuve interne — à téléverser dans cette fiche',NULL,'EDOF'),
  ('ind2-04',2,'Avis Google : 4,9/5 — 192 avis','Indicateur complémentaire de satisfaction','Fiche Google Business FTRANSPORT',NULL,'Google'),
  ('ind2-05',2,'1000+ élèves formés','Volume d''activité, sous réserve de conservation de la donnée justificative','Preuve interne — donnée justificative à conserver',NULL,'Interne FTRANSPORT'),
  ('ind2-06',2,'Rapport d''activité 2025','Preuve interne des résultats de l''organisme','Preuve interne — à téléverser dans cette fiche',NULL,'Interne FTRANSPORT'),
  ('ind2-07',2,'Capture de la page d''accueil — indicateurs publiés','Diffusion publique des indicateurs et mention « Indicateurs mis à jour en septembre 2026 »','Site public — page d''accueil','/','Site FTRANSPORT'),

  ('ind3-01',3,'Page publique /formation-vtc','Support d''information sur la certification préparée','Site public — /formation-vtc','/formation-vtc','Site FTRANSPORT'),
  ('ind3-02',3,'Rubrique « Certification préparée »','Identification publique de la certification visée','Page /formation-vtc','/formation-vtc','Site FTRANSPORT'),
  ('ind3-03',3,'Code RS5637','Référence officielle de la certification','Page /formation-vtc','/formation-vtc','France compétences'),
  ('ind3-04',3,'Certificateur indiqué sur la fiche','Identification du certificateur','Page /formation-vtc','/formation-vtc','France compétences'),
  ('ind3-05',3,'Période d''enregistrement indiquée','Validité de l''enregistrement de la certification','Page /formation-vtc','/formation-vtc','France compétences'),
  ('ind3-06',3,'Validation partielle : non','Information sur la possibilité de valider un bloc','Page /formation-vtc','/formation-vtc','France compétences'),
  ('ind3-07',3,'Lien vers la fiche officielle France compétences','Renvoi vers la source officielle','Page /formation-vtc','https://www.francecompetences.fr/recherche/rs/5637/','France compétences'),
  ('ind3-08',3,'Page /metier-vtc','Information sur le métier, les suites de parcours et les débouchés','Site public — /metier-vtc','/metier-vtc','Site FTRANSPORT'),
  ('ind3-09',3,'Bloc « Débouchés possibles »','Débouchés publiés','Page /metier-vtc','/metier-vtc','Site FTRANSPORT'),
  ('ind3-10',3,'Passerelle VTC → TAXI et ses conditions','Information sur les passerelles','Page /metier-vtc','/metier-vtc','Site FTRANSPORT'),
  ('ind3-11',3,'Retrait de l''information obsolète « accès VTC sans examen »','Mise à jour réglementaire des supports','Site public — pages VTC',NULL,'Site FTRANSPORT'),
  ('ind3-12',3,'Retrait du « taux de réussite +90 % » non justifié','Suppression d''un chiffre non traçable','Site public — pages VTC',NULL,'Site FTRANSPORT'),

  ('ind4-01',4,'Parcours de pré-information nominatif','Analyse individualisée rattachée au bénéficiaire','CRM — parcours de pré-information','/pre-information','CRM FTRANSPORT'),
  ('ind4-02',4,'Formulaire « Analyse du besoin »','Formalisation du besoin avant l''entrée en formation','CRM — dossier du bénéficiaire',NULL,'CRM FTRANSPORT'),
  ('ind4-03',4,'Situation actuelle du candidat','Prise en compte de la situation du bénéficiaire','Formulaire Analyse du besoin',NULL,'CRM FTRANSPORT'),
  ('ind4-04',4,'Expérience dans le transport de personnes','Prise en compte de l''expérience','Formulaire Analyse du besoin',NULL,'CRM FTRANSPORT'),
  ('ind4-05',4,'Secteur d''expérience','Contextualisation du parcours du candidat','Formulaire Analyse du besoin',NULL,'CRM FTRANSPORT'),
  ('ind4-06',4,'Besoins spécifiques et besoins d''adaptation','Identification des besoins d''adaptation','Formulaire Analyse du besoin',NULL,'CRM FTRANSPORT'),
  ('ind4-07',4,'Besoin éventuel d''équipement informatique','Identification des conditions matérielles de suivi','Formulaire Analyse du besoin',NULL,'CRM FTRANSPORT'),
  ('ind4-08',4,'Rubrique « Projet professionnel »','Analyse du projet du bénéficiaire','Formulaire de pré-information',NULL,'CRM FTRANSPORT'),
  ('ind4-09',4,'Objectifs professionnels à court et moyen terme','Projection professionnelle du candidat','Rubrique Projet professionnel',NULL,'CRM FTRANSPORT'),
  ('ind4-10',4,'Test de compétences VTC — 50 items','Positionnement du niveau initial','CRM — test de compétences',NULL,'CRM FTRANSPORT'),
  ('ind4-11',4,'Identification des compétences maîtrisées / à apprendre','Résultat exploitable du positionnement','CRM — résultat du test de compétences',NULL,'CRM FTRANSPORT'),
  ('ind4-12',4,'Décision finale de l''organisme : admis / non admis','Décision formalisée au vu du dossier','CRM — dossier du bénéficiaire',NULL,'CRM FTRANSPORT'),
  ('ind4-13',4,'Signature du stagiaire','Engagement du bénéficiaire','CRM — dossier signé',NULL,'CRM FTRANSPORT'),
  ('ind4-14',4,'Signature du responsable pédagogique','Validation de l''organisme','CRM — dossier signé',NULL,'CRM FTRANSPORT'),

  ('ind5-01',5,'Programme détaillé VTC','Objectifs formalisés dans les supports pédagogiques','Programme de formation VTC','/formation-vtc','FTRANSPORT'),
  ('ind5-02',5,'Objectifs pédagogiques détaillés par matière','Déclinaison opérationnelle des objectifs','Programme de formation VTC',NULL,'FTRANSPORT'),
  ('ind5-03',5,'Référentiel / compétences travaillées','Mise en correspondance objectifs / compétences','Programme et plateforme',NULL,'FTRANSPORT'),
  ('ind5-04',5,'Plateforme pédagogique FTRANSPORT','Support de mise en œuvre et d''évaluation des objectifs','Espace apprenant — cours en ligne','/cours-en-ligne','Plateforme FTRANSPORT'),
  ('ind5-05',5,'Cours correspondant aux matières de l''examen VTC','Cohérence contenus / objectifs','Plateforme — modules de cours','/cours-en-ligne','Plateforme FTRANSPORT'),
  ('ind5-06',5,'Quiz et exercices associés aux cours','Caractère évaluable des objectifs','Plateforme — quiz et exercices','/cours-en-ligne','Plateforme FTRANSPORT'),
  ('ind5-07',5,'Enregistrement des réponses','Traçabilité des acquis','Plateforme — réponses des apprenants',NULL,'Plateforme FTRANSPORT'),
  ('ind5-08',5,'Scores obtenus','Mesure des acquis','Plateforme — résultats',NULL,'Plateforme FTRANSPORT'),
  ('ind5-09',5,'Résultats en points et en pourcentage','Évaluation chiffrée des objectifs','Plateforme — résultats',NULL,'Plateforme FTRANSPORT'),
  ('ind5-10',5,'Possibilité de revoir les corrections','Exploitation pédagogique des évaluations','Plateforme — corrections',NULL,'Plateforme FTRANSPORT'),
  ('ind5-11',5,'Progression pédagogique enregistrée','Suivi de l''atteinte des objectifs','Plateforme — suivi de progression',NULL,'Plateforme FTRANSPORT'),
  ('ind5-12',5,'Exemple — développement commercial','Objectifs opérationnels : marketing, valorisation de la prestation VTC, fidélisation/prospection, communication, réseau de partenaires ; travaillés et évalués sur la plateforme','Programme VTC + plateforme',NULL,'FTRANSPORT')
), ins AS (
  INSERT INTO public.qualiopi_preuves
    (titre, description, ce_que_demontre, emplacement, lien_url, source_libelle, source_type, ref_key, date_preuve)
  SELECT s.titre, s.ce_que_demontre, s.ce_que_demontre, s.emplacement, s.lien_url, s.source_libelle, 'reference', s.ref_key, CURRENT_DATE
  FROM seed s
  WHERE NOT EXISTS (SELECT 1 FROM public.qualiopi_preuves p WHERE p.ref_key = s.ref_key)
  RETURNING id, ref_key
)
INSERT INTO public.qualiopi_preuve_liens (preuve_id, indicateur)
SELECT i.id, s.indicateur FROM ins i JOIN seed s ON s.ref_key = i.ref_key
ON CONFLICT (preuve_id, indicateur) DO NOTHING;