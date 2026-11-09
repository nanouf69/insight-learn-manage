type FactureFC = {
  id: string;
  session_id?: string | null;
  apprenant_id?: string | null;
  numero_convention?: string | null;
  statut?: string | null;
  montant_ttc?: number | string | null;
};

export function factureFCReglee(facture: FactureFC, paiements: { montant?: number | string | null }[] = []): boolean {
  const montant = Number(facture.montant_ttc);
  return facture.statut === 'payee' || (montant > 0 && paiements.length > 0 && paiements.reduce((t, p) => t + Number(p.montant ?? 0), 0) + 0.001 >= montant);
}

// An extra invoice only proves training payment when its recorded enrollment
// and exact training label match. Unrelated extras never unlock a certificate.
export function facturePourAttestationFC<T extends FactureFC>(
  principale: T | null | undefined, extras: T[],
  sessionId: string, apprenantId: string, titreSession: string,
  paiements: Record<string, { montant?: number | string | null }[]>,
): T | null {
  const scoped = (f: T) => f.session_id === sessionId && f.apprenant_id === apprenantId;
  const candidates = [
    ...(principale && scoped(principale) ? [principale] : []),
    ...extras.filter(f => scoped(f) && f.numero_convention === `EXTRA::Formation continue — ${titreSession}`),
  ];
  return candidates.find(f => factureFCReglee(f, paiements[f.id])) ?? candidates[0] ?? null;
}