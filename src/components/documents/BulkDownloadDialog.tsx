import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Package, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  format,
  startOfWeek,
  endOfWeek,
  getISOWeek,
  getYear,
  addWeeks,
  isBefore,
  parseISO,
} from "date-fns";
import { generateEmargementSemainePdf } from "@/lib/pdf/emargement-semaine";
import { generateDocumentIndividuelPdf } from "@/lib/pdf/document-individuel";
import { buildDossierApprenantIntoZip } from "@/lib/pdf/build-dossier-apprenant";

type DocKey =
  | "dossier-complet"
  | "emargements-hebdo"
  | "fiche-positionnement"
  | "projet-professionnel";

const DOC_OPTIONS: { key: DocKey; label: string; description: string }[] = [
  {
    key: "dossier-complet",
    label: "Dossier apprenant complet",
    description: "Contrôle qualité, programme, émargements, relevé de connexions, suivi de progression et emails",
  },
  {
    key: "emargements-hebdo",
    label: "Feuilles d'émargement hebdomadaires (seules)",
    description: "Un PDF par semaine de la période de formation",
  },
  {
    key: "fiche-positionnement",
    label: "Fiche de positionnement stagiaire (seule)",
    description: "Test de compétences rempli à l'entrée en formation",
  },
  {
    key: "projet-professionnel",
    label: "Questionnaire projet professionnel (seul)",
    description: "Projet professionnel TAXI / VTC",
  },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function BulkDownloadDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDocs, setSelectedDocs] = useState<Set<DocKey>>(
    new Set(DOC_OPTIONS.map((d) => d.key)),
  );
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const { data: apprenants = [], isLoading } = useQuery({
    queryKey: ["bulk-download-apprenants"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select(
          "id, nom, prenom, email, type_apprenant, formation_choisie, date_debut_formation, date_fin_formation, date_debut_cours_en_ligne, date_fin_cours_en_ligne, civilite",
        )
        .order("nom", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apprenants;
    return apprenants.filter((a) =>
      `${a.nom} ${a.prenom} ${a.email || ""}`.toLowerCase().includes(q),
    );
  }, [apprenants, search]);

  const toggleAll = () => {
    if (filtered.every((a) => selectedIds.has(a.id))) {
      const next = new Set(selectedIds);
      filtered.forEach((a) => next.delete(a.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach((a) => next.add(a.id));
      setSelectedIds(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleDoc = (key: DocKey) => {
    const next = new Set(selectedDocs);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedDocs(next);
  };

  const buildForApprenant = async (
    apprenant: any,
    zip: JSZip,
    formateur: string,
  ) => {
    const slug = slugify(`${apprenant.prenom || ""}-${apprenant.nom || ""}`) ||
      apprenant.id;
    const root = zip.folder(slug)!;

    // --- Fetch documents completes if needed for fiche positionnement / projet ---
    const needDocs =
      selectedDocs.has("fiche-positionnement") ||
      selectedDocs.has("projet-professionnel");

    let documentsCompletes: any[] = [];
    if (needDocs) {
      const { data } = await supabase
        .from("apprenant_documents_completes")
        .select("type_document, donnees, completed_at, titre")
        .eq("apprenant_id", apprenant.id);
      documentsCompletes = (data as any[]) || [];
    }

    const getDoc = (typeDocument: string) =>
      documentsCompletes.find((d) => d.type_document === typeDocument);

    // --- Dossier apprenant complet (contrôle qualité + programme + émargements + relevé + progression + emails) ---
    if (selectedDocs.has("dossier-complet")) {
      try {
        await buildDossierApprenantIntoZip(apprenant, root, formateur);
      } catch (e) {
        console.error("[bulk] dossier complet failed", slug, e);
      }
    }

    // --- Fiche de positionnement (PDF individuel) ---
    if (selectedDocs.has("fiche-positionnement")) {
      const d = getDoc("test-competences");
      if (d) {
        try {
          const res = generateDocumentIndividuelPdf(
            apprenant,
            {
              type_document: "test-competences",
              titre: "Fiche de positionnement stagiaire",
              donnees: d.donnees,
              completed_at: d.completed_at,
            },
            { returnBlob: true },
          );
          if (res)
            root.folder("fiche-positionnement")!.file(res.fileName, res.blob);
        } catch (e) {
          console.error("[bulk] positionnement failed", slug, e);
        }
      }
    }

    // --- Projet professionnel (PDF individuel) ---
    if (selectedDocs.has("projet-professionnel")) {
      const d = getDoc("projet-professionnel");
      if (d) {
        try {
          const res = generateDocumentIndividuelPdf(
            apprenant,
            {
              type_document: "projet-professionnel",
              titre: "Questionnaire projet professionnel",
              donnees: d.donnees,
              completed_at: d.completed_at,
            },
            { returnBlob: true },
          );
          if (res)
            root.folder("projet-professionnel")!.file(res.fileName, res.blob);
        } catch (e) {
          console.error("[bulk] projet pro failed", slug, e);
        }
      }
    }

    // --- Feuilles d'émargement hebdomadaires ---
    if (selectedDocs.has("emargements-hebdo")) {
      try {
        const { data: emargData } = await supabase
          .from("emargements_fc" as any)
          .select("*")
          .eq("apprenant_id", apprenant.id)
          .order("date_emargement", { ascending: true });
        const emargements = (emargData as any[]) || [];
        const weekMap = new Map<
          string,
          {
            weekStart: Date;
            weekEnd: Date;
            year: number;
            week: number;
            sigs: any[];
          }
        >();

        const addWeek = (d: Date, sig?: any) => {
          const ws = startOfWeek(d, { weekStartsOn: 1 });
          const we = endOfWeek(d, { weekStartsOn: 1 });
          const year = getYear(ws);
          const week = getISOWeek(ws);
          const key = `${year}-W${String(week).padStart(2, "0")}`;
          if (!weekMap.has(key))
            weekMap.set(key, { weekStart: ws, weekEnd: we, year, week, sigs: [] });
          if (sig) weekMap.get(key)!.sigs.push(sig);
        };

        for (const e of emargements) {
          if (!e.date_emargement) continue;
          const d = new Date(e.date_emargement + "T00:00:00");
          addWeek(d, {
            date: e.date_emargement,
            demi_journee: e.demi_journee,
            signed_at: e.signed_at,
            signature: e.signature_data_url,
            confirme_presence_lieu: !!e.confirme_presence_lieu,
            confirme_identite: !!e.confirme_identite,
          });
        }

        // e-learning : pas d'itération des semaines vides — uniquement les feuilles pratiques
        const isElearningOnly = /(^|-)e($|-)/i.test(String(apprenant.type_apprenant || ""));

        if (!isElearningOnly) {
          const startStr =
            apprenant.date_debut_formation || apprenant.date_debut_cours_en_ligne;
          const endStr =
            apprenant.date_fin_formation || apprenant.date_fin_cours_en_ligne;
          if (startStr && endStr) {
            try {
              let cursor = startOfWeek(parseISO(startStr), { weekStartsOn: 1 });
              const stop = endOfWeek(parseISO(endStr), { weekStartsOn: 1 });
              let safety = 0;
              while (
                (isBefore(cursor, stop) || +cursor === +stop) &&
                safety < 260
              ) {
                addWeek(cursor);
                cursor = addWeeks(cursor, 1);
                safety++;
              }
            } catch {}
          }
        }

        const emargFolder = root.folder(
          "feuilles-emargement-hebdomadaires",
        )!;
        const sortedWeeks = Array.from(weekMap.values())
          .filter(w => !isElearningOnly || w.sigs.length > 0)
          .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
        for (const w of sortedWeeks) {
          const wsStr = format(w.weekStart, "yyyy-MM-dd");
          const weStr = format(w.weekEnd, "yyyy-MM-dd");
          const label = `Semaine ${w.week} - ${w.year}`;
          const sigs = w.sigs.sort((a, b) => a.date.localeCompare(b.date));
          const res = generateEmargementSemainePdf(
            apprenant,
            label,
            wsStr,
            weStr,
            sigs,
            formateur,
            { returnBlob: true },
          );
          if (res) emargFolder.file(res.fileName, res.blob);
        }
      } catch (e) {
        console.error("[bulk] émargements failed", slug, e);
      }
    }
  };

  const handleDownload = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "Aucun apprenant sélectionné",
        description: "Cochez au moins un apprenant.",
        variant: "destructive",
      });
      return;
    }
    if (selectedDocs.size === 0) {
      toast({
        title: "Aucun document sélectionné",
        description: "Cochez au moins un type de document.",
        variant: "destructive",
      });
      return;
    }

    const formateur =
      (window.prompt(
        "Nom du formateur à indiquer sur les feuilles d'émargement :",
        "GUENICHI Naoufal",
      ) || "GUENICHI Naoufal").trim();

    setLoading(true);
    setProgress("Préparation…");
    try {
      const zip = new JSZip();
      const targets = apprenants.filter((a) => selectedIds.has(a.id));
      let i = 0;
      for (const a of targets) {
        i++;
        setProgress(
          `Génération ${i}/${targets.length} — ${a.prenom} ${a.nom}`,
        );
        await buildForApprenant(a, zip, formateur);
      }
      setProgress("Compression du ZIP…");
      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
      saveAs(blob, `dossiers-apprenants_${stamp}.zip`);
      toast({
        title: "Téléchargement prêt",
        description: `${targets.length} dossier(s) exporté(s).`,
      });
      setOpen(false);
    } catch (e: any) {
      console.error("[bulk-download] failed", e);
      toast({
        title: "Erreur",
        description: e?.message || "Échec de la génération.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const allChecked =
    filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Package className="w-4 h-4" />
          Téléchargement groupé
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Téléchargement groupé par apprenant
          </DialogTitle>
          <DialogDescription>
            Cochez les apprenants et les documents à générer. Un ZIP contenant
            un dossier par apprenant sera créé.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 flex-1 overflow-hidden">
          {/* Doc types */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Documents à inclure</p>
            <div className="grid sm:grid-cols-2 gap-2 p-3 bg-muted/40 rounded-md border">
              {DOC_OPTIONS.map((d) => (
                <label
                  key={d.key}
                  className="flex items-start gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedDocs.has(d.key)}
                    onCheckedChange={() => toggleDoc(d.key)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">{d.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {d.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Learners */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Apprenants ({selectedIds.size} sélectionné
                {selectedIds.size > 1 ? "s" : ""})
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                disabled={filtered.length === 0}
              >
                {allChecked ? "Tout décocher" : "Tout cocher (filtre)"}
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un apprenant…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="border rounded-md flex-1 overflow-y-auto max-h-[40vh]">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Chargement…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Aucun apprenant.
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((a) => (
                    <li key={a.id}>
                      <label className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={selectedIds.has(a.id)}
                          onCheckedChange={() => toggleOne(a.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {a.nom?.toUpperCase()} {a.prenom}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.type_apprenant || "—"} ·{" "}
                            {a.email || "sans email"}
                          </p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {progress && (
            <p className="text-xs text-muted-foreground flex-1">{progress}</p>
          )}
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleDownload}
            disabled={loading || selectedIds.size === 0 || selectedDocs.size === 0}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            Générer le ZIP ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
