import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string; nom: string | null; prenom: string | null; type_apprenant: string | null;
  resultat_examen: string | null; date_examen_theorique: string | null;
  date_debut_formation: string | null; date_fin_formation: string | null; created_at: string;
};

const annee = (s?: string | null) => s?.match(/(20\d\d)/)?.[1] ?? null;

const categorie = (t?: string | null): string | null => {
  const v = (t || "").toLowerCase().trim();
  if (v === "continue-vtc") return "FC VTC";
  if (v === "continue-taxi") return "FC TAXI";
  if (v.startsWith("vtc")) return "VTC";
  if (v.startsWith("taxi")) return "TAXI";
  if (v.startsWith("ta")) return "TA";
  if (v.startsWith("va")) return "VA";
  return null;
};

async function chargerTous(): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("apprenants")
      .select("id, nom, prenom, type_apprenant, resultat_examen, date_examen_theorique, date_debut_formation, date_fin_formation, created_at")
      .is("deleted_at", null).not("type_apprenant", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data || []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

type FcRow = { key: string; apprenantId: string; nom: string | null; prenom: string | null; debut: string | null; fin: string | null; factures: string[]; annee: string | null; cat: "FC VTC" | "FC TAXI" };

// Formation continue = stagiaires ayant au moins une facture rattachée à une session FC (ou dossier continue-*).
async function chargerFc(): Promise<FcRow[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("factures")
      .select("numero, date_emission, apprenant_id, session_id, apprenants(id, nom, prenom, type_apprenant, date_debut_formation, date_fin_formation, deleted_at), sessions(id, nom, date_debut, date_fin)")
      .not("apprenant_id", "is", null).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const map = new Map<string, FcRow>();
  for (const f of rows) {
    const a = f.apprenants; const s = f.sessions;
    if (!a || a.deleted_at) continue;
    const t = (a.type_apprenant || "").toLowerCase();
    const sn = (s?.nom || "").toLowerCase();
    const isFc = t.startsWith("continue") || sn.includes("formation continue");
    if (!isFc) continue;
    const taxi = sn ? sn.includes("taxi") : t.includes("taxi");
    const cat = taxi ? "FC TAXI" : "FC VTC";
    const debut = s?.date_debut ?? a.date_debut_formation ?? null;
    const fin = s?.date_fin ?? a.date_fin_formation ?? null;
    const key = `${a.id}|${s?.id ?? "-"}`;
    const ex = map.get(key);
    if (ex) { if (f.numero && !ex.factures.includes(f.numero)) ex.factures.push(f.numero); continue; }
    map.set(key, { key, apprenantId: a.id, nom: a.nom, prenom: a.prenom, debut, fin, factures: f.numero ? [f.numero] : [], annee: annee(debut) ?? annee(f.date_emission), cat });
  }
  return [...map.values()];
}

export function RapportActivitePage() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ["rapport-activite"], queryFn: chargerTous });
  const fcQ = useQuery({ queryKey: ["rapport-activite-fc"], queryFn: chargerFc });
  const [an, setAn] = useState<string>(String(new Date().getFullYear()));

  const { annees, stats, fc } = useMemo(() => {
    const set = new Set<string>();
    const stats: Record<string, { oui: number; non: number }> = {};
    const fc: Record<string, FcRow[]> = { "FC VTC": [], "FC TAXI": [] };
    for (const r of fcQ.data ?? []) { if (r.annee) set.add(r.annee); if (r.annee === an) fc[r.cat].push(r); }
    for (const r of data) {
      const c = categorie(r.type_apprenant);
      if (!c) continue;
      if (c.startsWith("FC")) continue;
      const y = annee(r.date_examen_theorique);
      if (!y) continue;
      set.add(y);
      if (y !== an) continue;
      const res = (r.resultat_examen || "").toLowerCase();
      if (res !== "oui" && res !== "non") continue;
      stats[c] ??= { oui: 0, non: 0 };
      stats[c][res as "oui" | "non"]++;
    }
    set.add(an);
    return { annees: [...set].sort().reverse(), stats, fc };
  }, [data, fcQ.data, an]);

  if (isLoading || fcQ.isLoading) return <p className="p-6 text-muted-foreground">Chargement…</p>;
  if (error || fcQ.error) return <p className="p-6 text-destructive">Erreur de lecture des données : aucune statistique affichée.</p>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rapport d'activité</h1>
          <p className="text-sm text-muted-foreground">Admis / non admis à l'examen théorique par formation, et stagiaires en formation continue ayant une facture.</p>
        </div>
        <Select value={an} onValueChange={setAn}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{annees.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["VTC", "TAXI", "TA", "VA"].map(c => {
          const s = stats[c] ?? { oui: 0, non: 0 };
          const tot = s.oui + s.non;
          return (
            <Card key={c}>
              <CardHeader><CardTitle>Formation {c}</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Admis</span><b>{s.oui}</b></div>
                <div className="flex justify-between"><span>Non admis</span><b>{s.non}</b></div>
                <div className="flex justify-between"><span>Total des candidats</span><b>{tot}</b></div>
                <div className="flex justify-between text-primary"><span>Taux de réussite</span><b>{tot ? `${((s.oui / tot) * 100).toFixed(2)} %` : "—"}</b></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(["FC VTC", "FC TAXI"] as const).map(c => (
        <Card key={c}>
          <CardHeader><CardTitle>Formation continue {c.replace("FC ", "")} ({fc[c].length})</CardTitle></CardHeader>
          <CardContent>
            {fc[c].length === 0 ? <p className="text-sm text-muted-foreground">Aucun stagiaire.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Prénom</TableHead><TableHead>Date de début</TableHead><TableHead>Date de fin</TableHead><TableHead>Facture(s)</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...fc[c]].sort((a, b) => (a.debut || "").localeCompare(b.debut || "") || (a.nom || "").localeCompare(b.nom || "")).map(r => (
                    <TableRow key={r.key}>
                      <TableCell className="font-medium">{(r.nom || "").toUpperCase()}</TableCell>
                      <TableCell>{r.prenom}</TableCell>
                      <TableCell>{r.debut || "—"}</TableCell>
                      <TableCell>{r.fin || "—"}</TableCell>
                      <TableCell className="text-xs">{r.factures.join(", ")}</TableCell>
                      <TableCell><Link className="text-primary underline" to={`/?apprenant=${r.apprenantId}`}>Ouvrir la fiche</Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
