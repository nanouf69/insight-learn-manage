import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coordonnees-public`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const call = async (body: Record<string, unknown>) => {
  const res = await fetch(FN_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: API_KEY, Authorization: `Bearer ${API_KEY}` }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Une erreur est survenue");
  return data;
};

const Champ = ({ id, label, v, set, type = "text" }: { id: string; label: string; v: string; set: (s: string) => void; type?: string }) => (
  <div className="space-y-1"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={v} onChange={(e) => set(e.target.value)} /></div>
);

export default function CoordonneesPublic() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [prenom, setPrenom] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [financeur, setFinanceur] = useState<"personnel" | "societe">("personnel");
  const [f, setF] = useState<Record<string, string>>({});
  const s = (k: string) => (v: string) => setF((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    document.title = "Mes coordonnées | FTRANSPORT";
    if (!token) { setInvalid(true); setLoading(false); return; }
    call({ action: "get", token }).then((d) => {
      setPrenom(d.prenom ?? null); setDone(!!d.deja_repondu);
      if (d.financeur_societe) { setFinanceur("societe"); if (d.raison_sociale) setF((o) => ({ ...o, raison_sociale: d.raison_sociale })); }
    }).catch(() => setInvalid(true)).finally(() => setLoading(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSubmitting(true);
    try { await call({ action: "submit", token, financeur, ...f }); setDone(true); }
    catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader><CardTitle>Compléter mes coordonnées</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : invalid ? (
            <p className="flex items-center gap-2 text-destructive"><AlertCircle className="w-5 h-5" /> Lien invalide ou expiré. Contactez contact@ftransport.fr.</p>
          ) : done ? (
            <p className="flex items-center gap-2 text-primary"><CheckCircle2 className="w-5 h-5" /> Merci{prenom ? ` ${prenom}` : ""}, vos coordonnées ont bien été enregistrées.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p>Bonjour{prenom ? ` ${prenom}` : ""}, merci de compléter les informations ci-dessous.</p>
              <div className="space-y-2">
                <Label>Qui paie votre formation ?</Label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={financeur === "personnel"} onChange={() => setFinanceur("personnel")} /> Moi-même</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={financeur === "societe"} onChange={() => setFinanceur("societe")} /> Une société (employeur, ma société…)</label>
              </div>
              <h3 className="font-semibold pt-2">Mes coordonnées personnelles</h3>
              <Champ id="adresse" label={`Adresse${financeur === "personnel" ? " *" : ""}`} v={f.adresse || ""} set={s("adresse")} />
              <Champ id="cp" label={`Code postal${financeur === "personnel" ? " *" : ""}`} v={f.code_postal || ""} set={s("code_postal")} />
              <Champ id="ville" label={`Ville${financeur === "personnel" ? " *" : ""}`} v={f.ville || ""} set={s("ville")} />
              <Champ id="tel" label="Téléphone" type="tel" v={f.telephone || ""} set={s("telephone")} />
              {financeur === "societe" && (<>
                <h3 className="font-semibold pt-2">Société qui finance</h3>
                <Champ id="rs" label="Nom de la société *" v={f.raison_sociale || ""} set={s("raison_sociale")} />
                <Champ id="siret" label="SIRET" v={f.siret || ""} set={s("siret")} />
                <Champ id="sadr" label="Adresse de la société *" v={f.soc_adresse || ""} set={s("soc_adresse")} />
                <Champ id="scp" label="Code postal *" v={f.soc_code_postal || ""} set={s("soc_code_postal")} />
                <Champ id="sville" label="Ville *" v={f.soc_ville || ""} set={s("soc_ville")} />
                <Champ id="stel" label="Téléphone de la société" type="tel" v={f.soc_telephone || ""} set={s("soc_telephone")} />
                <Champ id="smail" label="E-mail de la société" type="email" v={f.soc_email || ""} set={s("soc_email")} />
              </>)}
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Envoyer</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
