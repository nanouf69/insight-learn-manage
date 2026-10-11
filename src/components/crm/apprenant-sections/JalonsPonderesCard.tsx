import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FORMATION_MODULES, MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";
import { calculerJalonsPonderes, filiereDuParcours } from "@/lib/jalonsPonderes";

/** Carte interne ADMIN : taux indicatif pondéré. Lecture seule. */
export function JalonsPonderesCard({ apprenantId, typeApprenant, formationChoisie }: { apprenantId: string; typeApprenant?: string | null; formationChoisie?: string | null }) {
  const [open, setOpen] = useState(false);
  const { data: isAdmin } = useQuery({
    queryKey: ["jalons-ponderes-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });
  const ta = String(typeApprenant ?? "").toLowerCase().trim();
  const fc = String(formationChoisie ?? "").toLowerCase().trim();
  const key = FORMATION_MODULES[ta] ? ta : FORMATION_MODULES[fc] ? fc : null;
  const filiere = filiereDuParcours(key);
  const { data: rows, isError } = useQuery({
    queryKey: ["jalons-ponderes", apprenantId],
    enabled: !!isAdmin && !!filiere,
    queryFn: async () => {
      const { data, error } = await supabase.from("apprenant_module_completion").select("module_id, status, progress").eq("apprenant_id", apprenantId);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!isAdmin || !filiere || !key) return null;
  if (isError) return <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">Jalons pondérés : données indisponibles.</div>;
  if (!rows) return null;
  const r = calculerJalonsPonderes(filiere, FORMATION_MODULES[key].modules.map((m) => m.id), rows as any);
  const finIncomplete = r.taux < 100 && r.lignes.every((l) => l.obligatoireSansPoids || l.progression >= 100);
  return (
    <div className="w-full rounded-lg border bg-card shadow-sm px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Jalons pondérés (indicatif interne)</span>
        <span className="text-lg font-bold text-foreground">{r.taux.toLocaleString("fr-FR")}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-foreground/60" style={{ width: `${Math.min(100, r.taux)}%` }} />
      </div>
      {finIncomplete && <div className="mt-1 text-xs text-muted-foreground">Contenus pédagogiques terminés ; validation de fin de formation / jalon administratif en attente.</div>}
      <button type="button" onClick={() => setOpen(!open)} className="mt-1 flex items-center gap-1 text-xs text-primary">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Détail par module
      </button>
      {open && (
        <table className="mt-2 w-full text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Module</th><th className="text-right">Poids</th><th className="text-right">Progression</th><th className="text-right">Contribution</th></tr></thead>
          <tbody>
            {r.lignes.map((l) => (
              <tr key={l.moduleId} className="border-t">
                <td>{l.moduleId ? `${l.moduleId} · ${MODULE_NAME_BY_ID[l.moduleId] ?? ""}` : "Introduction (non attribuée)"}</td>
                <td className="text-right">{l.obligatoireSansPoids ? "0 (obligatoire)" : l.poids}</td>
                <td className="text-right">{Math.round(l.progression)}%</td>
                <td className="text-right">{l.contribution.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
