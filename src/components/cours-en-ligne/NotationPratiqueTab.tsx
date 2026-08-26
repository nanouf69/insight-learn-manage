import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GrilleNotationConduite from "@/components/sessions/GrilleNotationConduite";

interface Row {
  apprenantId: string;
  nom: string;
  prenom: string;
  formation: "vtc" | "taxi";
  sessionId: string;
  datePassage: string;
  avis?: "favorable" | "defavorable" | null;
  passage?: string | null;
}

const NotationPratiqueTab = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAllRows((from, to) =>
          supabase
            .from("session_apprenants")
            .select(
              "apprenant_id, session_id, apprenants:apprenant_id(nom, prenom, type_apprenant), sessions:session_id(type_session, date_debut, types_apprenant, nom)"
            )
            .range(from, to)
        );

        const list: Row[] = [];
        for (const r of ((data as any[]) || [])) {
          const s = r?.sessions;
          const a = r?.apprenants;
          if (!s || !a) continue;
          if (String(s.type_session || "") !== "pratique") continue;
          const label = `${String(s.nom || "")} ${(s.types_apprenant || []).join(" ")} ${String(a.type_apprenant || "")}`.toLowerCase();
          const formation: "vtc" | "taxi" = label.includes("taxi") ? "taxi" : "vtc";
          list.push({
            apprenantId: r.apprenant_id,
            nom: a.nom || "",
            prenom: a.prenom || "",
            formation,
            sessionId: r.session_id,
            datePassage: String(s.date_debut || "").slice(0, 10),
          });
        }

        const grilles = await fetchAllRows((from, to) =>
          supabase
            .from("grilles_notation_conduite" as any)
            .select("apprenant_id, session_id, avis, passage")
            .range(from, to)
        );
        const byKey = new Map<string, any>();
        for (const g of ((grilles as any[]) || [])) {
          byKey.set(`${g.apprenant_id}|${g.session_id || ""}`, g);
        }

        list.forEach((l) => {
          const g = byKey.get(`${l.apprenantId}|${l.sessionId}`) ?? byKey.get(`${l.apprenantId}|`);
          if (g) {
            l.avis = g.avis ?? null;
            l.passage = g.passage ?? null;
          }
        });

        list.sort((a, b) => (b.datePassage || "").localeCompare(a.datePassage || ""));
        setRows(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.nom} ${r.prenom} ${r.datePassage}`.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          Notation pratique (conduite)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Seul le formateur coche les éléments non assimilés. L'apprenant peut uniquement consulter la grille.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un candidat..."
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun candidat en session pratique.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidat</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead>Date pratique</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Grille</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={`${r.apprenantId}-${r.sessionId}`}>
                  <TableCell className="font-medium">
                    {r.nom.toUpperCase()} {r.prenom}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.formation.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{r.datePassage || "-"}</TableCell>
                  <TableCell>
                    {typeof r.noteGlobale === "number" ? (
                      <span
                        className={
                          r.noteGlobale >= 15
                            ? "text-emerald-600 font-semibold"
                            : r.noteGlobale >= 10
                              ? "text-amber-600 font-semibold"
                              : "text-destructive font-semibold"
                        }
                      >
                        {r.noteGlobale}/20
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Non notée</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <GrilleNotationConduite
                      apprenantId={r.apprenantId}
                      apprenantNom={r.nom}
                      apprenantPrenom={r.prenom}
                      formation={r.formation}
                      sessionId={r.sessionId}
                      datePassage={r.datePassage}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default NotationPratiqueTab;
