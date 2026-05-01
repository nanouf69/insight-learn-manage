import { useState } from "react";
import { Search, Filter, MoreVertical, Mail, Phone, MapPin, User, UserCheck, Trash2, Pencil, Loader2, ChevronDown, AlertTriangle } from "lucide-react";
import { isPresentielType, getCurrentCreneau, type AgendaBloc, type CreneauKey } from "@/lib/agendaSlots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApprenantForm } from "./ApprenantForm";
import { ApprenantEditForm } from "./ApprenantEditForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  civilite: string | null;
  statut: string | null;
  mode_financement: string | null;
  date_naissance: string | null;
  numero_dossier_cma: string | null;
  type_apprenant: string | null;
  organisme_financeur: string | null;
  formation_choisie?: string | null;
}

interface EmargementStatus {
  needsSignature: boolean;
  creneau: CreneauKey | null;
}

const typeApprenantLabels: Record<string, { label: string; class: string }> = {
  vtc: { label: "VTC", class: "bg-blue-100 text-blue-700" },
  "vtc-e": { label: "VTC E", class: "bg-blue-50 text-blue-600" },
  "vtc-e-presentiel": { label: "VTC E Présentiel", class: "bg-blue-200 text-blue-800" },
  taxi: { label: "TAXI", class: "bg-yellow-100 text-yellow-700" },
  "taxi-e": { label: "TAXI E", class: "bg-yellow-50 text-yellow-600" },
  "taxi-e-presentiel": { label: "TAXI E Présentiel", class: "bg-yellow-200 text-yellow-800" },
  ta: { label: "TA", class: "bg-green-100 text-green-700" },
  "ta-e": { label: "TA E", class: "bg-green-50 text-green-600" },
  "ta-e-presentiel": { label: "TA E Présentiel", class: "bg-green-200 text-green-800" },
  va: { label: "VA", class: "bg-purple-100 text-purple-700" },
  "va-e": { label: "VA E", class: "bg-purple-50 text-purple-600" },
  "va-e-presentiel": { label: "VA E Présentiel", class: "bg-purple-200 text-purple-800" },
};

const modesFinancementLabels: Record<string, { label: string; class: string }> = {
  cpf: { label: "CPF", class: "bg-purple-100 text-purple-700" },
  personnel: { label: "Personnel", class: "bg-gray-100 text-gray-700" },
  opco: { label: "OPCO", class: "bg-blue-100 text-blue-700" },
  france_travail: { label: "France Travail", class: "bg-orange-100 text-orange-700" },
  autre: { label: "Autre", class: "bg-slate-100 text-slate-700" },
};

