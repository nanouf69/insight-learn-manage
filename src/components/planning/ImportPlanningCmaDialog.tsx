import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  analyserPlanning, construireApercu,
  type FicheApprenant, type LigneDejaImportee, type LignePlanningPdf,
} from "@/lib/cmaPlanningImport";
import { extraireLignesPdf } from "@/lib/cmaPlanningPdfText";

interface Props { file: File | null; onClose: () => void; onImported?: () => void }

const LIBELLE: Record<string, string> = { lie: "Identifié", ambigu: "Ambigu", a_verifier: "À vérifier", inconnu: "Inconnu" };
const LIB_IMPORT: Record<string, string> = { deja_present: "Déjà au planning", a_ajouter: "À ajouter", conflit: "En attente (conflit)", non_importable: "Non importable" };

async function chargerFiches(): Promise<FicheApprenant[]> {
  const rows: FicheApprenant[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("apprenants")
      .select("id, nom, prenom, date_examen_pratique, heure_examen_pratique")
      .is("deleted_at", null).order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as FicheApprenant[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function chargerDeja(): Promise<LigneDejaImportee[]> {
  const rows: LigneDejaImportee[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("cma_planning_lignes")
      .select("apprenant_id, date_examen, heure, filiere").order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as LigneDejaImportee[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export function ImportPlanningCmaDialog({ file, onClose, onImported }: Props) {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lignes, setLignes] = useState<LignePlanningPdf[]>([]);
  const [nonLues, setNonLues] = useState<Array<{ texte: string; raison: string }>>([]);
  const [fiches, setFiches] = useState<FicheApprenant[]>([]);
  const [deja, setDeja] = useState<LigneDejaImportee[]>([]);
  const [choix, setChoix] = useState<Record<number, string | null>>({});
  const [coches, setCoches] = useState<Record<number, boolean>>({});
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!file) return;
    let annule = false;
    setLoading(true); setErreur(null); setChoix({}); setCoches({});
    (async () => {
      try {
        const [brut, f, d] = await Promise.all([extraireLignesPdf(file), chargerFiches(), chargerDeja()]);
        if (annule) return;
        const a = analyserPlanning(brut);
        setLignes(a.candidats); setNonLues(a.erreurs); setFiches(f); setDeja(d);
      } catch (e: any) {
        if (!annule) setErreur(e?.message || "Lecture impossible");
      } finally { if (!annule) setLoading(false); }
    })();
    return () => { annule = true; };
  }, [file]);

  const apercu = useMemo(() => construireApercu(lignes, fiches, deja, choix), [lignes, fiches, deja, choix]);
  const ficheParId = useMemo(() => new Map(fiches.map((f) => [f.id, f])), [fiches]);
  const compte = (k: string, v: string) => apercu.filter((r) => (r as any)[k] === v).length;
  const selection = apercu.map((r, i) => ({ r, i })).filter(({ r, i }) => r.import === "a_ajouter" && coches[i] !== false);

  const importer = async () => {
    if (!selection.length) return;
    setImporting(true);
    try {
      const payload = selection.map(({ r }) => ({
        apprenant_id: r.apprenantId!, date_examen: r.ligne.date, heure: r.ligne.heure, filiere: r.ligne.filiere,
        jury: r.ligne.jury, numero: r.ligne.numero, prenom_pdf: r.ligne.prenom, nom_pdf: r.ligne.nom,
        raison_rapprochement: r.raison, source_fichier: file?.name ?? null,
      }));
      const { error } = await supabase.from("cma_planning_lignes")
        .upsert(payload, { onConflict: "apprenant_id,date_examen,heure,filiere", ignoreDuplicates: true });
      if (error) throw error;
      const d = await chargerDeja();
      setDeja(d);
      const confirmes = payload.filter((p) => d.some((x) => x.apprenant_id === p.apprenant_id && x.date_examen === p.date_examen && x.heure === p.heure && x.filiere === p.filiere)).length;
      toast.success(`${confirmes} candidat(s) ajouté(s) au planning (fiches élèves inchangées)`);
      onImported?.();
    } catch (e: any) {
      toast.error("Import refusé : " + (e?.message || "erreur"));
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import du planning CMA — {file?.name}</DialogTitle>
          <DialogDescription>
            Lecture locale du PDF, sans IA. Chaque ligne du PDF est listée. Les fiches élèves ne sont jamais modifiées et aucun compte n'est créé.
          </DialogDescription>
        </DialogHeader>
        {loading && <div className="flex items-center gap-2 py-6"><Loader2 className="h-4 w-4 animate-spin" />Lecture du PDF…</div>}
        {erreur && <p className="text-destructive">{erreur}</p>}
        {!loading && !erreur && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">Lignes extraites : {lignes.length}</Badge>
              <Badge variant="outline">Identifiés : {compte("statut", "lie")}</Badge>
              <Badge variant="outline">Ambigus : {compte("statut", "ambigu")}</Badge>
              <Badge variant="outline">À vérifier : {compte("statut", "a_verifier")}</Badge>
              <Badge variant="outline">Inconnus : {compte("statut", "inconnu")}</Badge>
              <Badge variant="outline">Déjà au planning : {compte("import", "deja_present")}</Badge>
              <Badge>À ajouter : {selection.length}</Badge>
              <Badge variant="outline">En attente : {compte("import", "conflit")}</Badge>
            </div>
            {nonLues.length > 0 && (
              <div className="text-sm text-destructive">
                {nonLues.length} ligne(s) candidat illisible(s) : {nonLues.map((n) => `« ${n.texte} » (${n.raison})`).join(" ; ")}
              </div>
            )}
            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-left border-b">
                <th className="p-1"></th><th className="p-1">Date</th><th className="p-1">Heure</th><th className="p-1">Filière</th>
                <th className="p-1">Nom du PDF</th><th className="p-1">Fiche</th><th className="p-1">Rapprochement</th><th className="p-1">Planning</th>
              </tr></thead>
              <tbody>
                {apercu.map((r, i) => {
                  const f = r.apprenantId ? ficheParId.get(r.apprenantId) : undefined;
                  return (
                    <tr key={i} className="border-b align-top">
                      <td className="p-1">{r.import === "a_ajouter" && (
                        <Checkbox checked={coches[i] !== false} onCheckedChange={(v) => setCoches((c) => ({ ...c, [i]: !!v }))} />)}</td>
                      <td className="p-1 whitespace-nowrap">{r.ligne.date.split("-").reverse().join("/")}</td>
                      <td className="p-1">{r.ligne.heure}</td>
                      <td className="p-1">{r.ligne.filiere}{r.ligne.jury ? ` · ${r.ligne.jury}` : ""}</td>
                      <td className="p-1 font-medium">{r.ligne.prenom} {r.ligne.nom}</td>
                      <td className="p-1">
                        {r.candidats.length > 1 || r.statut !== "lie" ? (
                          <select className="border rounded px-1 py-0.5 bg-background max-w-[220px]"
                            value={r.apprenantId ?? ""}
                            onChange={(e) => setChoix((c) => ({ ...c, [i]: e.target.value || null }))}>
                            <option value="">— non rattaché —</option>
                            {r.candidats.map((c) => (
                              <option key={c.id} value={c.id}>{c.prenom} {c.nom} ({c.id.slice(0, 8)})</option>
                            ))}
                          </select>
                        ) : f ? `${f.prenom} ${f.nom}` : "—"}
                        {f?.date_examen_pratique && f.date_examen_pratique !== r.ligne.date && (
                          <div className="text-xs text-muted-foreground">date fiche : {f.date_examen_pratique} (inchangée)</div>)}
                      </td>
                      <td className="p-1"><Badge variant={r.statut === "lie" ? "secondary" : "destructive"}>{LIBELLE[r.statut]}</Badge>
                        <div className="text-xs text-muted-foreground">{r.raison}</div></td>
                      <td className="p-1"><div>{LIB_IMPORT[r.import]}</div><div className="text-xs text-muted-foreground">{r.raisonImport}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={importer} disabled={importing || loading || !selection.length}>
            {importing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Ajouter {selection.length} candidat(s) au planning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
