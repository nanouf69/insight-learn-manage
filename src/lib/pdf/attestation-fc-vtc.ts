import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

interface AttestationFCData {
  nom: string;
  prenom: string;
  dateFin: string; // YYYY-MM-DD
}

export async function generateAttestationFCVTC(data: AttestationFCData) {
  const response = await fetch('/templates/attestation_fc_vtc.docx');
  const arrayBuffer = await response.arrayBuffer();

  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });

  const [y, m, d] = data.dateFin.split('-').map(Number);
  const jourMois = `${d} ${MOIS_FR[m - 1]}`;
  const annee = String(y);

  doc.render({
    NOM: data.nom.toUpperCase(),
    PRENOM: data.prenom.toUpperCase(),
    JOUR_MOIS: jourMois,
    ANNEE: annee,
  });

  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  saveAs(out, `Attestation_FC_VTC_${data.nom.toUpperCase()}_${data.prenom}.docx`);
}
