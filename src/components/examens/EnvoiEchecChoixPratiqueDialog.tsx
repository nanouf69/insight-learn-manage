import { useEffect, useMemo, useState } from "react";
import { Mail, Loader2, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MODELE_CODE, MODELE_VERSION, MODELE_NOM, MODELE_FILE_PATH, CHOIX,
  texteFige, empreinteTexte, construireMailEchec, filiereDepuisDossier, LIBELLE_FILIERE,
  echeancesDepuisEnvoi, formatParis, type TexteFige,
} from "@/lib/modeles/entrainementPratiqueVtc";
import { genererPreuveChoixPdf } from "@/lib/modeles/preuveChoixPdf";
import { telechargerPdf } from "@/lib/documentSigneDownload";

const PUBLIC_BASE_URL = "https://gestion.ftransport.fr";

interface Candidat { id: string; nom: string; prenom: string; email?: string | null; type_apprenant?: string | null; resultat_examen?: string | null }
interface DocModele {
  id: string; apprenant_id: string | null; token: string; statut: string; envoye_le: string | null; sent_at: string | null;
  choix: string | null; signe_le_paris: string | null; signed_at: string | null; texte_fige: string | null;
  texte_empreinte: string | null; modele_version: string | null; reponses: any; destinataire_nom: string | null;
}

