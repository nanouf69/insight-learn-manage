import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Espace élève : QRC corrigées par intelligence artificielle (non vérifiées
 * par un formateur). Lecture seule : l'élève compare lui-même sa réponse au
 * corrigé officiel. Aucune sollicitation du formateur.
 */
type Ligne = {
  qrcId: string;
  enonce: string;
  corrige: string;
  reponse: string;
  note: number;
  bareme: number | null;
  justification: string | null;
  motsCles: string[];
};

const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));
const fr = (n: number | null) => String(n ?? "").replace(".", ",");

export default function CorrectionsIaEleve({ attemptIds }: { attemptIds: string[] }) {
  const [lignes, setLignes] = useState<Ligne[]>([]);
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
    const [{ data: corr }] = await Promise.all([
      supabase.from("qrc_ia_corrections" as any).select("qrc_instance_id, justification, bareme").in("qrc_instance_id", ids).eq("statut", "appliquee"),
    ]);
    const snap = new Map(((att ?? []) as any[]).map((a) => [a.attempt_id, a.snapshot]));
    setLignes(ia.map((q) => {
      const s = snap.get(q.attempt_id) as any;
      const qs = (Array.isArray(s?.questions) ? s.questions : []).find((x: any) => String(x.id) === String(q.question_id));
      const c = ((corr ?? []) as any[]).find((x) => x.qrc_instance_id === q.qrc_instance_id);
      return {
        qrcId: q.qrc_instance_id,
        enonce: qs?.enonce ?? "",
        corrige: qs?.reponseQRC ?? "",
        reponse: texte(q.reponse),
        note: Number(q.note),
        bareme: c?.bareme ?? qs?.points ?? null,
        justification: c?.justification ?? null,
        motsCles: (Array.isArray(qs?.motsCles) ? qs.motsCles : Array.isArray(qs?.mots_cles) ? qs.mots_cles : []).map((m: unknown) => String(m)).filter(Boolean),
      };
    }));
  };

  useEffect(() => { void charger(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cle]);

  if (!lignes.length) return null;

  return (
    <section className="space-y-3 rounded-lg border-2 border-ia/50 bg-ia/5 p-4" data-testid="corrections-ia-eleve">
      <p className="text-base font-semibold text-ia">🤖 Correction proposée par intelligence artificielle</p>
      {lignes.map((l) => (
        <div key={l.qrcId} className="space-y-3 rounded border border-ia/30 bg-background p-3 text-sm" data-testid={`qrc-ia-${l.qrcId}`}>
          <p className="font-medium">{l.enonce}</p>
          <div data-testid="bloc-reponse"><p className="text-xs font-semibold uppercase text-muted-foreground">Votre réponse</p><p className="whitespace-pre-wrap">{l.reponse}</p></div>
          <div className="rounded-lg border-4 border-success bg-success/10 p-4 shadow-md" data-testid="bloc-corrige-officiel">
            <p className="text-xl font-extrabold text-success">✅ CORRIGÉ OFFICIEL</p>
            <p className="mt-2 whitespace-pre-wrap text-lg font-medium leading-relaxed text-foreground">{l.corrige}</p>
            {l.motsCles.length > 0 && (
              <div className="mt-3" data-testid="mots-cles">
                <p className="text-sm font-bold text-success">Éléments attendus :</p>
                <div className="mt-1 flex flex-wrap gap-2">{l.motsCles.map((m, i) => <span key={i} className="rounded bg-success/20 px-2 py-0.5 text-base font-semibold text-success">{m}</span>)}</div>
              </div>
            )}
          </div>
          <p className="font-semibold text-ia" data-testid="bloc-note-ia">🤖 NOTE IA : {fr(l.note)}{l.bareme != null ? `/${l.bareme}` : ""}</p>
          {l.justification && <div data-testid="bloc-explication-ia"><p className="text-xs font-semibold uppercase text-muted-foreground">Explication de l'IA</p><p className="text-xs text-muted-foreground">{l.justification}</p></div>}
          <p className="rounded border border-warning/50 bg-warning/10 p-2 text-sm font-medium" data-testid="avertissement-ia">
            ⚠️ Cette correction a été réalisée automatiquement par intelligence artificielle. Une IA peut commettre des erreurs. Comparez votre réponse avec le corrigé officiel ci-dessus.
          </p>
        </div>
      ))}
    </section>
  );
}
