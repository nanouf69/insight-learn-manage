import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, X, Mail, Phone, RotateCcw } from "lucide-react";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";

const DISMISS_KEY = "dashboard-elearning-sans-pratique-masques";

const isElearning = (type?: string | null) => {
  const t = (type || "").toLowerCase().trim();
  if (!t) return false;
  return t.includes("e-learning") || t.includes("elearning") || /-e$/.test(t);
};

interface Props {
  onNavigateToApprenant?: (id: string) => void;
}

export function ElearningSansPratique({ onNavigateToApprenant }: Props) {
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      const raw = safeGetItem(DISMISS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });

  const persist = (next: string[]) => {
    setDismissed(next);
    try {
      safeSetItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["elearning-sans-pratique"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: apprenants, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, type_apprenant, statut")
        .is("deleted_at", null);
      if (error) throw error;

      const eligibles = (apprenants || []).filter(
        (a: any) =>
          isElearning(a.type_apprenant) && (a.statut || "").toLowerCase() !== "archive",
      );
      if (eligibles.length === 0) return [];

      const ids = eligibles.map((a: any) => a.id);

      const [{ data: reservations }, { data: sessionLinks }] = await Promise.all([
        supabase
          .from("reservations_pratique" as any)
          .select("apprenant_id")
          .in("apprenant_id", ids),
        supabase
          .from("session_apprenants")
          .select("apprenant_id, sessions:session_id(type_session, nom)")
          .in("apprenant_id", ids),
      ]);

      const avecPratique = new Set<string>();
      for (const r of ((reservations as any[]) || [])) {
        if (r?.apprenant_id) avecPratique.add(String(r.apprenant_id));
      }
      for (const s of ((sessionLinks as any[]) || [])) {
        const sess = s?.sessions;
        const label = `${sess?.type_session || ""} ${sess?.nom || ""}`.toLowerCase();
        if (label.includes("pratique")) avecPratique.add(String(s.apprenant_id));
      }

      return eligibles
        .filter((a: any) => !avecPratique.has(String(a.id)))
        .sort((a: any, b: any) =>
          `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"),
        );
    },
  });

  const rows = useMemo(
    () => (data || []).filter((a: any) => !dismissed.includes(String(a.id))),
    [data, dismissed],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Car className="h-4 w-4 text-orange-600" />
            E-learning sans formation pratique
          </span>
          <div className="flex items-center gap-2">
            {dismissed.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => persist([])}
                title="Réafficher les apprenants retirés"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Badge variant="secondary">{rows.length}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Tous les apprenants e-learning ont une formation pratique.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {rows.map((a: any) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-2 rounded-md border p-2"
              >
                <div className="min-w-0">
                  <button
                    className="font-medium text-sm hover:underline text-left truncate"
                    onClick={() => onNavigateToApprenant?.(a.id)}
                  >
                    {a.nom} {a.prenom}
                  </button>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                    {a.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {a.email}
                      </span>
                    )}
                    {a.telephone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {a.telephone}
                      </span>
                    )}
                  </div>
                  {a.type_apprenant && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {a.type_apprenant}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title="Retirer de la liste"
                  onClick={() => persist([...dismissed, String(a.id)])}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
