import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
        let msg = (data as any)?.error;
        try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
        throw new Error(msg ?? "L'envoi a échoué. Votre signalement n'a pas été transmis.");
      }
      setSucces("Merci, votre signalement a bien été envoyé au centre.");
      setType(""); setExplication(""); setFichiers([]);
    } catch (e: any) {
      setErreur(e?.message ?? "L'envoi a échoué. Votre signalement n'a pas été transmis.");
    } finally { setEnvoi(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 rounded-xl border bg-card p-5">
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
  );
}
