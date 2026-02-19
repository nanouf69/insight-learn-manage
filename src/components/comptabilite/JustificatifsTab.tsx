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
  // Achats & charges
  { value: "abonnements_logiciels_cotisations", label: "Abonnements logiciels et cotisations", color: "bg-violet-100 text-violet-700" },
  { value: "abonnements_logiciels_plateformes", label: "Abonnements logiciels et plateformes", color: "bg-violet-100 text-violet-700" },
  { value: "abonnements_telephone", label: "Abonnements téléphone", color: "bg-purple-100 text-purple-700" },
  { value: "achat_accessoires_fournitures", label: "Achat accessoires et fournitures", color: "bg-cyan-100 text-cyan-700" },
  { value: "achat_emballages", label: "Achat emballages", color: "bg-cyan-100 text-cyan-700" },
  { value: "achat_prestations_services", label: "Achat prestations de services", color: "bg-blue-100 text-blue-700" },
  { value: "assurances", label: "Assurances", color: "bg-green-100 text-green-700" },
  { value: "cadeau_client", label: "Cadeau client", color: "bg-pink-100 text-pink-700" },
  { value: "carburant", label: "Carburant", color: "bg-orange-100 text-orange-700" },
  { value: "catalogues_imprimes", label: "Catalogues et imprimés", color: "bg-yellow-100 text-yellow-700" },
  { value: "commissions_versees", label: "Commissions versées", color: "bg-amber-100 text-amber-700" },
  { value: "congres_expositions", label: "Congrès, expositions", color: "bg-teal-100 text-teal-700" },
  { value: "credit_bail", label: "Crédit bail", color: "bg-indigo-100 text-indigo-700" },
  { value: "depenses_sous_traitance", label: "Dépenses de sous-traitance", color: "bg-red-100 text-red-700" },
  { value: "depenses_sous_traitance_prestation", label: "Dépenses sous-traitance prestation de service", color: "bg-red-100 text-red-700" },
  { value: "documentation", label: "Documentation", color: "bg-sky-100 text-sky-700" },
  { value: "dons_pourboires", label: "Dons et pourboires versés", color: "bg-rose-100 text-rose-700" },
  { value: "eau", label: "Eau", color: "bg-cyan-100 text-cyan-700" },
  { value: "electricite", label: "Électricité", color: "bg-yellow-100 text-yellow-700" },
  { value: "entretien_vehicule", label: "Entretien véhicule", color: "bg-orange-100 text-orange-700" },
  { value: "fournitures_administratives", label: "Fournitures administratives", color: "bg-cyan-100 text-cyan-700" },
  { value: "frais_enregistrement_greffe", label: "Frais d'enregistrement, greffe, huissiers", color: "bg-slate-100 text-slate-700" },
  { value: "frais_deplacement_tva", label: "Frais de déplacement avec TVA", color: "bg-blue-100 text-blue-700" },
  { value: "frais_deplacement_sans_tva", label: "Frais de déplacement sans TVA", color: "bg-blue-100 text-blue-700" },
  { value: "frais_internet", label: "Frais internet", color: "bg-sky-100 text-sky-700" },
  { value: "frais_kilometriques", label: "Frais kilométriques", color: "bg-orange-100 text-orange-700" },
  { value: "frais_postaux_tva", label: "Frais postaux avec TVA", color: "bg-slate-100 text-slate-700" },
  { value: "gaz", label: "Gaz", color: "bg-yellow-100 text-yellow-700" },
  { value: "honoraires_payes", label: "Honoraires payés", color: "bg-violet-100 text-violet-700" },
  { value: "interimaires", label: "Intérimaires", color: "bg-purple-100 text-purple-700" },
  { value: "location_materiel", label: "Location de matériel", color: "bg-blue-100 text-blue-700" },
  { value: "loyers_charges_locatives", label: "Loyers et charges locatives", color: "bg-indigo-100 text-indigo-700" },
  { value: "marketing", label: "Marketing", color: "bg-pink-100 text-pink-700" },
  { value: "mission", label: "Mission", color: "bg-blue-100 text-blue-700" },
  { value: "nettoyage_entretien_reparations", label: "Nettoyage, entretien et réparations", color: "bg-teal-100 text-teal-700" },
  { value: "note_de_frais", label: "Note de frais", color: "bg-amber-100 text-amber-700" },
  { value: "peages_parking", label: "Péages, parking", color: "bg-slate-100 text-slate-700" },
  { value: "petits_materiels", label: "Petits matériels", color: "bg-blue-100 text-blue-700" },
  { value: "publicite", label: "Publicité", color: "bg-pink-100 text-pink-700" },
  { value: "remunerations_transitaires", label: "Rémunérations des transitaires", color: "bg-purple-100 text-purple-700" },
  { value: "restaurants", label: "Restaurants", color: "bg-yellow-100 text-yellow-700" },
  { value: "salon_seminaires_conferences", label: "Salon, séminaires, conférences", color: "bg-teal-100 text-teal-700" },
  // Divers
  { value: "compte_attente", label: "Compte d'attente (non classé)", color: "bg-muted text-muted-foreground" },
  { value: "depenses_exploitation_exceptionnelles", label: "Dépenses d'exploitation exceptionnelles", color: "bg-red-100 text-red-700" },
  { value: "facturation_frais_port", label: "Facturation frais de port", color: "bg-slate-100 text-slate-700" },
  { value: "gains_exceptionnels", label: "Gains exceptionnels", color: "bg-emerald-100 text-emerald-700" },
  { value: "indemnites_assurances", label: "Indemnités assurances", color: "bg-green-100 text-green-700" },
  { value: "revenus_activites_annexes", label: "Revenus activités annexes", color: "bg-emerald-100 text-emerald-700" },
  { value: "subvention_exploitation", label: "Subvention d'exploitation", color: "bg-green-100 text-green-700" },
  // Finances
  { value: "caution_recue", label: "Caution reçue", color: "bg-indigo-100 text-indigo-700" },
  { value: "emprunt", label: "Emprunt", color: "bg-red-100 text-red-700" },
  { value: "frais_bancaires_tva", label: "Frais bancaires avec TVA", color: "bg-slate-100 text-slate-700" },
  { value: "interets_bancaires", label: "Intérêts bancaires et escompte", color: "bg-slate-100 text-slate-700" },
  { value: "interets_retard_gains", label: "Intérêts de retard (gains)", color: "bg-green-100 text-green-700" },
  { value: "interets_emprunts", label: "Intérêts sur emprunts", color: "bg-red-100 text-red-700" },
  { value: "placements_financiers", label: "Placements financiers", color: "bg-emerald-100 text-emerald-700" },
  { value: "produits_financiers", label: "Produits financiers", color: "bg-emerald-100 text-emerald-700" },
  { value: "transfert_intragroupe", label: "Transfert intragroupe", color: "bg-blue-100 text-blue-700" },
  { value: "virement_banque_banque", label: "Virement de banque à banque", color: "bg-slate-100 text-slate-700" },
  { value: "virement_interne", label: "Virement interne", color: "bg-slate-100 text-slate-700" },
  // Fonds propres
  { value: "capital", label: "Capital", color: "bg-indigo-100 text-indigo-700" },
  { value: "dividendes_associes", label: "Dividendes versés aux associés", color: "bg-purple-100 text-purple-700" },
  { value: "subventions_investissement", label: "Subventions d'investissement", color: "bg-green-100 text-green-700" },
  // Immobilisations
  { value: "logiciel", label: "Logiciel", color: "bg-violet-100 text-violet-700" },
  { value: "materiel_outillage", label: "Matériel et outillage", color: "bg-blue-100 text-blue-700" },
  { value: "materiel_informatique", label: "Matériel Informatique", color: "bg-blue-100 text-blue-700" },
  { value: "mobilier", label: "Mobilier", color: "bg-amber-100 text-amber-700" },
  { value: "vehicule", label: "Véhicule", color: "bg-orange-100 text-orange-700" },
  // Impôts et taxes
  { value: "amendes", label: "Amendes", color: "bg-red-100 text-red-700" },
  { value: "autres_taxes", label: "Autres taxes", color: "bg-slate-100 text-slate-700" },
  { value: "cfe", label: "CFE", color: "bg-slate-100 text-slate-700" },
  { value: "impot_societes", label: "Impôt sur les sociétés", color: "bg-red-100 text-red-700" },
  { value: "impots_divers", label: "Impôts divers", color: "bg-slate-100 text-slate-700" },
  { value: "tva_payee", label: "TVA payée", color: "bg-slate-100 text-slate-700" },
  // Recettes
  { value: "cotisations_recues", label: "Cotisations reçues", color: "bg-emerald-100 text-emerald-700" },
  { value: "formation_professionnelle", label: "Compte formation professionnelle", color: "bg-emerald-100 text-emerald-700" },
  { value: "vente_prestations_normal", label: "Vente de prestations services taux normal", color: "bg-green-100 text-green-700" },
  // Social
  { value: "charges_sociales_salaries", label: "Charges sociales des salariés", color: "bg-purple-100 text-purple-700" },
  { value: "cotisations_sociales_dirigeant", label: "Cotisations sociales obligatoires du dirigeant", color: "bg-purple-100 text-purple-700" },
  { value: "remuneration_dirigeant", label: "Rémunération du dirigeant", color: "bg-purple-100 text-purple-700" },
  { value: "salaires_nets", label: "Salaires nets versés aux salariés", color: "bg-purple-100 text-purple-700" },
  { value: "tickets_restaurants", label: "Tickets restaurants", color: "bg-yellow-100 text-yellow-700" },
  { value: "mutuelle", label: "Mutuelle", color: "bg-green-100 text-green-700" },
  // Autre
  { value: "autre", label: "Autre", color: "bg-muted text-muted-foreground" },
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

