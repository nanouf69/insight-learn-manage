import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PenLine, Phone, Mail, Sun, Moon } from "lucide-react";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const currentDemi = (): "matin" | "apres_midi" => (new Date().getHours() < 13 ? "matin" : "apres_midi");

interface Props {
  onNavigateToApprenant?: (id: string) => void;
}

interface ApprenantPresentiel {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
}

interface EmargementSigne {
  apprenant_id: string;
}

export function EmargementsManquants({ onNavigateToApprenant }: Props) {
  const demi = currentDemi();
  const today = todayISO();

  const { data: manquants = [], isLoading } = useQuery({
    queryKey: ["emargements-manquants", today, demi],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // 1. Apprenants en présentiel ACTUELLEMENT en formation
      // (today entre date_debut_cours_en_ligne et date_fin_cours_en_ligne)
      const { data: apprenants, error: errA } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
        .is("deleted_at", null)
        .ilike("type_apprenant", "%presentiel%")
        .lte("date_debut_cours_en_ligne", today)
        .gte("date_fin_cours_en_ligne", today);

      if (errA) throw errA;
      if (!apprenants || apprenants.length === 0) return [];

      // 2. Émargements signés aujourd'hui pour ce créneau
      const ids = apprenants.map((a) => a.id);
      const { data: signes, error: errS } = await supabase
        .from("emargements_fc" as any)
        .select("apprenant_id")
        .eq("date_emargement", today)
        .eq("demi_journee", demi)
        .in("apprenant_id", ids);

      if (errS) throw errS;
      const signedSet = new Set(((signes || []) as EmargementSigne[]).map((s) => s.apprenant_id));

      return apprenants.filter((a) => !signedSet.has(a.id));
    },
  });

  const demiLabel = demi === "matin" ? "Matin" : "Après-midi";
  const DemiIcon = demi === "matin" ? Sun : Moon;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-muted-foreground" />
            Émargements présentiels manquants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (manquants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-muted-foreground" />
            Émargements présentiels — {demiLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Tous les apprenants ont signé 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <DemiIcon className="h-5 w-5" />
          Émargements manquants — {demiLabel}
          <Badge variant="outline" className="ml-2 border-amber-400 text-amber-700 bg-amber-50">
            {manquants.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(manquants as ApprenantPresentiel[]).slice(0, 8).map((a) => (
          <div
            key={a.id}
            className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1 cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => onNavigateToApprenant?.(a.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm">
                {a.prenom} {a.nom}
              </p>
              <Badge variant="outline" className="text-xs shrink-0">
                {a.type_apprenant}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {a.telephone && (
                <a
                  href={`tel:${a.telephone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Phone className="h-3 w-3" />
                  {a.telephone}
                </a>
              )}
              {a.email && (
                <a
                  href={`mailto:${a.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 hover:text-foreground truncate"
                >
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{a.email}</span>
                </a>
              )}
            </div>
          </div>
        ))}
        {manquants.length > 8 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            Et {manquants.length - 8} autre(s)…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
