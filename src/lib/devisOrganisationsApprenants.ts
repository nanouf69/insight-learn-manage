/**
 * Organisations déjà saisies par les apprenants (financeurs_fc professionnels),
 * proposées dans le choix du financeur du devis. Lecture seule : rien n'est
 * créé dans la table organismes. L'organisation de l'apprenant ouvert passe en tête.
 */
export interface OrganisationDevis {
  id: string; nom: string; siret: string | null; siret_complet: string | null;
  adresse: string; code_postal: string; ville: string; telephone: string; email: string;
  apprenantCourant: boolean;
}

const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function organisationsDepuisFinanceurs(rows: any[], apprenantId: string | null | undefined): OrganisationDevis[] {
  const parCle = new Map<string, OrganisationDevis>();
  for (const r of rows ?? []) {
    if (String(r?.type_financeur ?? '').toLowerCase() !== 'professionnel') continue;
    const nom = String(r?.raison_sociale ?? '').trim();
    if (!nom) continue;
    const siret = String(r?.siret ?? r?.siren ?? '').replace(/\s/g, '') || null;
    const cle = siret ? `s:${siret}` : `n:${norm(nom)}`;
    const courant = !!apprenantId && r.apprenant_id === apprenantId;
    const existant = parCle.get(cle);
    if (existant && !(courant && !existant.apprenantCourant)) continue;
    parCle.set(cle, {
      id: `fc:${r.id}`, nom, siret, siret_complet: siret,
      adresse: String(r?.adresse ?? ''), code_postal: String(r?.code_postal ?? ''), ville: String(r?.ville ?? ''),
      telephone: String(r?.contact_telephone ?? ''), email: String(r?.email_facturation || r?.contact_email || ''),
      apprenantCourant: courant,
    });
  }
  return [...parCle.values()].sort((a, b) => Number(b.apprenantCourant) - Number(a.apprenantCourant) || a.nom.localeCompare(b.nom, 'fr'));
}
