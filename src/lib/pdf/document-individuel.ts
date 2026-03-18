import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoImage from '@/assets/logo-ftransport.png';

const COMPANY_INFO = {
  name: 'Ftransport',
  address: '86 Route de Genas 69003 Lyon',
  siret: '53516371400044',
  naf: '8559A',
  declaration: '11770762377',
};

const FIELD_LABELS: Record<string, string> = {
  formType: 'Type de formation',
  dateEntretien: "Date d'entretien",
  conseiller: 'Conseiller',
  lieuNaissance: 'Lieu de naissance',
  statutActuel: 'Statut actuel',
  metierActuel: 'Metier actuel',
  anciennete: 'Anciennete',
  niveauFormation: 'Niveau de formation',
  motivations: 'Motivations',
  dejaTransport: 'Experience transport',
  detailTransport: 'Detail transport',
  permis3ans: 'Permis > 3 ans',
  datePermis: 'Date du permis',
  modeExercice: "Mode d'exercice",
  plateformes: 'Plateformes envisagees',
  diffTaxiVtc: 'Difference Taxi/VTC',
  modeExerciceTaxi: "Mode d'exercice Taxi",
  demandeADS: 'Demande ADS',
  zoneExercice: "Zone d'exercice",
  zoneAutre: 'Zone (autre)',
  activitesCompl: 'Activites complementaires',
  demarchesEntreprise: 'Demarches entreprise',
  craintes: 'Craintes',
  commentConnu: 'Comment connu',
  consulteProgram: 'Programme consulte',
  saitExamen: "Connaissance de l'examen",
  connaitZone: 'Connaissance de la zone',
  conduiteUrbaine: 'Conduite urbaine',
  connaitSites: 'Connaissance des sites',
  besoinsAdaptation: 'Besoins adaptation',
  accesOrdinateur: 'Acces ordinateur',
  precisionsBesoins: 'Precisions besoins',
  coherenceProjet: 'Coherence du projet',
  niveauMotivation: 'Niveau de motivation',
  observations: 'Observations',
  nom: 'Nom', prenom: 'Prenom', email: 'Email', telephone: 'Telephone',
  adresse: 'Adresse', codePostal: 'Code postal', ville: 'Ville',
  formationVTC: 'Formation VTC', formationTAXI: 'Formation TAXI',
  eligibility: 'Eligibilite', complementary: 'Complementaire',
  centreFormation: 'Centre de formation', typeHandicap: 'Type handicap',
  engagementAccepted: 'Engagement accepte', dateDocument: 'Date du document',
  noteGlobale: 'Note globale', pointsForts: 'Points forts',
  pointsAmeliorer: 'Points a ameliorer', suggestions: 'Suggestions',
  formationType: 'Type de formation', commentaires: 'Commentaires',
  cgv_accepted: 'CGV acceptees', ri_accepted: 'Reglement interieur accepte',
  accepted: 'Accepte', accepted_at: 'Date acceptation',
  signed_at: 'Date de signature', formationLabel: 'Formation',
  // Pre-information publique - Analyse du besoin
  situation_actuelle: 'Quelle est votre situation actuelle ?',
  niveau_etude: "Quel est votre niveau d'etudes ?",
  experience_transport: 'Avez-vous une experience dans le transport de personnes ?',
  type_experience: 'Si oui, dans quel secteur ?',
  permis_conduire: 'Depuis combien de temps avez-vous le permis B ?',
  motivation: 'Quelle est votre principale motivation pour cette formation ?',
  disponibilite: 'Quelles sont vos disponibilites pour suivre la formation ?',
  financement: 'Quel mode de financement envisagez-vous ?',
  besoins_specifiques: 'Avez-vous des besoins specifiques ?',
  comment_connu: 'Comment avez-vous connu FTRANSPORT ?',
  attentes: 'Quelles sont vos principales attentes vis-a-vis de la formation ?',
  delai_formation: 'Quand souhaitez-vous commencer la formation ?',
  // Pre-information publique - Projet professionnel
  objectif_court_terme: 'Quel est votre objectif a court terme (6 mois) ?',
  objectif_moyen_terme: 'Quel est votre objectif a moyen terme (1 a 3 ans) ?',
  type_activite: "Quel type d'activite envisagez-vous ?",
  zone_geographique: 'Dans quelle zone geographique souhaitez-vous exercer ?',
  statut_juridique: 'Quel statut juridique envisagez-vous ?',
  vehicule_prevu: 'Avez-vous deja prevu un vehicule pour votre activite ?',
  budget_investissement: "Quel est votre budget d'investissement estime ?",
  date_debut_activite: 'Quand souhaitez-vous demarrer votre activite professionnelle ?',
  connaissance_reglementation: 'Connaissez-vous la reglementation du secteur ?',
  plateforme_envisagee: 'Envisagez-vous de travailler avec une plateforme de mise en relation ?',
  accompagnement_souhaite: 'Souhaitez-vous un accompagnement apres la formation ?',
};