function ApprenantTable({ 
  data, 
  onDelete,
  onEdit,
  typeFilter,
  onTypeFilterChange,
  emargementStatus,
}: { 
  data: Apprenant[]; 
  onDelete: (id: string, name: string) => void;
  onEdit: (apprenant: Apprenant) => void;
  typeFilter: string[];
  onTypeFilterChange: (types: string[]) => void;
  emargementStatus: Record<string, EmargementStatus>;
}) {
  const toggleFilter = (type: string) => {
    if (typeFilter.includes(type)) {
      onTypeFilterChange(typeFilter.filter(t => t !== type));
    } else {
      onTypeFilterChange([...typeFilter, type]);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto p-0 font-semibold hover:bg-transparent">
                    Apprenant
                    <ChevronDown className="ml-1 h-4 w-4" />
                    {typeFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                        {typeFilter.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={typeFilter.includes("vtc")}
                    onCheckedChange={() => toggleFilter("vtc")}
                  >
                    VTC
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter.includes("vtc-e")}
                    onCheckedChange={() => toggleFilter("vtc-e")}
                  >
                    VTC E
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter.includes("taxi")}
                    onCheckedChange={() => toggleFilter("taxi")}
                  >
                    TAXI
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter.includes("taxi-e")}
                    onCheckedChange={() => toggleFilter("taxi-e")}
                  >
                    TAXI E
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter.includes("ta")}
                    onCheckedChange={() => toggleFilter("ta")}
                  >
                    TA (Passerelle TAXI)
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter.includes("ta-e")}
                    onCheckedChange={() => toggleFilter("ta-e")}
                  >
                    TA E (Passerelle TAXI E-learning)
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter.includes("va")}
                    onCheckedChange={() => toggleFilter("va")}
                  >
                    VA (Passerelle VTC)
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter.includes("va-e")}
                    onCheckedChange={() => toggleFilter("va-e")}
                  >
                    VA E (Passerelle VTC E-learning)
                  </DropdownMenuCheckboxItem>
                  {typeFilter.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onTypeFilterChange([])}>
                        Effacer les filtres
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableHead>
            <TableHead className="font-semibold">Contact</TableHead>
            <TableHead className="font-semibold">Adresse</TableHead>
            <TableHead className="font-semibold">Apprenant</TableHead>
            
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((apprenant) => {
            const status = emargementStatus[apprenant.id];
            const missing = status?.needsSignature;
            return (
            <TableRow
              key={apprenant.id}
              className={missing ? "bg-destructive/5 hover:bg-destructive/10 border-l-4 border-l-destructive" : "hover:bg-muted/50"}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={missing ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}>
                      {apprenant.prenom[0]}{apprenant.nom[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className={`font-medium ${missing ? "text-destructive" : ""}`}>
                      {apprenant.civilite && `${apprenant.civilite} `}
                      {apprenant.prenom} {apprenant.nom}
                    </span>
                    {missing && (
                      <div className="mt-1">
                        <Badge variant="destructive" className="gap-1 text-[10px] py-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          Émargement {status?.creneau ?? ""} non signé
                        </Badge>
                      </div>
                    )}
                    {apprenant.numero_dossier_cma && (
                      <div className="text-xs text-muted-foreground">
                        CMA: {apprenant.numero_dossier_cma}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {apprenant.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {apprenant.email}
                    </div>
                  )}
                  {apprenant.telephone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {apprenant.telephone}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {(apprenant.adresse || apprenant.ville) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      {apprenant.adresse && <div>{apprenant.adresse}</div>}
                      {(apprenant.code_postal || apprenant.ville) && (
                        <div className="text-muted-foreground">
                          {apprenant.code_postal} {apprenant.ville}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {apprenant.type_apprenant && typeApprenantLabels[apprenant.type_apprenant] ? (
                  <Badge className={typeApprenantLabels[apprenant.type_apprenant].class}>
                    {typeApprenantLabels[apprenant.type_apprenant].label}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(apprenant)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => onDelete(apprenant.id, `${apprenant.prenom} ${apprenant.nom}`)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ApprenantsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });
  const [editApprenant, setEditApprenant] = useState<Apprenant | null>(null);
  const queryClient = useQueryClient();

  // Fetch apprenants from database
  const { data: apprenants = [], isLoading } = useQuery({
    queryKey: ['apprenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('*')
        .is('deleted_at' as any, null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Apprenant[];
    }
  });

  // Fetch today's emargement status for presentiel apprenants
  const { data: emargementStatus = {} } = useQuery({
    queryKey: ['apprenants-emargements-today', apprenants.map(a => a.id).join(',')],
    enabled: apprenants.length > 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      const result: Record<string, EmargementStatus> = {};
      const presentielApprenants = apprenants.filter(a =>
        isPresentielType(a.type_apprenant, (a as any).formation_choisie)
      );
      if (presentielApprenants.length === 0) return result;

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // Today's signed emargements (one query)
      const ids = presentielApprenants.map(a => a.id);
      const { data: signedRows } = await supabase
        .from('emargements_fc')
        .select('apprenant_id, demi_journee')
        .eq('date_emargement', todayStr)
        .in('apprenant_id', ids);

      const signedMap = new Map<string, Set<string>>();
      (signedRows || []).forEach((r: any) => {
        if (!signedMap.has(r.apprenant_id)) signedMap.set(r.apprenant_id, new Set());
        signedMap.get(r.apprenant_id)!.add(r.demi_journee);
      });

      // For each apprenant, compute current creneau via agenda
      for (const a of presentielApprenants) {
        try {
          const { getTodayAgendaBlocs } = await import("@/lib/agendaSlots");
          const blocs = await getTodayAgendaBlocs((a as any).formation_choisie);
          const creneau = getCurrentCreneau(blocs);
          if (!creneau) continue;
          const signed = signedMap.get(a.id);
          if (!signed?.has(creneau)) {
            result[a.id] = { needsSignature: true, creneau };
          }
        } catch {
          // ignore individual failures
        }
      }
      return result;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('apprenants')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apprenants'] });
      queryClient.invalidateQueries({ queryKey: ['apprenants-corbeille'] });
      toast.success(`${deleteDialog.name} a été déplacé dans la corbeille`);
      setDeleteDialog({ open: false, id: null, name: "" });
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  });

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.id) {
      deleteMutation.mutate(deleteDialog.id);
    }
  };

  const normalize = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

  const stripNonAlpha = (str: string) => str.replace(/[\s\-\.\(\)]/g, "");

  const filteredApprenants = apprenants.filter(a => {
    if (!searchTerm.trim()) return true;
    const normalizedSearch = normalize(searchTerm);
    const keywords = normalizedSearch.split(" ").filter(Boolean);
    const haystack = normalize([a.nom, a.prenom, a.email || "", a.telephone || "", a.ville || "", a.adresse || "", a.code_postal || ""].join(" "));
    // Also build a stripped version for phone/email matching without spaces
    const haystackStripped = stripNonAlpha([a.telephone || "", a.email || ""].join(" "));
    const searchStripped = stripNonAlpha(normalizedSearch);
    return keywords.every(kw => haystack.includes(kw)) || (searchStripped.length >= 3 && haystackStripped.includes(searchStripped));
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header avec stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{apprenants.length}</p>
              <p className="text-sm text-muted-foreground">Total apprenants</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {apprenants.filter(a => a.mode_financement === 'cpf').length}
              </p>
              <p className="text-sm text-muted-foreground">Financements CPF</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un apprenant..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <ApprenantForm />
      </div>

      {/* Liste */}
      {filteredApprenants.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun apprenant trouvé</p>
          <p className="text-sm">Ajoutez votre premier apprenant pour commencer</p>
        </div>
      ) : (
        <ApprenantTable 
          data={filteredApprenants} 
          onDelete={handleDeleteClick}
          onEdit={setEditApprenant}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déplacer vers la corbeille ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteDialog.name}</strong> sera déplacé dans la corbeille. Vous pourrez le restaurer ultérieurement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Mettre à la corbeille
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog d'édition */}
      {editApprenant && (
        <ApprenantEditForm
          apprenant={editApprenant}
          open={!!editApprenant}
          onOpenChange={(open) => !open && setEditApprenant(null)}
        />
      )}
    </div>
  );
}
