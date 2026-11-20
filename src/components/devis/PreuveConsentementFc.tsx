type Preuve = {
  texte?: string;
  version?: string;
  horodatage_serveur?: string;
  identite?: { nom?: string; apprenant_id?: string | null; email?: string | null };
  devis?: { id?: string; modele?: string | null; formation?: string | null; session?: string | null };
};

type Demande = { coche?: boolean; texte?: string; version?: string; horodatage_serveur?: string };

/** Choix facultatif « commencement avant la fin du délai de rétractation », coché ou non, horodaté serveur. */
export function PreuveDemandeCommencement({ consentements }: { consentements?: { demande_commencement_anticipe?: Demande } | null }) {
  const d = consentements?.demande_commencement_anticipe;
  if (!d) return null;
  const date = d.horodatage_serveur ? new Date(d.horodatage_serveur) : null;
  return (
    <section className="w-full rounded-md border bg-muted/30 p-3 text-xs space-y-1" aria-label="Demande de commencement anticipé" data-testid="preuve-demande-commencement">
      <p className="font-semibold">Commencement avant fin du délai de rétractation : {d.coche ? "DEMANDÉ par le client" : "non demandé"}</p>
      {date && !Number.isNaN(date.getTime()) && <p><span className="font-medium">Date/heure serveur :</span> {date.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>}
      {d.version && <p><span className="font-medium">Version :</span> {d.version}</p>}
      {d.texte && <p className="leading-relaxed"><span className="font-medium">Texte présenté :</span> {d.texte}</p>}
      <p className="text-muted-foreground">Ce choix n'est pas une renonciation au droit de rétractation.</p>
    </section>
  );
}

export function PreuveConsentementFc({ consentements }: { consentements?: { annulation_remboursement_fc?: Preuve; demande_commencement_anticipe?: Demande } | null }) {
  const preuve = consentements?.annulation_remboursement_fc;
  if (!preuve) return <PreuveDemandeCommencement consentements={consentements} />;
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
      <PreuveDemandeCommencement consentements={consentements} />
    </section>
  );
}
