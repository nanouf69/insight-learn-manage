import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, MapPin, Loader2, Copy, Trophy, Trash2 } from "lucide-react";
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

export function SessionsList() {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
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

  // Fetch pass rates per session
  const { data: passRates = {} } = useQuery({
    queryKey: ['session-pass-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_apprenants')
        .select('session_id, apprenant_id, apprenants(resultat_examen)');
      
      if (error) throw error;
      
      const rates: Record<string, { total: number; passed: number; failed: number; absent: number }> = {};
      for (const sa of data || []) {
        if (!rates[sa.session_id]) rates[sa.session_id] = { total: 0, passed: 0, failed: 0, absent: 0 };
        const resultat = (sa as any).apprenants?.resultat_examen;
        if (resultat) {
          const r = resultat.toLowerCase();
          if (r === 'oui') {
            rates[sa.session_id].passed++;
            rates[sa.session_id].total++;
          } else if (r === 'non') {
            rates[sa.session_id].failed++;
            rates[sa.session_id].total++;
          } else if (r === 'absent') {
            rates[sa.session_id].absent++;
          }
        }
      }
      return rates;
    },
  });

  const openSessionDetail = (session: Session) => {
    const detailSession = {
      id: session.id,
      title: session.nom || `Session du ${formatDate(session.date_debut)}`,
      formation: "Formation TAXI VTC",
      dateDebut: formatDate(session.date_debut),
      dateFin: formatDate(session.date_fin),
      lieu: session.lieu || "Présentiel",
      formateur: "",
      participants: 0,
      maxParticipants: session.places_disponibles || 18,
      status: session.statut || "planifiee",
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

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune session créée. Cliquez sur "Nouvelle session" pour en créer une.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
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
                          <span>{session.places_disponibles || 18} places</span>
                        </div>
                        {passRates[session.id] && (passRates[session.id].total > 0 || passRates[session.id].absent > 0) && (() => {
                          const r = passRates[session.id];
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
      />
    </div>
  );
}
