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

interface ControleItem {
  label: string;
  category: string;
  found: boolean;
  completedAt?: string;
  donnees?: any;
}

// Human-readable labels for projet professionnel & analyse besoin fields
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
  // Analyse besoin
  nom: 'Nom', prenom: 'Prenom', email: 'Email', telephone: 'Telephone',
  adresse: 'Adresse', codePostal: 'Code postal', ville: 'Ville',
  formationVTC: 'Formation VTC', formationTAXI: 'Formation TAXI',
  eligibility: 'Eligibilite', complementary: 'Complementaire',
  centreFormation: 'Centre de formation', typeHandicap: 'Type handicap',
  engagementAccepted: 'Engagement accepte', dateDocument: 'Date du document',
  // Satisfaction
  noteGlobale: 'Note globale', pointsForts: 'Points forts',
  pointsAmeliorer: 'Points a ameliorer', suggestions: 'Suggestions',
  formationType: 'Type de formation', commentaires: 'Commentaires',
  // CGV
  cgv_accepted: 'CGV acceptees', ri_accepted: 'Reglement interieur accepte',
  accepted: 'Accepte', accepted_at: 'Date acceptation',
  signed_at: 'Date de signature',
  formationLabel: 'Formation',
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

// ---- Specialized renderers per document type ----

