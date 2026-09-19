import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ClipboardCheck, FileDown, FileSpreadsheet, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { CRITERES, INDICATEURS, STATUT_LABELS, type QualiopiStatut } from "@/lib/qualiopi/referentiel";
import { ALERTE_LABELS, alertesPourIndicateur, loadQualiopi, type QualiopiEtat, type QualiopiPreuve } from "@/lib/qualiopi/data";
import { buildExportRows, exportQualiopiCsv, exportQualiopiPdf } from "@/lib/qualiopi/export";
import { IndicateurDialog } from "./IndicateurDialog";

const statutVariant: Record<QualiopiStatut, string> = {
  conforme: "bg-green-100 text-green-800 border-green-200",
  a_completer: "bg-amber-100 text-amber-800 border-amber-200",
  preuve_manquante: "bg-red-100 text-red-800 border-red-200",
  non_applicable: "bg-muted text-muted-foreground",
};

export function QualiopiPage() {
  const [loading, setLoading] = useState(true);
  const [etats, setEtats] = useState<Record<number, QualiopiEtat>>({});
  const [preuves, setPreuves] = useState<QualiopiPreuve[]>([]);
  const [filtreCritere, setFiltreCritere] = useState("all");
  const [filtreStatut, setFiltreStatut] = useState("all");
  const [recherche, setRecherche] = useState("");
  const [openNum, setOpenNum] = useState<number | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadQualiopi();
      setEtats(data.etats);
      setPreuves(data.preuves);
    } catch (e: any) {
      toast.error(e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const preuvesParIndicateur = useMemo(() => {
    const map: Record<number, QualiopiPreuve[]> = {};
    for (const ind of INDICATEURS) map[ind.numero] = [];
    for (const p of preuves) for (const n of p.indicateurs) (map[n] ||= []).push(p);
    return map;
  }, [preuves]);

  const stats = useMemo(() => {
    let applicables = 0, conformes = 0, aCompleter = 0, sansPreuve = 0, nonApplicables = 0, couverts = 0;
    for (const ind of INDICATEURS) {
      const e = etats[ind.numero];
      const actives = (preuvesParIndicateur[ind.numero] || []).filter((p) => !p.archivee);
      if (!e?.applicable || e?.statut === "non_applicable") { nonApplicables++; continue; }
      applicables++;
      if (actives.length > 0) couverts++; else sansPreuve++;
      if (e.statut === "conforme") conformes++;
      if (e.statut === "a_completer") aCompleter++;
    }
    return {
      applicables, conformes, aCompleter, sansPreuve, nonApplicables,
      couverture: applicables ? Math.round((couverts / applicables) * 100) : 0,
    };
  }, [etats, preuvesParIndicateur]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return INDICATEURS.filter((ind) => {
      if (filtreCritere !== "all" && String(ind.critere) !== filtreCritere) return false;
      const e = etats[ind.numero];
      if (filtreStatut !== "all" && (e?.statut ?? "preuve_manquante") !== filtreStatut) return false;
      if (q && !`${ind.numero} ${ind.intitule} ${ind.niveauAttendu}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filtreCritere, filtreStatut, recherche, etats]);

  const rows = useMemo(() => buildExportRows(etats, preuvesParIndicateur), [etats, preuvesParIndicateur]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Tableau de bord */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Indicateurs applicables", value: stats.applicables },
          { label: "Conformes", value: stats.conformes },
          { label: "À compléter", value: stats.aCompleter },
          { label: "Sans preuve", value: stats.sansPreuve },
          { label: "Non applicables", value: stats.nonApplicables },
          { label: "Couverture documentaire", value: `${stats.couverture} %` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground border rounded-lg p-3 bg-muted/40">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Le pourcentage indique uniquement la <strong>présence de preuves</strong>. Il n'affirme jamais que l'organisme est
          conforme ou certifiable : la décision de conformité reste humaine. Les exemples de preuves du guide ne sont ni
          exhaustifs ni obligatoires.
        </p>
      </div>

      {/* Filtres + audit */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un indicateur…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        <Select value={filtreCritere} onValueChange={setFiltreCritere}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Critère" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les critères</SelectItem>
            {CRITERES.map((c) => <SelectItem key={c.numero} value={String(c.numero)}>Critère {c.numero}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtreStatut} onValueChange={setFiltreStatut}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.keys(STATUT_LABELS) as QualiopiStatut[]).map((s) => <SelectItem key={s} value={s}>{STATUT_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="gap-2" onClick={() => setAuditOpen(true)}><ClipboardCheck className="w-4 h-4" /> Préparer l'audit Qualiopi</Button>
        <Button variant="outline" className="gap-2" onClick={() => exportQualiopiPdf(rows)}><FileDown className="w-4 h-4" /> PDF</Button>
        <Button variant="outline" className="gap-2" onClick={() => exportQualiopiCsv(rows)}><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
      </div>

      {/* Liste par critère */}
      {CRITERES.filter((c) => visibles.some((i) => i.critere === c.numero)).map((c) => (
        <Card key={c.numero}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Critère {c.numero} — {c.intitule}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibles.filter((i) => i.critere === c.numero).map((ind) => {
              const e = etats[ind.numero];
              const liees = preuvesParIndicateur[ind.numero] || [];
              const actives = liees.filter((p) => !p.archivee);
              const alertes = alertesPourIndicateur(e, liees);
              return (
                <button key={ind.numero} onClick={() => setOpenNum(ind.numero)}
                  className="w-full text-left border rounded-lg p-3 hover:bg-accent/40 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        <span className="text-primary mr-2">#{ind.numero}</span>{ind.intitule}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ind.niveauAttendu}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {alertes.map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-700">
                            <AlertTriangle className="w-3 h-3" /> {ALERTE_LABELS[a]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <Badge className={statutVariant[e?.statut ?? "preuve_manquante"]} variant="outline">
                        {STATUT_LABELS[e?.statut ?? "preuve_manquante"]}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{actives.length} preuve(s)</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e?.date_verification ? `Vérifié le ${e.date_verification}` : "Jamais vérifié"}
                        {e?.responsable ? ` — ${e.responsable}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <IndicateurDialog
        indicateur={openNum ? INDICATEURS.find((i) => i.numero === openNum) ?? null : null}
        etat={openNum ? etats[openNum] ?? null : null}
        preuves={openNum ? preuvesParIndicateur[openNum] || [] : []}
        onOpenChange={(v) => { if (!v) setOpenNum(null); }}
        onChanged={refresh}
      />

      {/* Vue préparation d'audit */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Préparation de l'audit Qualiopi</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => exportQualiopiPdf(rows)}><FileDown className="w-4 h-4" /> Export PDF</Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => exportQualiopiCsv(rows)}><FileSpreadsheet className="w-4 h-4" /> Export Excel</Button>
          </div>
          <div className="space-y-4">
            {CRITERES.map((c) => (
              <div key={c.numero}>
                <p className="text-sm font-semibold mb-2">Critère {c.numero} — {c.intitule}</p>
                <div className="space-y-2">
                  {INDICATEURS.filter((i) => i.critere === c.numero).map((ind) => {
                    const e = etats[ind.numero];
                    const actives = (preuvesParIndicateur[ind.numero] || []).filter((p) => !p.archivee);
                    return (
                      <div key={ind.numero} className="border rounded-lg p-3">
                        <div className="flex justify-between gap-2">
                          <p className="text-sm font-medium">#{ind.numero} — {ind.intitule}</p>
                          <Badge className={statutVariant[e?.statut ?? "preuve_manquante"]} variant="outline">
                            {STATUT_LABELS[e?.statut ?? "preuve_manquante"]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{ind.niveauAttendu}</p>
                        <div className="mt-2 space-y-1">
                          {actives.length === 0 && <p className="text-xs text-red-600">Aucune preuve rattachée.</p>}
                          {actives.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-2 text-xs border rounded px-2 py-1">
                              <span className="truncate">{p.titre}</span>
                              <span className="flex gap-1 shrink-0">
                                {p.lien_url && <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => window.open(p.lien_url!, "_blank")}>Ouvrir le lien</Button>}
                                {p.fichiers.map((f, i) => (
                                  <Button key={i} size="sm" variant="ghost" className="h-6 text-xs"
                                    onClick={() => import("@/lib/qualiopi/data").then((m) => m.openPreuveFichier(f)).catch(() => toast.error("Ouverture impossible"))}>
                                    {f.nom}
                                  </Button>
                                ))}
                              </span>
                            </div>
                          ))}
                        </div>
                        {e?.commentaire_auditeur && (
                          <p className="text-xs mt-2 italic text-muted-foreground">Commentaire : {e.commentaire_auditeur}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QualiopiPage;
