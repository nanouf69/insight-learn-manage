import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FolderArchive, Loader2, Search, Download } from "lucide-react";
import { construireDossierControleZip } from "@/components/crm/apprenant-sections/ControleQualiteTab";
import { bornesPeriode, formationChevauche, type Granularite } from "@/lib/preuvesPeriode";

export function PreuvesDocuments() {
  const now = new Date();
  const [gran, setGran] = useState<Granularite>("mois");
  const [jour, setJour] = useState(now.toISOString().slice(0, 10));
  const [mois, setMois] = useState(now.toISOString().slice(0, 7));
  const [annee, setAnnee] = useState(String(now.getFullYear()));
  const [liste, setListe] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState({ fait: 0, total: 0, erreurs: [] as string[] });

  const valeur = gran === "jour" ? jour : gran === "mois" ? mois : annee;

  const chercher = async () => {
    setBusy(true);
    try {
      const b = bornesPeriode(gran, valeur);
      const rows = await fetchAllRows<any>((from, to) =>
        supabase.from("apprenants").select("*").lte("date_debut_formation", b.fin).order("nom").range(from, to) as any,
      );
      setListe(rows.filter((a) => formationChevauche(a.date_debut_formation, a.date_fin_formation, b)));
    } catch (e: any) {
      alert("Lecture impossible : " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const telecharger = async () => {
    if (!liste?.length) return;
    if (!confirm(`Générer ${liste.length} dossier(s) de contrôle ? Le fichier contient des données personnelles.`)) return;
    const formateur = (prompt("Nom du formateur sur les feuilles d'émargement :", "GUENICHI Naoufal") || "GUENICHI Naoufal").trim();
    setBusy(true);
    const erreurs: string[] = [];
    setProg({ fait: 0, total: liste.length, erreurs });
    const master = new JSZip();
    for (let i = 0; i < liste.length; i++) {
      const a = liste[i];
      try {
        const { zip, slug } = await construireDossierControleZip(a, formateur);
        master.file(`${slug}_${String(a.id).slice(0, 8)}.zip`, await zip.generateAsync({ type: "blob" }));
      } catch (e: any) {
        erreurs.push(`${a.prenom ?? ""} ${a.nom ?? ""} : ${e?.message || "erreur"}`);
      }
      setProg({ fait: i + 1, total: liste.length, erreurs: [...erreurs] });
    }
    if (erreurs.length) master.file("ERREURS.txt", "Dossiers non générés (rien n'a été inventé) :\n" + erreurs.join("\n"));
    saveAs(await master.generateAsync({ type: "blob" }), `dossiers-controle_${gran}_${valeur}.zip`);
    setBusy(false);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><FolderArchive className="h-6 w-6" /> Preuves documents</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Télécharger les dossiers de contrôle par période</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["jour", "mois", "annee"] as Granularite[]).map((g) => (
              <Button key={g} variant={gran === g ? "default" : "outline"} onClick={() => { setGran(g); setListe(null); }}>
                {g === "jour" ? "Par jour" : g === "mois" ? "Par mois" : "Par an"}
              </Button>
            ))}
          </div>
          <div className="max-w-xs space-y-1">
            <Label>{gran === "jour" ? "Jour" : gran === "mois" ? "Mois" : "Année"}</Label>
            {gran === "jour" && <Input type="date" value={jour} onChange={(e) => { setJour(e.target.value); setListe(null); }} />}
            {gran === "mois" && <Input type="month" value={mois} onChange={(e) => { setMois(e.target.value); setListe(null); }} />}
            {gran === "annee" && <Input type="number" min={2015} max={2100} value={annee} onChange={(e) => { setAnnee(e.target.value); setListe(null); }} />}
          </div>
          <p className="text-sm text-muted-foreground">Élèves dont les dates de formation couvrent la période choisie.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={chercher} disabled={busy || !valeur}><Search className="h-4 w-4" /> Voir les élèves</Button>
            <Button onClick={telecharger} disabled={busy || !liste?.length}>
              {busy && prog.total ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Tout télécharger (ZIP)
            </Button>
          </div>
          {prog.total > 0 && (
            <div className="space-y-1">
              <Progress value={(prog.fait / prog.total) * 100} />
              <p className="text-sm">{prog.fait}/{prog.total} dossier(s){prog.erreurs.length ? ` — ${prog.erreurs.length} en erreur (listés dans ERREURS.txt)` : ""}</p>
            </div>
          )}
          {liste && (
            <div className="rounded border">
              <p className="border-b p-2 text-sm font-semibold">{liste.length} élève(s)</p>
              <ul className="max-h-96 divide-y overflow-y-auto text-sm">
                {liste.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2 p-2">
                    <span>{a.prenom} {a.nom}</span>
                    <span className="text-muted-foreground">{a.date_debut_formation ?? "?"} → {a.date_fin_formation ?? "?"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
