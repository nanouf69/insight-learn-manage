import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Q {
  id: string;
  apprenant_id: string;
  apprenant_nom: string | null;
  question: string;
  reponse: string | null;
  status: string;
  created_at: string;
  answered_at: string | null;
}

export const ApprenantQuestionsPanel = () => {
  const [items, setItems] = useState<Q[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("apprenant_questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data || []) as any);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-questions")
      .on("postgres_changes", { event: "*", schema: "public", table: "apprenant_questions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const reply = async (q: Q) => {
    const txt = (drafts[q.id] || "").trim();
    if (!txt) return;
    setSending(q.id);
    const { error } = await supabase
      .from("apprenant_questions")
      .update({ reponse: txt, answered_at: new Date().toISOString(), status: "answered", read_by_apprenant: false })
      .eq("id", q.id);
    setSending(null);
    if (error) {
      toast.error("Erreur lors de l'envoi");
      return;
    }
    setDrafts((d) => ({ ...d, [q.id]: "" }));
    toast.success("Réponse envoyée");
  };

  const close = async (q: Q) => {
    await supabase.from("apprenant_questions").update({ status: "closed" }).eq("id", q.id);
  };

  const visible = items.filter((q) => (showResolved ? true : q.status !== "closed"));
  const openCount = items.filter((q) => q.status === "open").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Questions des apprenants
          {openCount > 0 && <Badge variant="destructive">{openCount}</Badge>}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setShowResolved((v) => !v)}>
          {showResolved ? "Masquer clôturées" : "Tout afficher"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune question</p>
        )}
        {visible.map((q) => (
          <div key={q.id} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm">
                <span className="font-semibold">{q.apprenant_nom || "Apprenant"}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {format(new Date(q.created_at), "d MMM HH:mm", { locale: fr })}
                </span>
              </div>
              <Badge variant={q.status === "open" ? "destructive" : q.status === "answered" ? "default" : "secondary"}>
                {q.status === "open" ? "Nouvelle" : q.status === "answered" ? "Répondue" : "Clôturée"}
              </Badge>
            </div>
            <p className="text-sm bg-muted rounded p-2">{q.question}</p>
            {q.reponse && (
              <div className="text-sm bg-primary/10 border border-primary/20 rounded p-2">
                <div className="text-xs text-primary font-semibold mb-1">
                  Réponse {q.answered_at ? `• ${format(new Date(q.answered_at), "d MMM HH:mm", { locale: fr })}` : ""}
                </div>
                {q.reponse}
              </div>
            )}
            {q.status !== "closed" && (
              <div className="space-y-2">
                <Textarea
                  value={drafts[q.id] || ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                  placeholder={q.reponse ? "Ajouter un complément…" : "Votre réponse…"}
                  className="min-h-[60px] resize-none text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => reply(q)} disabled={sending === q.id || !(drafts[q.id] || "").trim()} className="gap-2">
                    {sending === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Répondre
                  </Button>
                  {q.reponse && (
                    <Button size="sm" variant="outline" onClick={() => close(q)} className="gap-2">
                      <Check className="h-3 w-3" />
                      Clôturer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
