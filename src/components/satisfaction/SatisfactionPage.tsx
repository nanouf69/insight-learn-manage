import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { buildRapportAnnuel, computeIndicateurs, loadEnquetes, loadStagiaires, type EnqueteSatisfaction, type StagiaireRow } from "@/lib/satisfaction/data";
import { exportRapportAnnuelCsv, exportRapportAnnuelPdf } from "@/lib/satisfaction/export";

const n1 = (v: number | null) => (typeof v === "number" ? v.toFixed(1) : "—");
const n0 = (v: number | null) => (typeof v === "number" ? `${Math.round(v)} %` : "—");

const Kpi = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

export function SatisfactionPage() {
  const [loading, setLoading] = useState(true);
  const [enquetes, setEnquetes] = useState<EnqueteSatisfaction[]>([]);
  const [stagiaires, setStagiaires] = useState<StagiaireRow[]>([]);
  const [annee, setAnnee] = useState<string>(String(new Date().getFullYear()));
  const [formation, setFormation] = useState<string>("toutes");
  const [recherche, setRecherche] = useState("");
  const [detail, setDetail] = useState<EnqueteSatisfaction | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await loadEnquetes();
        setEnquetes(rows);
        setStagiaires(await loadStagiaires());
        const annees = Array.from(new Set(rows.map((r) => r.annee).filter(Boolean))).sort((a, b) => b - a);
        if (annees.length && !annees.includes(Number(annee))) setAnnee(String(annees[0]));
      } catch {
        toast.error("Impossible de charger les enquêtes de satisfaction");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const annees = useMemo(
    () => Array.from(new Set(enquetes.map((e) => e.annee).filter(Boolean))).sort((a, b) => b - a),
    [enquetes],
  );
  const formations = useMemo(() => Array.from(new Set(enquetes.map((e) => e.formation))).sort(), [enquetes]);

  const baseAnnee = useMemo(
    () => (formation === "toutes" ? enquetes : enquetes.filter((e) => e.formation === formation)),
    [enquetes, formation],
  );
  const rapport = useMemo(() => buildRapportAnnuel(baseAnnee, Number(annee)), [baseAnnee, annee]);
  const indicateurs = useMemo(
    () => computeIndicateurs(stagiaires, Number(annee), formation),
    [stagiaires, annee, formation],
  );

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return rapport.enquetes
      .filter((e) => !q || `${e.nom} ${e.prenom} ${e.email}`.toLowerCase().includes(q))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [rapport.enquetes, recherche]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement des enquêtes…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Année</p>
          <Select value={annee} onValueChange={setAnnee}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(annees.length ? annees : [new Date().getFullYear()]).map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Formation</p>
          <Select value={formation} onValueChange={setFormation}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les formations</SelectItem>
              {formations.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <p className="text-xs text-muted-foreground">Rechercher un apprenant</p>
          <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, prénom ou email" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportRapportAnnuelCsv(rapport, indicateurs)} disabled={!rapport.nbReponses}>
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button onClick={() => exportRapportAnnuelPdf(rapport, indicateurs)} disabled={!rapport.nbReponses}>
            <FileText className="w-4 h-4 mr-2" /> Rapport annuel PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Réponses reçues" value={String(rapport.nbReponses)} hint={`Année ${rapport.annee}`} />
        <Kpi label="Note globale moyenne" value={`${n1(rapport.noteGlobaleMoyenne)}/5`} />
        <Kpi label="Moyenne des critères" value={`${n1(rapport.moyenneCriteres)}/5`} />
        <Kpi label="Taux de satisfaction" value={n0(rapport.tauxSatisfaction)} hint="Notes ≥ 4" />
        <Kpi label="Recommandation" value={`${n1(rapport.recommandation)}/5`} />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Stagiaires formés" value={String(indicateurs.stagiairesFormes)} hint={`Année ${rapport.annee}`} />
        <Kpi label="Taux d'abandon" value={n0(indicateurs.tauxAbandon)} hint={`${indicateurs.abandons} abandon(s)`} />
        <Kpi label="Présentation à l'examen" value={n0(indicateurs.tauxPresentation)} hint={`${indicateurs.presentes} présenté(s)`} />
        <Kpi label="Taux de réussite" value={n0(indicateurs.tauxReussite)} hint={`${indicateurs.admis} admis / ${indicateurs.presentes} présentés`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Par formation</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rapport.parFormation.length === 0 && <p className="text-sm text-muted-foreground">Aucune réponse sur cette année.</p>}
            {rapport.parFormation.map((f) => (
              <div key={f.formation} className="flex items-center justify-between text-sm">
                <span>{f.formation} <span className="text-muted-foreground">({f.nb})</span></span>
                <span className="font-semibold">{n1(f.moyenne)}/5</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Évolution mensuelle</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rapport.parMois.filter((m) => m.nb > 0).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune réponse sur cette année.</p>
            )}
            {rapport.parMois.filter((m) => m.nb > 0).map((m) => (
              <div key={m.mois} className="flex items-center justify-between text-sm">
                <span className="capitalize">{format(new Date(rapport.annee, m.mois - 1, 1), "MMMM", { locale: fr })} <span className="text-muted-foreground">({m.nb})</span></span>
                <span className="font-semibold">{n1(m.moyenne)}/5</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Détail par critère</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {rapport.criteres.length === 0 && <p className="text-sm text-muted-foreground">Aucune réponse sur cette année.</p>}
          {Array.from(new Set(rapport.criteres.map((c) => c.partie))).map((partie) => (
            <div key={partie} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{partie}</p>
              {rapport.criteres.filter((c) => c.partie === partie).map((c) => (
                <div key={c.label} className="space-y-1">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span>{c.label}</span>
                    <span className="font-semibold whitespace-nowrap">{c.moyenne.toFixed(2)}/5</span>
                  </div>
                  <Progress value={(c.moyenne / 5) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Réponses individuelles ({liste.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apprenant</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Note globale</TableHead>
                <TableHead className="text-right">Moyenne critères</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liste.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune enquête</TableCell></TableRow>
              )}
              {liste.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setDetail(e)}>
                  <TableCell className="font-medium">{`${e.nom} ${e.prenom}`.trim() || "—"}</TableCell>
                  <TableCell>{e.formation}</TableCell>
                  <TableCell>{e.date ? format(new Date(e.date), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Star className="w-3.5 h-3.5 text-amber-500" />{n1(e.noteGlobale)}/5
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{n1(e.moyenneCriteres)}/5</TableCell>
                  <TableCell>
                    <Badge variant={e.complete ? "default" : "secondary"}>{e.complete ? "Complété" : "En cours"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail ? `${`${detail.nom} ${detail.prenom}`.trim() || "Apprenant"} — ${detail.formation}` : ""}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{detail.date ? format(new Date(detail.date), "dd/MM/yyyy") : "—"}</span>
                <span>Note globale : <strong className="text-foreground">{n1(detail.noteGlobale)}/5</strong></span>
                <span>Moyenne : <strong className="text-foreground">{n1(detail.moyenneCriteres)}/5</strong></span>
              </div>
              {detail.parties.map((p) => (
                <div key={p.titre} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{p.titre}</p>
                  {p.criteres.map((c) => (
                    <div key={c.label} className="flex items-start justify-between gap-4 text-sm">
                      <span>{c.label}</span>
                      <span className="font-semibold whitespace-nowrap">{typeof c.value === "number" ? `${c.value}/5` : "—"}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SatisfactionPage;
