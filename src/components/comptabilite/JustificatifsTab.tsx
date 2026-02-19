import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, FileText, Trash2, Eye, RefreshCw, Search, Tag,
  CheckCircle, Clock, AlertCircle, Plus, Edit2, Check, X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Justificatif {
  id: string;
  nom_fichier: string;
  url: string;
  montant_ttc: number | null;
  date_operation: string | null;
  categorie: string | null;
  fournisseur: string | null;
  description: string | null;
  statut: string;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "carburant", label: "⛽ Carburant", color: "bg-orange-100 text-orange-700" },
  { value: "repas", label: "🍽️ Repas / Restaurant", color: "bg-yellow-100 text-yellow-700" },
  { value: "materiel", label: "🖥️ Matériel", color: "bg-blue-100 text-blue-700" },
  { value: "fournitures", label: "📎 Fournitures", color: "bg-cyan-100 text-cyan-700" },
  { value: "telephonie", label: "📱 Téléphonie", color: "bg-purple-100 text-purple-700" },
  { value: "loyer", label: "🏢 Loyer", color: "bg-indigo-100 text-indigo-700" },
  { value: "assurance", label: "🛡️ Assurance", color: "bg-green-100 text-green-700" },
  { value: "formation", label: "🎓 Formation", color: "bg-emerald-100 text-emerald-700" },
  { value: "transport", label: "🚌 Transport", color: "bg-sky-100 text-sky-700" },
  { value: "honoraires", label: "⚖️ Honoraires", color: "bg-violet-100 text-violet-700" },
  { value: "publicite", label: "📢 Publicité", color: "bg-pink-100 text-pink-700" },
  { value: "banque", label: "🏦 Frais bancaires", color: "bg-slate-100 text-slate-700" },
  { value: "autre", label: "📄 Autre", color: "bg-muted text-muted-foreground" },
];

const STATUTS = [
  { value: "a_traiter", label: "À traiter", icon: AlertCircle, color: "bg-amber-100 text-amber-700" },
  { value: "traite", label: "Traité", icon: CheckCircle, color: "bg-emerald-100 text-emerald-700" },
  { value: "a_associer", label: "À associer", icon: Clock, color: "bg-blue-100 text-blue-700" },
];

function getCategorieConfig(value: string | null) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}

function getStatutConfig(value: string) {
  return STATUTS.find(s => s.value === value) || STATUTS[0];
}

