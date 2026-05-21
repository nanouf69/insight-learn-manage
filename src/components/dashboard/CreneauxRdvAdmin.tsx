import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Loader2, RefreshCw } from "lucide-react";

const SLOTS = [
  "11:00","11:15","11:30","11:45",
  "12:00","12:15","12:30","12:45",
  "13:00","13:15","13:30","13:45",
];

interface Creneau {
  slot: string;
  nom: string;
  telephone: string;
  apprenant_id: string;
  created_at: string;
}

export function CreneauxRdvAdmin() {
  const [rows, setRows] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("creneaux_rdv")
      .select("slot, nom, telephone, apprenant_id, created_at")
      .order("slot");
    if (!error && data) setRows(data as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin:creneaux_rdv")
      .on("postgres_changes", { event: "*", schema: "public", table: "creneaux_rdv" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sendInvites = async () => {
    if (!confirm("Envoyer les invitations par email à tous les apprenants ayant un examen le 26 mai ?")) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-booking-invitations", {
        body: { baseUrl: window.location.origin },
      });
      if (error) throw error;
      toast.success(`${data?.sent ?? 0} email(s) envoyé(s) sur ${data?.total ?? 0} apprenant(s) ciblé(s).`);
    } catch (e: any) {
      toast.error("Erreur : " + (e?.message ?? String(e)));
    } finally {
      setSending(false);
    }
  };

  const bookedMap = new Map(rows.map((r) => [r.slot, r]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Créneaux — Lundi 25 mai</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Q/R avant l'examen du 26 mai — temps réel
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
          <Button onClick={sendInvites} disabled={sending} className="bg-[#F4A227] hover:bg-[#d8901c] text-white">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Envoyer les invitations
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SLOTS.map((s) => {
            const r = bookedMap.get(s);
            return (
              <div
                key={s}
                className="border-2 rounded-lg p-4"
                style={{
                  borderColor: r ? "#639922" : "#e5e7eb",
                  background: r ? "#EAF3DE" : "#ffffff",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold" style={{ color: "#0D2540" }}>{s}</div>
                  {r ? (
                    <Badge style={{ background: "#639922", color: "#fff" }}>Réservé</Badge>
                  ) : (
                    <Badge variant="outline">Disponible</Badge>
                  )}
                </div>
                {r ? (
                  <div className="text-sm">
                    <div className="font-medium">{r.nom}</div>
                    <div className="text-muted-foreground">{r.telephone}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">Aucune réservation</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          {rows.length} / {SLOTS.length} créneaux réservés
        </div>
      </CardContent>
    </Card>
  );
}