const TYPE_TITLES: Record<string, string> = {
  'test-competences': 'FICHE DE POSITIONNEMENT STAGIAIRE',
  'projet-professionnel': 'QUESTIONNAIRE PROJET PROFESSIONNEL',
  'analyse-besoin': 'VERIFICATION DES PREREQUIS',
  'evaluation-acquis': 'EVALUATION PEDAGOGIQUE',
  'satisfaction': 'ENQUETE DE SATISFACTION',
  'cgv-acceptation': 'CONDITIONS GENERALES DE VENTE',
  'cgv-ri-acceptation': 'CGV ET REGLEMENT INTERIEUR',
};

function getLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
}

function isBase64(val: string): boolean {
  return typeof val === 'string' && (val.startsWith('data:image/') || (val.length > 300 && /^[A-Za-z0-9+/=\n]+$/.test(val.slice(0, 100))));
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 278) { doc.addPage(); return 20; }
  return y;
}

// ---- Render helpers ----

function renderSectionHeader(doc: jsPDF, title: string, y: number, margin: number, pw: number): number {
  y = ensureSpace(doc, y, 14);
  doc.setFillColor(13, 37, 64);
  doc.rect(margin, y - 3, pw - margin * 2, 9, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin + 4, y + 3);
  return y + 12;
}

