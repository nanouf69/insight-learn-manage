import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { loadAllEnvois, loadDossiers } from "@/lib/prestataires/data";
import {
  STATUT_LABELS,
  type PrestataireDossier,
  type PrestataireEnvoi,
  type PrestataireStatut,
} from "@/lib/prestataires/types";
import { DossierDialog } from "./DossierDialog";

type FiltreId = "toutes" | "manquantes" | "a_relancer" | "mise_en_demeure" | "recues" | "cloture";

const FILTRES: { id: FiltreId; label: string }[] = [
  { id: "toutes", label: "Toutes" },
  { id: "manquantes", label: "Factures manquantes" },
  { id: "a_relancer", label: "À relancer" },
  { id: "mise_en_demeure", label: "Mise en demeure" },
  { id: "recues", label: "Factures reçues" },
  { id: "cloture", label: "Dossiers clôturés" },
];

const matchFiltre = (statut: PrestataireStatut, f: FiltreId) => {
  switch (f) {
    case "manquantes":
      return statut === "facture_manquante" || statut === "demande_a_envoyer";
    case "a_relancer":
      return statut === "demande_envoyee" || statut === "relance_1_envoyee" || statut === "relance_2_envoyee";
    case "mise_en_demeure":
      return statut === "mise_en_demeure_envoyee";
    case "recues":
      return statut === "facture_recue";
    case "cloture":
      return statut === "cloture";
    default:
      return true;
  }
};

const statutVariant = (s: PrestataireStatut) =>
  s === "facture_recue" || s === "cloture" ? "secondary" : s === "mise_en_demeure_envoyee" ? "destructive" : "outline";

const fmtMontant = (n: number | null) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n));

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const [y, m, j] = d.split("-");
  return y && m && j ? `${j}/${m}/${y}` : d;
};

export function PrestatairesPage() {
  const [dossiers, setDossiers] = useState<PrestataireDossier[]>([]);
  const [envois, setEnvois] = useState<PrestataireEnvoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<FiltreId>("toutes");
  const [recherche, setRecherche] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PrestataireDossier | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [d, e] = await Promise.all([loadDossiers(), loadAllEnvois()]);
      setDossiers(d);
      setEnvois(e);
      if (selected) {
        const updated = d.find((x) => x.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const envoisParDossier = useMemo(() => {
    const map = new Map<string, PrestataireEnvoi[]>();
    for (const e of envois) {
      if (e.statut !== "envoye") continue;
      const list = map.get(e.dossier_id) ?? [];
      list.push(e);
      map.set(e.dossier_id, list);
    }
    return map;
  }, [envois]);

  const rows = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return dossiers.filter((d) => {
      if (!matchFiltre(d.statut, filtre)) return false;
      if (!q) return true;
      const hay = [
        d.prestataire_nom,
        d.prestataire_prenom,
        d.raison_sociale,
        d.siren,
        d.siret,
        d.reference,
        d.reference_paiement,
        d.description_prestation,
        d.montant_paye?.toString(),
        d.montant_ttc?.toString(),
        d.date_paiement,
        d.date_prestation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [dossiers, filtre, recherche]);

  const openNew = () => {
    setSelected(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTRES.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filtre === f.id ? "default" : "outline"}
              onClick={() => setFiltre(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau dossier
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Prestataire, raison sociale, SIREN/SIRET, montant, référence, période…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucun dossier pour ce filtre.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestataire</TableHead>
                    <TableHead>Prestation</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date paiement</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead>Dernière relance</TableHead>
                    <TableHead className="text-center">Nb relances</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((d) => {
                    const envs = envoisParDossier.get(d.id) ?? [];
                    const relances = envs.filter((e) => e.type_envoi !== "demande");
                    const dernier = envs[envs.length - 1];
                    return (
                      <TableRow key={d.id} className="cursor-pointer" onClick={() => { setSelected(d); setDialogOpen(true); }}>
                        <TableCell className="font-medium">
                          {d.raison_sociale || [d.prestataire_prenom, d.prestataire_nom].filter(Boolean).join(" ") || "—"}
                          {d.est_test && <Badge variant="outline" className="ml-2 text-[10px]">Test</Badge>}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">{d.description_prestation || "—"}</TableCell>
                        <TableCell>{fmtMontant(d.montant_paye ?? d.montant_ttc)}</TableCell>
                        <TableCell>{fmtDate(d.date_paiement)}</TableCell>
                        <TableCell>
                          {d.facture_numero || (d.facture_recue_le ? fmtDate(d.facture_recue_le) : "—")}
                        </TableCell>
                        <TableCell>
                          {dernier ? format(new Date(dernier.envoye_le ?? dernier.created_at), "dd/MM/yyyy HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-center">{relances.length}</TableCell>
                        <TableCell>
                          <Badge variant={statutVariant(d.statut)}>{STATUT_LABELS[d.statut] ?? d.statut}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(d); setDialogOpen(true); }}>
                            Ouvrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DossierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dossier={selected}
        onSaved={(d) => {
          setSelected(d);
          void refresh();
        }}
      />
    </div>
  );
}
