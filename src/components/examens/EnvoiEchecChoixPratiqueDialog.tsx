import { useEffect, useMemo, useState } from "react";
import { Mail, Loader2, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MODELE_CODE, MODELE_VERSION, filiereDepuisDossier, LIBELLE_FILIERE,
  echeancesDepuisEnvoi, formatParis, type TexteFige,
} from "@/lib/modeles/entrainementPratiqueVtc";
import { genererPreuveChoixPdf } from "@/lib/modeles/preuveChoixPdf";
import { telechargerPdf } from "@/lib/documentSigneDownload";

interface Candidat { id: string; nom: string; prenom: string; email?: string | null; type_apprenant?: string | null; resultat_examen?: string | null; date_examen_theorique?: string | null }
export interface DocModele {
  id: string; apprenant_id: string | null; statut: string; envoye_le: string | null; envoi_etat: string | null; envoi_tente_le: string | null; envoi_erreur: string | null;
  choix: string | null; signe_le_paris: string | null; signed_at: string | null; texte_fige: string | null; cle_envoi: string | null;
  texte_empreinte: string | null; modele_version: string | null; reponses: any; identite_figee: any;
  mail_objet_fige: string | null; mail_html_fige: string | null;
}
const COLS = "id, apprenant_id, statut, envoye_le, envoi_etat, envoi_tente_le, envoi_erreur, choix, signe_le_paris, signed_at, texte_fige, cle_envoi, texte_empreinte, modele_version, reponses, identite_figee, mail_objet_fige, mail_html_fige";
const cleDe = (a: Candidat) => (a.date_examen_theorique ? `examen_theorique:${String(a.date_examen_theorique).slice(0, 10)}` : null);
const LIB_CHOIX: Record<string, string> = { maintenant: "Dès maintenant", plus_tard: "Plus tard", renonce: "Renonce" };

/** Le document du mail pour CET examen et CETTE version (un autre examen n'empêche pas un nouvel envoi). */
export const docCourant = (docs: DocModele[], a: Candidat) =>
  docs.find((d) => d.apprenant_id === a.id && d.cle_envoi === cleDe(a) && d.modele_version === MODELE_VERSION) || null;

export async function telechargerPreuveDoc(d: DocModele) {
  const id = d.identite_figee || {};
  const bytes = await genererPreuveChoixPdf({
    texte: JSON.parse(d.texte_fige || "null") as TexteFige, version: d.modele_version, empreinte: d.texte_empreinte,
    nom: id.nom ?? "", prenom: id.prenom ?? "", email: id.email ?? null,
    choix: d.choix, signature: d.reponses?.signature ?? null, signeLeParis: d.signe_le_paris, signedAt: d.signed_at, envoyeLe: d.envoye_le,
  });
  telechargerPdf(bytes, `choix_pratique_${id.nom ?? ""}_${id.prenom ?? ""}.pdf`);
}

