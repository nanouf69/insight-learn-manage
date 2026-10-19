import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type Slot = { date: string; creneau: string; signe: boolean; signed_at: string | null };
const LIBELLE: Record<string, string> = { soir_1: "17h00 – 18h30", soir_2: "18h30 – 21h00", matin: "Matin", apres_midi: "Après-midi" };
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

async function appel(body: Record<string, unknown>) {
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) throw new Error("Session expirée : reconnectez-vous.");
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-emargement-apprenant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
  return data;
}

function Creneau({ slot, onSign }: { slot: Slot; onSign: (s: Slot, sig: string) => Promise<void> }) {
  const [confirme, setConfirme] = useState(false);
  const [sig, setSig] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (slot.signe) {
    return (
      <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span className="font-medium capitalize">{fmtDate(slot.date)} · {LIBELLE[slot.creneau]}</span>
        <span className="text-muted-foreground">— signé{slot.signed_at ? ` (régularisation effectuée le ${new Date(slot.signed_at).toLocaleString("fr-FR")})` : ""}</span>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="font-medium capitalize">{fmtDate(slot.date)} · {LIBELLE[slot.creneau]}</p>
      <p className="text-sm text-destructive">Signez uniquement si vous étiais réellement présent à ce créneau. Sinon, laissez-le non signé.</p>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={confirme} onCheckedChange={(v) => setConfirme(v === true)} />
        <span>Je confirme avoir été présent à ce créneau</span>
      </label>
      {confirme && <SignaturePad value={sig} onChange={setSig} />}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button
        className="w-full"
        disabled={!confirme || !sig || busy}
        onClick={async () => {
          setBusy(true); setErr(null);
          try { await onSign(slot, sig); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Signer ce créneau"}
      </Button>
    </div>
  );
}

export default function EmargementsRegularisation() {
  const { id } = useParams();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [data, setData] = useState<{ apprenant_id: string; eleve: string | null; session: string | null; creneaux: Slot[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try { setData(await appel({ regularisation_id: id, action: "liste" })); setErr(null); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [id]);
  useEffect(() => { if (user) charger(); }, [user, charger]);

  if (!loading && !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const signer = async (slot: Slot, sig: string) => {
    if (!data) return;
    await appel({
      regularisation_id: id, apprenant_id: data.apprenant_id, date_emargement: slot.date, demi_journee: slot.creneau,
      confirme_presence_creneau: true, signature_data_url: sig, user_agent: navigator.userAgent,
    });
    await charger(); // affichage uniquement après relecture serveur
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Mes émargements à compléter</h1>
      {err && <Card><CardContent className="flex gap-2 p-4 text-destructive"><AlertTriangle className="h-5 w-5" />{err}</CardContent></Card>}
      {!data && !err && <Loader2 className="h-6 w-6 animate-spin" />}
      {data && (
        <>
          <Card><CardContent className="space-y-2 p-4 text-sm">
            <p><strong>{data.eleve}</strong> — {data.session}</p>
            <p className="font-semibold text-destructive">IMPORTANT : signez uniquement les créneaux auxquels vous avez réellement assisté. Ne signez aucun créneau où vous étiez absent ou dont vous ne pouvez pas confirmer votre présence. En cas de doute, contactez-nous avant de signer.</p>
            <p className="text-muted-foreground">La date du cours et la date réelle de votre signature sont conservées séparément.</p>
            <p>{data.creneaux.filter((s) => s.signe).length} / {data.creneaux.length} créneaux signés</p>
          </CardContent></Card>
          {data.creneaux.map((s) => <Creneau key={`${s.date}|${s.creneau}`} slot={s} onSign={signer} />)}
        </>
      )}
    </div>
  );
}
