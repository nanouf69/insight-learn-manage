import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STATUT_SUIVI_LABELS, joursAvantDateLimite } from "@/lib/dossierFormation";

interface Props {
  onOpenApprenant: (id: string) => void;
}

const fr = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Demandes urgentes « date limite d'inscription proche » envoyées par les élèves. */
export default function DemandesInscriptionUrgentes({ onOpenApprenant }: Props) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["demandes-inscription-urgentes"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("demandes_inscription_urgentes")
        .select("*")
        .eq("statut", "a_traiter")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((rows || []).map((r) => r.apprenant_id)));
      const valides = new Set<string>();
      if (ids.length) {
        const [{ data: liens }, { data: apps }] = await Promise.all([
          supabase.from("session_apprenants").select("apprenant_id, statut_suivi").in("apprenant_id", ids),
          supabase.from("apprenants").select("id, statut_suivi").in("id", ids),
        ]);
        (liens || []).forEach((l: any) => l.statut_suivi === "inscription_validee" && valides.add(l.apprenant_id));
        (apps || []).forEach((a: any) => a.statut_suivi === "inscription_validee" && valides.add(a.id));
      }
      return (rows || []).map((r) => ({ ...r, validee: valides.has(r.apprenant_id) }));
    },
    staleTime: 30_000,
  });

  if (!data || data.length === 0) return null;

  const marquerTraitee = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("demandes_inscription_urgentes")
      .update({ statut: "traitee", traitee_at: new Date().toISOString(), traitee_par: u.user?.id ?? null })
      .eq("id", id);
    if (error) toast.error("Impossible de marquer la demande comme traitée.");
    else qc.invalidateQueries({ queryKey: ["demandes-inscription-urgentes"] });
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3" data-testid="demandes-urgentes-admin">
      <p className="font-semibold text-destructive flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> Demandes urgentes — date limite d'inscription ({data.length})
      </p>
      {data.map((d) => {
        const jours = joursAvantDateLimite(d.date_limite);
        return (
          <div key={d.id} className="rounded-lg bg-card border p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-sm space-y-0.5">
              <button className="font-semibold text-primary hover:underline" onClick={() => onOpenApprenant(d.apprenant_id)}>
                {d.apprenant_prenom} {String(d.apprenant_nom || "").toUpperCase()}
              </button>
              <p className="text-xs text-muted-foreground">
                {d.formation || "Formation non renseignée"} · {d.examen_libelle} · Limite {fr(d.date_limite)} ·{" "}
                {jours >= 0 ? `${jours} j restant(s)` : "date limite dépassée"}
              </p>
              <p className="text-xs text-muted-foreground">
                Statut à la demande : {d.statut_inscription ? STATUT_SUIVI_LABELS[d.statut_inscription] ?? d.statut_inscription : "En attente d'inscription"} ·
                Demandé le {new Date(d.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {d.validee ? (
                  <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" />Inscription validée — plus urgente</Badge>
                ) : (
                  <Badge variant="destructive">À traiter</Badge>
                )}
                {d.email_statut === "echec" && <Badge variant="destructive">E-mail d'urgence non envoyé</Badge>}
                {d.email_statut === "en_attente" && <Badge variant="outline">E-mail en attente</Badge>}
                {d.email_statut === "envoye" && <Badge variant="outline">E-mail envoyé</Badge>}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => marquerTraitee(d.id)}>Marquer traitée</Button>
          </div>
        );
      })}
    </div>
  );
}
