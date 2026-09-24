import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { demanderVerification } from "@/features/correction-qrc-v2/correctionIa";

/**
 * Espace élève : QRC corrigées par intelligence artificielle (non vérifiées
 * par un formateur). Lecture seule, sauf la demande de vérification, qui ne
 * modifie jamais la note.
 */
type Ligne = {
  qrcId: string;
  enonce: string;
  corrige: string;
  reponse: string;
  note: number;
  bareme: number | null;
  justification: string | null;
  demande: "aucune" | "a_traiter" | "traitee";
};

const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));
const fr = (n: number | null) => String(n ?? "").replace(".", ",");

export default function CorrectionsIaEleve({ attemptIds }: { attemptIds: string[] }) {
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [envoi, setEnvoi] = useState<Record<string, "encours" | "ok" | "echec">>({});
  const cle = attemptIds.slice().sort().join(",");

  const charger = async () => {
    if (!attemptIds.length) { setLignes([]); return; }
    const [{ data: qrc }, { data: att }] = await Promise.all([
      supabase.from("qrc_instances_v2").select("qrc_instance_id, attempt_id, question_id, reponse, note, etat, corrige_email").in("attempt_id", attemptIds).eq("etat", "corrigee").like("corrige_email", "ia:%"),
      supabase.from("exam_attempts_v2").select("attempt_id, snapshot").in("attempt_id", attemptIds),
    ]);
    const ia = (qrc ?? []) as any[];
    if (!ia.length) { setLignes([]); return; }
    const ids = ia.map((q) => q.qrc_instance_id);
    const [{ data: corr }, { data: dem }] = await Promise.all([
      supabase.from("qrc_ia_corrections" as any).select("qrc_instance_id, justification, bareme").in("qrc_instance_id", ids).eq("statut", "appliquee"),
      supabase.from("qrc_verification_demandes" as any).select("qrc_instance_id, statut").in("qrc_instance_id", ids),
    ]);
    const snap = new Map(((att ?? []) as any[]).map((a) => [a.attempt_id, a.snapshot]));
    setLignes(ia.map((q) => {
      const s = snap.get(q.attempt_id) as any;
      const qs = (Array.isArray(s?.questions) ? s.questions : []).find((x: any) => String(x.id) === String(q.question_id));
      const c = ((corr ?? []) as any[]).find((x) => x.qrc_instance_id === q.qrc_instance_id);
      const d = ((dem ?? []) as any[]).filter((x) => x.qrc_instance_id === q.qrc_instance_id);
      return {
        qrcId: q.qrc_instance_id,
        enonce: qs?.enonce ?? "",
        corrige: qs?.reponseQRC ?? "",
        reponse: texte(q.reponse),
        note: Number(q.note),
        bareme: c?.bareme ?? qs?.points ?? null,
        justification: c?.justification ?? null,
        demande: d.some((x) => x.statut === "a_traiter") ? "a_traiter" : d.length ? "traitee" : "aucune",
      };
    }));
  };

  useEffect(() => { void charger(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cle]);

  if (!lignes.length) return null;

  const demander = async (qrcId: string) => {
    if (envoi[qrcId] === "encours") return;
    setEnvoi((e) => ({ ...e, [qrcId]: "encours" }));
    try {
      await demanderVerification(qrcId);
      setEnvoi((e) => ({ ...e, [qrcId]: "ok" }));
      await charger();
    } catch {
      setEnvoi((e) => ({ ...e, [qrcId]: "echec" }));
    }
  };

  return (
    <section className="space-y-3 rounded-lg border-2 border-ia/50 bg-ia/5 p-4" data-testid="corrections-ia-eleve">
      <p className="text-base font-semibold text-ia">🤖 Correction proposée par intelligence artificielle</p>
      <p className="rounded border border-warning/50 bg-warning/10 p-2 text-sm" data-testid="avertissement-ia">
        ⚠️ Cette correction a été réalisée automatiquement par une intelligence artificielle et peut comporter une erreur.
        Vérifiez votre réponse et le corrigé officiel. En cas de doute, demandez une vérification au centre de formation.
      </p>
      {lignes.map((l) => (
        <div key={l.qrcId} className="space-y-2 rounded border border-ia/30 bg-background p-3 text-sm" data-testid={`qrc-ia-${l.qrcId}`}>
          <p className="font-medium">{l.enonce}</p>
          <div><p className="text-xs font-semibold uppercase text-muted-foreground">Votre réponse</p><p className="whitespace-pre-wrap">{l.reponse}</p></div>
          <div><p className="text-xs font-semibold uppercase text-success">Corrigé officiel</p><p className="whitespace-pre-wrap">{l.corrige}</p></div>
          <div><p className="text-xs font-semibold uppercase text-ia">Note proposée par l'IA</p><p className="font-semibold text-ia">🤖 {fr(l.note)}{l.bareme != null ? `/${l.bareme}` : ""}</p></div>
          {l.justification && <div><p className="text-xs font-semibold uppercase text-ia">Explication de l'IA</p><p>{l.justification}</p></div>}
          {l.demande === "a_traiter" ? (
            <p className="text-warning font-medium" data-testid="verification-en-cours">⏳ Vérification demandée — votre formateur va contrôler cette correction.</p>
          ) : (
            <Button size="sm" variant="outline" disabled={envoi[l.qrcId] === "encours"} onClick={() => void demander(l.qrcId)} data-testid="demander-verification">
              Demander une vérification au formateur
            </Button>
          )}
          {envoi[l.qrcId] === "echec" && <p className="text-destructive text-xs">La demande n'a pas pu être envoyée. Réessayez.</p>}
        </div>
      ))}
    </section>
  );
}