function renderQA(doc: jsPDF, question: string, answer: string, y: number, margin: number, pw: number): number {
  const maxW = pw - margin * 2 - 16;

  // Question
  y = ensureSpace(doc, y, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 37, 64);
  const qLines = doc.splitTextToSize(`Question : ${question}`, maxW);
  for (const l of qLines) { y = ensureSpace(doc, y, 5); doc.text(l, margin + 6, y); y += 4.5; }

  // Answer
  y = ensureSpace(doc, y, 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const displayAnswer = answer || '(Non repondu)';
  const aLines = doc.splitTextToSize(`Reponse : ${displayAnswer}`, maxW);
  for (const l of aLines) { y = ensureSpace(doc, y, 5); doc.text(l, margin + 10, y); y += 4.5; }

  y += 3;
  return y;
}

function renderField(doc: jsPDF, key: string, value: any, y: number, margin: number, pw: number): number {
  if (value === null || value === undefined || value === '') return y;

  if (typeof value === 'string' && isBase64(value)) {
    y = ensureSpace(doc, y, 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(34, 150, 60);
    doc.text(`${getLabel(key)} : [Signature numerique presente]`, margin + 6, y);
    return y + 6;
  }

  if (typeof value === 'boolean') {
    y = ensureSpace(doc, y, 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(`${getLabel(key)} :`, margin + 6, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(value ? 34 : 200, value ? 150 : 60, value ? 60 : 60);
    doc.text(value ? 'Oui' : 'Non', margin + 65, y);
    return y + 6;
  }

  if (Array.isArray(value)) {
    y = ensureSpace(doc, y, 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(`${getLabel(key)} :`, margin + 6, y);
    y += 5;
    for (const item of value) {
      if (typeof item === 'object' && item !== null) {
        y = renderObjectFields(doc, item, y, margin, pw);
      } else {
        y = ensureSpace(doc, y, 5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(`  - ${String(item)}`, margin + 10, y);
        y += 5;
      }
    }
    return y;
  }

  if (typeof value === 'object') {
    y = renderSectionHeader(doc, getLabel(key), y, margin, pw);
    y = renderObjectFields(doc, value, y, margin, pw);
    return y;
  }

  // Simple value
  y = ensureSpace(doc, y, 7);
  const label = `${getLabel(key)} : `;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(label, margin + 6, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const strVal = String(value);
  const labelW = doc.getTextWidth(label);
  const remaining = pw - margin * 2 - labelW - 12;

  if (remaining > 25 && doc.getTextWidth(strVal) <= remaining) {
    doc.text(strVal, margin + 6 + labelW, y);
    y += 6;
  } else {
    y += 5;
    const wrapped = doc.splitTextToSize(strVal, pw - margin * 2 - 14);
    for (const line of wrapped) { y = ensureSpace(doc, y, 5); doc.text(line, margin + 10, y); y += 4.5; }
    y += 2;
  }
  return y;
}

function renderObjectFields(doc: jsPDF, obj: any, y: number, margin: number, pw: number): number {
  const SKIP = new Set(['id', 'apprenant_id', 'user_id', 'module_id', 'created_at', 'updated_at']);
  for (const [key, value] of Object.entries(obj)) {
    if (SKIP.has(key)) continue;
    y = renderField(doc, key, value, y, margin, pw);
  }
  return y;
}

// ---- Specialized renderers ----

function renderTestCompetences(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  if (donnees.formationLabel) {
    y = renderField(doc, 'formationLabel', donnees.formationLabel, y, margin, pw);
  }

  if (donnees.sections && Array.isArray(donnees.sections) && donnees.answers) {
    for (let si = 0; si < donnees.sections.length; si++) {
      y = renderSectionHeader(doc, donnees.sections[si], y, margin, pw);

      const sectionItems: string[] | undefined = donnees.sectionItems?.[si];
      const sectionAnswers = Object.entries(donnees.answers as Record<string, string>)
        .filter(([key]) => key.startsWith(`${si}-`))
        .sort(([a], [b]) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));

      for (const [key, value] of sectionAnswers) {
        const qIdx = parseInt(key.split('-')[1]);
        const questionText = sectionItems?.[qIdx] || `Question ${qIdx + 1}`;
        y = renderQA(doc, questionText, String(value), y, margin, pw);
      }
    }
  }
  return y;
}

function renderSatisfaction(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const NOTES: Record<number, string> = { 1: 'Tres insatisfait', 2: 'Insatisfait', 3: 'Neutre', 4: 'Satisfait', 5: 'Tres satisfait' };

  if (donnees.parties && Array.isArray(donnees.parties)) {
    for (const partie of donnees.parties) {
      y = renderSectionHeader(doc, partie.titre || 'Section', y, margin, pw);

      if (partie.criteres && Array.isArray(partie.criteres)) {
        for (const c of partie.criteres) {
          const noteLabel = c.value != null ? `${c.value}/5 - ${NOTES[c.value] || ''}` : 'Non repondu';
          y = renderQA(doc, c.label, noteLabel, y, margin, pw);
        }
      }
    }
  }

  for (const key of ['noteGlobale', 'pointsForts', 'pointsAmeliorer', 'suggestions', 'commentaires']) {
    if (donnees[key]) y = renderField(doc, key, donnees[key], y, margin, pw);
  }
  return y;
}

function renderEvaluationAcquis(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const NIVEAUX: Record<string, string> = { A: 'Acquis', B: 'En cours', C: 'Non acquis', D: 'Non evalue' };

  if (donnees.parties && Array.isArray(donnees.parties)) {
    for (const partie of donnees.parties) {
      y = renderSectionHeader(doc, partie.titre || 'Section', y, margin, pw);

      if (partie.competences && Array.isArray(partie.competences)) {
        for (const comp of partie.competences) {
          const val = comp.value || 'D';
          const answer = `${NIVEAUX[val] || val}${comp.observation ? ` - Obs: ${comp.observation}` : ''}`;
          y = renderQA(doc, comp.label, answer, y, margin, pw);
        }
      }
    }
  }

  if (donnees.commentaires) y = renderField(doc, 'commentaires', donnees.commentaires, y, margin, pw);
  return y;
}

function renderProjetProfessionnel(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const SECTIONS = [
    { title: 'INFORMATIONS GENERALES', keys: ['formType', 'dateEntretien', 'conseiller', 'lieuNaissance'] },
    { title: 'SITUATION ACTUELLE', keys: ['statutActuel', 'metierActuel', 'anciennete', 'niveauFormation'] },
    { title: 'PROJET PROFESSIONNEL', keys: ['motivations', 'dejaTransport', 'detailTransport', 'permis3ans', 'datePermis', 'modeExercice', 'plateformes', 'diffTaxiVtc', 'modeExerciceTaxi', 'demandeADS', 'zoneExercice', 'zoneAutre', 'activitesCompl', 'demarchesEntreprise', 'craintes'] },
    { title: 'CONNAISSANCES PREALABLES', keys: ['commentConnu', 'consulteProgram', 'saitExamen', 'connaitZone', 'conduiteUrbaine', 'connaitSites'] },
    { title: 'BESOINS SPECIFIQUES', keys: ['besoinsAdaptation', 'accesOrdinateur', 'precisionsBesoins'] },
    { title: 'AVIS CONSEILLER', keys: ['coherenceProjet', 'niveauMotivation', 'observations'] },
  ];

  for (const section of SECTIONS) {
    const filled = section.keys.filter(k => donnees[k] !== undefined && donnees[k] !== null && donnees[k] !== '');
    if (filled.length === 0) continue;
    y = renderSectionHeader(doc, section.title, y, margin, pw);
    for (const key of filled) {
      y = renderQA(doc, getLabel(key), String(donnees[key]), y, margin, pw);
    }
  }
  return y;
}

function renderAnalyseBesoin(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const SECTIONS = [
    { title: 'IDENTITE', keys: ['nom', 'prenom', 'email', 'telephone', 'adresse', 'codePostal', 'ville'] },
    { title: 'FORMATION SOUHAITEE', keys: ['formationVTC', 'formationTAXI', 'centreFormation'] },
    { title: 'ELIGIBILITE & ACCESSIBILITE', keys: ['eligibility', 'complementary', 'typeHandicap'] },
    { title: 'ENGAGEMENT', keys: ['engagementAccepted', 'dateDocument'] },
  ];

  for (const section of SECTIONS) {
    const filled = section.keys.filter(k => donnees[k] !== undefined && donnees[k] !== null && donnees[k] !== '');
    if (filled.length === 0) continue;
    y = renderSectionHeader(doc, section.title, y, margin, pw);
    for (const key of filled) {
      const val = typeof donnees[key] === 'boolean' ? (donnees[key] ? 'Oui' : 'Non') : String(donnees[key]);
      y = renderQA(doc, getLabel(key), val, y, margin, pw);
    }
  }
  return y;
}

function renderCGV(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const infoKeys = ['formationLabel', 'accepted', 'accepted_at', 'cgv_accepted', 'ri_accepted', 'signed_at'];
  y = renderSectionHeader(doc, 'ACCEPTATION', y, margin, pw);
  for (const key of infoKeys) {
    if (donnees[key] !== undefined && donnees[key] !== null) {
      const val = typeof donnees[key] === 'boolean' ? (donnees[key] ? 'Oui' : 'Non') : String(donnees[key]);
      y = renderQA(doc, getLabel(key), val, y, margin, pw);
    }
  }
  return y;
}

// ---- Dispatch ----
function renderDocContent(doc: jsPDF, typeDocument: string, donnees: any, y: number, margin: number, pw: number): number {
  switch (typeDocument) {
    case 'test-competences': return renderTestCompetences(doc, donnees, y, margin, pw);
    case 'satisfaction': return renderSatisfaction(doc, donnees, y, margin, pw);
    case 'evaluation-acquis': return renderEvaluationAcquis(doc, donnees, y, margin, pw);
    case 'projet-professionnel': return renderProjetProfessionnel(doc, donnees, y, margin, pw);
    case 'analyse-besoin': return renderAnalyseBesoin(doc, donnees, y, margin, pw);
    case 'cgv-acceptation':
    case 'cgv-ri-acceptation': return renderCGV(doc, donnees, y, margin, pw);
    default: return renderGenericContent(doc, donnees, y, margin, pw);
  }
}

function renderGenericContent(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const SKIP = new Set(['id', 'apprenant_id', 'user_id', 'module_id', 'created_at', 'updated_at', 'signature', 'signatureResponsable']);

  if (Array.isArray(donnees)) {
    for (const item of donnees) {
      if (typeof item === 'object' && item !== null) {
        const header = item.titre || item.label || item.name;
        if (header) y = renderSectionHeader(doc, String(header), y, margin, pw);
        y = renderObjectFields(doc, item, y, margin, pw);
      } else {
        y = ensureSpace(doc, y, 5);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(`- ${String(item)}`, margin + 6, y);
        y += 5;
      }
    }
    return y;
  }

  for (const [key, value] of Object.entries(donnees)) {
    if (SKIP.has(key)) continue;
    if (typeof value === 'string' && isBase64(value)) {
      y = ensureSpace(doc, y, 7);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(34, 150, 60);
      doc.text(`${getLabel(key)} : [Signature numerique presente]`, margin + 6, y);
      y += 6;
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // Sub-array (parties, criteres, etc.)
        if (value.length > 0 && typeof value[0] === 'object') {
          y = renderSectionHeader(doc, getLabel(key), y, margin, pw);
          for (const sub of value) {
            if (sub.titre || sub.label) {
              y = ensureSpace(doc, y, 10);
              doc.setFontSize(8);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(13, 37, 64);
              doc.text(sub.titre || sub.label, margin + 8, y);
              y += 6;
            }
            y = renderObjectFields(doc, sub, y, margin, pw);
          }
        } else {
          y = renderField(doc, key, value.join(', '), y, margin, pw);
        }
      } else {
        y = renderSectionHeader(doc, getLabel(key), y, margin, pw);
        y = renderObjectFields(doc, value, y, margin, pw);
      }
    } else {
      y = renderQA(doc, getLabel(key), value === null || value === undefined ? '(Non renseigne)' : String(value), y, margin, pw);
    }
  }
  return y;
}

// ===== Main export =====
export function generateDocumentIndividuelPdf(
  apprenant: { nom: string; prenom: string; civilite?: string; type_apprenant?: string; formation_choisie?: string },
  document: { type_document: string; titre: string; donnees: any; completed_at: string }
) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const margin = 15;

  // ---- Header with logo ----
  try { doc.addImage(logoImage, 'PNG', margin, 8, 45, 16); } catch (_) {}

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(COMPANY_INFO.name, pw - margin, 12, { align: 'right' });
  doc.text(COMPANY_INFO.address, pw - margin, 16, { align: 'right' });
  doc.text(`SIRET : ${COMPANY_INFO.siret}`, pw - margin, 20, { align: 'right' });

  // ---- Title banner ----
  const title = TYPE_TITLES[document.type_document] || document.titre.toUpperCase();
  doc.setFillColor(13, 37, 64);
  doc.rect(0, 28, pw, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pw / 2, 39, { align: 'center' });

  // ---- Apprenant info ----
  let y = 56;
  const fullName = `${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim();
  doc.setFillColor(240, 245, 250);
  doc.rect(margin, y - 4, pw - margin * 2, 20, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 37, 64);
  doc.text(`Stagiaire : ${fullName}`, margin + 4, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Formation : ${(apprenant.type_apprenant || apprenant.formation_choisie || '-').toUpperCase()}`, margin + 4, y + 9);

  let completedDateStr = '';
  try {
    completedDateStr = format(new Date(document.completed_at), 'dd MMMM yyyy a HH:mm', { locale: fr });
  } catch (_) {
    completedDateStr = document.completed_at;
  }
  doc.text(`Complete le : ${completedDateStr}`, pw - margin - 4, y + 2, { align: 'right' });

  y += 24;

  // ---- Document content ----
  if (document.donnees && typeof document.donnees === 'object') {
    y = renderDocContent(doc, document.type_document, document.donnees, y, margin, pw);
  } else {
    y = ensureSpace(doc, y, 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(200, 60, 60);
    doc.text('Aucune donnee disponible pour ce document.', margin + 6, y);
    y += 10;
  }

  // ---- Signatures section ----
  y = ensureSpace(doc, y, 40);
  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 37, 64);
  doc.text('SIGNATURES', margin, y);
  y += 8;

  // Check for signatures in donnees
  const hasApprenantSig = document.donnees?.signature && isBase64(document.donnees.signature);
  const hasResponsableSig = document.donnees?.signatureResponsable && isBase64(document.donnees.signatureResponsable);

  // Apprenant signature
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Signature du stagiaire :', margin + 4, y);
  if (hasApprenantSig) {
    try {
      doc.addImage(document.donnees.signature, 'PNG', margin + 4, y + 2, 50, 20);
      y += 24;
    } catch (_) {
      doc.setTextColor(34, 150, 60);
      doc.setFont('helvetica', 'italic');
      doc.text('[Signature numerique presente]', margin + 4, y + 6);
      y += 10;
    }
  } else {
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('(Non signe)', margin + 4, y + 6);
    y += 10;
  }

  // Responsable signature
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Signature du responsable pedagogique :', pw / 2, y - (hasApprenantSig ? 24 : 10) + 0);
  if (hasResponsableSig) {
    try {
      doc.addImage(document.donnees.signatureResponsable, 'PNG', pw / 2, y - (hasApprenantSig ? 22 : 8), 50, 20);
    } catch (_) {
      doc.setTextColor(34, 150, 60);
      doc.setFont('helvetica', 'italic');
      doc.text('[Signature presente]', pw / 2, y - (hasApprenantSig ? 16 : 2));
    }
  }

  // ---- Footer ----
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${COMPANY_INFO.name} - ${COMPANY_INFO.address} | Document genere le ${format(new Date(), 'dd/MM/yyyy a HH:mm', { locale: fr })}`,
      pw / 2, 290, { align: 'center' }
    );
    doc.text(`Page ${i}/${totalPages}`, pw - margin, 290, { align: 'right' });
  }

  const fileName = `${document.type_document}_${apprenant.nom}_${apprenant.prenom}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    .replace(/\s+/g, '-').toLowerCase();
  doc.save(fileName);
}
