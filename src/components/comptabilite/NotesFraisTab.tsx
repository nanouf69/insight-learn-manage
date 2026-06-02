import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Upload, Download, Trash2, Eye, CalendarIcon, Receipt, Euro, Copy, Pencil, FileDown } from "lucide-react";

import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface NoteFrais {
  id: string;
  date_depense: string;
  description: string;
  montant: number;
  categorie: string | null;
  fournisseur: string | null;
  nom_fichier: string | null;
  url: string | null;
  notes: string | null;
  statut: string;
  created_at: string;
}

const categories = [
  "📚 Recette formation",
  "🎓 CPF",
  "🏛️ Paiement frais examen CMA",
  "⛽ Carburant",
  "🍽️ Repas",
  "🖥️ Matériel",
  "📎 Fournitures",
  "📱 Téléphonie & Internet",
  "💻 Abonnement logiciel / CRM",
  "🏢 Loyer",
  "🛡️ Assurance",
  "👨‍🏫 Formateurs",
  "💼 Salaire",
  "🚌 Transport",
  "⚖️ Honoraires",
  "📢 Publicité",
  "🏦 Frais bancaires",
  "🏛️ Impôts & taxes",
  "🔄 Virement interne",
  "💰 Dividendes",
  "⚡ Électricité",
  "🧹 Entretien des locaux",
  "🚗 Entretien véhicule",
  "🏦 Compte courant associé",
  "📮 Frais postaux",
  "🏛️ URSSAF",
  "👴 Retraite",
  "❓ Inconnu",
  "📄 Autre",
];

const statutConfig: Record<string, { label: string; color: string }> = {
  a_traiter: { label: "À traiter", color: "bg-amber-100 text-amber-700" },
  valide: { label: "Validé", color: "bg-emerald-100 text-emerald-700" },
  refuse: { label: "Refusé", color: "bg-destructive/10 text-destructive" },
};

interface NotesFraisTabProps {
  readOnly?: boolean;
}

