import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { fichesIdentiques } from "@/lib/noteExamenAffichee";
import { listerGroupesCrm, type GroupeSessionCrm } from "@/features/correction-qrc-v2/noyauReel";

type QuestionConservee = { id?: string | number; questionId?: string | number; enonce?: string };
type DetailsConserves = { reponses?: Record<string, unknown>; snapshot?: { questions?: QuestionConservee[] }; questions?: QuestionConservee[] };
export type CopieHistorique = { id: string; apprenant_id: string; quiz_id: string; matiere_id: string; tentative: number | null; completed_at: string | null; details: DetailsConserves };
type Passage = { attempt_id: string; apprenant_id: string; exam_id: string; snapshot: { source_historique?: { result_id?: string; tentative?: number; details?: DetailsConserves } } };
export function passageExact(row: CopieHistorique, passages: Passage[]): Passage | null {
  const candidats = passages.filter(p => p.apprenant_id === row.apprenant_id && p.exam_id === row.quiz_id && p.snapshot?.source_historique?.result_id === row.id
    && Number(p.snapshot.source_historique.tentative) === row.tentative && fichesIdentiques(p.snapshot.source_historique.details, row.details));
  return candidats.length === 1 ? candidats[0] : null;
}
export function lienCorrectionExact(groupes: GroupeSessionCrm[], p: Passage, qrcId: string): string | null {
  for (const g of groupes) {
    const eb = g.examens.find(e => e.exam_id === p.exam_id && e.attemptIds.includes(p.attempt_id) && e.apprenantParAttempt?.[p.attempt_id] === p.apprenant_id);
    if (eb) return `/admin/correction-qrc-v2?${new URLSearchParams({ qrc_groupe: g.cle, qrc_eb: eb.cle, qrc: qrcId })}`;
  }
  return null;
}
export function LectureCopieSelectionnee({ row }: { row: CopieHistorique }) {
  const questions = Array.isArray(row.details?.snapshot?.questions) ? row.details.snapshot.questions : row.details?.questions;
  const reponses = row.details?.reponses ?? {};
  return <article className="space-y-3 break-words" aria-label="Copie sélectionnée">
    <p className="text-sm">Tentative {row.tentative ?? "inconnue"} · {row.completed_at ? new Date(row.completed_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "Date non enregistrée"}</p>
    <p className="text-xs text-muted-foreground">Identifiant de copie : {row.id}</p>
    <p className="text-sm font-semibold">{Object.values(reponses).filter(v => v != null && String(v).trim()).length} réponses enregistrées</p>
    {Array.isArray(questions) ? questions.map((q: QuestionConservee, i: number) => {
      const id = String(q.id ?? q.questionId ?? "");
      const answer = reponses[id];
      return <div key={`${id}-${i}`} className="border-t pt-3"><p className="font-medium">Q{id} — {q.enonce ?? "Énoncé non conservé"}</p><p className="whitespace-pre-wrap mt-1">{answer == null || String(answer).trim() === "" ? "Sans réponse enregistrée" : Array.isArray(answer) ? answer.join(" + ") : String(answer)}</p></div>;
    }) : <p role="alert">Questions figées indisponibles : aucun contenu actuel substitué.</p>}
  </article>;
}
export default function HistoriqueCopiesMatiere({ account, exam, subject, nom }: { account: string; exam: string; subject: string; nom: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [selected, setSelected] = useState("");
  const [lien, setLien] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [lectureLien, setLectureLien] = useState(false);
  const generation = useRef(0);
  const query = useQuery({ queryKey: ["crm-copies-matiere", account, exam, subject], enabled: ouvert, retry: false, queryFn: async () => {
    const rows: CopieHistorique[] = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase.from("apprenant_quiz_results").select("id,apprenant_id,quiz_id,matiere_id,tentative,completed_at,details")
        .eq("apprenant_id", account).eq("quiz_id", exam).eq("matiere_id", subject).order("completed_at", { ascending: false }).order("id").range(from, from + 499);
      if (error) throw error;
      rows.push(...(data as CopieHistorique[] ?? []));
      if ((data?.length ?? 0) < 500) return rows;
    }
  } });
  const row = query.data?.find(r => r.id === selected);
  const rechercherLien = async () => {
    if (!row || lectureLien) return;
    const version = ++generation.current;
    const messageSiActuel = (text: string) => { if (version === generation.current) setMessage(text); };
    setLectureLien(true); setMessage(""); setLien(null);
    try {
      const { data, error } = await supabase.from("exam_attempts_v2").select("attempt_id,apprenant_id,exam_id,snapshot")
        .eq("apprenant_id", account).eq("exam_id", exam).eq("snapshot->source_historique->>result_id", row.id);
      if (error) throw error;
      const p = passageExact(row, data as Passage[] ?? []);
      if (!p) { messageSiActuel("Correspondance V2 absente ou ambiguë : cette copie reste consultable, sans ouvrir une autre tentative."); return; }
      const { data: qrc, error: qerror } = await supabase.from("qrc_instances_v2").select("qrc_instance_id,attempt_id,apprenant_id").eq("attempt_id", p.attempt_id).eq("apprenant_id", account).order("question_id").limit(1);
      if (qerror) throw qerror;
      const id = qrc?.[0]?.qrc_instance_id;
      if (!id) { messageSiActuel("Aucune QRC V2 conservée pour cette copie."); return; }
      const url = lienCorrectionExact(await listerGroupesCrm(), p, id);
      if (!url) { messageSiActuel("Cette copie exacte n’a pas été retrouvée dans le menu du correcteur."); return; }
      if (version === generation.current) { setLien(url); setMessage(`Même passage V2 : ${p.attempt_id}`); }
    } catch { messageSiActuel("Lecture du lien impossible. Aucune autre copie n’a été choisie."); }
    finally { if (version === generation.current) setLectureLien(false); }
  };
  return <>
    <Button size="sm" variant="outline" onClick={() => { setOuvert(true); setSelected(""); setLien(null); setMessage(""); }}>Historique des copies : {nom}</Button>
    <Dialog open={ouvert} onOpenChange={v => { generation.current++; setLectureLien(false); setOuvert(v); }}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{exam} · {nom} — Historique des copies</DialogTitle></DialogHeader>
      {query.isLoading && <p role="status">Lecture des copies…</p>}{query.isError && <p role="alert">Lecture impossible : aucune copie remplacée.</p>}
      {query.data && <><Label htmlFor={`copie-${subject}`}>Choisir explicitement un passage</Label><select id={`copie-${subject}`} className="w-full rounded-md border border-input bg-background p-3 text-sm" value={selected} onChange={e => { generation.current++; setLectureLien(false); setSelected(e.target.value); setLien(null); setMessage(""); }}><option value="">Sélectionner une copie</option>{query.data.map(r => <option key={r.id} value={r.id}>Tentative {r.tentative ?? "?"} · {r.completed_at ? new Date(r.completed_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "Date inconnue"} · {r.id}</option>)}</select>{!query.data.length && <p>Aucune copie enregistrée pour cette matière.</p>}</>}
      {row && <div key={row.id} className="space-y-3"><LectureCopieSelectionnee row={row} /><Button variant="outline" disabled={lectureLien} onClick={() => void rechercherLien()}>Retrouver cette copie dans Correction QRC V2</Button>{message && <p role="status" className="text-xs break-all">{message}</p>}{lien && <Button asChild><a href={lien} target="_blank" rel="noopener noreferrer">Ouvrir cette copie exacte dans le correcteur</a></Button>}</div>}
    </DialogContent></Dialog>
  </>;
}