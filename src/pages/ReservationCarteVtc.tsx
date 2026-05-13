import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Slot { id: string; date: string; heure: string; }

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
const addMin = (h: string, n: number) => {
  const [hh, mm] = h.split(":").map(Number);
  const t = hh * 60 + mm + n;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export default function ReservationCarteVtc() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Slot | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rdv-carte-vtc-public?action=list`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const json = await res.json();
      setSlots(json.slots || []);
    } catch (e) {
      toast.error("Impossible de charger les créneaux");
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const m: Record<string, Slot[]> = {};
    slots.forEach(s => { (m[s.date] ||= []).push(s); });
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b));
  }, [slots]);

  const submit = async () => {
    if (!selected) return;
    if (!form.nom || !form.prenom || !form.telephone) {
      toast.error("Nom, prénom et téléphone requis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rdv-carte-vtc-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ slotId: selected.id, ...form }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Erreur"); setSaving(false); return; }
      setDone(selected);
    } catch (e) {
      toast.error("Erreur réseau");
    }
    setSaving(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold">Rendez-vous confirmé !</h1>
            <p className="text-muted-foreground">
              Votre RDV pour la création de votre carte professionnelle VTC est fixé au :
            </p>
            <p className="text-lg font-semibold">
              {fmtDate(done.date)} à {done.heure.slice(0,5)}
            </p>
            <div className="bg-muted p-4 rounded-lg text-sm text-left space-y-1">
              <p className="font-semibold">📍 FTRANSPORT — 86 Route de Genas, 69003 Lyon</p>
              <p>📞 04 28 29 60 91</p>
              <p className="mt-2 font-semibold">À apporter :</p>
              <ul className="list-disc list-inside">
                <li>Justificatif de domicile (- 3 mois)</li>
                <li>Attestation de réussite CMA</li>
                <li>Certificat médical (médecin agréé)</li>
                <li>30 € (espèces ou CB)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Réservation RDV — Carte professionnelle VTC</h1>
          <p className="text-muted-foreground mt-2">Choisissez un créneau pour la création de votre carte (durée 30 min — 30 €)</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : grouped.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            Aucun créneau disponible pour le moment. Merci de nous contacter au 04 28 29 60 91.
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5"/>Créneaux disponibles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {grouped.map(([date, list]) => (
                <div key={date}>
                  <p className="font-semibold capitalize mb-2">{fmtDate(date)}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map(s => (
                      <Button key={s.id} variant={selected?.id === s.id ? "default" : "outline"} size="sm"
                        onClick={() => setSelected(s)} className="gap-1">
                        <Clock className="h-3 w-3" />{s.heure.slice(0,5)} – {addMin(s.heure.slice(0,5), 30)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {selected && (
          <Card>
            <CardHeader><CardTitle>Vos coordonnées</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm bg-muted p-3 rounded">
                Créneau choisi : <strong>{fmtDate(selected.date)} à {selected.heure.slice(0,5)}</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nom *</Label><Input value={form.nom} onChange={e=>setForm({...form, nom:e.target.value})}/></div>
                <div><Label>Prénom *</Label><Input value={form.prenom} onChange={e=>setForm({...form, prenom:e.target.value})}/></div>
                <div><Label>Téléphone *</Label><Input value={form.telephone} onChange={e=>setForm({...form, telephone:e.target.value})}/></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/></div>
              </div>
              <div><Label>Notes (facultatif)</Label><Textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} rows={2}/></div>
              <Button onClick={submit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                Confirmer mon RDV
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
