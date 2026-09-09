import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type MdpMail = { to: string; subject: string; body: string };

/**
 * Aperçu du mail URGENT « Inscription examen T3P » avant envoi.
 * Le statut « MDP changé » n'est enregistré (via onSent) qu'après un envoi réussi.
 */
export function useMdpChangeMail(onSent: (apprenantId: string, to: string) => Promise<void> | void) {
  const [open, setOpen] = useState(false);
  const [mail, setMail] = useState<MdpMail | null>(null);
  const [apprenantId, setApprenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const prepare = async (id: string) => {
    if (!id) { toast.error("Apprenant introuvable"); return; }
    setLoading(true);
    try {
      const [{ data: a, error: aErr }, { data: tpl, error: tErr }] = await Promise.all([
        supabase.from('apprenants').select('id, prenom, nom, email, type_apprenant, date_debut_formation').eq('id', id).single(),
        supabase.from('email_templates').select('*').eq('id', 'urgent_inscription_exament3p').single(),
      ]);
      if (aErr) throw aErr;
      if (tErr) throw tErr;
      if (!a?.email) { toast.error("L'apprenant n'a pas d'adresse email — renseignez-la d'abord"); return; }

      let { data: ident } = await supabase
        .from('apprenant_identifiants_t3p')
        .select('token')
        .eq('apprenant_id', id)
        .maybeSingle();
      if (!ident) {
        const { data: created, error: cErr } = await supabase
          .from('apprenant_identifiants_t3p')
          .insert({ apprenant_id: id })
          .select('token')
          .single();
        if (cErr) throw cErr;
        ident = created;
      }

      const url = `https://gestion.ftransport.fr/identifiants-t3p?token=${ident!.token}`;
      const bouton = `<div style="margin:18px 0"><a href="${url}" style="display:inline-block;background:#dc2626;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 22px;border-radius:8px;text-decoration:none">🔐 Transmettre mes nouveaux identifiants</a><br><span style="font-size:12px;color:#555">Lien personnel et sécurisé : ne le transmettez à personne.</span></div>`;
      const fill = (s: string) => (s || '')
        .replace(/\{\{prenom\}\}/g, a.prenom || '')
        .replace(/\{\{nom\}\}/g, a.nom || '')
        .replace(/\{\{email\}\}/g, a.email || '')
        .replace(/\{\{apprenant_id\}\}/g, a.id || '')
        .replace(/\{\{formation\}\}/g, (a as any).type_apprenant || '')
        .replace(/\{\{date_debut\}\}/g, (a as any).date_debut_formation || '[à compléter]')
        .replace(/\{\{lien_identifiants_t3p\}\}/g, url)
        .replace(/\{\{bouton_identifiants_t3p\}\}/g, bouton);

      setApprenantId(id);
      setMail({ to: a.email, subject: fill(tpl.subject_template || ''), body: fill(tpl.body_template || '') });
      setOpen(true);
    } catch (e: any) {
      toast.error("Erreur préparation du mail : " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!mail || !apprenantId) return;
    setSending(true);
    const { error } = await supabase.functions.invoke('sync-outlook-emails', {
      body: {
        action: 'send',
        apprenantId,
        userEmail: 'contact@ftransport.fr',
        to: mail.to,
        subject: mail.subject,
        body: mail.body,
        attachments: [],
      },
    });
    setSending(false);
    if (error) { toast.error("Erreur d'envoi : " + error.message); return; }
    const to = mail.to;
    const id = apprenantId;
    setOpen(false);
    setMail(null);
    setApprenantId(null);
    await onSent(id, to);
  };

  const dialog = (
    <Dialog open={open} onOpenChange={(o) => { if (!sending) { setOpen(o); if (!o) { setMail(null); setApprenantId(null); } } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>📧 Aperçu du mail URGENT avant envoi</DialogTitle>
        </DialogHeader>
        {mail && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="text-sm"><span className="font-semibold">À :</span> {mail.to}</div>
            <div className="text-sm"><span className="font-semibold">Objet :</span> {mail.subject}</div>
            <div
              className="border rounded-md p-4 bg-white text-sm [&_a]:text-blue-600"
              dangerouslySetInnerHTML={{ __html: mail.body }}
            />
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={sending} onClick={() => { setOpen(false); setMail(null); setApprenantId(null); }}>
            Annuler
          </Button>
          <Button disabled={sending || !mail} onClick={send}>
            {sending ? "Envoi en cours…" : "📨 Envoyer le mail"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { prepare, loading, dialog };
}
