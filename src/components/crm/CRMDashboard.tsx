import { useState, useMemo, useEffect } from "react";
import { Search, Filter, MoreVertical, Mail, Phone, Calendar, GraduationCap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import ApprenantDetailPage from "./ApprenantDetailPage";
import { ApprenantForm } from "@/components/apprenants/ApprenantForm";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAvatarUrl } from "@/lib/avatarUrl";
import { filterAndSortApprenants } from "@/lib/apprenantSearch";
import { CodesAccesEnvoyes } from "@/components/dashboard/CodesAccesEnvoyes";
const typeLabels: Record<string, string> = {
  'vtc': 'VTC',
  'vtc-e': 'VTC E',
  'vtc-e-presentiel': 'VTC E Présentiel',
  'taxi': 'TAXI',
  'taxi-e': 'TAXI E',
  'taxi-e-presentiel': 'TAXI E Présentiel',
  'ta': 'TA',
  'ta-e': 'TA E',
  'ta-e-presentiel': 'TA E Présentiel',
  'va-e': 'VA E',
  'va-e-presentiel': 'VA E Présentiel',
};

const typeColors: Record<string, string> = {
  'vtc': 'bg-blue-100 text-blue-800',
  'vtc-e': 'bg-blue-50 text-blue-700',
  'vtc-e-presentiel': 'bg-blue-200 text-blue-900',
  'taxi': 'bg-amber-100 text-amber-800',
  'taxi-e': 'bg-amber-50 text-amber-700',
  'taxi-e-presentiel': 'bg-amber-200 text-amber-900',
  'ta': 'bg-purple-100 text-purple-800',
  'ta-e': 'bg-purple-50 text-purple-700',
  'ta-e-presentiel': 'bg-purple-200 text-purple-900',
  'va-e': 'bg-emerald-100 text-emerald-800',
  'va-e-presentiel': 'bg-emerald-200 text-emerald-900',
};

const financementLabels: Record<string, string> = {
  'personnel': 'Personnel',
  'cpf': 'CPF',
  'cpf-a': 'CPF A',
  'opco': 'OPCO',
  'france-travail': 'France Travail',
  'entreprise': 'Entreprise',
};

const financementColors: Record<string, string> = {
  'personnel': 'bg-muted text-muted-foreground',
  'cpf': 'bg-primary/10 text-primary',
  'cpf-a': 'bg-primary/20 text-primary',
  'opco': 'bg-orange-100 text-orange-700',
  'france-travail': 'bg-emerald-100 text-emerald-700',
  'entreprise': 'bg-accent text-accent-foreground',
};

const dedupeByStableId = <T extends { id?: string | null }>(rows: T[]) =>
  Array.from(new Map(rows.map((row, index) => [row.id || `missing-id-${index}`, row])).values());

const INITIAL_VISIBLE_APPRENANTS = 80;
const SEARCH_VISIBLE_APPRENANTS = 160;

interface CRMDashboardProps {
  initialApprenantId?: string | null;
  onApprenantClosed?: () => void;
}

