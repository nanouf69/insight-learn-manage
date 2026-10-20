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

/** Une preuve envoyée/signée de cet examen reste visible même si le modèle a changé. */
export const docCourant = (docs: DocModele[], a: Candidat) => {
  const memeExamen = docs.filter((d) => d.apprenant_id === a.id && d.cle_envoi === cleDe(a));
  return memeExamen.find((d) => d.envoye_le || d.statut === "signe" ||
    ["envoye", "envoi_en_cours", "indetermine"].includes(d.envoi_etat ?? "")) ??
    memeExamen.find((d) => d.modele_version === MODELE_VERSION) ?? null;
};

export const documentSelectionnable = (d: DocModele | null) =>
  d?.envoi_etat === "prepare" && d.statut !== "signe" && !d.envoye_le && d.modele_version === MODELE_VERSION;

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
  const [apercuServeur, setApercuServeur] = useState<DocModele | null>(null);
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

  useEffect(() => { if (open) { setSelection(new Set()); setApercuId(null); setApercuServeur(null); setRaisons({}); void charger(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const apercuDoc = useMemo(() => { const a = eligibles.find((e) => e.id === apercuId); return apercuServeur ?? (a ? docCourant(docs, a) : null); }, [apercuId, apercuServeur, docs, eligibles]);

  /** Aperçu = préparation serveur (éligibilité revalidée en base) puis affichage de l'instantané exact qui partira. */
  const ouvrirApercu = async (a: Candidat) => {
    setApercuServeur(null);
    setApercuId(null);
    if (lectureErreur) { toast.error("Lecture du suivi impossible : aperçu indisponible."); return; }
    const existant = docCourant(docs, a);
    if (existant) {
      if (!existant.mail_html_fige) { toast.error("Le mail enregistré ne contient pas d’aperçu disponible."); return; }
      setApercuServeur(existant);
      setApercuId(a.id);
      return;
    }
    setOccupe(true);
    try {
      const { data, error } = await supabase.functions.invoke("envoi-echec-choix-pratique", { body: { action: "preparer", apprenantId: a.id } });
      if (error) throw error;
      if (data?.etat === "bloque" || data?.etat === "erreur") { setRaisons((r) => ({ ...r, [a.id]: data.raison })); toast.error(`${a.nom} ${a.prenom} : ${data.raison}`); return; }
      if (!data?.doc?.mail_html_fige || data.doc.apprenant_id !== a.id || data.doc.cle_envoi !== cleDe(a)) {
        toast.error("Aperçu non disponible : le document retourné ne correspond pas à ce candidat et cet examen."); return;
      }
      setApercuServeur(data.doc as DocModele);
      await charger();
      setApercuId(a.id);
    } catch (e: any) {
      toast.error(`Préparation impossible : ${e?.message ?? e}`);
    } finally { setOccupe(false); }
  };

  const toggle = (id: string) => setSelection((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const estSelectionnable = (a: Candidat, liste: DocModele[] = docs) => documentSelectionnable(docCourant(liste, a));
  const prets = useMemo(() => eligibles.filter((a) => estSelectionnable(a)), [eligibles, docs]);

  const toutSelectionner = () => setSelection(new Set(prets.map((p) => p.id)));
  const toutDeselectionner = () => setSelection(new Set());

  /** Prépare (comme l'aperçu) tous les candidats encore non relus, sans envoyer quoi que ce soit, puis les sélectionne. */
  const toutPreparerEtSelectionner = async () => {
    if (lectureErreur) { toast.error("Lecture du suivi impossible : préparation bloquée."); return; }
    const aPreparer = eligibles.filter((a) => !docCourant(docs, a) && !raisons[a.id]);
    if (aPreparer.length === 0) { toutSelectionner(); return; }
    if (!window.confirm(`Préparer l'aperçu de ${aPreparer.length} mail(s) (aucun envoi) puis tout sélectionner ?`)) return;
    setOccupe(true);
    let echecs = 0;
    for (const a of aPreparer) {
      try {
        const { data, error } = await supabase.functions.invoke("envoi-echec-choix-pratique", { body: { action: "preparer", apprenantId: a.id } });
        if (error) throw error;
        if (data?.etat === "bloque" || data?.etat === "erreur") { setRaisons((r) => ({ ...r, [a.id]: data.raison })); echecs++; }
      } catch (e: any) {
        setRaisons((r) => ({ ...r, [a.id]: e?.message ?? String(e) }));
        echecs++;
      }
    }
    const { data, error } = await supabase.from("documents_a_signer").select(COLS)
      .eq("modele_code", MODELE_CODE).in("apprenant_id", eligibles.map((e) => e.id)).order("created_at", { ascending: false });
    if (!error && data) setDocs((data as any[]) as DocModele[]);
    setOccupe(false);
    if (error || !data) { setLectureErreur(error?.message ?? "Lecture indisponible"); setSelection(new Set()); toast.error("Lecture du suivi impossible : aucune sélection confirmée."); return; }
    setLectureErreur(null);
    const liste = (data as any[]) as DocModele[];
    setSelection(new Set(eligibles.filter((a) => estSelectionnable(a, liste)).map((a) => a.id)));
    if (echecs > 0) toast.warning(`${echecs} préparation(s) impossible(s) : la raison est affichée sur la ligne. Rien n'a été envoyé.`);
    else toast.success("Tous les mails sont préparés (relus) et sélectionnés. Rien n'est envoyé avant votre confirmation.");
  };


  const envoyer = async () => {
    if (lectureErreur) { toast.error("Lecture du suivi impossible : envoi bloqué."); return; }
    const cibles = eligibles.filter((e) => selection.has(e.id)).map((a) => ({ a, d: docCourant(docs, a) })).filter((x) => documentSelectionnable(x.d));
    if (cibles.length === 0) return;
    if (!window.confirm(`Envoyer le mail « résultat théorique + choix pratique » relu à ${cibles.length} candidat(s) ?`)) return;
    setOccupe(true);
    const bilan: Record<string, number> = {};
    for (const { a, d } of cibles) {
      if (!d) continue;
      let etat = "erreur";
      try {
        const { data, error } = await supabase.functions.invoke("envoi-echec-choix-pratique", { body: { action: "envoyer", docId: d.id } });
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
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={occupe || prets.length === 0} onClick={toutSelectionner}>
              Tout sélectionner ({prets.length})
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={occupe || eligibles.length === 0} onClick={toutPreparerEtSelectionner}>
              Tout préparer puis tout sélectionner
            </Button>
            {selection.size > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={occupe} onClick={toutDeselectionner}>
                Tout désélectionner
              </Button>
            )}
          </div>
          <div className="border rounded-lg divide-y">
            {eligibles.map((a) => {
              const d = docCourant(docs, a);
              const ech = echeancesDepuisEnvoi(d?.envoye_le);
              const selectionnable = documentSelectionnable(d);
              const filiere = filiereDepuisDossier(a.type_apprenant);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 p-2 text-sm">
                  <Checkbox checked={selection.has(a.id)} disabled={!selectionnable || occupe || !!lectureErreur} onCheckedChange={() => toggle(a.id)} aria-label={`Sélectionner ${a.nom} ${a.prenom}`} />
                  <span className="font-medium min-w-[160px]">{a.nom} {a.prenom}</span>
                  <Badge variant="secondary">{filiere ? LIBELLE_FILIERE[filiere] : "À vérifier"}</Badge>
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
                        Envoyé le {formatParis(ech.envoi)} · non sélectionnable
                      </Badge>
                    ) : d?.envoi_etat === "indetermine" || d?.envoi_etat === "envoi_en_cours" ? (
                      <Badge variant="destructive" title={d.envoi_erreur ?? ""}>Envoi indéterminé (tenté le {d.envoi_tente_le ? formatParis(d.envoi_tente_le) : "date indisponible"}) – vérifier Suivi mails</Badge>
                    ) : d?.envoi_etat === "envoye" ? <Badge variant="outline">Déjà envoyé · non sélectionnable</Badge>
                    : selectionnable ? <Badge variant="outline">Relu, prêt à envoyer{d?.envoi_erreur ? " (dernier essai refusé)" : ""}</Badge>
                    : d ? <Badge variant="outline">Document enregistré · non sélectionnable</Badge> : null}
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
