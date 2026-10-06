import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Élève fictif (compte de test technique, exclu des listes et statistiques).
export const TEST_PRATIQUE = {
  id: "7e570000-0000-4000-8000-0000000c0067",
  nom: "TEST",
  prenom: "Opto",
  email: "opto67@yahoo.com",
};

interface Props {
  examDate: string;
  datePratique?: string | null;
  buildUrl: (id: string, type: "vtc" | "taxi") => string;
}

export function TestReservationPratique({ examDate, datePratique, buildUrl }: Props) {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const url = buildUrl(TEST_PRATIQUE.id, "vtc");

  const { data: resa } = useQuery({
    queryKey: ["reservations-pratique-planning", "test", TEST_PRATIQUE.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations_pratique")
        .select("*")
        .eq("apprenant_id", TEST_PRATIQUE.id)
        .maybeSingle();
      return data;
    },
    refetchInterval: false,
  });

  const send = async () => {
    setSending(true);
    const body = `Bonjour ${TEST_PRATIQUE.prenom},<br><br>[TEST] Choisissez votre journée d'entraînement pratique VTC.<br><br>👉 <a href="${url}">CHOISISSEZ VOTRE DATE ICI</a><br><br>Cordialement,<br>FTRANSPORT`;
    const { error } = await supabase.functions.invoke("sync-outlook-emails", {
      body: { action: "send", userEmail: "contact@ftransport.fr", to: TEST_PRATIQUE.email, subject: "[TEST] Choix de votre date de formation pratique VTC", body },
    });
    setSending(false);
    error ? toast.error("Échec de l'envoi : " + error.message) : toast.success(`E-mail TEST envoyé à ${TEST_PRATIQUE.email}`);
  };

  const cancel = async () => {
    const { error } = await supabase.from("reservations_pratique").delete().eq("apprenant_id", TEST_PRATIQUE.id);
    if (error) return toast.error("Erreur : " + error.message);
    qc.invalidateQueries({ queryKey: ["reservations-pratique-planning"] });
    toast.success("Réservation TEST supprimée");
  };

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" /> TEST
          <Badge variant="outline" className="text-xs">élève fictif, exclu des statistiques</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p><strong>{TEST_PRATIQUE.nom} {TEST_PRATIQUE.prenom}</strong> — VTC — {TEST_PRATIQUE.email}</p>
        <p className="text-muted-foreground text-xs">Session {examDate}{datePratique ? ` • ${datePratique}` : ""}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" disabled={sending} onClick={send}>
            <Mail className="h-3.5 w-3.5" /> {sending ? "Envoi..." : "Envoyer l'e-mail TEST"}
          </Button>
          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Ouvrir le lien</a>
        </div>
        <div className="flex items-center gap-2">
          {resa ? (
            <>
              <Badge>Date choisie : {resa.date_choisie}</Badge>
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={cancel}>
                <Trash2 className="h-3.5 w-3.5" /> Supprimer la date
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Aucune date choisie pour l'instant.</span>
          )}
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => qc.invalidateQueries({ queryKey: ["reservations-pratique-planning"] })}>Actualiser</Button>
        </div>
      </CardContent>
    </Card>
  );
}
