import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Question {
  id: string;
  question: string;
  reponse: string | null;
  status: string;
  created_at: string;
  answered_at: string | null;
}

interface Props {
  apprenantId: string;
  apprenantNom?: string;
}

export const ApprenantChatWidget = ({ apprenantId, apprenantNom }: Props) => {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("apprenant_questions")
      .select("id, question, reponse, status, created_at, answered_at, read_by_apprenant")
      .eq("apprenant_id", apprenantId)
      .order("created_at", { ascending: true });
    setQuestions((data || []) as any);
    setUnread((data || []).filter((q: any) => q.reponse && !q.read_by_apprenant).length);
  };

  useEffect(() => {
    if (!apprenantId) return;
    load();
    const ch = supabase
      .channel(`questions-${apprenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "apprenant_questions", filter: `apprenant_id=eq.${apprenantId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [apprenantId]);

  useEffect(() => {
    if (open && unread > 0) {
      supabase
        .from("apprenant_questions")
        .update({ read_by_apprenant: true })
        .eq("apprenant_id", apprenantId)
        .eq("read_by_apprenant", false)
        .then(() => setUnread(0));
    }
  }, [open, unread, apprenantId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("apprenant_questions").insert({
      apprenant_id: apprenantId,
      apprenant_nom: apprenantNom || null,
      question: text.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Erreur lors de l'envoi");
      return;
    }
    setText("");
    toast.success("Question envoyée au centre");
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Poser une question"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-semibold">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-lg shadow-xl flex flex-col">
          <div className="p-4 border-b border-border bg-primary text-primary-foreground rounded-t-lg">
            <h3 className="font-semibold">Poser une question au centre</h3>
            <p className="text-xs opacity-90">Nous vous répondrons dès que possible</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune question pour l'instant. Posez votre première question ci-dessous.
              </p>
            )}
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">
                    Vous • {format(new Date(q.created_at), "d MMM HH:mm", { locale: fr })}
                  </div>
                  {q.question}
                </div>
                {q.reponse ? (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm ml-4">
                    <div className="text-xs text-primary font-semibold mb-1">
                      Centre • {q.answered_at ? format(new Date(q.answered_at), "d MMM HH:mm", { locale: fr }) : ""}
                    </div>
                    {q.reponse}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground ml-4 italic">En attente de réponse…</div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Votre question…"
              className="min-h-[60px] resize-none"
            />
            <Button onClick={send} disabled={sending || !text.trim()} className="w-full gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