export function EnvoiEchecChoixPratiqueDialog({ candidats }: { candidats: Candidat[] }) {
  const enEchec = useMemo(() => candidats.filter((a) => a.resultat_examen === "non" && !!a.email), [candidats]);
  const eligibles = useMemo(() => enEchec.filter((a) => filiereDepuisDossier(a.type_apprenant) !== null), [enEchec]);
  const bloques = useMemo(() => enEchec.filter((a) => filiereDepuisDossier(a.type_apprenant) === null), [enEchec]);
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<DocModele[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [apercuId, setApercuId] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [lectureErreur, setLectureErreur] = useState<string | null>(null);

  const charger = async () => {
    if (eligibles.length === 0) { setDocs([]); return; }
    const { data, error } = await supabase
      .from("documents_a_signer")
      .select("id, apprenant_id, token, statut, envoye_le, sent_at, choix, signe_le_paris, signed_at, texte_fige, texte_empreinte, modele_version, reponses, destinataire_nom")
      .eq("modele_code", MODELE_CODE)
      .in("apprenant_id", eligibles.map((e) => e.id))
      .order("created_at", { ascending: false });
    if (error) { setLectureErreur(error.message); return; }
    setLectureErreur(null);
    setDocs((data as any[]) as DocModele[]);
  };

  useEffect(() => { if (open) { setSelection(new Set()); setApercuId(null); void charger(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const docDe = (id: string) => docs.find((d) => d.apprenant_id === id && d.statut === "signe") || docs.find((d) => d.apprenant_id === id);
  const apercu = eligibles.find((e) => e.id === apercuId) || null;
  const apercuMail = apercu ? construireMailEchec({ filiere: filiereDepuisDossier(apercu.type_apprenant)!, prenom: apercu.prenom, lien: `${PUBLIC_BASE_URL}/document-a-signer/(lien-securise-genere-a-l-envoi)` }) : null;

  const toggle = (id: string) => setSelection((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const envoyer = async () => {
    if (lectureErreur) { toast.error("Lecture du suivi impossible : envoi bloqué."); return; }
    const cibles = eligibles.filter((e) => selection.has(e.id));
    if (cibles.length === 0) return;
    if (!window.confirm(`Envoyer le mail « résultat théorique + choix pratique » à ${cibles.length} candidat(s) sélectionné(s) ?`)) return;
    setEnvoi(true);
    let ok = 0, ko = 0, ignores = 0;
    const { data: u } = await supabase.auth.getUser();
    for (const a of cibles) {
      try {
        const existant = docDe(a.id);
        if (existant && (existant.statut === "signe" || existant.envoye_le)) { ignores++; continue; }
        const filiere = filiereDepuisDossier(a.type_apprenant);
        if (!filiere) { ignores++; continue; }
        let doc = existant;
        if (!doc) {
          const tf = JSON.stringify(texteFige(filiere));
          const { data, error } = await supabase.from("documents_a_signer").insert({
            nom: `${MODELE_NOM} – ${a.nom} ${a.prenom}`,
            file_path: MODELE_FILE_PATH,
            champs: [],
            destinataire_nom: `${a.prenom} ${a.nom}`,
            destinataire_email: a.email!,
            statut: "prepare",
            modele_code: MODELE_CODE,
            modele_version: MODELE_VERSION,
            texte_fige: tf,
            texte_empreinte: await empreinteTexte(tf),
            apprenant_id: a.id,
            created_by: u.user?.id ?? null,
          } as any).select("*").single();
          if (error) throw error;
          doc = data as any;
        }
        const { subject, html } = construireMailEchec({ filiere, prenom: a.prenom, lien: `${PUBLIC_BASE_URL}/document-a-signer/${doc!.token}` });
        const { data: res, error: errEnvoi } = await supabase.functions.invoke("sync-outlook-emails", {
          body: { action: "send", userEmail: "contact@ftransport.fr", to: a.email, subject, body: html, apprenantId: a.id },
        });
        if (errEnvoi || (res as any)?.error) throw new Error(errEnvoi?.message || (res as any)?.error);
        const now = new Date().toISOString();
        // Date d'envoi réelle = confirmation serveur d'envoi ; jamais une preuve de réception.
        await supabase.from("documents_a_signer").update({ statut: "envoye", sent_at: now, envoye_le: now } as any).eq("id", doc!.id).is("envoye_le", null);
        ok++;
      } catch (e) {
        console.error("[EnvoiEchecVtc]", e);
        ko++;
      }
    }
    setEnvoi(false);
    setSelection(new Set());
    await charger();
    if (ko) toast.error(`${ok} envoyé(s), ${ko} échec(s), ${ignores} déjà envoyé(s)/signé(s)`);
    else toast.success(`${ok} envoyé(s)${ignores ? `, ${ignores} déjà envoyé(s)/signé(s) ignoré(s)` : ""}`);
  };

  const telechargerPreuve = async (a: Candidat, d: DocModele) => {
    const texte = JSON.parse(d.texte_fige || "null") as TexteFige;
    const bytes = await genererPreuveChoixPdf({
      texte, version: d.modele_version, empreinte: d.texte_empreinte, nom: a.nom, prenom: a.prenom,
      choix: d.choix, signature: d.reponses?.signature ?? null, signeLeParis: d.signe_le_paris, signedAt: d.signed_at, envoyeLe: d.envoye_le,
    });
    telechargerPdf(bytes, `choix_pratique_${a.nom}_${a.prenom}.pdf`);
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
          <p className="text-xs text-muted-foreground">Candidats en échec uniquement (VTC, TAXI, passerelle TAXI), texte adapté à la filière du dossier. Aucun n'est sélectionné d'avance : cochez vous-même les destinataires. Rien n'est envoyé automatiquement et le choix de l'élève ne déclenche aucune déclaration.</p>
          {lectureErreur && <p className="text-sm text-destructive">Suivi illisible ({lectureErreur}) : envoi bloqué.</p>}
          {bloques.length > 0 && (
            <div className="text-sm text-destructive border border-destructive/40 rounded p-2">
              Filière absente ou ambiguë dans le dossier : préparation bloquée pour {bloques.map((b) => `${b.nom} ${b.prenom} (${b.type_apprenant || "vide"})`).join(", ")}.
            </div>
          )}
          <div className="border rounded-lg divide-y">
            {eligibles.map((a) => {
              const d = docDe(a.id);
              const ech = echeancesDepuisEnvoi(d?.envoye_le);
              const bloque = !!d && (d.statut === "signe" || !!d.envoye_le);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 p-2 text-sm">
                  <Checkbox checked={selection.has(a.id)} disabled={bloque || envoi} onCheckedChange={() => toggle(a.id)} aria-label={`Sélectionner ${a.nom} ${a.prenom}`} />
                  <span className="font-medium min-w-[160px]">{a.nom} {a.prenom}</span>
                  <Badge variant="secondary">{LIBELLE_FILIERE[filiereDepuisDossier(a.type_apprenant)!]}</Badge>
                  <span className="text-xs text-muted-foreground">{a.email}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {d?.statut === "signe" ? (
                      <>
                        <Badge variant="outline">Signé {d.signe_le_paris}</Badge>
                        <Badge>{CHOIX.find((c) => c.code === d.choix)?.code === "maintenant" ? "Dès maintenant" : d.choix === "plus_tard" ? "Plus tard" : "Renonce"}</Badge>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => telechargerPreuve(a, d)}><Download className="h-3 w-3" /> PDF</Button>
                      </>
                    ) : d?.envoye_le && ech ? (
                      <Badge variant="outline" title="Date d'envoi enregistrée, pas une preuve de réception">
                        Envoyé le {formatParis(ech.envoi)} · réponse attendue ~{ech.reponseAttendue.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                      </Badge>
                    ) : d ? <Badge variant="outline">Préparé, non envoyé</Badge> : null}
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setApercuId(a.id)}><Eye className="h-3 w-3" /> Aperçu</Button>
                  </span>
                </div>
              );
            })}
          </div>
          {apercuMail && (
            <div className="border rounded-lg">
              <div className="p-2 border-b text-sm"><strong>Objet :</strong> {apercuMail.subject}<br /><strong>À :</strong> {apercu?.email}</div>
              <iframe title="Aperçu du mail" sandbox="" srcDoc={apercuMail.html} className="w-full h-[480px] bg-background" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            <Button onClick={envoyer} disabled={envoi || selection.size === 0 || !!lectureErreur}>
              {envoi && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Envoyer aux {selection.size} sélectionné(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