export function EnvoiEchecChoixPratiqueDialog({ candidats }: { candidats: Candidat[] }) {
  const enEchec = useMemo(() => candidats.filter((a) => a.resultat_examen === "non" && !!a.email), [candidats]);
  const eligibles = useMemo(() => enEchec.filter((a) => filiereDepuisDossier(a.type_apprenant) !== null), [enEchec]);
  const bloques = useMemo(() => enEchec.filter((a) => filiereDepuisDossier(a.type_apprenant) === null), [enEchec]);
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<DocModele[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [apercuId, setApercuId] = useState<string | null>(null);
  const [raisons, setRaisons] = useState<Record<string, string>>({});
  const [occupe, setOccupe] = useState(false);
  const [lectureErreur, setLectureErreur] = useState<string | null>(null);

  const charger = async () => {
    if (eligibles.length === 0) { setDocs([]); return; }
    const { data, error } = await supabase.from("documents_a_signer").select(COLS)
      .eq("modele_code", MODELE_CODE).in("apprenant_id", eligibles.map((e) => e.id)).order("created_at", { ascending: false });
    if (error) { setLectureErreur(error.message); return; }
    setLectureErreur(null);
    setDocs((data as any[]) as DocModele[]);
  };

  useEffect(() => { if (open) { setSelection(new Set()); setApercuId(null); setRaisons({}); void charger(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const apercuDoc = useMemo(() => { const a = eligibles.find((e) => e.id === apercuId); return a ? docCourant(docs, a) : null; }, [apercuId, docs, eligibles]);

  /** Aperçu = préparation serveur (éligibilité revalidée en base) puis affichage de l'instantané exact qui partira. */
  const ouvrirApercu = async (a: Candidat) => {
    setOccupe(true);
    try {
      const { data, error } = await supabase.functions.invoke("envoi-echec-choix-pratique", { body: { action: "preparer", apprenantId: a.id } });
      if (error) throw error;
      if (data?.etat === "bloque" || data?.etat === "erreur") { setRaisons((r) => ({ ...r, [a.id]: data.raison })); toast.error(`${a.nom} ${a.prenom} : ${data.raison}`); return; }
      await charger();
      setApercuId(a.id);
    } catch (e: any) {
      toast.error(`Préparation impossible : ${e?.message ?? e}`);
    } finally { setOccupe(false); }
  };

  const toggle = (id: string) => setSelection((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const envoyer = async () => {
    if (lectureErreur) { toast.error("Lecture du suivi impossible : envoi bloqué."); return; }
    const cibles = eligibles.filter((e) => selection.has(e.id)).map((a) => ({ a, d: docCourant(docs, a) })).filter((x) => x.d?.envoi_etat === "prepare");
    if (cibles.length === 0) return;
    if (!window.confirm(`Envoyer le mail « résultat théorique + choix pratique » relu à ${cibles.length} candidat(s) ?`)) return;
    setOccupe(true);
    const bilan: Record<string, number> = {};
    for (const { a, d } of cibles) {
      let etat = "erreur";
      try {
        const { data, error } = await supabase.functions.invoke("envoi-echec-choix-pratique", { body: { action: "envoyer", docId: d!.id } });
        if (error) { etat = "indetermine"; console.error("[EnvoiEchecChoixPratique]", a.id, error.message); }
        else { etat = data?.etat ?? "erreur"; if (data?.raison) setRaisons((r) => ({ ...r, [a.id]: data.raison })); }
      } catch (e: any) { etat = "indetermine"; console.error("[EnvoiEchecChoixPratique]", a.id, e?.message); }
      bilan[etat] = (bilan[etat] || 0) + 1;
    }
    setOccupe(false);
    setSelection(new Set());
    await charger();
    const txt = Object.entries(bilan).map(([k, v]) => `${v} ${k}`).join(", ");
    (bilan.envoye === cibles.length ? toast.success : toast.warning)(`Résultat : ${txt}. Un état « indéterminé » n'est jamais réexpédié automatiquement : vérifiez « Suivi mails ».`);
  };

  if (enEchec.length === 0) return null;

  return (
    <>
      <Button size="sm" variant="outline" className="mt-2 w-full gap-1.5 text-xs" onClick={() => setOpen(true)}>
        <Mail className="h-3 w-3" /> Mail échec + choix pratique ({eligibles.length})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Mail échec théorique + choix entraînement pratique</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Candidats en échec (VTC, TAXI, passerelle TAXI). Ouvrez l'aperçu : le serveur revérifie le dossier et fige le mail exact. Seuls les mails relus peuvent être cochés. Rien n'est envoyé automatiquement ; le choix de l'élève ne déclenche aucune déclaration.</p>
          {lectureErreur && <p className="text-sm text-destructive">Suivi illisible ({lectureErreur}) : envoi bloqué.</p>}
          {bloques.length > 0 && (
            <div className="text-sm text-destructive border border-destructive/40 rounded p-2">
              Filière absente, ambiguë ou sans pratique incluse : préparation bloquée pour {bloques.map((b) => `${b.nom} ${b.prenom} (${b.type_apprenant || "vide"})`).join(", ")}.
            </div>
          )}
          <div className="border rounded-lg divide-y">
            {eligibles.map((a) => {
              const d = docCourant(docs, a);
              const ech = echeancesDepuisEnvoi(d?.envoye_le);
              const selectionnable = d?.envoi_etat === "prepare" && d.statut !== "signe";
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 p-2 text-sm">
                  <Checkbox checked={selection.has(a.id)} disabled={!selectionnable || occupe} onCheckedChange={() => toggle(a.id)} aria-label={`Sélectionner ${a.nom} ${a.prenom}`} />
                  <span className="font-medium min-w-[160px]">{a.nom} {a.prenom}</span>
                  <Badge variant="secondary">{LIBELLE_FILIERE[filiereDepuisDossier(a.type_apprenant)!]}</Badge>
                  <span className="text-xs text-muted-foreground">{a.email}</span>
                  {raisons[a.id] && <span className="text-xs text-destructive w-full">{raisons[a.id]}</span>}
                  <span className="ml-auto flex items-center gap-2">
                    {d?.statut === "signe" ? (
                      <>
                        <Badge variant="outline">Signé {d.signe_le_paris}</Badge>
                        <Badge>{LIB_CHOIX[d.choix ?? ""] ?? "?"}</Badge>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => telechargerPreuveDoc(d)}><Download className="h-3 w-3" /> PDF</Button>
                      </>
                    ) : d?.envoye_le && ech ? (
                      <Badge variant="outline" title="Date serveur d'acceptation par le circuit mail, pas une preuve de réception">
                        Envoyé le {formatParis(ech.envoi)} · réponse attendue ~{ech.reponseAttendue.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                      </Badge>
                    ) : d?.envoi_etat === "indetermine" || d?.envoi_etat === "envoi_en_cours" ? (
                      <Badge variant="destructive" title={d.envoi_erreur ?? ""}>Envoi indéterminé (tenté le {formatParis(d.envoi_tente_le!)}) – vérifier Suivi mails</Badge>
                    ) : d ? <Badge variant="outline">Relu, prêt à envoyer{d.envoi_erreur ? " (dernier essai refusé)" : ""}</Badge> : null}
                    <Button size="sm" variant="ghost" className="h-7 gap-1" disabled={occupe} onClick={() => ouvrirApercu(a)}><Eye className="h-3 w-3" /> Aperçu</Button>
                  </span>
                </div>
              );
            })}
          </div>
          {apercuDoc?.mail_html_fige && (
            <div className="border rounded-lg" data-testid="apercu-fige">
              <div className="p-2 border-b text-sm"><strong>Objet :</strong> {apercuDoc.mail_objet_fige}<br /><strong>À :</strong> {apercuDoc.identite_figee?.email} <span className="text-xs text-muted-foreground">(instantané figé, version {apercuDoc.modele_version})</span></div>
              <iframe title="Aperçu du mail" sandbox="" srcDoc={apercuDoc.mail_html_fige} className="w-full h-[480px] bg-background" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            <Button onClick={envoyer} disabled={occupe || selection.size === 0 || !!lectureErreur}>
              {occupe && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Envoyer aux {selection.size} sélectionné(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
