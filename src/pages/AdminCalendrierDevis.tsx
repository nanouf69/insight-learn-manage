import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calendrierSession, estSessionSoir, heuresPlages, joursOuvres, PLAGES_JOURNEE, PLAGES_SOIREE,
  type JourCalendrier, type PlageHoraire, type SessionPublique,
} from "@/lib/programmeCalendrierDevis";
import type { Filiere } from "@/lib/jalonsPonderes";

interface Ligne extends JourCalendrier { id?: string }
const db = supabase as any;
const filiereSession = (s: SessionPublique): Filiere => {
  const t = (s.types_apprenant || []).map((x) => x.toUpperCase());
  if (t.includes("TAXI") || /taxi/i.test(s.nom)) return "taxi";
  if (t.includes("TA")) return "ta";
  return "vtc";
};

/** Saisie admin du calendrier journalier affiché dans le programme du devis public. */
export default function AdminCalendrierDevis() {
  const [sessions, setSessions] = useState<SessionPublique[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [brouillon, setBrouillon] = useState<Ligne[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [jour, setJour] = useState("");
  const [preset, setPreset] = useState<"journee" | "soiree">("journee");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.from("sessions").select("id, nom, type_session, date_debut, date_fin, heure_debut, heure_fin, heures_total, lieu, types_apprenant")
      .gte("date_fin", new Date().toISOString().slice(0, 10)).order("date_debut")
      .then(({ data, error }: any) => { if (error) setErreur("Lecture des sessions impossible"); else setSessions((data || []).map((s: any) => ({ ...s, jours: [] }))); });
  }, []);

  const charger = async (id: string) => {
    setLignes([]); setBrouillon([]); setErreur(null);
    const { data, error } = await db.from("session_calendrier_jours").select("id, jour, plages, nature, libelle").eq("session_id", id).order("jour");
    if (error) { setErreur("Lecture du calendrier impossible : rien n'est affiché comme vide."); return; }
    setLignes(data || []);
  };
  useEffect(() => { if (sessionId) charger(sessionId); }, [sessionId]);

  const session = sessions.find((s) => s.id === sessionId);
  const plages = (): PlageHoraire[] => (preset === "soiree" ? PLAGES_SOIREE : PLAGES_JOURNEE);
  const apercu = useMemo(() => (session ? calendrierSession({ ...session, jours: [...lignes, ...brouillon] }, filiereSession(session)) : null), [session, lignes, brouillon]);

  const ajouter = (dates: string[], nature: "cours" | "pratique" = "cours") => {
    const pris = new Set([...lignes, ...brouillon].filter((l) => l.nature === nature).map((l) => l.jour));
    setBrouillon((b) => [...b, ...dates.filter((d) => !pris.has(d)).map((d) => ({ jour: d, plages: nature === "pratique" ? PLAGES_JOURNEE : plages(), nature }))]);
  };

  const enregistrer = async () => {
    if (!session || brouillon.length === 0) return;
    setSaving(true);
    const { error } = await db.from("session_calendrier_jours").insert(brouillon.map((b) => ({ session_id: session.id, jour: b.jour, plages: b.plages, nature: b.nature })));
    setSaving(false);
    if (error) { toast.error(`Enregistrement refusé : ${error.message}`); return; }
    toast.success("Jours enregistrés"); charger(session.id);
  };

  const retirer = async (l: Ligne) => {
    if (!l.id) { setBrouillon((b) => b.filter((x) => x !== l)); return; }
    if (!confirm(`Retirer le ${l.jour} du calendrier du devis ? (aucune donnée élève concernée)`)) return;
    const { error } = await db.from("session_calendrier_jours").delete().eq("id", l.id);
    if (error) toast.error(error.message); else charger(sessionId);
  };

  const date = (d: string) => format(new Date(`${d}T12:00:00`), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Calendrier des sessions pour le devis</h1>
      <p className="text-sm text-muted-foreground">Ces jours apparaissent dans le PDF « Programme et calendrier » de la page devis. Le calendrier n'est publié que si les jours totalisent exactement les heures de la session.</p>
      {erreur && <p className="text-destructive text-sm">{erreur}</p>}
      <Select value={sessionId} onValueChange={setSessionId}>
        <SelectTrigger><SelectValue placeholder="Choisir une session..." /></SelectTrigger>
        <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.nom} — {s.date_debut}</SelectItem>)}</SelectContent>
      </Select>
      {session && apercu && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{session.nom}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Du {date(session.date_debut)} au {date(session.date_fin)} · heures prévues : <b>{apercu.heuresAttendues ?? "non déterminées"} h</b> · saisies : <b>{apercu.heuresSaisies} h</b></p>
            <p className={apercu.valide ? "text-sm text-primary font-medium" : "text-sm text-destructive"}>{apercu.valide ? "Calendrier complet : il sera publié dans le PDF." : `Non publié : ${apercu.anomalies.join(" ; ")}`}</p>
            <div className="flex flex-col gap-3">
              <div><Label>Horaire</Label>
                <Select value={preset} onValueChange={(v) => setPreset(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="journee">Journée 9h–12h / 13h–16h (6 h)</SelectItem>
                    <SelectItem value="soiree">Soirée 17h–21h (4 h)</SelectItem>
                  </SelectContent>
                </Select>
                {estSessionSoir(session) !== (preset === "soiree") && <p className="text-xs text-destructive mt-1">Attention : cet horaire ne correspond pas au type de la session.</p>}
              </div>
              <div><Label>Ajouter un jour</Label>
                <div className="flex gap-2"><Input type="date" min={session.date_debut} max={session.date_fin} value={jour} onChange={(e) => setJour(e.target.value)} />
                  <Button variant="outline" disabled={!jour} onClick={() => { ajouter([jour]); setJour(""); }}>Ajouter</Button></div>
              </div>
              <div><Label>Ajouter le samedi de pratique (9h–12h / 13h–16h, 6 h)</Label>
                <div className="flex gap-2"><Input type="date" min={session.date_debut} value={samedi} onChange={(e) => setSamedi(e.target.value)} />
                  <Button variant="outline" disabled={!samedi} onClick={() => { ajouter([samedi], "pratique"); setSamedi(""); }}>Ajouter la pratique</Button></div>
                <p className="text-xs text-muted-foreground mt-1">La date n'est jamais choisie automatiquement : saisissez le samedi réellement prévu.</p>
              </div>
              <Button variant="outline" onClick={() => ajouter(joursOuvres(session.date_debut, session.date_fin))}>Proposer tous les jours du lundi au vendredi (à vérifier avant d'enregistrer)</Button>
            </div>
            <ul className="divide-y text-sm">
              {[...lignes, ...brouillon].sort((a, b) => a.jour.localeCompare(b.jour)).map((l, i) => (
                <li key={l.id ?? `b${i}`} className="flex justify-between py-1.5">
                  <span>{date(l.jour)} · {l.nature === "pratique" ? "Pratique" : "Cours"} · {l.plages.map((p) => `${p.debut}–${p.fin}`).join(" / ")} · {heuresPlages(l.plages)} h {l.id ? "" : "(non enregistré)"}</span>
                  <Button size="sm" variant="ghost" onClick={() => retirer(l)}>Retirer</Button>
                </li>
              ))}
            </ul>
            <Button onClick={enregistrer} disabled={saving || brouillon.length === 0}>Enregistrer {brouillon.length} jour(s)</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
