import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Send, Loader2, Eye, Copy, CheckCircle2, Clock, FileText } from "lucide-react";
import { generateContratFranchisePdf } from "@/lib/pdf/contrat-franchise";

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
  sent_pdf_url: string | null;
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
  const [pdfOnly, setPdfOnly] = useState(false);

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
      // 1. Génère le PDF du contrat envoyé (version blanche, à compléter)
      const blob = generateContratFranchisePdf({
        representantNom: "[À COMPLÉTER PAR LE FRANCHISEUR]",
        lieu: "London",
        date: new Date().toLocaleDateString("fr-FR"),
        signatureDataUrl: "",
        initiales: "—",
      });

      // 2. Upload dans le bucket public pour garder une trace
      const fileName = `contrats-envoyes/${fournisseurId}/${Date.now()}-contrat-franchise.pdf`;
      const { error: upErr } = await supabase.storage
        .from("fournisseur-shared-docs")
        .upload(fileName, blob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("fournisseur-shared-docs").getPublicUrl(fileName);
      const sentPdfUrl = pub.publicUrl;

      // 3. Crée le contrat + envoie l'email (avec lien vers le PDF envoyé)
      const { data, error } = await supabase.functions.invoke("envoyer-contrat-franchise", {
        body: { fournisseurId, destinataireEmail: email, destinataireNom: destNom, titre: "Contrat de Franchise FINALLY ACADEMY / FTRANSPORT", sentPdfUrl, pdfOnly },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast({ title: "Contrat envoyé ✓", description: pdfOnly ? `PDF envoyé à ${email} en pièce jointe` : `Lien de signature envoyé à ${email} — PDF archivé` });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyLink = (token: string) => {
    // Toujours utiliser le domaine public, jamais le preview Lovable.
    const url = `https://gestion.ftransport.fr/contrat-signature/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié" });
  };

  const previewContract = () => {
    const blob = generateContratFranchisePdf({
      representantNom: "[À COMPLÉTER PAR LE FRANCHISEUR]",
      lieu: "London",
      date: new Date().toLocaleDateString("fr-FR"),
      signatureDataUrl: "",
      initiales: "—",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Apercu-Contrat-Franchise-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast({ title: "Aperçu téléchargé", description: "Ouvrez le PDF pour visualiser le contrat." });
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Contrats envoyés pour signature électronique</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={previewContract} className="gap-2">
            <FileText className="w-4 h-4" />Aperçu du contrat
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <FileSignature className="w-4 h-4" />Envoyer le contrat de franchise
          </Button>
        </div>
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
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {c.sent_pdf_url && (
                      <a href={c.sent_pdf_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="gap-1"><FileText className="w-3 h-3" />PDF envoyé</Button>
                      </a>
                    )}
                    {c.signed_pdf_url ? (
                      <a href={c.signed_pdf_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="gap-1"><Eye className="w-3 h-3" />PDF signé</Button>
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

            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">À remplir par le franchiseur</p>
                <Button type="button" size="sm" variant="ghost" onClick={previewContract} className="h-7 gap-1 text-xs">
                  <FileText className="w-3 h-3" />Aperçu PDF
                </Button>
              </div>
              <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
                <li>Nom complet du représentant légal de Finally Academy</li>
                <li>Initiales (paraphe apposé sur chaque page)</li>
                <li>Lieu de signature (défaut : London)</li>
                <li>Signature manuscrite (souris ou doigt)</li>
                <li>Validation de la case « Lu et approuvé — Bon pour accord »</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Un email contenant un lien sécurisé sera envoyé. Le destinataire pourra consulter le contrat,
              renseigner les champs ci-dessus et signer en ligne. Vous serez notifié à la signature et retrouverez le PDF signé ici.
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