function renderSatisfaction(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const NOTES_LABELS: Record<number, string> = { 1: 'Tres insatisfait', 2: 'Insatisfait', 3: 'Neutre', 4: 'Satisfait', 5: 'Tres satisfait' };

  if (donnees.parties && Array.isArray(donnees.parties)) {
    for (const partie of donnees.parties) {
      y = ensureSpace(doc, y, 14);
      doc.setFillColor(230, 240, 250);
      doc.rect(margin + 3, y - 3, pw - margin * 2 - 6, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 37, 64);
      doc.text(partie.titre, margin + 6, y + 2);
      y += 10;

      if (partie.criteres && Array.isArray(partie.criteres)) {
        for (const c of partie.criteres) {
          y = ensureSpace(doc, y, 8);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          const lines = doc.splitTextToSize(`${c.label}`, pw - margin * 2 - 50);
          doc.text(lines, margin + 6, y);

          // Note
          const noteLabel = c.value != null ? `${c.value}/5 - ${NOTES_LABELS[c.value] || ''}` : 'Non repondu';
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(c.value && c.value >= 4 ? 34 : c.value && c.value >= 3 ? 180 : 200, c.value && c.value >= 4 ? 150 : c.value && c.value >= 3 ? 130 : 60, c.value && c.value >= 4 ? 60 : c.value && c.value >= 3 ? 0 : 60);
          doc.text(noteLabel, pw - margin - 2, y, { align: 'right' });
          y += lines.length * 4 + 3;
        }
      }
      y += 3;
    }
  }

  // Free text fields
  for (const key of ['noteGlobale', 'pointsForts', 'pointsAmeliorer', 'suggestions']) {
    if (donnees[key]) {
      y = ensureSpace(doc, y, 12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 37, 64);
      doc.text(`${getLabel(key)} :`, margin + 6, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(String(donnees[key]), pw - margin * 2 - 12);
      for (const l of lines) { y = ensureSpace(doc, y, 5); doc.text(l, margin + 8, y); y += 4; }
      y += 3;
    }
  }
  return y;
}

function renderEvaluationAcquis(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const NIVEAUX_LABELS: Record<string, string> = { A: 'Acquis', B: 'En cours', C: 'Non acquis', D: 'Non evalue' };
  const NIVEAUX_COLORS: Record<string, number[]> = { A: [34, 197, 94], B: [245, 158, 11], C: [239, 68, 68], D: [150, 150, 150] };

  if (donnees.parties && Array.isArray(donnees.parties)) {
    for (const partie of donnees.parties) {
      y = ensureSpace(doc, y, 14);
      doc.setFillColor(230, 240, 250);
      doc.rect(margin + 3, y - 3, pw - margin * 2 - 6, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 37, 64);
      doc.text(partie.titre, margin + 6, y + 2);
      y += 10;

      if (partie.competences && Array.isArray(partie.competences)) {
        for (const comp of partie.competences) {
          y = ensureSpace(doc, y, 10);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          const lines = doc.splitTextToSize(comp.label, pw - margin * 2 - 55);
          doc.text(lines, margin + 6, y);

          const val = comp.value || 'D';
          const color = NIVEAUX_COLORS[val] || [150, 150, 150];
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(color[0], color[1], color[2]);
          doc.text(NIVEAUX_LABELS[val] || val, pw - margin - 2, y, { align: 'right' });

          y += lines.length * 4 + 2;

          if (comp.observation) {
            y = ensureSpace(doc, y, 6);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 120, 120);
            const obsLines = doc.splitTextToSize(`Obs: ${comp.observation}`, pw - margin * 2 - 20);
            doc.text(obsLines, margin + 10, y);
            y += obsLines.length * 3.5 + 1;
          }
        }
      }
      y += 3;
    }
  }

  if (donnees.commentaires) {
    y = ensureSpace(doc, y, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 37, 64);
    doc.text('Commentaires :', margin + 6, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(String(donnees.commentaires), pw - margin * 2 - 12);
    for (const l of lines) { y = ensureSpace(doc, y, 5); doc.text(l, margin + 8, y); y += 4; }
    y += 3;
  }
  return y;
}

function renderProjetProfessionnel(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const SECTIONS: { title: string; keys: string[] }[] = [
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

    y = ensureSpace(doc, y, 14);
    doc.setFillColor(230, 240, 250);
    doc.rect(margin + 3, y - 3, pw - margin * 2 - 6, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 37, 64);
    doc.text(section.title, margin + 6, y + 2);
    y += 10;

    for (const key of filled) {
      y = renderField(doc, key, donnees[key], y, margin, pw);
    }
    y += 3;
  }
  return y;
}

function renderAnalyseBesoin(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  const SECTIONS: { title: string; keys: string[] }[] = [
    { title: 'IDENTITE', keys: ['nom', 'prenom', 'email', 'telephone', 'adresse', 'codePostal', 'ville'] },
    { title: 'FORMATION SOUHAITEE', keys: ['formationVTC', 'formationTAXI', 'centreFormation'] },
    { title: 'ELIGIBILITE & ACCESSIBILITE', keys: ['eligibility', 'complementary', 'typeHandicap'] },
    { title: 'ENGAGEMENT', keys: ['engagementAccepted', 'dateDocument'] },
  ];

  for (const section of SECTIONS) {
    const filled = section.keys.filter(k => donnees[k] !== undefined && donnees[k] !== null && donnees[k] !== '');
    if (filled.length === 0) continue;

    y = ensureSpace(doc, y, 14);
    doc.setFillColor(230, 240, 250);
    doc.rect(margin + 3, y - 3, pw - margin * 2 - 6, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 37, 64);
    doc.text(section.title, margin + 6, y + 2);
    y += 10;

    for (const key of filled) {
      y = renderField(doc, key, donnees[key], y, margin, pw);
    }
    y += 3;
  }

  // Signature mention
  if (donnees.signature && isBase64(donnees.signature)) {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(34, 150, 60);
    doc.text('Signature numerique du stagiaire : presente', margin + 6, y);
    y += 6;
  }
  return y;
}

function renderTestCompetences(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  if (donnees.formationLabel) {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 37, 64);
    doc.text(`Formation : ${donnees.formationLabel}`, margin + 6, y);
    y += 7;
  }

  if (donnees.sections && Array.isArray(donnees.sections) && donnees.answers) {
    for (let si = 0; si < donnees.sections.length; si++) {
      y = ensureSpace(doc, y, 12);
      doc.setFillColor(230, 240, 250);
      doc.rect(margin + 3, y - 3, pw - margin * 2 - 6, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 37, 64);
      doc.text(donnees.sections[si], margin + 6, y + 2);
      y += 10;

      // Find answers for this section
      const sectionAnswers = Object.entries(donnees.answers as Record<string, string>)
        .filter(([key]) => key.startsWith(`${si}-`));

      for (const [key, value] of sectionAnswers) {
        y = ensureSpace(doc, y, 7);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const qNum = key.split('-')[1];
        doc.text(`Q${parseInt(qNum) + 1} :`, margin + 6, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(String(value), margin + 22, y);
        y += 5;
      }
      y += 3;
    }
  }
  return y;
}

function renderGenericDonnees(doc: jsPDF, donnees: any, y: number, margin: number, pw: number, depth: number = 0): number {
  if (!donnees || typeof donnees !== 'object') return y;
  const SKIP_KEYS = new Set(['id', 'apprenant_id', 'user_id', 'module_id', 'apprenant', 'created_at', 'updated_at']);
  const indent = depth * 4;

  if (Array.isArray(donnees)) {
    for (let i = 0; i < donnees.length; i++) {
      const item = donnees[i];
      if (item && typeof item === 'object') {
        // If item has a 'titre' or 'label' key, use it as section header
        const header = item.titre || item.label || item.name || null;
        if (header) {
          y = ensureSpace(doc, y, 12);
          doc.setFillColor(230, 240, 250);
          doc.rect(margin + 3 + indent, y - 3, pw - margin * 2 - 6 - indent, 8, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(13, 37, 64);
          doc.text(String(header), margin + 6 + indent, y + 2);
          y += 10;
        }
        // Render sub-content
        const subEntries = Object.entries(item).filter(([k]) => !SKIP_KEYS.has(k) && k !== 'titre' && k !== 'label' && k !== 'name');
        for (const [subKey, subVal] of subEntries) {
          y = renderFieldDeep(doc, subKey, subVal, y, margin, pw, depth + 1);
        }
        y += 2;
      } else {
        y = ensureSpace(doc, y, 5);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(`• ${String(item)}`, margin + 6 + indent, y);
        y += 5;
      }
    }
    return y;
  }

  const entries = Object.entries(donnees);
  for (const [key, value] of entries) {
    if (SKIP_KEYS.has(key)) continue;
    y = renderFieldDeep(doc, key, value, y, margin, pw, depth);
  }
  return y;
}

function renderFieldDeep(doc: jsPDF, key: string, value: any, y: number, margin: number, pw: number, depth: number = 0): number {
  const indent = depth * 4;

  // Skip base64 images - just mention them
  if (typeof value === 'string' && isBase64(value)) {
    y = ensureSpace(doc, y, 7);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(`${getLabel(key)} :`, margin + 6 + indent, y);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(34, 150, 60);
    doc.text('[Signature presente]', margin + 60 + indent, y);
    y += 5;
    return y;
  }

  if (typeof value === 'boolean') {
    y = ensureSpace(doc, y, 7);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(`${getLabel(key)} :`, margin + 6 + indent, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(value ? 34 : 200, value ? 150 : 60, value ? 60 : 60);
    doc.text(value ? 'Oui' : 'Non', margin + 60 + indent, y);
    y += 5;
    return y;
  }

  if (value === null || value === undefined || value === '') return y;

  // Handle nested arrays
  if (Array.isArray(value)) {
    y = ensureSpace(doc, y, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 37, 64);
    doc.text(`${getLabel(key)} :`, margin + 6 + indent, y);
    y += 6;
    y = renderGenericDonnees(doc, value, y, margin, pw, depth + 1);
    return y;
  }

  // Handle nested objects
  if (typeof value === 'object') {
    y = ensureSpace(doc, y, 10);
    doc.setFillColor(240, 245, 250);
    doc.rect(margin + 3 + indent, y - 3, pw - margin * 2 - 6 - indent, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 37, 64);
    doc.text(getLabel(key), margin + 6 + indent, y + 2);
    y += 10;
    y = renderGenericDonnees(doc, value, y, margin, pw, depth + 1);
    return y;
  }

  // Simple scalar value
  y = ensureSpace(doc, y, 7);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  const label = `${getLabel(key)} : `;
  doc.text(label, margin + 6 + indent, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const strVal = String(value);
  const labelW = doc.getTextWidth(label);
  const remaining = pw - margin * 2 - labelW - 12 - indent;

  if (remaining > 25 && doc.getTextWidth(strVal) <= remaining) {
    doc.text(strVal, margin + 6 + indent + labelW, y);
    y += 5;
  } else {
    y += 5;
    const wrapped = doc.splitTextToSize(strVal, pw - margin * 2 - 14 - indent);
    for (const line of wrapped) { y = ensureSpace(doc, y, 4.5); doc.text(line, margin + 10 + indent, y); y += 4; }
    y += 1;
  }
  return y;
}

// Keep backward-compatible renderField
function renderField(doc: jsPDF, key: string, value: any, y: number, margin: number, pw: number): number {
  return renderFieldDeep(doc, key, value, y, margin, pw, 0);
}

function renderCGV(doc: jsPDF, donnees: any, y: number, margin: number, pw: number): number {
  // CGV acceptance info
  const infoKeys = ['formationLabel', 'accepted', 'accepted_at', 'cgv_accepted', 'ri_accepted', 'signed_at'];
  for (const key of infoKeys) {
    if (donnees[key] !== undefined && donnees[key] !== null) {
      y = renderFieldDeep(doc, key, donnees[key], y, margin, pw, 0);
    }
  }

  // If there are sections content
  if (donnees.sections && Array.isArray(donnees.sections)) {
    for (const section of donnees.sections) {
      y = ensureSpace(doc, y, 14);
      doc.setFillColor(230, 240, 250);
      doc.rect(margin + 3, y - 3, pw - margin * 2 - 6, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 37, 64);
      doc.text(section.titre || section.title || '', margin + 6, y + 2);
      y += 10;

      if (section.contenu || section.content) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(section.contenu || section.content, pw - margin * 2 - 12);
        for (const l of lines) { y = ensureSpace(doc, y, 4.5); doc.text(l, margin + 6, y); y += 4; }
        y += 3;
      }
    }
  }

  // Signature
  if (donnees.signature && isBase64(donnees.signature)) {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(34, 150, 60);
    doc.text('Signature numerique du stagiaire : presente', margin + 6, y);
    y += 6;
  }

  // Render remaining keys not already handled
  const handledKeys = new Set([...infoKeys, 'sections', 'signature', 'id', 'apprenant_id', 'user_id', 'module_id']);
  const remaining = Object.entries(donnees).filter(([k]) => !handledKeys.has(k));
  for (const [key, value] of remaining) {
    y = renderFieldDeep(doc, key, value, y, margin, pw, 0);
  }

  return y;
}

// ---- Dispatch to the right renderer based on document type ----
function renderDocContent(doc: jsPDF, docLabel: string, donnees: any, y: number, margin: number, pw: number): number {
  const labelLower = docLabel.toLowerCase();

  if (labelLower.includes('satisfaction'))
    return renderSatisfaction(doc, donnees, y, margin, pw);
  if (labelLower.includes('evaluation') || labelLower.includes('acquis'))
    return renderEvaluationAcquis(doc, donnees, y, margin, pw);
  if (labelLower.includes('projet professionnel'))
    return renderProjetProfessionnel(doc, donnees, y, margin, pw);
  if (labelLower.includes('prerequis') || labelLower.includes('analyse'))
    return renderAnalyseBesoin(doc, donnees, y, margin, pw);
  if (labelLower.includes('positionnement') || labelLower.includes('competences'))
    return renderTestCompetences(doc, donnees, y, margin, pw);
  if (labelLower.includes('cgv') || labelLower.includes('conditions') || labelLower.includes('reglement'))
    return renderCGV(doc, donnees, y, margin, pw);

  return renderGenericDonnees(doc, donnees, y, margin, pw);
}

// ===== Main export =====
export function generateControleQualitePdf(apprenant: any, items: ControleItem[]) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pw - margin * 2;

  // Logo
  try { doc.addImage(logoImage, 'PNG', margin, 8, 45, 16); } catch (_) {}

  // Company info
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(COMPANY_INFO.name, pw - margin, 12, { align: 'right' });
  doc.text(COMPANY_INFO.address, pw - margin, 16, { align: 'right' });
  doc.text(`SIRET : ${COMPANY_INFO.siret}`, pw - margin, 20, { align: 'right' });

  // Header
  doc.setFillColor(13, 37, 64);
  doc.rect(0, 28, pw, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTROLE QUALITE - DOSSIER APPRENANT', pw / 2, 40, { align: 'center' });

  // Apprenant
  doc.setTextColor(0, 0, 0);
  let y = 58;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const fullName = `${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim();
  doc.text(`Stagiaire : ${fullName}`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Formation : ${(apprenant.type_apprenant || apprenant.formation_choisie || '-').toUpperCase()}`, pw / 2, y);
  y += 7;
  if (apprenant.date_debut_formation) doc.text(`Debut : ${apprenant.date_debut_formation}`, margin, y);
  if (apprenant.date_fin_formation) doc.text(`Fin : ${apprenant.date_fin_formation}`, pw / 2, y);
  y += 5;

  // Summary bar
  const totalDocs = items.length;
  const completedCount = items.filter(i => i.found).length;
  const pct = Math.round((completedCount / totalDocs) * 100);
  y += 5;
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(`Completude : ${completedCount} / ${totalDocs} documents (${pct}%)`, margin + 5, y + 9);

  const barX = pw - margin - 65, barW = 60, barH = 6, barY = y + 4;
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(barX, barY, barW, barH, 2, 2, 'F');
  const fc = pct === 100 ? [34, 197, 94] : pct >= 50 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(fc[0], fc[1], fc[2]);
  if (pct > 0) doc.roundedRect(barX, barY, Math.max(4, (barW * pct) / 100), barH, 2, 2, 'F');
  y += 22;

  // ---- Categories + documents ----
  const categoryLabels: Record<string, string> = {
    formulaire: 'FORMULAIRES STAGIAIRE',
    suivi: 'SUIVI PEDAGOGIQUE',
    administratif: 'DOCUMENTS ADMINISTRATIFS',
  };

  for (const cat of ['formulaire', 'suivi', 'administratif']) {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length === 0) continue;
    y = ensureSpace(doc, y, 15);

    doc.setFillColor(13, 37, 64);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(categoryLabels[cat] || cat.toUpperCase(), margin + 4, y + 5.5);
    y += 12;

    for (const item of catItems) {
      y = ensureSpace(doc, y, 12);

      // Status dot + label
      doc.setFillColor(item.found ? 34 : 239, item.found ? 197 : 68, item.found ? 94 : 68);
      doc.circle(margin + 4, y + 1.5, 2, 'F');
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, margin + 10, y + 3);

      const statusText = item.found ? 'Present' : 'Manquant';
      doc.setFontSize(8);
      doc.setTextColor(item.found ? 34 : 239, item.found ? 197 : 68, item.found ? 94 : 68);
      doc.text(statusText, pw - margin - 30, y + 3);

      if (item.completedAt) {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        try {
          doc.text(format(new Date(item.completedAt), 'dd/MM/yyyy', { locale: fr }), pw - margin, y + 3, { align: 'right' });
        } catch (_) {}
      }
      y += 9;

      // ---- Detailed content ----
      if (item.donnees && item.found) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin + 8, y - 1, pw - margin, y - 1);
        y += 3;

        y = renderDocContent(doc, item.label, item.donnees, y, margin, pw);

        y += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + 8, y, pw - margin, y);
        y += 5;
      }
    }
    y += 4;
  }

  // Footer
  y = ensureSpace(doc, y, 15);
  y += 8;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.text(`Document genere le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, margin, y);
  doc.text(`${COMPANY_INFO.name} - ${COMPANY_INFO.address}`, pw / 2, y, { align: 'center' });

  const fileName = `controle-qualite-${apprenant.prenom}-${apprenant.nom}.pdf`.replace(/\s+/g, '-').toLowerCase();
  doc.save(fileName);
}
