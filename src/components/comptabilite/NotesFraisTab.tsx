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
import { Plus, Search, Upload, Download, Trash2, Eye, CalendarIcon, Receipt, Euro } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  "Carburant", "Péage", "Parking", "Transport", "Repas", "Hébergement",
  "Fournitures bureau", "Matériel pédagogique", "Téléphone / Internet",
  "Assurance", "Entretien véhicule", "Frais postaux", "Abonnements",
  "Formation", "Publicité", "Honoraires", "Autre"
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
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!formDescription || !formMontant || !formDate) {
      toast.error("Veuillez remplir la description, le montant et la date");
      return;
    }
    setSaving(true);

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (formFile) {
      const ext = formFile.name.split('.').pop();
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

    const { error } = await supabase.from('notes_frais').insert({
      date_depense: format(formDate, 'yyyy-MM-dd'),
      description: formDescription,
      montant: parseFloat(formMontant),
      categorie: formCategorie || null,
      fournisseur: formFournisseur || null,
      nom_fichier: fileName,
      url: fileUrl,
      notes: formNotes || null,
    });

    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success("Note de frais ajoutée");
      resetForm();
      setShowForm(false);
      fetchNotes();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notes_frais').delete().eq('id', id);
    if (!error) {
      toast.success("Note de frais supprimée");
      fetchNotes();
    }
  };

  const handleStatutChange = async (id: string, newStatut: string) => {
    const { error } = await supabase.from('notes_frais').update({ statut: newStatut }).eq('id', id);
    if (!error) {
      toast.success("Statut mis à jour");
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

  const filtered = notes.filter(n => {
    const matchSearch = !search || 
      n.description.toLowerCase().includes(search.toLowerCase()) ||
      (n.fournisseur || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.categorie || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategorie === "all" || n.categorie === filterCategorie;
    const matchStatut = filterStatut === "all" || n.statut === filterStatut;
    return matchSearch && matchCat && matchStatut;
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
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nouvelle note</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter une note de frais</DialogTitle>
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
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Remarques..." rows={2} />
                </div>
                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                  {saving ? "Enregistrement..." : "Ajouter"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => openFile(note.url!)}>
                            <Eye className="h-3 w-3" /> Voir
                          </Button>
                        ) : '—'}
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(note.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
