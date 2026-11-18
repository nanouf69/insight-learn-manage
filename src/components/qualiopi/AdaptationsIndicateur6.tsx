import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LockKeyhole, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { adaptationVide, CHAMPS_ADAPTATION, verifierAdaptation } from "./indicateur6";
import type { Tables } from "@/integrations/supabase/types";

export function AdaptationsIndicateur6() {
  const [rows, setRows] = useState<Tables<"qualiopi_adaptations">[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(adaptationVide);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  async function load() {
    setLoading(true); setError("");
    try {
      const all: Tables<"qualiopi_adaptations">[] = [];
      for (let offset = 0; ; offset += 500) {
        const result = await supabase.from("qualiopi_adaptations").select("*").order("created_at", { ascending: false }).range(offset, offset + 499);
        if (result.error) throw result.error;
        all.push(...result.data);
        if (result.data.length < 500) break;
      }
      setRows(all);
    } catch { setError("Lecture des fiches confidentielles impossible."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    setSaving(true);
    try {
      verifierAdaptation(form, new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date()));
      const existing = await supabase.from("qualiopi_adaptations").select("*").eq("id", operationId).maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) {
        const result = await supabase.from("qualiopi_adaptations").insert({ id: operationId, ...form });
        if (result.error) throw result.error;
      }
      const read = await supabase.from("qualiopi_adaptations").select("*").eq("id", operationId).single();
      if (read.error) throw read.error;
      if (CHAMPS_ADAPTATION.some(([k]) => read.data[k] !== form[k])) throw new Error("La fiche enregistrée diffère de la saisie ; elle reste conservée.");
      toast.success("Fiche confidentielle enregistrée et relue");
      setOpen(false); setForm(adaptationVide()); setOperationId(crypto.randomUUID()); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Enregistrement non confirmé ; votre saisie est conservée."); }
    finally { setSaving(false); }
  }
  return <section className="space-y-4 border-t pt-4">
    <h3 className="font-semibold flex items-center gap-2"><LockKeyhole className="h-4 w-4" /> Traçabilité confidentielle</h3>
    <p className="text-sm text-muted-foreground">Administrateurs uniquement. Fiche à remplir seulement pour une adaptation réellement appliquée, sans diagnostic médical ni preuve rétroactive fabriquée. Les fiches enregistrées sont conservées en lecture seule, hors exports généraux.</p>
    {loading ? <p>Chargement…</p> : error ? <div><p role="alert">{error}</p><Button variant="outline" onClick={load}>Réessayer</Button></div> : <>
      <p className="text-sm">{rows.length === 0 ? "Aucune adaptation enregistrée." : `${rows.length} fiche(s) enregistrée(s).`}</p>
      {rows.map((r) => <details key={r.id} className="border rounded-md p-3"><summary className="cursor-pointer">{r.stagiaire_reference} — {r.session_reference} — {r.date_mise_en_place}</summary><dl className="space-y-2 mt-3">{CHAMPS_ADAPTATION.map(([k, label]) => <div key={k}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{r[k]}</dd></div>)}<div><dt className="text-xs text-muted-foreground">Enregistrée le</dt><dd>{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</dd></div></dl></details>)}
      {!open && <Button variant="outline" onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Tracer une adaptation réelle</Button>}
    </>}
    {open && <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-4">
      {CHAMPS_ADAPTATION.map(([key, label]) => <div key={key} className="space-y-1"><Label htmlFor={`adapt-${key}`}>{label}</Label>{key.startsWith("date_") ? <Input id={`adapt-${key}`} type="date" required value={form[key]} disabled={saving} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /> : <Textarea id={`adapt-${key}`} required value={form[key]} disabled={saving} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}</div>)}
      <div className="flex gap-2 items-start"><Checkbox id="adapt-confirm" checked={form.mise_en_oeuvre_confirmee} disabled={saving} onCheckedChange={(v) => setForm({ ...form, mise_en_oeuvre_confirmee: v === true })} /><Label htmlFor="adapt-confirm">Je confirme que cette adaptation a réellement été mise en œuvre et que les éléments saisis sont vérifiables.</Label></div>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving || !form.mise_en_oeuvre_confirmee} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer la fiche confidentielle"}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Fermer sans enregistrer</Button></div>
    </form>}
  </section>;
}