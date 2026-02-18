import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

const specialites = [
  { id: "taxi-vtc", label: "Formation TAXI et VTC" },
  { id: "taxi", label: "Formation TAXI" },
  { id: "vtc", label: "Formation VTC" },
  { id: "taxi-ta", label: "Formation TAXI et TA" },
  { id: "anglais", label: "Cours Anglais" },
];

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  specialites: string | null;
  tarif_horaire: number | null;
  type: string | null;
  civilite: string | null;
  societe_nom: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  siren: string | null;
  numero_tva: string | null;
}

interface FormateurEditFormProps {
  formateur: Formateur;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PresenceStatus = 'present' | 'absent' | 'excuse';

const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const timeToHours = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h + (m / 60);
};

export function FormateurEditForm({ formateur, open, onOpenChange }: FormateurEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpecialites, setSelectedSpecialites] = useState<string[]>([]);
  // Map: blocId -> presence status (stored in state, persisted via supabase via a simple upsert pattern using localStorage key for now)
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceStatus>>({});
  const [formData, setFormData] = useState({
    civilite: "",
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    tarif_horaire: "",
    type: "interne",
    societe_nom: "",
    adresse: "",
    code_postal: "",
    ville: "",
    siren: "",
    numero_tva: "",
  });
  const queryClient = useQueryClient();

  // Charger les blocs agenda du formateur (toutes les semaines)
  const { data: agendaBlocs = [], isLoading: blocsLoading } = useQuery({
    queryKey: ['agenda-blocs-formateur', formateur.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_blocs')
        .select('id, discipline_nom, formation, heure_debut, heure_fin, semaine_debut, jour, discipline_color')
        .eq('formateur_id', formateur.id)
        .order('semaine_debut', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Charger la presence depuis localStorage au montage
  useEffect(() => {
    if (!open) return;
    const key = `presence_formateur_${formateur.id}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) setPresenceMap(JSON.parse(saved));
    } catch {}
  }, [open, formateur.id]);

  const savePresence = (newMap: Record<string, PresenceStatus>) => {
    setPresenceMap(newMap);
    const key = `presence_formateur_${formateur.id}`;
    localStorage.setItem(key, JSON.stringify(newMap));
  };

  const togglePresenceBloc = (blocId: string) => {
    const current = presenceMap[blocId] || 'present';
    const next: PresenceStatus = current === 'present' ? 'absent' : current === 'absent' ? 'excuse' : 'present';
    const newMap = { ...presenceMap, [blocId]: next };
    savePresence(newMap);
    toast.success(`Présence : ${next === 'present' ? '✓ Présent' : next === 'absent' ? '✗ Absent' : '~ Excusé'}`);
  };

  // Grouper les blocs par date
  const blocsGroupedByDate = agendaBlocs.reduce((acc: Record<string, typeof agendaBlocs>, bloc) => {
    const baseDate = parseDateString(bloc.semaine_debut);
    const date = addDays(baseDate, bloc.jour);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(bloc);
    return acc;
  }, {});

  const sortedDates = Object.keys(blocsGroupedByDate).sort((a, b) => a.localeCompare(b));

  // Calcul des heures totales présent
  const totalHeuresPresent = agendaBlocs.reduce((total, bloc) => {
    const status = presenceMap[bloc.id] || 'present';
    if (status === 'present') {
      return total + (timeToHours(bloc.heure_fin) - timeToHours(bloc.heure_debut));
    }
    return total;
  }, 0);

  // Initialize form data when formateur changes
  useEffect(() => {
    if (formateur) {
      setFormData({
        civilite: formateur.civilite || "",
        prenom: formateur.prenom,
        nom: formateur.nom,
        email: formateur.email || "",
        telephone: formateur.telephone || "",
        tarif_horaire: formateur.tarif_horaire?.toString() || "",
        type: formateur.type || "interne",
        societe_nom: formateur.societe_nom || "",
        adresse: formateur.adresse || "",
        code_postal: formateur.code_postal || "",
        ville: formateur.ville || "",
        siren: formateur.siren || "",
        numero_tva: formateur.numero_tva || "",
      });

      if (formateur.specialites) {
        const labels = formateur.specialites.split(',').map(s => s.trim());
        const ids = specialites
          .filter(spec => labels.includes(spec.label))
          .map(spec => spec.id);
        setSelectedSpecialites(ids);
      } else {
        setSelectedSpecialites([]);
      }
    }
  }, [formateur]);

  const handleSpecialiteChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecialites([...selectedSpecialites, id]);
    } else {
      setSelectedSpecialites(selectedSpecialites.filter(s => s !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const specialitesLabels = selectedSpecialites
        .map(id => specialites.find(s => s.id === id)?.label)
        .filter(Boolean)
        .join(', ');

      const { error } = await supabase
        .from('formateurs')
        .update({
          civilite: formData.civilite || null,
          prenom: formData.prenom,
          nom: formData.nom,
          email: formData.email || null,
          telephone: formData.telephone || null,
          tarif_horaire: formData.tarif_horaire ? parseFloat(formData.tarif_horaire) : null,
          type: formData.type,
          specialites: specialitesLabels || null,
          societe_nom: formData.societe_nom || null,
          adresse: formData.adresse || null,
          code_postal: formData.code_postal || null,
          ville: formData.ville || null,
          siren: formData.siren || null,
          numero_tva: formData.numero_tva || null,
        })
        .eq('id', formateur.id);

      if (error) throw error;

      toast.success("Formateur modifié avec succès");
      queryClient.invalidateQueries({ queryKey: ['formateurs'] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la modification du formateur");
    } finally {
      setIsLoading(false);
    }
  };

  const getPresenceStyle = (presence: PresenceStatus) => {
    if (presence === 'present') return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 cursor-pointer';
    if (presence === 'absent') return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 cursor-pointer';
    return 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 cursor-pointer';
  };

  const getPresenceLabel = (presence: PresenceStatus) => {
    if (presence === 'present') return '✓ Présent';
    if (presence === 'absent') return '✗ Absent';
    return '~ Excusé';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formateur.civilite ? `${formateur.civilite} ` : ''}{formateur.prenom} {formateur.nom}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="infos" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="infos">Informations</TabsTrigger>
            <TabsTrigger value="presence" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Présence Agenda
              {agendaBlocs.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                  {agendaBlocs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ===== ONGLET INFORMATIONS ===== */}
          <TabsContent value="infos">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="civilite">Civilité</Label>
                <Select value={formData.civilite} onValueChange={(value) => setFormData({ ...formData, civilite: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une civilité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M.">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input 
                    id="prenom" 
                    placeholder="Jean" 
                    required 
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input 
                    id="nom" 
                    placeholder="Dupont" 
                    required 
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="jean.dupont@ftransport.fr"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input 
                    id="telephone" 
                    placeholder="06 12 34 56 78"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tarif">Tarif horaire (€)</Label>
                  <Input 
                    id="tarif" 
                    type="number" 
                    placeholder="50"
                    value={formData.tarif_horaire}
                    onChange={(e) => setFormData({ ...formData, tarif_horaire: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interne">Interne</SelectItem>
                    <SelectItem value="externe">Externe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Section Facturation */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium text-sm mb-3 text-muted-foreground">Informations de facturation (optionnel)</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="societe_nom">Nom de l'entreprise ou de la société</Label>
                    <Input 
                      id="societe_nom" 
                      placeholder="Ma Société SARL"
                      value={formData.societe_nom}
                      onChange={(e) => setFormData({ ...formData, societe_nom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adresse">Adresse</Label>
                    <Input 
                      id="adresse" 
                      placeholder="15 rue de la Formation"
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code_postal">Code postal</Label>
                      <Input 
                        id="code_postal" 
                        placeholder="75001"
                        value={formData.code_postal}
                        onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ville">Ville</Label>
                      <Input 
                        id="ville" 
                        placeholder="Paris"
                        value={formData.ville}
                        onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siren">Numéro SIREN</Label>
                      <Input 
                        id="siren" 
                        placeholder="123 456 789"
                        value={formData.siren}
                        onChange={(e) => setFormData({ ...formData, siren: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero_tva">Numéro de TVA</Label>
                      <Input 
                        id="numero_tva" 
                        placeholder="FR12345678901"
                        value={formData.numero_tva}
                        onChange={(e) => setFormData({ ...formData, numero_tva: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Spécialités (formations dispensées)</Label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg bg-muted/30">
                  {specialites.map((spec) => (
                    <div key={spec.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`edit-${spec.id}`} 
                        checked={selectedSpecialites.includes(spec.id)}
                        onCheckedChange={(checked) => handleSpecialiteChange(spec.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`edit-${spec.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {spec.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ===== ONGLET PRÉSENCE AGENDA ===== */}
          <TabsContent value="presence">
            <div className="mt-4 space-y-4">

              {/* Résumé total heures */}
              {agendaBlocs.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{totalHeuresPresent.toFixed(1)}h effectuées (Présent)</p>
                    <p className="text-xs text-muted-foreground">
                      {agendaBlocs.length} créneaux au total • Cliquer sur le badge pour changer la présence
                    </p>
                  </div>
                  {formData.tarif_horaire && (
                    <div className="ml-auto text-right">
                      <p className="text-sm font-bold text-primary">{(totalHeuresPresent * parseFloat(formData.tarif_horaire)).toFixed(0)} €</p>
                      <p className="text-xs text-muted-foreground">à facturer</p>
                    </div>
                  )}
                </div>
              )}

              {blocsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : agendaBlocs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/20">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Aucun créneau dans l'agenda</p>
                  <p className="text-sm mt-1">Ce formateur n'a pas de blocs assignés dans l'agenda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedDates.map((dateKey) => {
                    const blocs = blocsGroupedByDate[dateKey];
                    const date = parseDateString(dateKey);
                    const isPast = date < new Date();
                    const heuresDuJour = blocs.reduce((sum: number, b: any) => {
                      const status = presenceMap[b.id] || 'present';
                      if (status === 'present') return sum + (timeToHours(b.heure_fin) - timeToHours(b.heure_debut));
                      return sum;
                    }, 0);

                    return (
                      <div key={dateKey} className={`border rounded-xl overflow-hidden ${isPast ? 'opacity-80' : ''}`}>
                        {/* En-tête de la journée */}
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b">
                          <div>
                            <span className="font-semibold text-sm capitalize">
                              {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                            </span>
                            {isPast && <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Passé</span>}
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">{heuresDuJour.toFixed(1)}h présent</span>
                        </div>

                        {/* Liste des créneaux */}
                        <div className="divide-y">
                          {(blocs as any[])
                            .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
                            .map((bloc: any) => {
                              const presence = presenceMap[bloc.id] || 'present';
                              const heures = timeToHours(bloc.heure_fin) - timeToHours(bloc.heure_debut);

                              return (
                                <div key={bloc.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Couleur discipline */}
                                    <div
                                      className="w-3 h-8 rounded-sm shrink-0"
                                      style={{ backgroundColor: bloc.discipline_color || '#6366f1' }}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{bloc.discipline_nom}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{bloc.heure_debut} – {bloc.heure_fin}</span>
                                        <span>·</span>
                                        <span>{heures.toFixed(1)}h</span>
                                        <span>·</span>
                                        <span className="truncate">{bloc.formation}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Badge présence cliquable */}
                                  <button
                                    onClick={() => togglePresenceBloc(bloc.id)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors shrink-0 ml-3 ${getPresenceStyle(presence)}`}
                                  >
                                    {getPresenceLabel(presence)}
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
