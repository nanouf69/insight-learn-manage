import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { etatResolution } from "@/lib/signalements/resolution";

export const MAX_IMAGE_OCTETS = 20 * 1024 * 1024;

/** Contrôle client (le serveur revérifie) : type image valide et ≤ 20 Mo. */
export function erreurImage(f: { name: string; type: string; size: number }): string | null {
  const ext = f.name.toLowerCase().split(".").pop() ?? "";
  const estImage = f.type.startsWith("image/") || ["heic", "heif"].includes(ext);
  if (!estImage) return `« ${f.name} » n'est pas une image.`;
  if (f.size > MAX_IMAGE_OCTETS) return `« ${f.name} » dépasse 20 Mo.`;
  return null;
}

export default function SignalementForm() {
  const [type, setType] = useState<"bug" | "remarque" | "">("");
  const [explication, setExplication] = useState("");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [rafraichir, setRafraichir] = useState(0);

  const ajouter = (liste: FileList | null) => {
    setErreur(null);
    const nouveaux = Array.from(liste ?? []);
    const err = nouveaux.map(erreurImage).find(Boolean);
    if (err) { setErreur(err); return; }
    setFichiers((p) => [...p, ...nouveaux].slice(0, 10));
  };

  const envoyer = async () => {
    setErreur(null); setSucces(null);
    if (!type) return setErreur("Choisissez « Bug informatique » ou « Remarque ».");
    if (!explication.trim()) return setErreur("L'explication est obligatoire.");
    if (type === "bug" && fichiers.length === 0) return setErreur("Ajoutez au moins une capture d'écran pour un bug.");
    setEnvoi(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée : reconnectez-vous.");
      const chemins: string[] = [];
      for (const f of fichiers) {
        const nomSur = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
        const chemin = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${nomSur}`;
        const ext = nomSur.toLowerCase().split(".").pop();
        const contentType = f.type || (ext === "heif" ? "image/heif" : "image/heic");
        const { error } = await supabase.storage.from("signalements-apprenants").upload(chemin, f, { contentType, upsert: false });
        if (error) throw new Error(`Capture « ${f.name} » non envoyée : ${error.message}`);
        chemins.push(chemin);
      }
      const { data, error } = await supabase.functions.invoke("signaler-remarque-bug", { body: { type, explication: explication.trim(), chemins } });
      if (error || !data?.ok) {
        let corps: any = data;
        try { corps = corps ?? (await (error as any)?.context?.json()); } catch { /* ignore */ }
        if (corps?.reference) { setType(""); setExplication(""); setFichiers([]); setRafraichir((n) => n + 1); }
        throw new Error(corps?.error ?? "L'envoi a échoué. Votre signalement n'a pas été transmis.");
      }
      setSucces(`Merci, votre signalement a bien été transmis au centre. Référence de votre ticket : ${data.reference}.`);
      setType(""); setExplication(""); setFichiers([]); setRafraichir((n) => n + 1);
    } catch (e: any) {
      setErreur(e?.message ?? "L'envoi a échoué. Votre signalement n'a pas été transmis.");
    } finally { setEnvoi(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
    <div className="space-y-5 rounded-xl border bg-card p-5">
      <h2 className="text-xl font-bold">Signaler une remarque ou un bug</h2>
      <fieldset className="space-y-2">
        <legend className="font-medium">Type de signalement *</legend>
        {([["bug", "Bug informatique"], ["remarque", "Remarque"]] as const).map(([v, l]) => (
          <label key={v} className="flex items-center gap-2 min-h-11 cursor-pointer">
            <input type="radio" name="type-signalement" checked={type === v} onChange={() => setType(v)} />
            {l}
          </label>
        ))}
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="sig-expl">Explication *</Label>
        <Textarea id="sig-expl" rows={6} maxLength={5000} value={explication} onChange={(e) => setExplication(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sig-img">Captures d'écran {type === "bug" ? "* (au moins une)" : "(facultatif)"} — images, 20 Mo maximum chacune</Label>
        <input id="sig-img" type="file" accept="image/*,.heic,.heif" multiple onChange={(e) => { ajouter(e.target.files); e.target.value = ""; }} className="block w-full text-sm" />
        {fichiers.length > 0 && (
          <ul className="text-sm space-y-1">
            {fichiers.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="truncate">{f.name} ({(f.size / 1024 / 1024).toFixed(1)} Mo)</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setFichiers((p) => p.filter((_, j) => j !== i))}>Retirer</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      {succes && <p role="status" className="text-sm text-primary font-medium">{succes}</p>}
      <Button className="w-full min-h-11" disabled={envoi} onClick={envoyer}>{envoi ? "Envoi en cours…" : "Envoyer"}</Button>
    </div>
    <MesTickets cle={rafraichir} />
    </div>
  );
}

export const STATUT_TICKET: Record<string, string> = { recu: "Reçu", en_cours: "En cours", traite: "Traité" };

type Ticket = { id: string; reference: string; type: string; explication: string; statut: string; created_at: string; apprenant_email: string | null };
type Envoi = { id: string; signalement_id: string; copie_texte: string; envoye_le: string | null; destinataire: string };
type Suivi = { id: string; signalement_id: string; nature: string; contenu: string | null; statut_apres: string | null; created_at: string };

/** Lecture seule : l'apprenant voit uniquement ses tickets et les réponses qui lui sont destinées (RLS). */
function MesTickets({ cle }: { cle: number }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [envois, setEnvois] = useState<Envoi[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await (supabase as any).from("signalements_apprenants")
      .select("id, reference, type, explication, statut, created_at, apprenant_email").eq("auth_user_id", user.id).order("created_at", { ascending: false });
    if (error) { setErreur("Vos tickets n'ont pas pu être chargés."); return; }
    setTickets(data ?? []);
    const ids = (data ?? []).map((t: Ticket) => t.id);
    if (ids.length) {
      const { data: s } = await (supabase as any).from("signalements_suivi")
        .select("id, signalement_id, nature, contenu, statut_apres, created_at").in("signalement_id", ids).order("created_at");
      setSuivis(s ?? []);
      const { data: e } = await (supabase as any).from("signalements_reponses_envois")
        .select("id, signalement_id, copie_texte, envoye_le, destinataire").in("signalement_id", ids).eq("statut", "envoye").order("envoye_le");
      setEnvois(e ?? []);
    }
  }, []);
  useEffect(() => { void charger(); }, [charger, cle]);
  const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  return (
    <section className="space-y-3 rounded-xl border bg-card p-5" aria-label="Mes signalements">
      <h3 className="text-lg font-bold">Mes signalements</h3>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      {tickets && tickets.length === 0 && <p className="text-sm text-muted-foreground">Aucun signalement envoyé.</p>}
      {tickets?.map((t) => (
        <article key={t.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">{t.reference}</span>
            <span className="flex gap-1">
              <span className="text-xs rounded-full bg-muted px-2 py-1">{STATUT_TICKET[t.statut] ?? t.statut}</span>
              <span className={`text-xs rounded-full px-2 py-1 font-semibold ${t.statut === "traite" ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive"}`}>{etatResolution(t.statut)}</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{t.type === "bug" ? "Bug informatique" : "Remarque"} · {fmt(t.created_at)}</p>
          {t.apprenant_email && <p className="text-xs text-muted-foreground">Adresse e-mail associée : {t.apprenant_email}</p>}
          <p className="text-sm whitespace-pre-wrap">{t.explication}</p>
          {envois.filter((e) => e.signalement_id === t.id).map((e) => (
            <div key={e.id} className="rounded-md bg-muted p-2 text-sm">
              <p className="text-xs text-muted-foreground">Réponse du centre envoyée le {e.envoye_le ? fmt(e.envoye_le) : "?"} à {e.destinataire}</p>
              <p className="whitespace-pre-wrap">{e.copie_texte}</p>
            </div>
          ))}
          {suivis.filter((s) => s.signalement_id === t.id && s.nature === "statut").map((s) => (
            <div key={s.id} className="border-l-2 border-primary pl-3 text-sm">
              <p className="text-xs text-muted-foreground">{fmt(s.created_at)}{s.statut_apres ? ` · ${STATUT_TICKET[s.statut_apres] ?? s.statut_apres}` : ""}</p>
              {s.contenu && <p className="whitespace-pre-wrap">{s.contenu}</p>}
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
