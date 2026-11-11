type Preuve = {
  texte?: string;
  version?: string;
  horodatage_serveur?: string;
  identite?: { nom?: string; apprenant_id?: string | null; email?: string | null };
  devis?: { id?: string; modele?: string | null; formation?: string | null; session?: string | null };
};

export function PreuveConsentementFc({ consentements }: { consentements?: { annulation_remboursement_fc?: Preuve } | null }) {
  const preuve = consentements?.annulation_remboursement_fc;
  if (!preuve) return null;
  const date = preuve.horodatage_serveur ? new Date(preuve.horodatage_serveur) : null;
  const dateValide = date && !Number.isNaN(date.getTime());
  return (
    <section className="w-full rounded-md border bg-muted/30 p-3 text-xs space-y-2" aria-label="Preuve d’information annulation et remboursement" data-testid="preuve-consentement-fc">
      <p className="font-semibold">Information annulation/remboursement confirmée</p>
      {preuve.version && <p><span className="font-medium">Version :</span> {preuve.version}</p>}
      {dateValide && <p><span className="font-medium">Date/heure serveur :</span> <time dateTime={preuve.horodatage_serveur}>{date.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</time></p>}
      {preuve.identite?.nom && <p><span className="font-medium">Identité :</span> {preuve.identite.nom}{preuve.identite.email ? ` — ${preuve.identite.email}` : ''}</p>}
      {preuve.devis?.id && <p><span className="font-medium">Devis :</span> {preuve.devis.id}{preuve.devis.formation ? ` — ${preuve.devis.formation}` : ''}</p>}
      {preuve.devis?.session && <p><span className="font-medium">Session :</span> {preuve.devis.session}</p>}
      {preuve.texte && <p className="leading-relaxed whitespace-pre-line"><span className="font-medium">Texte accepté :</span> {preuve.texte}</p>}
    </section>
  );
}
