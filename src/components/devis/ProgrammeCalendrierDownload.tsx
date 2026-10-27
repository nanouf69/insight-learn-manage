import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formationProgramme, sessionsPourFormation, type SessionPublique } from "@/lib/programmeCalendrierDevis";
import { buildProgrammeCalendrierPDF } from "@/lib/pdf/programme-calendrier-devis";

interface Props {
  formation: { id: string; label: string; designation: string; agrement: string } | undefined;
  /** Date de début (AAAA-MM-JJ) déduite des dates choisies dans le devis, si elle existe. */
  dateDebutDevis?: string | null;
}

const libelle = (s: SessionPublique) =>
  `${s.nom} (${format(new Date(`${s.date_debut}T12:00:00`), "d MMM yyyy", { locale: fr })})`;

export function ProgrammeCalendrierDownload({ formation, dateDebutDevis }: Props) {
  const [sessions, setSessions] = useState<SessionPublique[]>([]);
  const [etat, setEtat] = useState<"chargement" | "ok" | "erreur">("chargement");
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let actif = true;
    (async () => {
      const { data, error } = await (supabase as any).rpc("sessions_publiques_devis");
      if (!actif) return;
      if (error || !Array.isArray(data)) { setEtat("erreur"); return; }
      setSessions(data as SessionPublique[]); setEtat("ok");
    })();
    return () => { actif = false; };
  }, []);

  const programme = formation ? formationProgramme(formation.id) : null;
  const candidates = useMemo(() => (programme ? sessionsPourFormation(sessions, programme) : []), [sessions, programme?.filiere, programme?.mode, programme?.soir]);

  useEffect(() => {
    const auto = candidates.find((s) => s.date_debut === dateDebutDevis);
    if (auto) setSessionId(auto.id);
    else if (!candidates.some((s) => s.id === sessionId)) setSessionId("");
  }, [candidates, dateDebutDevis]);

  if (!formation || !programme) return null;

  const telecharger = () => {
    setBusy(true);
    try {
      const session = candidates.find((s) => s.id === sessionId) ?? null;
      const { doc, manquants } = buildProgrammeCalendrierPDF({ formation, programme, session, sessions, erreurLecture: etat === "erreur" });
      doc.save(`Programme_calendrier_${formation.id}${session ? `_${session.date_debut}` : ""}.pdf`);
      if (manquants.length) toast.info("Programme téléchargé. Certains éléments sont indiqués « à confirmer ».");
    } catch (e) {
      console.error("programme PDF", e);
      toast.error("Le programme n'a pas pu être généré.");
    } finally { setBusy(false); }
  };

  return (
    <div className="w-full md:w-auto flex flex-col gap-2">
      {programme.mode === "presentiel" && (
        <div className="min-w-64">
          <Label className="text-xs">Session pour le calendrier</Label>
          <Select value={sessionId} onValueChange={setSessionId} disabled={etat !== "ok" || candidates.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={etat === "chargement" ? "Chargement..." : etat === "erreur" ? "Sessions indisponibles" : candidates.length ? "Choisir une session..." : "Aucune session prévue"} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((s) => <SelectItem key={s.id} value={s.id}>{libelle(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button size="lg" variant="outline" className="w-full md:w-auto px-6 text-lg" onClick={telecharger} disabled={busy || etat === "chargement"}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <BookOpen className="w-5 h-5 mr-2" />}
        Télécharger le programme et le calendrier
      </Button>
    </div>
  );
}
