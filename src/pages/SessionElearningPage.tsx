import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  Loader2,
  Search,
  Users,
} from "lucide-react";

const isElearning = (type?: string | null) => {
  const t = (type || "").toLowerCase().trim();
  if (!t) return false;
  return t.includes("e-learning") || t.includes("elearning") || /(^|[\s-])[a-z]{2,4}-e($|-)/.test(t) || t.endsWith("-e");
};

const hasPassedExam = (r?: string | null) => (r || "").toLowerCase().trim() === "oui";

const formatExamDate = (value?: string | null): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  try {
    return format(d, "dd MMMM yyyy", { locale: fr });
  } catch {
    return null;
  }
};

export default function SessionElearningPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["session-elearning-apprenants"],
    queryFn: async () => {
      const { data: apprenants, error } = await supabase
        .from("apprenants")
        .select(
          "id, civilite, nom, prenom, email, telephone, type_apprenant, statut, resultat_examen, date_examen_theorique, lieu_examen, mot_de_passe_plateforme, mot_de_passe_cma, documents_complets, modules_autorises, deleted_at"
        )
        .is("deleted_at", null);
      if (error) throw error;

      const eligibles = (apprenants || []).filter(
        (a: any) =>
          isElearning(a.type_apprenant) &&
          !hasPassedExam(a.resultat_examen) &&
          (a.statut || "").toLowerCase() !== "archive"
      );

      const ids = eligibles.map((a: any) => a.id);
      let dossierIds = new Set<string>();
      const completedByLearner = new Map<string, Set<number>>();
      if (ids.length > 0) {
        const { data: docs } = await supabase
          .from("apprenant_documents_completes")
          .select("apprenant_id")
          .in("apprenant_id", ids)
          .eq("type_document", "dossier-bienvenue");
        dossierIds = new Set((docs || []).map((d: any) => d.apprenant_id));

        // Modules terminés (status terminal = source de vérité)
        const { data: completions } = await supabase
          .from("apprenant_module_completion")
          .select("apprenant_id, module_id")
          .in("apprenant_id", ids)
          .eq("status", "completed");
        for (const c of completions || []) {
          const set = completedByLearner.get(c.apprenant_id) || new Set<number>();
          set.add(Number(c.module_id));
          completedByLearner.set(c.apprenant_id, set);
        }
      }

      return eligibles
        .map((a: any) => {
          const autorises: number[] = Array.isArray(a.modules_autorises)
            ? a.modules_autorises.map((m: any) => Number(m)).filter((m: number) => Number.isFinite(m))
            : [];
          const doneSet = completedByLearner.get(a.id) || new Set<number>();
          const modulesTermines = autorises.length > 0
            ? autorises.filter((m) => doneSet.has(m)).length
            : doneSet.size;
          return {
            ...a,
            hasDossier: dossierIds.has(a.id),
            modulesTotal: autorises.length,
            modulesTermines,
            tousModulesTermines: autorises.length > 0 && modulesTermines >= autorises.length,
          };
        })
        .sort((a: any, b: any) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"));
    },
  });

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data || [];
    return (data || []).filter((a: any) =>
      `${a.nom} ${a.prenom} ${a.email} ${a.telephone}`.toLowerCase().includes(q)
    );
  }, [data, search]);

  const copy = async (value?: string | null, label = "Valeur") => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copié`, description: value });
  };

  const downloadDossier = async (apprenant: any) => {
    try {
      const { data: docs, error } = await supabase
        .from("apprenant_documents_completes")
        .select("type_document, donnees, completed_at")
        .eq("apprenant_id", apprenant.id)
        .eq("type_document", "dossier-bienvenue")
        .order("completed_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const doc = docs?.[0];
      if (!doc) {
        toast({
          title: "Aucun dossier de bienvenue",
          description: `${apprenant.prenom} ${apprenant.nom} n'a pas encore complété son dossier.`,
          variant: "destructive",
        });
        return;
      }
      const { generateDocumentIndividuelPdf } = await import("@/lib/pdf/document-individuel");
      await generateDocumentIndividuelPdf(apprenant, {
        type_document: "dossier-bienvenue",
        titre: "Dossier de bienvenue - Inscription CMA",
        donnees: doc.donnees,
        completed_at: doc.completed_at,
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "PDF impossible", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Session e-learning</h1>
            <p className="text-muted-foreground">
              Apprenants inscrits en e-learning n'ayant pas encore passé l'examen
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Users className="h-4 w-4 mr-1" /> {rows.length} apprenant(s)
        </Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un apprenant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun apprenant e-learning en attente d'examen.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((a: any) => (
            <Card key={a.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="truncate">
                    {a.civilite ? `${a.civilite} ` : ""}
                    {a.nom} {a.prenom}
                  </span>
                  <Badge variant="outline" className="shrink-0">{a.type_apprenant}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-muted-foreground">{a.email || "—"}</span>
                  {a.email && (
                    <Button variant="ghost" size="icon" onClick={() => copy(a.email, "Email")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div>
                  <span className="text-muted-foreground">Examen théorique : </span>
                  {formatExamDate(a.date_examen_theorique) ? (
                    <span className="font-medium">
                      {formatExamDate(a.date_examen_theorique)}
                      {a.lieu_examen ? ` — ${a.lieu_examen}` : ""}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground">non planifié</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Modules : </span>
                  <Badge
                    variant={a.tousModulesTermines ? "default" : "outline"}
                    className={a.tousModulesTermines ? "bg-green-600 hover:bg-green-600 text-white" : ""}
                  >
                    {a.tousModulesTermines
                      ? `✅ Tous les modules terminés (${a.modulesTermines}/${a.modulesTotal})`
                      : a.modulesTotal > 0
                        ? `${a.modulesTermines}/${a.modulesTotal} modules terminés`
                        : `${a.modulesTermines} module(s) terminé(s)`}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Badge variant={a.hasDossier ? "default" : "destructive"}>
                    {a.hasDossier ? "Dossier de bienvenue complété" : "Dossier de bienvenue manquant"}
                  </Badge>
                  {a.hasDossier && (
                    <Button variant="outline" size="sm" onClick={() => downloadDossier(a)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> PDF
                    </Button>
                  )}
                </div>

                <div className="rounded-md border p-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Mot de passe plateforme</span>
                    <span className="font-mono">{a.mot_de_passe_plateforme || "—"}</span>
                    {a.mot_de_passe_plateforme && (
                      <Button variant="ghost" size="icon" onClick={() => copy(a.mot_de_passe_plateforme, "Mot de passe")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Mot de passe CMA</span>
                    <span className="font-mono">{a.mot_de_passe_cma || "—"}</span>
                    {a.mot_de_passe_cma && (
                      <Button variant="ghost" size="icon" onClick={() => copy(a.mot_de_passe_cma, "Mot de passe CMA")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/?apprenant=${a.id}`)}
                >
                  <FileText className="h-3.5 w-3.5 mr-1" /> Voir la fiche
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