export function NotesFraisTab({ readOnly = false }: NotesFraisTabProps) {
  const [notes, setNotes] = useState<NoteFrais[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategorie, setFilterCategorie] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterMois, setFilterMois] = useState("all");
  const [filterFournisseur, setFilterFournisseur] = useState("all");
  const [filterMontantMin, setFilterMontantMin] = useState("");
  const [filterMontantMax, setFilterMontantMax] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [duplicateSource, setDuplicateSource] = useState<Pick<NoteFrais, "url" | "nom_fichier"> | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState<Date | undefined>(new Date());
  const [formDescription, setFormDescription] = useState("");
  const [formMontant, setFormMontant] = useState("");
  const [formCategorie, setFormCategorie] = useState("");
  const [formFournisseur, setFormFournisseur] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notes_frais')
      .select('*')
      .order('date_depense', { ascending: false });
    if (!error && data) setNotes(data as NoteFrais[]);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, []);

  const resetForm = () => {
    setFormDate(new Date());
    setFormDescription("");
    setFormMontant("");
    setFormCategorie("");
    setFormFournisseur("");
    setFormNotes("");
    setFormFile(null);
    setDuplicateSource(null);
    setEditId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openNewNoteForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formDescription || !formMontant || !formDate) {
      toast.error("Veuillez remplir la description, le montant et la date");
      return;
    }
    setSaving(true);

    let fileUrl: string | null = duplicateSource?.url || null;
    let fileName: string | null = duplicateSource?.nom_fichier || null;

    if (formFile) {
      const path = `${Date.now()}-${formFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('notes-frais')
        .upload(path, formFile);
      if (uploadError) {
        toast.error("Erreur upload: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('notes-frais').getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      fileName = formFile.name;
    }

    const payload: any = {
      date_depense: format(formDate, 'yyyy-MM-dd'),
      description: formDescription,
      montant: parseFloat(formMontant),
      categorie: formCategorie || null,
      fournisseur: formFournisseur || null,
      notes: formNotes || null,
    };

    // Only update file fields if a new file is uploaded or duplicating
    if (editId) {
      if (formFile) {
        payload.nom_fichier = fileName;
        payload.url = fileUrl;
      }
    } else {
      payload.nom_fichier = fileName;
      payload.url = fileUrl;
    }

    const { error } = editId
      ? await supabase.from('notes_frais').update(payload).eq('id', editId)
      : await supabase.from('notes_frais').insert(payload);

    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success(editId ? "Note de frais modifiée" : duplicateSource ? "Note de frais dupliquée" : "Note de frais ajoutée");
      resetForm();
      setShowForm(false);
      fetchNotes();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette note de frais ?")) return;
    const { error } = await supabase.from('notes_frais').delete().eq('id', id);
    if (!error) {
      toast.success("Note de frais supprimée");
      fetchNotes();
    }
  };

  const handleDuplicate = (note: NoteFrais) => {
    setFormDate(new Date(note.date_depense));
    setFormDescription(note.description);
    setFormMontant(String(note.montant));
    setFormCategorie(note.categorie || "");
    setFormFournisseur(note.fournisseur || "");
    setFormNotes(note.notes || "");
    setFormFile(null);
    setDuplicateSource({ url: note.url, nom_fichier: note.nom_fichier });
    setEditId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
  };

  const handleEdit = (note: NoteFrais) => {
    setFormDate(new Date(note.date_depense));
    setFormDescription(note.description);
    setFormMontant(String(note.montant));
    setFormCategorie(note.categorie || "");
    setFormFournisseur(note.fournisseur || "");
    setFormNotes(note.notes || "");
    setFormFile(null);
    setDuplicateSource(note.url ? { url: note.url, nom_fichier: note.nom_fichier } : null);
    setEditId(note.id);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
  };


  const handleStatutChange = async (id: string, newStatut: string) => {
    const { error } = await supabase.from('notes_frais').update({ statut: newStatut }).eq('id', id);
    if (!error) {
      toast.success("Statut mis à jour");
      fetchNotes();
    }
  };

  const handleValidateAll = async () => {
    const ids = filtered.filter(n => n.statut !== 'valide').map(n => n.id);
    if (ids.length === 0) {
      toast.info("Aucune note à valider");
      return;
    }
    if (!confirm(`Valider ${ids.length} note${ids.length > 1 ? 's' : ''} de frais ?`)) return;
    const { error } = await supabase.from('notes_frais').update({ statut: 'valide' }).in('id', ids);
    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success(`${ids.length} note${ids.length > 1 ? 's' : ''} validée${ids.length > 1 ? 's' : ''}`);
      fetchNotes();
    }
  };


  const openFile = async (url: string) => {
    const match = url.match(/\/storage\/v1\/object\/public\/(.+)/);
    if (!match) { window.open(url, '_blank'); return; }
    const fullPath = decodeURIComponent(match[1]);
    const bucketName = fullPath.split('/')[0];
    const filePath = fullPath.substring(bucketName.length + 1);
    const { data } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error("Impossible de générer le lien");
  };

  const downloadJustificatif = async (note: NoteFrais) => {
    if (!note.url) return;
    try {
      const match = note.url.match(/\/storage\/v1\/object\/public\/(.+)/);
      let downloadUrl = note.url;
      if (match) {
        const fullPath = decodeURIComponent(match[1]);
        const bucketName = fullPath.split('/')[0];
        const filePath = fullPath.substring(bucketName.length + 1);
        const { data } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 300, {
          download: note.nom_fichier || true,
        });
        if (data?.signedUrl) downloadUrl = data.signedUrl;
      }
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = note.nom_fichier || `justificatif-${note.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e: any) {
      toast.error("Erreur de téléchargement : " + (e?.message || e));
    }
  };

  const exportPDF = () => {
    if (filtered.length === 0) {
      toast.info("Aucune note à exporter");
      return;
    }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes de frais', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Édité le ${format(new Date(), 'dd/MM/yyyy')}`, 14, 24);
    doc.text(
      `${filtered.length} note${filtered.length > 1 ? 's' : ''} — Total : ${totalMontant.toFixed(2)} €`,
      14,
      29
    );
    doc.setTextColor(0);

    let cursorY = 36;
    Object.entries(grouped).forEach(([month, items]) => {
      const monthTotal = items.reduce((s, i) => s + i.montant, 0);
      if (cursorY > 260) { doc.addPage(); cursorY = 18; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(month.charAt(0).toUpperCase() + month.slice(1), 14, cursorY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${items.length} note${items.length > 1 ? 's' : ''} — ${monthTotal.toFixed(2)} €`, 14, cursorY + 5);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: cursorY + 8,
        head: [['Date', 'Description', 'Fournisseur', 'Catégorie', 'Montant', 'Statut']],
        body: items.map(n => [
          format(new Date(n.date_depense), 'dd/MM/yyyy'),
          n.description,
          n.fournisseur || '—',
          n.categorie || '—',
          `${n.montant.toFixed(2)} €`,
          statutConfig[n.statut]?.label || n.statut,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [243, 244, 246], textColor: 30, fontStyle: 'bold' },
        columnStyles: { 4: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 8;
    });

    doc.save(`notes-de-frais-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.info("Aucune note à exporter");
      return;
    }
    const rows = [
      ['Date', 'Description', 'Fournisseur', 'Catégorie', 'Montant', 'Statut', 'Notes'],
      ...filtered.map(n => [
        format(new Date(n.date_depense), 'dd/MM/yyyy'),
        n.description,
        n.fournisseur || '',
        n.categorie || '',
        n.montant.toFixed(2),
        statutConfig[n.statut]?.label || n.statut,
        n.notes || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notes-de-frais-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const moisOptions = Array.from(new Set(notes.map(n => format(new Date(n.date_depense), 'yyyy-MM'))))
    .sort()
    .reverse();
  const fournisseurOptions = Array.from(new Set(notes.map(n => n.fournisseur).filter(Boolean) as string[])).sort();

  const filtered = notes.filter(n => {
    const matchSearch = !search || 
      n.description.toLowerCase().includes(search.toLowerCase()) ||
      (n.fournisseur || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.categorie || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategorie === "all" || n.categorie === filterCategorie;
    const matchStatut = filterStatut === "all" || n.statut === filterStatut;
    const matchMois = filterMois === "all" || format(new Date(n.date_depense), 'yyyy-MM') === filterMois;
    const matchFournisseur = filterFournisseur === "all" || n.fournisseur === filterFournisseur;
    const min = parseFloat(filterMontantMin);
    const max = parseFloat(filterMontantMax);
    const matchMin = isNaN(min) || n.montant >= min;
    const matchMax = isNaN(max) || n.montant <= max;
    return matchSearch && matchCat && matchStatut && matchMois && matchFournisseur && matchMin && matchMax;

  });


  const totalMontant = filtered.reduce((sum, n) => sum + n.montant, 0);

  // Group by month
  const grouped = filtered.reduce((acc, n) => {
    const key = format(new Date(n.date_depense), 'MMMM yyyy', { locale: fr });
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {} as Record<string, NoteFrais[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Notes de frais
            <Badge variant="secondary">{notes.length}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Total : {totalMontant.toFixed(2)} €
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={exportPDF}>
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleValidateAll}>
              ✓ Tout valider
            </Button>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openNewNoteForm}><Plus className="h-4 w-4" /> Nouvelle note</Button>
              </DialogTrigger>

            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? "Modifier la note de frais" : duplicateSource ? "Dupliquer la note de frais" : "Ajouter une note de frais"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formDate ? format(formDate, "dd/MM/yyyy") : "Choisir"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={formDate} onSelect={setFormDate} locale={fr} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Montant (€) *</Label>
                    <Input type="number" step="0.01" value={formMontant} onChange={e => setFormMontant(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Ex: Norauto 02/06/2025" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={formCategorie} onValueChange={setFormCategorie}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fournisseur</Label>
                    <Input value={formFournisseur} onChange={e => setFormFournisseur(e.target.value)} placeholder="Ex: Norauto" />
                  </div>
                </div>
                <div>
                  <Label>Justificatif</Label>
                  <Input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={e => setFormFile(e.target.files?.[0] || null)} />
                  {duplicateSource?.nom_fichier && !formFile && (
                    <p className="mt-1 text-xs text-muted-foreground">Justificatif repris : {duplicateSource.nom_fichier}</p>
                  )}
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Remarques..." rows={2} />
                </div>
                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                  {saving ? "Enregistrement..." : editId ? "Enregistrer les modifications" : duplicateSource ? "Créer la copie" : "Ajouter"}
                </Button>

              </div>
            </DialogContent>
          </Dialog>
          </div>
        )}

      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategorie} onValueChange={setFilterCategorie}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="a_traiter">À traiter</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="refuse">Refusé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMois} onValueChange={setFilterMois}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Mois" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les mois</SelectItem>
            {moisOptions.map(m => (
              <SelectItem key={m} value={m} className="capitalize">
                {format(new Date(m + '-01'), 'MMMM yyyy', { locale: fr })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterFournisseur} onValueChange={setFilterFournisseur}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Fournisseur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous fournisseurs</SelectItem>
            {fournisseurOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2 h-10">
          <Euro className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Min"
            className="w-[80px] h-8 border-0 px-1 focus-visible:ring-0"
            value={filterMontantMin}
            onChange={e => setFilterMontantMin(e.target.value)}
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Max"
            className="w-[80px] h-8 border-0 px-1 focus-visible:ring-0"
            value={filterMontantMax}
            onChange={e => setFilterMontantMax(e.target.value)}
          />
        </div>

        {(search || filterCategorie !== "all" || filterStatut !== "all" || filterMois !== "all" || filterFournisseur !== "all" || filterMontantMin || filterMontantMax) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterCategorie("all"); setFilterStatut("all"); setFilterMois("all"); setFilterFournisseur("all"); setFilterMontantMin(""); setFilterMontantMax(""); }}>
            Réinitialiser

          </Button>
        )}

      </div>

      {/* Table grouped by month */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Aucune note de frais</p>
      ) : (
        Object.entries(grouped).map(([month, items]) => (
          <Card key={month}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base capitalize">{month}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {items.length} note{items.length > 1 ? 's' : ''} — {items.reduce((s, i) => s + i.montant, 0).toFixed(2)} €
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Justificatif</TableHead>
                    {!readOnly && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(note => (
                    <TableRow key={note.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(note.date_depense), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{note.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{note.fournisseur || '—'}</TableCell>
                      <TableCell>
                        {note.categorie ? <Badge variant="outline">{note.categorie}</Badge> : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{note.montant.toFixed(2)} €</TableCell>
                      <TableCell>
                        {readOnly ? (
                          <Badge className={cn("text-xs", statutConfig[note.statut]?.color)}>
                            {statutConfig[note.statut]?.label || note.statut}
                          </Badge>
                        ) : (
                          <Select value={note.statut} onValueChange={v => handleStatutChange(note.id, v)}>
                            <SelectTrigger className="h-7 w-[110px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="a_traiter">À traiter</SelectItem>
                              <SelectItem value="valide">Validé</SelectItem>
                              <SelectItem value="refuse">Refusé</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {note.url ? (
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => openFile(note.url!)}>
                              <Eye className="h-3 w-3" /> Voir
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadJustificatif(note)} title="Télécharger le justificatif">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : '—'}
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleEdit(note)} title="Modifier cette note de frais">
                              <Pencil className="h-3.5 w-3.5" /> Modifier
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleDuplicate(note)} title="Dupliquer cette note de frais">
                              <Copy className="h-3.5 w-3.5" /> Dupliquer

                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(note.id)} title="Supprimer">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
