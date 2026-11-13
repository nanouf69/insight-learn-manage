/** Read-only projections. Never copy an onboarding signature or infer rental permission. */
export interface BienvenueLocation {
  id: string; apprenant_id: string; completed_at: string | null;
  donnees: unknown;
}
export interface VehiculeLocation {
  id: string; libelle: string; reference: string | null;
  date_debut: string | null; date_echeance: string | null;
}
const texte = (value: unknown) => typeof value === 'string' ? value.trim() : '';
/** Same-dossier CRM fallback; never copy signatures, credentials or unverified licence data. */
export function coordonneesFicheLocation(fiche: Record<string, unknown>, apprenantId: string) {
  if (!apprenantId || fiche.id !== apprenantId) return null;
  const naissance = texte(fiche.date_naissance);
  return {
    nomComplet: [texte(fiche.prenom), texte(fiche.nom)].filter(Boolean).join(' '),
    email: texte(fiche.email), telephone: texte(fiche.telephone),
    adresse: [texte(fiche.adresse), texte(fiche.code_postal), texte(fiche.ville)].filter(Boolean).join(', '),
    dateNaissance: /^\d{4}-\d{2}-\d{2}$/.test(naissance) ? naissance : '',
    numPermis: '', dateDelivrancePermis: '', prefecturePermis: '',
  };
}
export function coordonneesLocation(doc: BienvenueLocation, apprenantId: string) {
  if (doc.apprenant_id !== apprenantId || !doc.completed_at || !Number.isFinite(Date.parse(doc.completed_at))) return null;
  const d = doc.donnees;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const fields = d as Record<string, unknown>;
  return {
    sourceId: doc.id, completedAt: doc.completed_at,
    nomComplet: [texte(fields.prenom), texte(fields.nom)].filter(Boolean).join(' '),
    email: texte(fields.email), telephone: texte(fields.telephone),
    adresse: [texte(fields.adresse), texte(fields.code_postal), texte(fields.ville)].filter(Boolean).join(', '),
    dateNaissance: /^\d{4}-\d{2}-\d{2}$/.test(texte(fields.date_naissance)) ? texte(fields.date_naissance) : '',
    numPermis: '', dateDelivrancePermis: '', prefecturePermis: '',
  };
}
export function detailsVehicule(v: VehiculeLocation) {
  const plate = v.libelle.match(/\b[A-Z]{2}-\d{3}-[A-Z]{2}\b/)?.[0] ?? '';
  return { marqueModele: v.libelle.replace(/\s*[—–-]\s*[A-Z]{2}-\d{3}-[A-Z]{2}\s*$/, '').trim(),
    immatriculation: plate, vin: v.reference?.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i)?.[0] ?? '',
    premiereImmatriculation: v.date_debut ?? '', controleAvant: v.date_echeance ?? '' };
}
export function conditionsDepot(avecCaution: boolean) {
  return avecCaution
    ? { depot: 500, cheque: true, preautorisation: false }
    : { depot: 0, cheque: false, preautorisation: false };
}
export function clauseSansCaution() {
  return "Sans caution : dépôt de garantie de 0 €. Aucun chèque, prélèvement ni préautorisation n'est demandé au titre du dépôt de garantie. Cette dispense ne supprime ni la franchise prévue par la police d'assurance applicable ni la responsabilité légalement établie du locataire pour les dommages. Les garanties, franchises et exclusions doivent être communiquées séparément avant signature.";
}
export function pointsVehicule(v: VehiculeLocation | undefined, fin: string) {
  const points = ['Disponibilité sur la période : non vérifiée (aucun registre de réservations relié).',
    'Assurance et couverture location/examen : non vérifiées (police et avenant requis).',
    'Aptitude technique et équipement pour l’examen : non vérifiés.'];
  if (!v) return ['Véhicule du parc non sélectionné.', ...points];
  if (!v.date_echeance) points.unshift('Échéance du contrôle technique non renseignée.');
  else if (fin >= v.date_echeance) points.unshift('Échéance de contrôle dépassée ou atteinte selon le registre ; justificatif actuel requis.');
  else points.unshift('Échéance inscrite au registre uniquement ; ne prouve pas la conformité ni le bon régime de contrôle.');
  return points;
}