export function CRMDashboard({ initialApprenantId, onApprenantClosed }: CRMDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [formationFilter, setFormationFilter] = useState<string[]>([]);
  const [selectedApprenantId, setSelectedApprenantId] = useState<string | null>(initialApprenantId || null);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_APPRENANTS);

  useEffect(() => {
    if (initialApprenantId) {
      setSelectedApprenantId(initialApprenantId);
    }
  }, [initialApprenantId]);

  useEffect(() => {
    setVisibleLimit(searchQuery.trim() ? SEARCH_VISIBLE_APPRENANTS : INITIAL_VISIBLE_APPRENANTS);
  }, [searchQuery, formationFilter.join("|")]);

  const { data: apprenants = [], isLoading } = useQuery({
    queryKey: ['apprenants-crm'],
    queryFn: async () => {
      // Fetch ALL apprenants (backend caps each page at 1000 rows)
      // On limite aux colonnes affichées dans la liste pour accélérer le chargement.
      const columns = [
        'id', 'nom', 'prenom', 'email', 'telephone',
        'adresse', 'code_postal', 'ville',
        'statut', 'created_at', 'type_apprenant', 'formation_choisie',
        'mode_financement', 'organisme_financeur',
        'montant_ttc', 'montant_paye',
        'date_formation_catalogue', 'date_examen_theorique',
        'type_examen', 'b2_vierge', 'numero_dossier_cma', 'notes', 'auth_user_id',
      ].join(', ');
      const pageSize = 1000;
      let from = 0;
      const regularData: any[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('apprenants')
          .select(columns as any)
          .is('deleted_at' as any, null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        regularData.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const uniqueData = dedupeByStableId(regularData || []);

      // Mark fournisseur apprenants with source info
      const result = uniqueData.map((a: any) => {
        if (a.statut === 'fournisseur') {
          return { ...a, _source: 'fournisseur', _fournisseurNom: a.notes?.replace('Via fournisseur: ', '') || 'Fournisseur' };
        }
        return a;
      });

      return result.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          || String(b.id).localeCompare(String(a.id))
      );
    },
    staleTime: 60_000,
  });

  const formationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          apprenants
            .map((a: any) => (a.formation_choisie || "").trim())
            .filter((f: string) => f.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
    [apprenants],
  );

  const filteredApprenants = useMemo(() => {
    let list = apprenants as any[];
    if (formationFilter.length > 0) {
      list = list.filter((a) => formationFilter.includes((a.formation_choisie || "").trim()));
    }
    return filterAndSortApprenants(list, searchQuery);
  }, [apprenants, searchQuery, formationFilter]);

  const displayedApprenants = useMemo(() => {
    const unique = dedupeByStableId(filteredApprenants);
    return unique.slice(0, visibleLimit);
  }, [filteredApprenants, visibleLimit]);

  const stats = useMemo(() => {
    const byType = apprenants.reduce((acc, a) => {
      const type = a.type_apprenant || 'autre';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalMontant = apprenants.reduce((sum, a) => sum + (a.montant_ttc || 0), 0);
    const totalPaye = apprenants.reduce((sum, a) => sum + (a.montant_paye || 0), 0);

    return {
      total: apprenants.length,
      byType,
      totalMontant,
      totalPaye,
      soldeRestant: totalMontant - totalPaye,
    };
  }, [apprenants]);

  const pipelineStages = [
    { id: "total", label: "Total", count: stats.total, value: `${stats.totalMontant.toLocaleString('fr-FR')}€` },
    { id: "vtc", label: "VTC", count: (stats.byType['vtc'] || 0) + (stats.byType['vtc-e'] || 0) + (stats.byType['vtc-e-presentiel'] || 0), value: "" },
    { id: "taxi", label: "TAXI", count: (stats.byType['taxi'] || 0) + (stats.byType['taxi-e'] || 0) + (stats.byType['taxi-e-presentiel'] || 0), value: "" },
    { id: "paye", label: "Payé", count: "", value: `${stats.totalPaye.toLocaleString('fr-FR')}€` },
  ];

  // Afficher la fiche détaillée si un apprenant est sélectionné
  if (selectedApprenantId) {
    return (
      <ApprenantDetailPage 
        apprenantId={selectedApprenantId} 
        onBack={() => { setSelectedApprenantId(null); onApprenantClosed?.(); }} 
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pipeline Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => (
          <div key={stage.id} className="stat-card">
            <p className="text-sm font-medium text-muted-foreground">{stage.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              {stage.count !== "" && (
                <>
                  <span className="text-2xl font-bold text-foreground">{stage.count}</span>
                  <span className="text-sm text-muted-foreground">apprenants</span>
                </>
              )}
            </div>
            {stage.value && <p className="text-sm font-medium text-primary mt-1">{stage.value}</p>}
          </div>
        ))}
      </div>

      {/* Codes d'accès envoyés aujourd'hui */}
      <CodesAccesEnvoyes onNavigateToApprenant={(id) => setSelectedApprenantId(id)} />

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Nom, email, téléphone, ville ou code postal..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Formation</span>
                {formationFilter.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {formationFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-64">
              {formationOptions.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  Aucune formation disponible
                </div>
              ) : (
                formationOptions.map((f) => (
                  <DropdownMenuCheckboxItem
                    key={f}
                    checked={formationFilter.includes(f)}
                    onCheckedChange={(checked) => {
                      setFormationFilter((prev) =>
                        checked ? [...prev, f] : prev.filter((x) => x !== f),
                      );
                    }}
                  >
                    {f}
                  </DropdownMenuCheckboxItem>
                ))
              )}
              {formationFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFormationFilter([])}>
                    Effacer les filtres
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ApprenantForm />
      </div>

      {/* Apprenants Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : filteredApprenants.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun apprenant trouvé</div>
      ) : (
        <>
          {filteredApprenants.length > displayedApprenants.length && (
            <div className="text-sm text-muted-foreground">
              {displayedApprenants.length} résultats affichés sur {filteredApprenants.length}. Affinez la recherche pour ouvrir la fiche plus vite.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedApprenants.map((apprenant, index) => {
            const typeLabel = typeLabels[apprenant.type_apprenant || ''] || apprenant.type_apprenant || '-';
            const typeColor = typeColors[apprenant.type_apprenant || ''] || 'bg-muted text-muted-foreground';
            const financementLabel = financementLabels[apprenant.mode_financement || ''] || apprenant.mode_financement || '-';
            const financementColor = financementColors[apprenant.mode_financement || ''] || 'bg-muted text-muted-foreground';
            const initials = `${apprenant.prenom?.[0] || ''}${apprenant.nom?.[0] || ''}`.toUpperCase();
            const createdAt = apprenant.created_at ? formatDistanceToNow(new Date(apprenant.created_at), { addSuffix: true, locale: fr }) : '';

            // Vérifier les incohérences entre type_apprenant et type_examen
            const typeExamen = (apprenant as any).type_examen;
            const b2Vierge = (apprenant as any).b2_vierge;
            const anomalies: string[] = [];
            
            // Vérifier si le type d'examen correspond au type d'apprenant
            if (typeExamen) {
              const isVtcApprenant = apprenant.type_apprenant?.toLowerCase().includes('vtc');
              const isTaxiApprenant = apprenant.type_apprenant?.toLowerCase().includes('taxi') || 
                                       apprenant.type_apprenant?.toLowerCase().includes('ta');
              const isVtcExam = typeExamen.includes('vtc');
              const isTaxiExam = typeExamen.includes('taxi');
              
              if (isVtcApprenant && isTaxiExam) {
                anomalies.push(`Type d'examen (${typeExamen === 'taxi_complet' ? 'Taxi complet' : 'Taxi mobilité'}) ne correspond pas au type apprenant (VTC)`);
              }
              if (isTaxiApprenant && isVtcExam) {
                anomalies.push(`Type d'examen (${typeExamen === 'vtc_complet' ? 'VTC complet' : 'VTC mobilité'}) ne correspond pas au type apprenant (TAXI/TA)`);
              }
            }
            
            // Vérifier si B2 n'est pas vierge
            if (b2Vierge === false && typeExamen) {
              anomalies.push("B2 non confirmé comme vierge");
            }

            const hasAnomalies = anomalies.length > 0;

            return (
              <div 
                key={apprenant.id || `apprenant-${index}`} 
                className={`bg-card rounded-xl border p-5 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  hasAnomalies ? 'border-red-500 border-2' : 'border-border'
                }`}
                onClick={() => setSelectedApprenantId(apprenant.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={getAvatarUrl(apprenant.prenom, apprenant.nom, apprenant.civilite)} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{apprenant.prenom} {apprenant.nom}</h3>
                        {hasAnomalies && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-red-50 border-red-200 text-red-800">
                                <p className="font-semibold mb-1">Anomalies détectées :</p>
                                <ul className="list-disc list-inside text-sm">
                                  {anomalies.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Badge className={typeColor}>{typeLabel}</Badge>
                      {(apprenant as any)._source === 'fournisseur' && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                          {(apprenant as any)._fournisseurNom}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedApprenantId(apprenant.id)}>
                        Voir fiche
                      </DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="w-4 h-4" />
                    {apprenant.formation_choisie || '-'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {apprenant.email || '-'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {apprenant.telephone || '-'}
                  </div>
                  {(() => {
                    const fmt = (d?: string | null) => {
                      if (!d) return null;
                      const iso = /^\d{4}-\d{2}-\d{2}/.exec(d);
                      if (iso) {
                        const [y, m, day] = d.slice(0, 10).split('-');
                        return `${day}/${m}/${y}`;
                      }
                      return d;
                    };
                    const a: any = apprenant;
                    const catalogue = a.date_formation_catalogue && a.date_formation_catalogue !== 'manuel' ? a.date_formation_catalogue : null;
                    const debut = a.date_debut_formation || a.date_debut_cours_en_ligne;
                    const fin = a.date_fin_formation || a.date_fin_cours_en_ligne;
                    if (catalogue) {
                      return (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {catalogue}
                        </div>
                      );
                    }
                    if (debut || fin) {
                      return (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {fmt(debut) || '?'} → {fmt(fin) || '?'}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${financementColor}`}>
                      {financementLabel}
                    </span>
                    {apprenant.montant_ttc && (
                      <span className="text-sm font-medium text-foreground">{apprenant.montant_ttc.toLocaleString('fr-FR')}€</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {createdAt}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          {filteredApprenants.length > displayedApprenants.length && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisibleLimit((limit) => limit + 80)}>
                Afficher plus
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
