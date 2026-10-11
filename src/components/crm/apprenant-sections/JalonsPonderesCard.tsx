import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FORMATION_MODULES, MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";
import { calculerJalonsPonderes, filiereDuParcours } from "@/lib/jalonsPonderes";

/** Carte interne ADMIN : taux indicatif pondéré. Lecture seule. */
export function JalonsPonderesCard({ apprenantId, typeApprenant, formationChoisie }: { apprenantId: string; typeApprenant?: string | null; formationChoisie?: string | null }) {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const userId = !loading ? user?.id ?? null : null;
  const { data: adminCheck } = useQuery({
    queryKey: ["jalons-ponderes-admin", userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!).eq("role", "admin").maybeSingle();
      if (error) throw error;
      return { userId, admin: !!data };
    },
  });
  // Le résultat n'est valable que pour le compte qui l'a obtenu (changement de compte / déconnexion = masqué).
  const isAdmin = !!userId && adminCheck?.userId === userId && adminCheck.admin;
  const ta = String(typeApprenant ?? "").toLowerCase().trim();
  const fc = String(formationChoisie ?? "").toLowerCase().trim();
  const key = FORMATION_MODULES[ta] ? ta : FORMATION_MODULES[fc] ? fc : null;
  const filiere = filiereDuParcours(key);
  const { data: rows, isError } = useQuery({
    queryKey: ["jalons-ponderes", apprenantId, userId],
    enabled: !!isAdmin && !!filiere,
    queryFn: async () => {
      const { data, error } = await supabase.from("apprenant_module_completion").select("module_id, status, progress").eq("apprenant_id", apprenantId);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!isAdmin || !filiere || !key) return null;
  if (isError) return <div className="mt-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">Jalons pondérés : données indisponibles.</div>;
  if (!rows) return null;
  const r = calculerJalonsPonderes(filiere, FORMATION_MODULES[key].modules.map((m) => m.id), rows as any);
  const finIncomplete = r.taux < 100 && r.lignes.every((l) => l.obligatoireSansPoids || l.valide);
  return (
    <div className="mt-2 w-full rounded-md border bg-card px-3 py-2">
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
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[22rem] text-xs">
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
        </table></div>
      )}
    </div>
  );
}
