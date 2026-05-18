import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Send, Loader2, Eye, Copy, CheckCircle2, Clock } from "lucide-react";

interface Contrat {
  id: string;
  titre: string;
  type: string;
  status: string;
  token: string;
  destinataire_email: string | null;
  destinataire_nom: string | null;
  representant_nom: string | null;
  sent_at: string | null;
  signed_at: string | null;
  signed_pdf_url: string | null;
  created_at: string;
}

export function ContratsFranchiseTab({
  fournisseurId,
  fournisseurEmail,
  fournisseurNom,
}: { fournisseurId: string; fournisseurEmail: string | null; fournisseurNom: string }) {
  const { toast } = useToast();
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState(fournisseurEmail || "");
  const [destNom, setDestNom] = useState(fournisseurNom);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contrats_fournisseurs")
      .select("*")
      .eq("fournisseur_id", fournisseurId)
      .order("created_at", { ascending: false });
    setContrats((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fournisseurId]);

  // Realtime: mise à jour automatique quand le contrat est signé
  useEffect(() => {
    const channel = supabase
      .channel(`contrats-${fournisseurId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contrats_fournisseurs", filter: `fournisseur_id=eq.${fournisseurId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fournisseurId]);

  const handleSend = async () => {
    if (!email) { toast({ title: "Email requis", variant: "destructive" }); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("envoyer-contrat-franchise", {
        body: { fournisseurId, destinataireEmail: email, destinataireNom: destNom, titre: "Contrat de Franchise FINALLY ACADEMY / FTRANSPORT" },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast({ title: "Contrat envoyé ✓", description: `Lien de signature envoyé à ${email}` });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/contrat-signature/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié" });
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Contrats envoyés pour signature électronique</p>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <FileSignature className="w-4 h-4" />Envoyer le contrat de franchise
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : contrats.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          Aucun contrat envoyé. Cliquez sur "Envoyer le contrat de franchise" pour démarrer.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {contrats.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileSignature className="w-4 h-4 text-primary" />
                      <p className="font-medium truncate">{c.titre}</p>
                      {c.status === "signe" ? (
                        <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 className="w-3 h-3" />Signé</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />En attente de signature</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Envoyé à {c.destinataire_email} {c.sent_at && `le ${new Date(c.sent_at).toLocaleString("fr-FR")}`}
                    </p>
                    {c.signed_at && (
                      <p className="text-xs text-green-700 mt-1">
                        ✓ Signé par <strong>{c.representant_nom}</strong> le {new Date(c.signed_at).toLocaleString("fr-FR")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {c.signed_pdf_url ? (
                      <a href={c.signed_pdf_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="gap-1"><Eye className="w-3 h-3" />Voir PDF signé</Button>
                      </a>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => copyLink(c.token)}>
                        <Copy className="w-3 h-3" />Copier le lien
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Envoyer le contrat de franchise</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Destinataire (nom)</Label>
              <Input value={destNom} onChange={(e) => setDestNom(e.target.value)} placeholder="Représentant de Finally Academy" />
            </div>
            <div>
              <Label>Email destinataire *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@finallyacademy.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              Un email contenant un lien sécurisé sera envoyé. Le destinataire pourra consulter le contrat,
              renseigner le nom du représentant et signer en ligne. Vous serez notifié à la signature.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Annuler</Button>
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
