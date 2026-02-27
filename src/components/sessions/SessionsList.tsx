import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, MapPin, Loader2, Copy, Trophy, Trash2, Search, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SessionForm } from "./SessionForm";
import { SessionDetail } from "./SessionDetail";
import { SessionEditor } from "./SessionEditor";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Session {
  id: string;
  nom: string | null;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  places_disponibles: number | null;
  statut: string | null;
  formation_id: string | null;
  types_apprenant: string[] | null;
  creneaux: string[] | null;
  type_session: string;
  heure_debut: string | null;
  heure_fin: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  "VTC": "bg-blue-500",
  "VTC E": "bg-blue-400",
  "VTC E Présentiel": "bg-blue-600",
  "TAXI": "bg-yellow-500",
  "TAXI E": "bg-yellow-400",
  "TAXI E Présentiel": "bg-yellow-600",
  "TA": "bg-green-500",
  "TA E": "bg-green-400",
  "TA E Présentiel": "bg-green-600",
  "VA E": "bg-purple-500",
  "VA E Présentiel": "bg-purple-600",
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "confirmee":
    case "confirmed":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confirmée</Badge>;
    case "planifiee":
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Planifiée</Badge>;
    case "annulee":
    case "cancelled":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Annulée</Badge>;
    case "terminee":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Terminée</Badge>;
    default:
      return <Badge variant="secondary">{status || "Planifiée"}</Badge>;
  }
};

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
  } catch {
    return dateString;
  }
};

