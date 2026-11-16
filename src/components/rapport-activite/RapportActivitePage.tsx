import { useMemo, useState } from "react";
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

export function RapportActivitePage() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ["rapport-activite"], queryFn: chargerTous });
  const [an, setAn] = useState<string>(String(new Date().getFullYear()));

  const { annees, stats, fc } = useMemo(() => {
    const set = new Set<string>();
    const stats: Record<string, { oui: number; non: number }> = {};
    const fc: Record<string, Row[]> = { "FC VTC": [], "FC TAXI": [] };
    for (const r of data) {
      const c = categorie(r.type_apprenant);
      if (!c) continue;
      const isFc = c.startsWith("FC");
      const y = isFc ? (annee(r.date_debut_formation) ?? annee(r.created_at)) : annee(r.date_examen_theorique);
      if (!y) continue;
      set.add(y);
      if (y !== an) continue;
      if (isFc) { fc[c].push(r); continue; }
      const res = (r.resultat_examen || "").toLowerCase();
      if (res !== "oui" && res !== "non") continue;
      stats[c] ??= { oui: 0, non: 0 };
      stats[c][res as "oui" | "non"]++;
    }
    set.add(an);
    return { annees: [...set].sort().reverse(), stats, fc };
  }, [data, an]);

  if (isLoading) return <p className="p-6 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-6 text-destructive">Erreur de lecture des données : aucune statistique affichée.</p>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rapport d'activité</h1>
          <p className="text-sm text-muted-foreground">Admis / non admis à l'examen théorique par formation, et stagiaires en formation continue.</p>
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
                <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Prénom</TableHead><TableHead>Date de début</TableHead><TableHead>Date de fin</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...fc[c]].sort((a, b) => (a.nom || "").localeCompare(b.nom || "")).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{(r.nom || "").toUpperCase()}</TableCell>
                      <TableCell>{r.prenom}</TableCell>
                      <TableCell>{r.date_debut_formation || "—"}</TableCell>
                      <TableCell>{r.date_fin_formation || "—"}</TableCell>
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
