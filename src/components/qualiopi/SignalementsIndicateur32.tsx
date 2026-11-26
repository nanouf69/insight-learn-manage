import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { etatResolution } from "@/lib/signalements/resolution";

const STATUTS: Record<string, string> = { recu: "Reçu", en_cours: "En cours", traite: "Traité" };
const NATURES: Record<string, string> = {
  creation: "Création", statut: "Changement de statut", analyse: "Analyse", reponse: "Réponse à l'apprenant",
  mesure: "Mesure d'amélioration", note_interne: "Note interne",
};
const ENVOI: Record<string, string> = { en_attente: "Mail en attente", envoye: "Mail envoyé", echec: "Mail en échec" };

type Ticket = { id: string; reference: string; type: string; apprenant_nom: string | null; apprenant_email: string | null; explication: string; captures: { chemin: string }[]; statut: string; envoi_statut: string; envoi_erreur: string | null; created_at: string };
type Suivi = { id: string; signalement_id: string; nature: string; contenu: string | null; statut_avant: string | null; statut_apres: string | null; visible_apprenant: boolean; auteur_nom: string | null; created_at: string };

type Envoi = { id: string; suivi_id: string; destinataire: string; sujet: string; copie_html: string; statut: string; erreur: string | null; envoye_le: string | null; demande_par_nom: string | null; created_at: string };
const ENVOI_REP: Record<string, string> = { en_cours: "Envoi en cours / résultat inconnu", envoye: "Mail envoyé", echec: "Mail en échec" };

async function envoyerReponse(suiviId: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("signalement-envoyer-reponse", { body: { suivi_id: suiviId } });
  if (error || !data?.ok) {
    let msg = (data as any)?.error;
    try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
    toast.error(msg ?? "Le mail de réponse n'est pas parti.");
    return false;
  }
  toast.success("Réponse envoyée par mail."); return true;
}

const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

