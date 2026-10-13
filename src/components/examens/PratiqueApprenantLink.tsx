import { Button } from "@/components/ui/button";

/** Uses the existing admin CRM navigation; never edits the reservation. */
export function PratiqueApprenantLink({ apprenant, onOuvrir }: {
  apprenant: { id: string; nom?: string | null; prenom?: string | null };
  onOuvrir?: (id: string) => void;
}) {
  const nom = `${apprenant.nom?.toUpperCase() ?? ""} ${apprenant.prenom ?? ""}`.trim();
  if (!onOuvrir || !apprenant.id) return <span className="flex-1 min-w-0 font-semibold leading-tight break-words">{nom}</span>;
  return (
    <Button type="button" variant="link" title="Ouvrir la fiche CRM"
      aria-label={`Ouvrir la fiche CRM de ${nom}`}
      onClick={() => onOuvrir(apprenant.id)}
      className="flex-1 min-w-0 h-auto p-0 block text-left text-[11px] font-semibold leading-tight whitespace-normal break-words">
      {nom}
    </Button>
  );
}