import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SessionDetail } from "@/components/sessions/SessionDetail";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setSession(null);
        setLoading(false);
        return;
      }
      setSession({
        id: data.id,
        title: data.nom || `Session du ${format(new Date(data.date_debut), "dd MMM yyyy", { locale: fr })}`,
        formation: data.nom || `Session du ${format(new Date(data.date_debut), "dd MMM yyyy", { locale: fr })}`,
        dateDebut: data.date_debut,
        dateFin: data.date_fin,
        lieu: data.lieu || "Présentiel",
        formateur: "",
        participants: 0,
        maxParticipants: data.places_disponibles || 18,
        status: data.statut || "planifiee",
        type_session: data.type_session,
        creneaux: data.creneaux,
        nom: data.nom,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Session introuvable.
      </div>
    );
  }

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/?section=sessions");
    }
  };

  return (
    <SessionDetail
      session={session}
      open={true}
      onOpenChange={goBack}
      asPage
      onBack={goBack}
      onNavigateToApprenant={(apprenantId) => navigate(`/?section=crm&apprenant=${apprenantId}`, {
        replace: true,
        state: { section: "crm", apprenantId },
      })}
    />
  );
}