// Combobox catégorie avec recherche intégrée
function CategorieCombobox({
  value,
  onValueChange,
  placeholder = "Catégorie...",
  className = "",
  allowAll = false,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  allowAll?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = CATEGORIES.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = value === "tous" ? null : CATEGORIES.find(c => c.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        className="flex items-center gap-2 w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring hover:bg-muted/50 transition-colors"
      >
        <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-left truncate text-sm">
          {allowAll && value === "tous" ? "Toutes catégories" : selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <svg className="h-4 w-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              placeholder="Rechercher une catégorie..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-sm border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {allowAll && (
              <button
                type="button"
                className={cn("w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-muted transition-colors", value === "tous" && "bg-primary/10 font-medium")}
                onClick={() => { onValueChange("tous"); setOpen(false); }}
              >
                Toutes catégories
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground text-center">Aucune catégorie trouvée</p>
            ) : (
              filtered.map(c => (
                <button
                  type="button"
                  key={c.value}
                  className={cn("w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-muted transition-colors", value === c.value && "bg-primary/10 font-medium")}
                  onClick={() => { onValueChange(c.value); setOpen(false); }}
                >
                  {c.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
        <CategorieCombobox
          value={filterCategorie}
          onValueChange={setFilterCategorie}
          placeholder="Toutes catégories"
          allowAll={true}
          className="w-[220px]"
        />
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
                          <CategorieCombobox
                            value={editForm.categorie || ""}
                            onValueChange={v => setEditForm(f => ({ ...f, categorie: v }))}
                            placeholder="Catégorie..."
                            className="w-[260px] h-8 text-xs"
                          />
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
