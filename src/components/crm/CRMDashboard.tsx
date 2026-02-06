import { useState, useMemo } from "react";
import { Search, Filter, MoreVertical, Mail, Phone, Calendar, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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
  'taxi': 'bg-yellow-100 text-yellow-800',
  'taxi-e': 'bg-yellow-50 text-yellow-700',
  'taxi-e-presentiel': 'bg-yellow-200 text-yellow-900',
  'ta': 'bg-purple-100 text-purple-800',
  'ta-e': 'bg-purple-50 text-purple-700',
  'ta-e-presentiel': 'bg-purple-200 text-purple-900',
  'va-e': 'bg-green-100 text-green-800',
  'va-e-presentiel': 'bg-green-200 text-green-900',
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
  'opco': 'bg-warning/10 text-warning',
  'france-travail': 'bg-success/10 text-success',
  'entreprise': 'bg-accent text-accent-foreground',
};

export function CRMDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: apprenants = [], isLoading } = useQuery({
    queryKey: ['apprenants-crm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredApprenants = useMemo(() => {
    if (!searchQuery) return apprenants;
    const query = searchQuery.toLowerCase();
    return apprenants.filter(a => 
      a.nom?.toLowerCase().includes(query) ||
      a.prenom?.toLowerCase().includes(query) ||
      a.email?.toLowerCase().includes(query) ||
      a.telephone?.includes(query)
    );
  }, [apprenants, searchQuery]);

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

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un apprenant..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Apprenants Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : filteredApprenants.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun apprenant trouvé</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApprenants.map((apprenant) => {
            const typeLabel = typeLabels[apprenant.type_apprenant || ''] || apprenant.type_apprenant || '-';
            const typeColor = typeColors[apprenant.type_apprenant || ''] || 'bg-gray-100 text-gray-800';
            const financementLabel = financementLabels[apprenant.mode_financement || ''] || apprenant.mode_financement || '-';
            const financementColor = financementColors[apprenant.mode_financement || ''] || 'bg-muted text-muted-foreground';
            const initials = `${apprenant.prenom?.[0] || ''}${apprenant.nom?.[0] || ''}`.toUpperCase();
            const createdAt = apprenant.created_at ? formatDistanceToNow(new Date(apprenant.created_at), { addSuffix: true, locale: fr }) : '';

            return (
              <div 
                key={apprenant.id} 
                className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${apprenant.prenom}${apprenant.nom}`} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">{apprenant.prenom} {apprenant.nom}</h3>
                      <Badge className={typeColor}>{typeLabel}</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir fiche</DropdownMenuItem>
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
      )}
    </div>
  );
}
