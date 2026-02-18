import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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

export function FormateurEditForm({ formateur, open, onOpenChange }: FormateurEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpecialites, setSelectedSpecialites] = useState<string[]>([]);
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

  // Charger les sessions du formateur
  const { data: sessionFormateurs = [], refetch: refetchSessions } = useQuery({
    queryKey: ['formateur-sessions', formateur.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_formateurs')
        .select(`
          id,
          presence,
          heures_effectuees,
          sessions(id, nom, date_debut, date_fin, heure_debut, heure_fin, lieu, type_session)
        `)
        .eq('formateur_id', formateur.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

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

  const togglePresence = async (sessionFormateurId: string, currentPresence: string) => {
    const next = currentPresence === 'present' ? 'absent' : currentPresence === 'absent' ? 'excuse' : 'present';
    const { error } = await supabase
      .from('session_formateurs')
      .update({ presence: next })
      .eq('id', sessionFormateurId);
    if (!error) {
      refetchSessions();
      toast.success(`Présence mise à jour : ${next === 'present' ? 'Présent' : next === 'absent' ? 'Absent' : 'Excusé'}`);
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

  const getPresenceStyle = (presence: string) => {
    if (presence === 'present') return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200';
    if (presence === 'absent') return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200';
    return 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200';
  };

  const getPresenceLabel = (presence: string) => {
    if (presence === 'present') return '✓ Présent';
    if (presence === 'absent') return '✗ Absent';
    return '~ Excusé';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              Sessions & Présence
              {sessionFormateurs.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                  {sessionFormateurs.length}
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

          {/* ===== ONGLET SESSIONS & PRÉSENCE ===== */}
          <TabsContent value="presence">
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Cliquez sur le badge de présence pour le modifier (Présent → Absent → Excusé)
              </p>

              {sessionFormateurs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/20">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Aucune session assignée</p>
                  <p className="text-sm mt-1">Ce formateur n'est assigné à aucune session.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionFormateurs
                    .sort((a: any, b: any) => {
                      const da = a.sessions?.date_debut || '';
                      const db = b.sessions?.date_debut || '';
                      return db.localeCompare(da);
                    })
                    .map((sf: any) => {
                      const session = sf.sessions;
                      if (!session) return null;
                      const presence = sf.presence || 'present';
                      const isPast = session.date_fin && new Date(session.date_fin) < new Date();
                      
                      return (
                        <div
                          key={sf.id}
                          className={`flex items-center justify-between p-4 rounded-xl border bg-card transition-shadow hover:shadow-sm ${isPast ? 'opacity-70' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground text-sm">
                                {session.nom || (session.type_session === 'pratique' ? '🚗 Session Pratique' : '📚 Session Théorique')}
                              </span>
                              {isPast && (
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Passée</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {session.date_debut && format(new Date(session.date_debut), 'd MMM yyyy', { locale: fr })}
                              {session.date_fin && session.date_fin !== session.date_debut && (
                                <> → {format(new Date(session.date_fin), 'd MMM yyyy', { locale: fr })}</>
                              )}
                              {session.heure_debut && (
                                <span>· {session.heure_debut}{session.heure_fin ? ` - ${session.heure_fin}` : ''}</span>
                              )}
                              {session.lieu && <span>· {session.lieu}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => togglePresence(sf.id, presence)}
                            title="Cliquer pour changer la présence"
                            className={`ml-3 flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium border transition-colors cursor-pointer ${getPresenceStyle(presence)}`}
                          >
                            {getPresenceLabel(presence)}
                          </button>
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
