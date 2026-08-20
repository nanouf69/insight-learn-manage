import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, ShieldCheck, Car, Award, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Renouvellement {
  id: string;
  categorie: string;
  libelle: string;
  reference: string | null;
  date_debut: string | null;
  date_echeance: string | null;
  notes: string | null;
  ordre: number;
}

const CATEGORIES: Record<string, { label: string; icon: typeof Car; dateDebutLabel: string; dateEcheanceLabel: string }> = {
  vehicule: {
    label: "Véhicules",
    icon: Car,
    dateDebutLabel: "1ère immatriculation",
    dateEcheanceLabel: "Contrôle technique (avant le)",
  },
  agrement: {
    label: "Agréments préfectoraux",
    icon: Award,
    dateDebutLabel: "Date de délivrance",
    dateEcheanceLabel: "Renouvellement avant le",
  },
  qualiopi: {
    label: "Qualiopi",
    icon: ShieldCheck,
    dateDebutLabel: "Début de validité",
    dateEcheanceLabel: "Renouvellement avant le",
  },
};

const ORDER = ["vehicule", "agrement", "qualiopi"];

const fmt = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const daysLeft = (d: string | null) => {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(d + "T00:00:00").getTime() - today.getTime()) / 86_400_000);
};

const emptyForm = {
  categorie: "vehicule",
  libelle: "",
  reference: "",
  date_debut: "",
  date_echeance: "",
  notes: "",
};

export function RenouvellementsPage() {
  const [rows, setRows] = useState<Renouvellement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("renouvellements")
      .select("*")
      .order("ordre", { ascending: true })
      .order("date_echeance", { ascending: true });
    if (error) toast.error("Erreur de chargement");
    else setRows((data ?? []) as Renouvellement[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Renouvellement[]> = {};
    for (const r of rows) (map[r.categorie] ??= []).push(r);
    return map;
  }, [rows]);

  const openNew = (categorie: string) => {
    setEditingId(null);
    setForm({ ...emptyForm, categorie });
    setOpen(true);
  };

  const openEdit = (r: Renouvellement) => {
    setEditingId(r.id);
    setForm({
      categorie: r.categorie,
      libelle: r.libelle,
      reference: r.reference ?? "",
      date_debut: r.date_debut ?? "",
      date_echeance: r.date_echeance ?? "",
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.libelle.trim()) {
      toast.error("Indiquez un libellé");
      return;
    }
    setSaving(true);
    const payload = {
      categorie: form.categorie,
      libelle: form.libelle.trim(),
      reference: form.reference.trim() || null,
      date_debut: form.date_debut || null,
      date_echeance: form.date_echeance || null,
      notes: form.notes.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("renouvellements").update(payload).eq("id", editingId)
      : await supabase.from("renouvellements").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(editingId ? "Échéance modifiée" : "Échéance ajoutée");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("renouvellements").delete().eq("id", id);
    if (error) toast.error("Erreur suppression");
    else {
      toast.success("Supprimé");
      load();
    }
  };

  const statusBadge = (d: string | null) => {
    const n = daysLeft(d);
    if (n === null) return <Badge variant="outline">Non renseigné</Badge>;
    if (n < 0) return <Badge variant="destructive">Expiré depuis {Math.abs(n)} j</Badge>;
    if (n <= 90) return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">À renouveler — {n} j</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Valide — {n} j</Badge>;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Renouvellements</h2>
          <p className="text-sm text-muted-foreground">
            Suivi des échéances : immatriculations et contrôles techniques des véhicules, agréments TAXI/VTC et certification Qualiopi.
          </p>
        </div>
        <a
          href="https://ftransport.fr/certifications"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Page certifications <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        ORDER.map((cat) => {
          const conf = CATEGORIES[cat];
          const Icon = conf.icon;
          const items = grouped[cat] ?? [];
          return (
            <Card key={cat} className="p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{conf.label}</h3>
                <Button size="sm" variant="ghost" className="ml-auto h-8 gap-1" onClick={() => openNew(cat)}>
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Aucune échéance enregistrée.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-3">Désignation</th>
                        <th className="py-2 pr-3">{conf.dateDebutLabel}</th>
                        <th className="py-2 pr-3">{conf.dateEcheanceLabel}</th>
                        <th className="py-2 pr-3">Statut</th>
                        <th className="py-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.id} className="border-t align-top">
                          <td className="py-2 pr-3">
                            <div className="font-medium">{r.libelle}</div>
                            {r.reference && <div className="text-xs text-muted-foreground">{r.reference}</div>}
                            {r.notes && <div className="text-xs text-muted-foreground mt-0.5">{r.notes}</div>}
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">{fmt(r.date_debut)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap font-medium">{fmt(r.date_echeance)}</td>
                          <td className="py-2 pr-3">{statusBadge(r.date_echeance)}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => remove(r.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier l'échéance" : "Nouvelle échéance"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Catégorie</Label>
              <Select value={form.categorie} onValueChange={(v) => setForm((f) => ({ ...f, categorie: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIES[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Désignation</Label>
              <Input
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                placeholder="Ex : Renault Trafic — AB-123-CD"
              />
            </div>
            <div>
              <Label>Référence (immatriculation, n° d'arrêté, certificat…)</Label>
              <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
            </div>
            <div>
              <Label>{CATEGORIES[form.categorie]?.dateDebutLabel ?? "Date de début"}</Label>
              <Input type="date" value={form.date_debut} onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} />
            </div>
            <div>
              <Label>{CATEGORIES[form.categorie]?.dateEcheanceLabel ?? "Échéance"}</Label>
              <Input type="date" value={form.date_echeance} onChange={(e) => setForm((f) => ({ ...f, date_echeance: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
