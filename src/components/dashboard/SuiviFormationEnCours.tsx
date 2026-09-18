import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { isPratiqueType } from "@/lib/sessionTypes";

const SIGNATURES_REQUISES = 40;

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const DOCS_REQUIS: Array<{ type: string; label: string }> = [
  { type: "projet-professionnel", label: "Projet professionnel" },
  { type: "analyse-besoin", label: "Analyse des besoins" },
  { type: "test-competences", label: "Test de compétences" },
];

interface Props {
  onNavigateToApprenant?: (id: string) => void;
}

interface Ligne {
  id: string;
  nom: string;
  prenom: string;
  type_apprenant: string | null;
  formation_choisie: string | null;
  pole: "journee" | "soiree";
  signatures: number;
  manquantsDocs: string[];
}

export function SuiviFormationEnCours({ onNavigateToApprenant }: Props) {
  const today = isoDate(new Date());

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["suivi-formation-en-cours", today],
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Ligne[]> => {
      const { data: apprenants, error: errA } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
        .is("deleted_at", null)
        .lte("date_debut_cours_en_ligne", today)
        .gte("date_fin_cours_en_ligne", today);
      if (errA) throw errA;

      const presentiels = (apprenants || []).filter((a) => {
        const t = (a.type_apprenant || "").toLowerCase().trim();
        return t && !/-e$/.test(t);
      });
      if (presentiels.length === 0) return [];

      const ids = presentiels.map((a) => a.id);

      const { data: sessionAppr, error: errSA } = await supabase
        .from("session_apprenants")
        .select("apprenant_id, date_debut, date_fin, date_fin_personnalisee, session:sessions!inner(date_debut, date_fin, type_session, creneaux, heure_debut, nom)")
        .in("apprenant_id", ids);
      if (errSA) throw errSA;

      const poleByAppr = new Map<string, "journee" | "soiree">();
      for (const sa of (sessionAppr || []) as any[]) {
        const sess = sa.session;
        if (!sess) continue;
        if (sess.type_session && isPratiqueType(sess.type_session)) continue;
        const start = (sa.date_debut && sa.date_debut > sess.date_debut ? sa.date_debut : sess.date_debut) as string;
        const endRaw = sa.date_fin_personnalisee || sa.date_fin || sess.date_fin;
        const end = (endRaw && endRaw < sess.date_fin ? endRaw : sess.date_fin) as string;
        if (!start || !end) continue;
        if (start > today || end < today) continue;

        const creneauxStr = ((sess.creneaux as string[] | null) || []).join(" ").toLowerCase();
        const nomStr = (sess.nom || "").toLowerCase();
        const heureDeb = sess.heure_debut || "";
        const isEvening =
          creneauxStr.includes("soir") ||
          nomStr.includes("soir") ||
          /1[7-9]:|2[0-3]:/.test(creneauxStr) ||
          (heureDeb && parseInt(heureDeb.split(":")[0], 10) >= 17);
        poleByAppr.set(sa.apprenant_id, isEvening ? "soiree" : "journee");
      }

      const actifs = presentiels.filter((a) => poleByAppr.has(a.id));
      if (actifs.length === 0) return [];
      const actifIds = actifs.map((a) => a.id);

      const { data: signes, error: errS } = await supabase
        .from("emargements_fc")
        .select("apprenant_id, date_emargement, demi_journee, absent, signature_data_url")
        .in("apprenant_id", actifIds);
      if (errS) throw errS;

      const signCount = new Map<string, number>();
      for (const s of (signes || []) as any[]) {
        if (s.absent) continue;
        if (!s.signature_data_url) continue;
        signCount.set(s.apprenant_id, (signCount.get(s.apprenant_id) || 0) + 1);
      }

      const { data: docs, error: errD } = await supabase
        .from("apprenant_documents_completes")
        .select("apprenant_id, type_document")
        .in("apprenant_id", actifIds)
        .in("type_document", DOCS_REQUIS.map((d) => d.type));
      if (errD) throw errD;

      const docSet = new Set(((docs || []) as any[]).map((d) => `${d.apprenant_id}|${d.type_document}`));

      return actifs
        .map((a) => ({
          id: a.id,
          nom: (a.nom || "").toUpperCase(),
          prenom: a.prenom || "",
          type_apprenant: a.type_apprenant,
          formation_choisie: a.formation_choisie,
          pole: poleByAppr.get(a.id)!,
          signatures: signCount.get(a.id) || 0,
          manquantsDocs: DOCS_REQUIS.filter((d) => !docSet.has(`${a.id}|${d.type}`)).map((d) => d.label),
        }))
        .sort((x, y) => `${x.nom} ${x.prenom}`.localeCompare(`${y.nom} ${y.prenom}`));
    },
  });

  const lignes = data ?? [];
  const journee = lignes.filter((l) => l.pole === "journee");
  const soiree = lignes.filter((l) => l.pole === "soiree");

  const renderLigne = (l: Ligne) => {
    const signaturesManquantes = Math.max(0, SIGNATURES_REQUISES - l.signatures);
    const complet = signaturesManquantes === 0 && l.manquantsDocs.length === 0;
    return (
      <button
        key={l.id}
        type="button"
        onClick={() => onNavigateToApprenant?.(l.id)}
        className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {l.nom} {l.prenom}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {l.formation_choisie || l.type_apprenant || ""}
            </p>
          </div>
          {complet ? (
            <Badge className="bg-success/10 text-success border-success/30 shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Complet
            </Badge>
          ) : (
            <Badge variant="destructive" className="shrink-0">
              <AlertTriangle className="w-3 h-3 mr-1" /> À compléter
            </Badge>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span
            className={
              signaturesManquantes === 0
                ? "px-2 py-0.5 rounded-full bg-success/10 text-success"
                : "px-2 py-0.5 rounded-full bg-destructive/10 text-destructive"
            }
          >
            Signatures {l.signatures}/{SIGNATURES_REQUISES}
            {signaturesManquantes > 0 ? ` — il manque ${signaturesManquantes}` : ""}
          </span>
          {l.manquantsDocs.length === 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success">
              Projet professionnel, analyse des besoins et test de compétences remplis et signés
            </span>
          ) : (
            l.manquantsDocs.map((d) => (
              <span key={d} className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                Manque : {d}
              </span>
            ))
          )}
        </div>
      </button>
    );
  };

  const renderPole = (
    titre: string,
    icone: React.ReactNode,
    items: Ligne[],
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icone}
        <h3 className="font-semibold text-sm">{titre}</h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun apprenant en formation sur ce pôle aujourd'hui.</p>
      ) : (
        <div className="space-y-2">{items.map(renderLigne)}</div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Apprenants actuellement en formation — contrôle dossier
        </CardTitle>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          {dataUpdatedAt
            ? `Mis à jour à ${new Date(dataUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 opacity-60">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        ) : lignes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun apprenant en formation présentielle aujourd'hui.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPole("Cours en journée", <Sun className="w-4 h-4 text-warning" />, journee)}
            {renderPole("Cours en soirée", <Moon className="w-4 h-4 text-primary" />, soiree)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
