/** Prospective boundary: existing invoice rendering and evidence stay unchanged. */
export const DEBUT_ADRESSE_FACTURE = '2026-11-26T16:53:00Z';

export interface AdressePostaleFacture {
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
}

export interface FinanceurAdresseFacture extends AdressePostaleFacture {
  type_financeur?: string | null;
  raison_sociale?: string | null;
}

const texte = (value?: string | null) => value?.trim() ?? '';

/** Never assemble one address using fields belonging to two different people. */
export function assemblerAdresseFacture(source?: AdressePostaleFacture | null): string {
  return [texte(source?.adresse), [texte(source?.code_postal), texte(source?.ville)].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
}

export function adresseDestinataireFacture(
  financeur: FinanceurAdresseFacture | null | undefined,
  stagiaire: AdressePostaleFacture | null | undefined,
  options: { financeurParticulierDestinataire?: boolean } = {},
): string {
  const type = texte(financeur?.type_financeur).toLowerCase();
  const entreprise = type === 'professionnel';
  return assemblerAdresseFacture(entreprise || (financeur && options.financeurParticulierDestinataire) ? financeur : stagiaire);
}

export interface FactureAdresseEnregistree {
  created_at?: string | null;
  client_nom?: string | null;
  client_adresse?: string | null;
  client_siret?: string | null;
}

export function factureAdresseProspective(facture?: FactureAdresseEnregistree | null): boolean {
  const instant = Date.parse(facture?.created_at ?? '');
  return Number.isFinite(instant) && instant >= Date.parse(DEBUT_ADRESSE_FACTURE);
}

/** undefined = keep legacy rendering; empty address = confirmed missing, not a fallback. */
export function destinataireFactureFige(facture?: FactureAdresseEnregistree | null) {
  if (!factureAdresseProspective(facture)) return undefined;
  return {
    nom: texte(facture?.client_nom),
    adresse: texte(facture?.client_adresse),
    siret: texte(facture?.client_siret),
  };
}

export interface BrouillonAdresseFacture {
  client_nom?: string | null;
  client_adresse?: string | null;
  client_siret?: string | null;
  refDossier?: string | null;
}

export function lignesDestinataireBrouillon(draft?: BrouillonAdresseFacture | null): string[] {
  // New local drafts carry explicit billing fields; old drafts remain untouched.
  if (draft && Object.prototype.hasOwnProperty.call(draft, 'client_nom')) {
    return [texte(draft.client_nom), texte(draft.client_adresse), draft.client_siret ? `SIRET : ${texte(draft.client_siret)}` : '']
      .filter(Boolean);
  }
  return texte(draft?.refDossier).split('\n').filter(Boolean);
}

/** Exact recorded postal line, no inferred postcode/city/country. Old XML is unchanged. */
export function adresseAcheteurFactureXml(facture: FactureAdresseEnregistree): string {
  const destinataire = destinataireFactureFige(facture);
  if (!destinataire?.adresse) return '';
  const adresse = destinataire.adresse.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] ?? c));
  return `<ram:PostalTradeAddress><ram:LineOne>${adresse}</ram:LineOne></ram:PostalTradeAddress>`;
}