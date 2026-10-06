import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RotateCcw, Car, GraduationCap } from "lucide-react";
import { formatDateShortFR } from "@/lib/safeDateParse";

interface Candidat {
  id: string;
  nom: string | null;
  prenom: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
  date_examen_theorique: string | null;
  resultat_examen_pratique: string | null;
}

// Classement TAXI / VTC à partir du type d'apprenant (insensible à la casse).
export function categorieCandidat(typeApprenant: string | null | undefined): "taxi" | "vtc" | "autre" {
  const s = (typeApprenant || "").toLowerCase().trim();
  if (s === "ta" || s.startsWith("ta-") || s.startsWith("ta ") || s.includes("taxi")) return "taxi";
  if (s.includes("vtc") || s === "va" || s.startsWith("va-")) return "vtc";
  return "autre";
}

const nomComplet = (c: Candidat) => `${(c.nom || "").toUpperCase()} ${(c.prenom || "").trim()}`.trim();

export function CandidatsAFormer() {
  const [recherche, setRecherche] = useState("");

  const { data: candidats, isLoading, error } = useQuery({
    queryKey: ["candidats-a-former"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie, date_examen_theorique, resultat_examen_pratique")
        .eq("resultat_examen", "oui");
      if (error) throw error;
      return (data || []) as Candidat[];
    },
  });

  const filtres = useMemo(() => {
    const liste = candidats || [];
    const q = recherche.trim().toLowerCase();
    const corresponds = (c: Candidat) =>
      !q || `${c.nom || ""} ${c.prenom || ""}`.toLowerCase().includes(q);
    const parNom = (a: Candidat, b: Candidat) => nomComplet(a).localeCompare(nomComplet(b), "fr");
    return {
      taxi: liste.filter((c) => categorieCandidat(c.type_apprenant) === "taxi" && corresponds(c)).sort(parNom),
      vtc: liste.filter((c) => categorieCandidat(c.type_apprenant) === "vtc" && corresponds(c)).sort(parNom),
      autre: liste.filter((c) => categorieCandidat(c.type_apprenant) === "autre" && corresponds(c)).sort(parNom),
      totalTaxi: liste.filter((c) => categorieCandidat(c.type_apprenant) === "taxi").length,
      totalVtc: liste.filter((c) => categorieCandidat(c.type_apprenant) === "vtc").length,
      totalAutre: liste.filter((c) => categorieCandidat(c.type_apprenant) === "autre").length,
    };
  }, [candidats, recherche]);

  const colonne = (titre: string, liste: Candidat[], total: number, icon: React.ReactNode, accent: string) => (
    <Card className="flex-1 min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-base">
            {icon}
            {titre}
          </span>
          <Badge variant="secondary" className={accent}>
            {liste.length}
            {liste.length !== total ? ` / ${total}` : ""} au total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun candidat.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Formation</TableHead>
                <TableHead className="hidden lg:table-cell">Examen théorique</TableHead>
                <TableHead className="hidden lg:table-cell">Pratique</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liste.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{nomComplet(c) || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(c.type_apprenant || "").toUpperCase() || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {c.date_examen_theorique ? formatDateShortFR(c.date_examen_theorique) : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {c.resultat_examen_pratique ? (
                      <Badge variant={c.resultat_examen_pratique === "oui" ? "default" : "outline"}>
                        {c.resultat_examen_pratique}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">à programmer</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Candidats à former</h1>
          <p className="text-sm text-muted-foreground">
            Tous les candidats ayant réussi l'examen théorique, en attente de formation pratique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom ou prénom…"
              className="w-56 pl-8"
            />
          </div>
          <button
            type="button"
            onClick={() => setRecherche("")}
            className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm hover:bg-muted"
            title="Réinitialiser la recherche"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
          </button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-4 text-sm text-destructive">
            Erreur de chargement : {(error as Error).message}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Total TAXI</span>
                <span className="text-2xl font-semibold">{filtres.totalTaxi}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Total VTC</span>
                <span className="text-2xl font-semibold">{filtres.totalVtc}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Autres</span>
                <span className="text-2xl font-semibold">{filtres.totalAutre}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-2xl font-semibold">
                  {filtres.totalTaxi + filtres.totalVtc + filtres.totalAutre}
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row">
            {colonne(
              "TAXI",
              filtres.taxi,
              filtres.totalTaxi,
              <Car className="h-4 w-4 text-primary" />,
              ""
            )}
            {colonne(
              "VTC",
              filtres.vtc,
              filtres.totalVtc,
              <GraduationCap className="h-4 w-4 text-primary" />,
              ""
            )}
          </div>

          {filtres.autre.length > 0 && (
            <div className="flex flex-col">
              {colonne(
                "Autres formations",
                filtres.autre,
                filtres.totalAutre,
                <GraduationCap className="h-4 w-4 text-muted-foreground" />,
                ""
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