export function SessionsList({ onNavigateToApprenant }: { onNavigateToApprenant?: (apprenantId: string) => void }) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterType, setFilterType] = useState("tous");
  const { toast } = useToast();

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date_debut', { ascending: true });
      
      if (error) throw error;
      return data as Session[];
    },
  });

  // Fetch pass rates, counts, and apprenant details per session
  const { data: sessionApprenants = [] } = useQuery({
    queryKey: ['session-apprenants-search'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_apprenants')
        .select('session_id, apprenant_id, apprenants(nom, prenom, email, telephone, resultat_examen)');
      
      if (error) throw error;
      return data || [];
    },
  });

  const sessionStats = useMemo(() => {
    const stats: Record<string, { inscrits: number; passed: number; failed: number; absent: number; total: number }> = {};
    for (const sa of sessionApprenants) {
      if (!stats[sa.session_id]) stats[sa.session_id] = { inscrits: 0, passed: 0, failed: 0, absent: 0, total: 0 };
      stats[sa.session_id].inscrits++;
      const resultat = (sa as any).apprenants?.resultat_examen;
      if (resultat) {
        const r = resultat.toLowerCase();
        if (r === 'oui') { stats[sa.session_id].passed++; stats[sa.session_id].total++; }
        else if (r === 'non') { stats[sa.session_id].failed++; stats[sa.session_id].total++; }
        else if (r === 'absent') { stats[sa.session_id].absent++; }
      }
    }
    return stats;
  }, [sessionApprenants]);

  // Build a map of session_id -> apprenant search strings
  const sessionApprenantSearchMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const sa of sessionApprenants) {
      const a = (sa as any).apprenants;
      if (!a) continue;
      if (!map[sa.session_id]) map[sa.session_id] = [];
      const parts = [a.nom, a.prenom, a.email, a.telephone].filter(Boolean).join(' ').toLowerCase();
      map[sa.session_id].push(parts);
    }
    return map;
  }, [sessionApprenants]);

  // Sort: upcoming sessions first (closest to today), then past sessions
  // Formation filter matchers (on session name)
  const FORMATION_FILTERS: Record<string, (nom: string) => boolean> = {
    "continue_vtc": (nom) => /continue.*vtc|vtc.*continue/i.test(nom),
    "soir_vtc": (nom) => /soir/i.test(nom),
    "ta_taxi": (nom) => /ta.*taxi|taxi.*ta/i.test(nom) && !/vtc/i.test(nom),
    "vtc_taxi": (nom) => /vtc.*taxi|taxi.*vtc/i.test(nom) && !/continue/i.test(nom) && !/soir/i.test(nom),
    "pratique_vtc": (nom) => /pratique.*vtc|vtc.*pratique/i.test(nom),
    "pratique_taxi": (nom) => /pratique.*taxi|taxi.*pratique/i.test(nom) && !/vtc/i.test(nom),
  };

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const q = search.toLowerCase();

    let list = sessions.filter((s) => {
      const nom = s.nom || "";
      const matchSearch = !q
        || nom.toLowerCase().includes(q)
        || (s.lieu || "").toLowerCase().includes(q)
        || (s.types_apprenant || []).some(t => t.toLowerCase().includes(q))
        || (sessionApprenantSearchMap[s.id] || []).some(str => str.includes(q));
      const matchStatut = filterStatut === "tous" || s.statut === filterStatut;
      const matchType = filterType === "tous"
        ? true
        : FORMATION_FILTERS[filterType]
          ? FORMATION_FILTERS[filterType](nom)
          : s.type_session === filterType;
      return matchSearch && matchStatut && matchType;
    });

    // Sort: today first, then upcoming ascending, then past descending
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = list
      .filter(s => {
        const d = new Date(s.date_debut);
        d.setHours(0, 0, 0, 0);
        const fin = new Date(s.date_fin);
        fin.setHours(0, 0, 0, 0);
        return d <= today && fin >= today;
      })
      .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());

    const todayIds = new Set(todaySessions.map(s => s.id));

    const upcoming = list
      .filter(s => {
        const d = new Date(s.date_debut);
        d.setHours(0, 0, 0, 0);
        return d >= tomorrow && !todayIds.has(s.id);
      })
      .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());

    const past = list
      .filter(s => {
        const fin = new Date(s.date_fin);
        fin.setHours(0, 0, 0, 0);
        return fin < today && !todayIds.has(s.id);
      })
      .sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());

    return [...todaySessions, ...upcoming, ...past];
  }, [sessions, search, filterStatut, filterType, sessionApprenantSearchMap]);

  const hasActiveFilters = search || filterStatut !== "tous" || filterType !== "tous";

  const openSessionDetail = (session: Session) => {
    const detailSession = {
      id: session.id,
      title: session.nom || `Session du ${formatDate(session.date_debut)}`,
      formation: "Formation TAXI VTC",
      dateDebut: session.date_debut,
      dateFin: session.date_fin,
      lieu: session.lieu || "Présentiel",
      formateur: "",
      participants: 0,
      maxParticipants: session.places_disponibles || 18,
      status: session.statut || "planifiee",
      type_session: session.type_session,
    };
    setSelectedSession(detailSession);
    setDetailOpen(true);
  };

  const duplicateSession = async (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setDuplicating(session.id);

    try {
      const { error } = await supabase
        .from('sessions')
        .insert({
          nom: session.nom ? `${session.nom} (copie)` : null,
          date_debut: session.date_debut,
          date_fin: session.date_fin,
          lieu: session.lieu,
          places_disponibles: session.places_disponibles || 18,
          formation_id: session.formation_id,
          statut: 'planifiee',
          types_apprenant: session.types_apprenant || [],
          creneaux: session.creneaux || [],
        });

      if (error) throw error;

      toast({
        title: "Session dupliquée",
        description: "La session a été dupliquée avec succès.",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la duplication",
        variant: "destructive",
      });
    } finally {
      setDuplicating(null);
    }
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      // Delete linked session_apprenants and session_formateurs first
      await supabase.from('session_apprenants').delete().eq('session_id', sessionId);
      await supabase.from('session_formateurs').delete().eq('session_id', sessionId);
      
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;

      toast({ title: "Session supprimée", description: "La session a été supprimée avec succès." });
      refetch();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
          <p className="text-muted-foreground">Gérez vos sessions de formation</p>
        </div>
        <SessionForm />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par session, apprenant, téléphone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Formation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes les formations</SelectItem>
            <SelectItem value="theorique">📚 Théorique</SelectItem>
            <SelectItem value="pratique">🚗 Pratique</SelectItem>
            <SelectItem value="continue_vtc">🔄 Formation continue VTC</SelectItem>
            <SelectItem value="soir_vtc">🌙 Formation VTC cours du soir</SelectItem>
            <SelectItem value="ta_taxi">🚕 Formation TA et TAXI</SelectItem>
            <SelectItem value="vtc_taxi">🚖 Formation VTC et TAXI</SelectItem>
            <SelectItem value="pratique_vtc">🚗 Formation pratique VTC</SelectItem>
            <SelectItem value="pratique_taxi">🚕 Formation pratique TAXI</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="planifiee">Planifiée</SelectItem>
            <SelectItem value="confirmee">Confirmée</SelectItem>
            <SelectItem value="terminee">Terminée</SelectItem>
            <SelectItem value="annulee">Annulée</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setFilterStatut("tous"); setFilterType("tous"); }}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {hasActiveFilters ? "Aucune session ne correspond aux filtres." : "Aucune session créée. Cliquez sur \"Nouvelle session\" pour en créer une."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSessions.map((session) => (
            <Card 
              key={session.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openSessionDetail(session)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-5">
                  {/* Dates début - fin */}
                  <div className="flex flex-col items-center justify-center min-w-[140px] p-3 rounded-xl bg-primary/10 text-primary">
                    <Calendar className="w-5 h-5 mb-1" />
                    <span className="text-sm font-bold">{formatDate(session.date_debut)}</span>
                    <span className="text-xs text-primary/70">au</span>
                    <span className="text-sm font-bold">{formatDate(session.date_fin)}</span>
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-foreground">
                        {session.nom || `Session du ${formatDate(session.date_debut)}`}
                      </h3>
                      {session.type_session === 'pratique' && (
                        <Badge className="bg-emerald-500 text-white text-xs">🚗 Pratique</Badge>
                      )}
                      <SessionEditor 
                        session={session} 
                        onUpdate={refetch}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => duplicateSession(e, session)}
                        disabled={duplicating === session.id}
                      >
                        {duplicating === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Tous les apprenants liés à cette session seront détachés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(e) => deleteSession(e, session.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {getStatusBadge(session.statut)}
                    </div>
                    
                    {/* Tags types apprenant et créneaux */}
                    {((session.types_apprenant && session.types_apprenant.length > 0) || (session.creneaux && session.creneaux.length > 0)) && (
                      <div className="flex flex-wrap gap-1.5">
                        {session.types_apprenant?.map((type) => (
                          <Badge 
                            key={type} 
                            className={`${TYPE_COLORS[type] || 'bg-gray-500'} text-white text-xs`}
                          >
                            {type}
                          </Badge>
                        ))}
                        {session.creneaux?.map((creneau) => (
                          <Badge 
                            key={creneau} 
                            variant="outline"
                            className="text-xs"
                          >
                            {creneau}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>{session.lieu || "Non défini"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span className={sessionStats[session.id]?.inscrits > (session.places_disponibles || 18) ? "text-red-600 font-medium" : ""}>
                            {sessionStats[session.id]?.inscrits || 0}/{session.places_disponibles || 18} inscrits
                          </span>
                        </div>
                        {sessionStats[session.id] && (sessionStats[session.id].total > 0 || sessionStats[session.id].absent > 0) && (() => {
                          const r = sessionStats[session.id];
                          const pct = r.total > 0 ? Math.round((r.passed / r.total) * 100) : 0;
                          return (
                            <div className="flex items-center gap-1.5">
                              <Trophy className="w-4 h-4" />
                              <span className={
                                r.total === 0 ? "text-muted-foreground font-medium"
                                : pct >= 70 ? "text-emerald-600 font-medium"
                                : pct >= 40 ? "text-amber-600 font-medium"
                                : "text-red-600 font-medium"
                              }>
                                Théorie : ✅ {r.passed} · ❌ {r.failed}{r.absent > 0 ? ` · 🔶 ${r.absent} abs.` : ''}
                                {r.total > 0 ? ` (${pct}%)` : ''}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SessionDetail 
        session={selectedSession}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onNavigateToApprenant={onNavigateToApprenant}
      />
    </div>
  );
}