export function JustificatifsTab() {
  const [items, setItems] = useState<Justificatif[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCategorie, setFilterCategorie] = useState("tous");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Justificatif>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("justificatifs")
      .select("*")
      .order("date_operation", { ascending: false, nullsFirst: false });
    if (!error && data) setItems(data as Justificatif[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("justificatifs")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from("justificatifs")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);

      const { error: dbError } = await supabase.from("justificatifs").insert({
        nom_fichier: file.name,
        url: signedData?.signedUrl || "",
        statut: "a_traiter",
        date_operation: new Date().toISOString().split("T")[0],
      });
      if (dbError) throw dbError;

      toast.success("Justificatif ajouté !");
      await fetchItems();
    } catch (err) {
      toast.error("Erreur : " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(handleUpload);
  };

  const handleDelete = async (item: Justificatif) => {
    if (!confirm(`Supprimer "${item.nom_fichier}" ?`)) return;
    await supabase.from("justificatifs").delete().eq("id", item.id);
    toast.success("Supprimé");
    await fetchItems();
  };

  const startEdit = (item: Justificatif) => {
    setEditingId(item.id);
    setEditForm({
      categorie: item.categorie,
      fournisseur: item.fournisseur,
      montant_ttc: item.montant_ttc,
      date_operation: item.date_operation,
      description: item.description,
      statut: item.statut,
    });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("justificatifs").update(editForm).eq("id", id);
    if (error) { toast.error("Erreur de sauvegarde"); return; }
    toast.success("Mis à jour !");
    setEditingId(null);
    await fetchItems();
  };

  const quickUpdate = async (id: string, updates: Partial<Justificatif>) => {
    await supabase.from("justificatifs").update(updates).eq("id", id);
    await fetchItems();
  };

  const filtered = items.filter(item => {
    const matchStatut = filterStatut === "tous" || item.statut === filterStatut;
    const matchCat = filterCategorie === "tous" || item.categorie === filterCategorie;
    const matchSearch = !search ||
      item.nom_fichier.toLowerCase().includes(search.toLowerCase()) ||
      (item.fournisseur || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(search.toLowerCase());
    return matchStatut && matchCat && matchSearch;
  });

  // Group by month
  const grouped = filtered.reduce((acc, item) => {
    const key = item.date_operation
      ? format(new Date(item.date_operation), "MMMM yyyy", { locale: fr })
      : "Sans date";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Justificatif[]>);

  const nbATraiter = items.filter(i => i.statut === "a_traiter").length;
  const nbAAssocier = items.filter(i => i.statut === "a_associer").length;
  const totalDepenses = items.reduce((s, i) => s + (i.montant_ttc || 0), 0);
  const formatMontant = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total justificatifs</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">À traiter</p>
            <p className="text-2xl font-bold text-amber-600">{nbATraiter}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">À associer</p>
            <p className="text-2xl font-bold text-blue-600">{nbAAssocier}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total dépenses</p>
            <p className="text-2xl font-bold text-destructive">{formatMontant(totalDepenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <><RefreshCw className="h-8 w-8 text-primary animate-spin" /><p className="text-sm text-muted-foreground">Envoi en cours...</p></>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Nouveau justificatif</p>
              <p className="text-sm text-muted-foreground">Glissez vos factures, tickets, reçus ici — ou cliquez</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, CSV — plusieurs fichiers à la fois</p>
            </div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx"
        className="hidden"
        onChange={e => Array.from(e.target.files || []).forEach(handleUpload)}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["tous", "a_traiter", "a_associer", "traite"].map(s => (
            <Button
              key={s}
              size="sm"
              variant={filterStatut === s ? "default" : "outline"}
              onClick={() => setFilterStatut(s)}
            >
              {s === "tous" ? "Tous" : s === "a_traiter" ? "À traiter" : s === "a_associer" ? "À associer" : "Traités"}
              {s !== "tous" && (
                <Badge className="ml-1.5 h-4 px-1 text-[10px]">
                  {items.filter(i => i.statut === s).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <Select value={filterCategorie} onValueChange={setFilterCategorie}>
          <SelectTrigger className="w-[180px]">
            <Tag className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes catégories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List grouped by month */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucun justificatif trouvé</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([month, monthItems]) => (
          <div key={month} className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide capitalize px-1">{month}</h3>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {monthItems.map(item => {
                  const isEditing = editingId === item.id;
                  const catConfig = getCategorieConfig(item.categorie);
                  const statutConfig = getStatutConfig(item.statut);
                  const StatutIcon = statutConfig.icon;

                  return (
                    <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/30 transition-colors">
                      {/* Icon */}
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium truncate max-w-[250px] text-sm">{item.nom_fichier}</span>
                          <Badge className={cn("text-xs", statutConfig.color)}>
                            <StatutIcon className="h-3 w-3 mr-1" />
                            {statutConfig.label}
                          </Badge>
                        </div>

                        {isEditing ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Input
                              placeholder="Fournisseur"
                              value={editForm.fournisseur || ""}
                              onChange={e => setEditForm(f => ({ ...f, fournisseur: e.target.value }))}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="number"
                              placeholder="Montant TTC"
                              value={editForm.montant_ttc || ""}
                              onChange={e => setEditForm(f => ({ ...f, montant_ttc: parseFloat(e.target.value) }))}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="date"
                              value={editForm.date_operation || ""}
                              onChange={e => setEditForm(f => ({ ...f, date_operation: e.target.value }))}
                              className="h-8 text-xs"
                            />
                            <Input
                              placeholder="Description"
                              value={editForm.description || ""}
                              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {item.fournisseur && <span className="font-medium text-foreground">{item.fournisseur}</span>}
                            {item.date_operation && <span>{format(new Date(item.date_operation), "dd MMM yyyy", { locale: fr })}</span>}
                            {item.description && <span className="truncate max-w-[200px]">{item.description}</span>}
                          </div>
                        )}

                        {/* Category selector */}
                        {isEditing ? (
                          <Select
                            value={editForm.categorie || ""}
                            onValueChange={v => setEditForm(f => ({ ...f, categorie: v }))}
                          >
                            <SelectTrigger className="h-8 w-[200px] text-xs">
                              <SelectValue placeholder="Catégorie..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(c => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          item.categorie && (
                            <Badge className={cn("text-xs w-fit", catConfig.color)}>{catConfig.label}</Badge>
                          )
                        )}
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        {item.montant_ttc ? (
                          <p className="font-semibold text-destructive">{formatMontant(item.montant_ttc)}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Montant N/A</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isEditing ? (
                          <>
                            {/* Statut in edit */}
                            <Select
                              value={editForm.statut || "a_traiter"}
                              onValueChange={v => setEditForm(f => ({ ...f, statut: v }))}
                            >
                              <SelectTrigger className="h-8 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUTS.map(s => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-8 px-2" onClick={() => saveEdit(item.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {/* Quick status change */}
                            {item.statut !== "traite" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1"
                                onClick={() => quickUpdate(item.id, { statut: "traite" })}
                              >
                                <CheckCircle className="h-3 w-3 text-emerald-500" /> Traité
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => startEdit(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => window.open(item.url, "_blank")}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