/** Registre interne des tickets apprenants rattachés à l'indicateur 32 (admin uniquement, historique non modifiable). */
export function SignalementsIndicateur32() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [envois, setEnvois] = useState<Envoi[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(async () => {
    const sb = supabase as any;
    const { data, error } = await sb.from("signalements_apprenants").select("*").order("created_at", { ascending: false });
    if (error) { setErreur("Lecture du registre impossible."); return; }
    setErreur(null); setTickets(data ?? []);
    const { data: s, error: e2 } = await sb.from("signalements_suivi").select("*").order("created_at");
    if (e2) setErreur("Lecture de l'historique impossible."); else setSuivis(s ?? []);
    const { data: ev, error: e3 } = await sb.from("signalements_reponses_envois").select("*").order("created_at");
    if (e3) setErreur("Lecture des envois de réponses impossible."); else setEnvois(ev ?? []);
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const ouvrirCapture = async (chemin: string) => {
    const { data, error } = await supabase.storage.from("signalements-apprenants").createSignedUrl(chemin, 300);
    if (error || !data) return toast.error("Capture inaccessible.");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-6 text-sm space-y-1">
        <p>Tickets envoyés par les apprenants depuis « Signaler une remarque ou un bug », rattachés automatiquement à l'indicateur 32.</p>
        <p className="text-muted-foreground">Un ticket reçu n'est qu'un recueil : l'indicateur 32 exige l'analyse, les mesures d'amélioration décidées et leur suivi, consignés ici par le centre.</p>
      </CardContent></Card>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      {tickets.length === 0 && !erreur && <p className="text-sm text-muted-foreground">Aucun ticket.</p>}
      {tickets.map((t) => (
        <TicketCarte key={t.id} t={t} suivis={suivis.filter((s) => s.signalement_id === t.id)} envois={envois} onCapture={ouvrirCapture} onChange={charger} />
      ))}
    </div>
  );
}

function TicketCarte({ t, suivis, envois, onCapture, onChange }: { t: Ticket; suivis: Suivi[]; envois: Envoi[]; onCapture: (c: string) => void; onChange: () => void }) {
  const [nature, setNature] = useState("analyse");
  const [texte, setTexte] = useState("");
  const [statut, setStatut] = useState(t.statut);
  const [enCours, setEnCours] = useState(false);
  const enregistrer = async () => {
    const changeStatut = statut !== t.statut;
    if (!texte.trim() && !changeStatut) return toast.error("Écrivez un texte ou changez le statut.");
    setEnCours(true);
    const { data: suiviId, error } = await (supabase as any).rpc("signalement_ajouter_suivi", {
      _signalement_id: t.id, _nature: texte.trim() ? nature : "statut", _contenu: texte.trim() || null,
      _nouveau_statut: changeStatut ? statut : null, _visible_apprenant: nature === "reponse" || (!texte.trim() && changeStatut),
    });
    if (error) { setEnCours(false); return toast.error(`Non enregistré : ${error.message}`); }
    toast.success("Suivi enregistré dans l'historique."); setTexte("");
    if (texte.trim() && nature === "reponse" && suiviId) await envoyerReponse(suiviId);
    setEnCours(false); onChange();
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {t.reference}
          <Badge variant="secondary">{STATUTS[t.statut] ?? t.statut}</Badge>
          <Badge variant="outline">{t.type === "bug" ? "Bug informatique" : "Remarque"}</Badge>
          <Badge variant={t.envoi_statut === "echec" ? "destructive" : "outline"}>{ENVOI[t.envoi_statut] ?? t.envoi_statut}</Badge>
          <Badge variant={t.statut === "traite" ? "default" : "destructive"}>{etatResolution(t.statut)}</Badge>
          <Badge variant="outline">Qualiopi — indicateur 32</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Apprenant : {t.apprenant_nom ?? "?"} · Adresse e-mail : {t.apprenant_email ?? "non enregistrée"} · Reçu le {fmt(t.created_at)}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs font-semibold">Demande intégrale de l'apprenant :</p>
        <p className="whitespace-pre-wrap">{t.explication}</p>
        {t.envoi_erreur && <p className="text-xs text-destructive">Erreur d'envoi : {t.envoi_erreur}</p>}
        {t.captures?.length > 0 && (
          <div className="flex flex-wrap gap-2">{t.captures.map((c, i) => <Button key={i} size="sm" variant="outline" onClick={() => onCapture(c.chemin)}>Capture {i + 1}</Button>)}</div>
        )}
        <ol className="space-y-2">
          {suivis.map((s) => (
            <li key={s.id} className="border-l-2 border-primary pl-3">
              <p className="text-xs text-muted-foreground">
                {fmt(s.created_at)} · {s.auteur_nom ?? "?"} · {NATURES[s.nature] ?? s.nature}
                {s.statut_avant && s.statut_apres && s.statut_avant !== s.statut_apres ? ` · ${STATUTS[s.statut_avant]} → ${STATUTS[s.statut_apres]}` : ""}
                {s.nature === "reponse" ? ` · destinataire : ${t.apprenant_email ?? "?"}` : s.visible_apprenant ? " · visible par l'apprenant" : " · interne (jamais visible par l'apprenant)"}
              </p>
              {s.contenu && <p className="whitespace-pre-wrap">{s.contenu}</p>}
              {s.nature === "reponse" && <EnvoisReponse suivi={s} envois={envois.filter((e) => e.suivi_id === s.id)} onChange={onChange} />}
            </li>
          ))}
        </ol>
        <div className="space-y-2 rounded-lg border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={nature} onValueChange={setNature}>
              <SelectTrigger aria-label="Nature"><SelectValue /></SelectTrigger>
              <SelectContent>{["analyse", "mesure", "reponse", "note_interne"].map((n) => <SelectItem key={n} value={n}>{NATURES[n]}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger aria-label="Statut"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STATUTS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Textarea rows={3} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Analyse, suite donnée, mesure d'amélioration ou réponse à l'apprenant" />
          <p className="text-xs text-muted-foreground">Seule une « Réponse à l'apprenant » (et un simple changement de statut) est visible par l'apprenant. Rien n'est modifiable ni supprimable après enregistrement.</p>
          <Button size="sm" disabled={enCours} onClick={enregistrer}>{enCours ? "Enregistrement…" : "Enregistrer dans l'historique"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EnvoisReponse({ suivi, envois, onChange }: { suivi: Suivi; envois: Envoi[]; onChange: () => void }) {
  const [enCours, setEnCours] = useState(false);
  const dejaEnvoye = envois.some((e) => e.statut === "envoye");
  const bloque = envois.some((e) => e.statut === "en_cours");
  return (
    <div className="mt-1 space-y-1">
      {envois.length === 0 && <p className="text-xs text-destructive">Aucun envoi de mail enregistré pour cette réponse.</p>}
      {envois.map((e) => (
        <details key={e.id} className="text-xs">
          <summary className={e.statut === "echec" ? "text-destructive" : ""}>
            {ENVOI_REP[e.statut] ?? e.statut} · à {e.destinataire} · {fmt(e.envoye_le ?? e.created_at)} · par {e.demande_par_nom ?? "?"}{e.erreur ? ` · ${e.erreur}` : ""}
          </summary>
          <p className="font-medium">Sujet : {e.sujet}</p>
          <iframe title={`Copie ${e.id}`} sandbox="" srcDoc={e.copie_html} className="w-full h-48 rounded border bg-background" />
        </details>
      ))}
      {!dejaEnvoye && !bloque && (
        <Button size="sm" variant="outline" disabled={enCours} onClick={async () => { setEnCours(true); await envoyerReponse(suivi.id); setEnCours(false); onChange(); }}>
          {envois.length ? "Réessayer l'envoi du mail" : "Envoyer par mail"}
        </Button>
      )}
    </div>
  );
}
