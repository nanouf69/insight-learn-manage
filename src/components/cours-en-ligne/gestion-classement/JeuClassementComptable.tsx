import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BookOpen, Calculator, CheckCircle2, GripVertical, Landmark, RefreshCw, Trophy } from "lucide-react";
import { useSuiviJeu } from "../jeux-lyon/useSuiviJeu";
import { AMORTISSEMENT as A, BILAN_EXEMPLE, CARTES, JEU_GESTION_ID, ZONES, calculCorrect, euro, jeuTermine, lireProgression, placer, progressionVide, scoreClassement, totalBilan, type Zone } from "./donnees";

export function PlateauComptable({ compteId }: { compteId?: string | null }) {
  const suivi = useSuiviJeu(compteId, JEU_GESTION_ID);
  const [progression, setProgression] = useState(progressionVide);
  const [restaure, setRestaure] = useState(!compteId);
  const [revision, setRevision] = useState(false);
  const [choisie, setChoisie] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; texte: string } | null>(null);
  const [calcul, setCalcul] = useState(["", "", ""]);
  const [correctionCalcul, setCorrectionCalcul] = useState(false);
  const [erreurCalcul, setErreurCalcul] = useState(false);
  useEffect(() => {
    if (restaure || !["a_faire", "confirme"].includes(suivi.etat)) return;
    setProgression(lireProgression(suivi.reponses)); setRestaure(true);
  }, [restaure, suivi.etat, suivi.reponses]);
  const busy = Boolean(compteId) && (!restaure || suivi.etat === "envoi" || suivi.etat === "lecture_impossible");
  const enregistrer = (p: ReturnType<typeof progressionVide>) => {
    setProgression(p);
    if (compteId && !revision && suivi.etat !== "confirme") void suivi.enregistrer({ ...p, version: 1 }, jeuTermine(p));
  };
  const classer = (id: string | null, zone: Zone) => {
    const carte = CARTES.find(c => c.id === id);
    if (!carte || busy || progression.placements[carte.id]) return;
    const ok = carte.zone === zone;
    enregistrer(placer(progression, carte.id, zone));
    setFeedback({ ok, texte: `${ok ? "Exact" : "À revoir"} : ${carte.titre} → ${ZONES.find(z => z.id === carte.zone)?.titre} · ${carte.categorie}. ${carte.explication}` });
    if (ok) setChoisie(null); else setChoisie(carte.id);
  };
  const statut = !compteId ? "Aperçu · progression non enregistrée" : revision ? "Nouvel entraînement · progression conservée" : suivi.etat === "envoi" ? "Enregistrement en cours…" : suivi.etat === "confirme" ? "Terminé · confirmé par le serveur" : suivi.etat === "lecture_impossible" ? "Lecture impossible · aucun envoi" : suivi.etat === "attente_locale" ? "En attente de confirmation du serveur" : "Progression facultative";
  return <div className="space-y-6" aria-label="Plateau de classement comptable">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3"><Trophy className="h-5 w-5 text-warning" /><strong>Score : {scoreClassement(progression)} / {CARTES.length}</strong><span className="text-sm text-muted-foreground">{Object.keys(progression.placements).length} / {CARTES.length} classées</span></div>
      <Button variant="outline" onClick={() => { setRevision(true); setProgression(progressionVide()); setChoisie(null); setFeedback(null); setCalcul(["", "", ""]); setCorrectionCalcul(false); setErreurCalcul(false); }} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Recommencer</Button>
    </div>
    <Badge variant="outline" role="status">{statut}</Badge>
    {suivi.etat === "lecture_impossible" && <p className="text-sm text-destructive">Fermez puis rouvrez le jeu pour réessayer la lecture. Votre progression enregistrée reste conservée.</p>}
    <details className="border-b pb-4" open><summary className="cursor-pointer font-semibold">Hypothèses de classement</summary><p className="mt-2 text-sm text-muted-foreground">Société, activité professionnelle, charges et produits de l’exercice ; bilan à la clôture avant affectation du résultat, bénéfice positif, banque sans découvert. Entretien courant, carburant consommé, honoraires et abonnement de l’exercice. Les deux téléphones sont deux situations alternatives : achat de faible valeur avec traitement en charge applicable et choisi, ou bien immobilisé utilisé durablement. Les charges ne sont pas les dettes restant à payer. Le score compte uniquement les classements exacts au premier essai ; vous pouvez corriger les autres cartes.</p></details>
    <div className="flex flex-wrap gap-2" aria-label="Cartes à classer">{CARTES.filter(c => !progression.placements[c.id]).map(c => <Button key={c.id} variant={choisie === c.id ? "default" : "outline"} className="h-auto min-h-11 max-w-full whitespace-normal text-left justify-start" aria-pressed={choisie === c.id} disabled={busy} draggable={!busy} onDragStart={e => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; setChoisie(c.id); }} onClick={() => setChoisie(c.id)}><GripVertical className="mr-2 h-4 w-4 shrink-0" />{c.titre}</Button>)}</div>
    <p className="min-h-6 text-sm font-semibold" aria-live="polite">{choisie ? `Carte sélectionnée : ${CARTES.find(c => c.id === choisie)?.titre}` : jeuTermine(progression) ? "Classement et calcul terminés." : "Classement comptable"}</p>
    {feedback && <p role="status" className={`border-l-4 p-3 text-sm ${feedback.ok ? "border-success bg-success/5 text-foreground" : "border-destructive bg-destructive/5 text-foreground"}`}>{feedback.texte}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{ZONES.map((z, index) => <section key={z.id} aria-label={z.sousTitre + " / " + z.titre} onDragOver={e => { if (!busy) e.preventDefault(); }} onDrop={e => { e.preventDefault(); classer(e.dataTransfer.getData("text/plain"), z.id); }} className={`min-h-44 border rounded-lg p-4 ${index === 0 ? "border-destructive/40 bg-destructive/5" : index === 1 ? "border-success/40 bg-success/5" : index === 2 ? "border-primary/40 bg-primary/5" : "border-warning/40 bg-warning/5"}`}>
      <p className="text-xs font-semibold text-muted-foreground">{z.sousTitre}</p><h4 className="my-1 text-xl font-bold">{z.titre}</h4>
      <Button variant="outline" className="w-full my-2 min-h-11" aria-label={`Classer dans ${z.titre}`} disabled={!choisie || busy} onClick={() => classer(choisie, z.id)}>Classer ici</Button>
      <ul className="space-y-2">{CARTES.filter(c => progression.placements[c.id] === z.id).map(c => <li key={c.id} className="border-t pt-2 text-sm"><span className="flex items-start gap-2 font-medium"><CheckCircle2 className="h-4 w-4 shrink-0 text-success mt-0.5" />{c.titre}</span><span className="block ml-6 text-xs text-muted-foreground">{c.categorie}</span></li>)}</ul>
    </section>)}</div>
    <details className="border-b pb-4"><summary className="cursor-pointer font-semibold">Corrigé pédagogique des 19 cartes</summary><dl className="mt-3 space-y-3">{CARTES.map(c => <div key={c.id}><dt className="font-semibold text-sm">{c.titre} · {c.categorie}</dt><dd className="text-sm text-muted-foreground">{c.explication}</dd></div>)}</dl></details>
    <section className="border-t pt-5 space-y-4" aria-label="Calcul d’amortissement">
      <h4 className="text-xl font-bold flex items-center gap-2"><Calculator className="h-5 w-5" />Le véhicule : du brut au net</h4>
      <p className="text-sm">Véhicule immobilisé pour {euro(A.brut)}, amortissement linéaire sur {A.duree} ans. Mise en service au début de l’exercice, trois années pleines écoulées, valeur résiduelle nulle ; aucune cession ni dépréciation. Montant amortissable retenu de {euro(A.brut)}, sans calcul fiscal ni TVA dans cet exemple.</p>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); const ok = calculCorrect(calcul); setErreurCalcul(!ok); setCorrectionCalcul(true); if (ok && !busy) enregistrer({ ...progression, calcul: true }); }}>
        {["Dotation annuelle (€)", "Amortissements cumulés après 3 ans (€)", "Valeur nette comptable après 3 ans (€)"].map((label, i) => <div key={label}><Label htmlFor={`gestion-calcul-${i}`}>{label}</Label><Input id={`gestion-calcul-${i}`} inputMode="decimal" value={calcul[i]} disabled={busy || progression.calcul} onChange={e => setCalcul(v => v.map((x, j) => j === i ? e.target.value : x))} /></div>)}
        <Button type="submit" disabled={busy || progression.calcul}>Vérifier le calcul</Button>
      </form>
      {(correctionCalcul || progression.calcul) && <div role="status" className="border-l-4 border-primary bg-primary/5 p-4 space-y-2 text-sm"><strong>{erreurCalcul ? "Vérifiez vos montants." : "Calcul exact."}</strong><p>{euro(A.brut)} ÷ {A.duree} = <strong>{euro(A.annuel)} de charge annuelle</strong> au compte de résultat.</p><p>{A.annees} × {euro(A.annuel)} = <strong>{euro(A.cumule)} d’amortissements cumulés</strong>.</p><p>Au bilan : brut {euro(A.brut)} − amortissements {euro(A.cumule)} = <strong>net {euro(A.net)}</strong> à l’actif. Les amortissements sont une correction de l’actif, pas un élément du passif. Ce calcul ne représente pas un solde bancaire.</p></div>}
    </section>
    <section className="border-t pt-5 space-y-3" aria-label="Exemples indépendants">
      <h4 className="text-xl font-bold flex items-center gap-2"><Landmark className="h-5 w-5" />Deux exemples indépendants</h4>
      <p className="text-sm">L’exemple de compte de résultat aboutit à un résultat net de <strong>12 461 €</strong>. Le bilan ci-dessous appartient à un autre exemple, avec un bénéfice de <strong>20 000 €</strong>. Ils ne décrivent pas le même exercice ni la même entreprise. Le véhicule du mini-calcul est aussi un cas distinct.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">{(["actif", "passif"] as const).map(side => <div key={side}><h5 className="font-bold capitalize">{side === "actif" ? "Actif · valeurs nettes" : "Passif"}</h5><dl className="mt-2 space-y-2 text-sm">{BILAN_EXEMPLE[side].map(l => <div key={l.libelle} className="flex justify-between gap-3"><dt>{l.libelle}</dt><dd className="whitespace-nowrap tabular-nums">{euro(l.montant)}</dd></div>)}</dl><p className="flex justify-between gap-3 mt-3 border-t pt-2 font-bold">Total {side}<span>{euro(totalBilan(BILAN_EXEMPLE[side]))}</span></p></div>)}</div>
      <p className="text-sm text-success font-semibold">Actif net 40 000 € = passif 40 000 €.</p><p className="text-xs text-muted-foreground">Véhicule : 6 000 € nets ; téléphone : 200 € nets, immobilisé dans cet exemple. Les valeurs brutes et amortissements de ces deux biens ne sont pas donnés : ils ne sont pas inventés. Stocks, emprunts et dettes fournisseurs sont nuls dans ce seul exemple.</p>
    </section>
  </div>;
}

export default function JeuClassementComptable({ compteId }: { compteId?: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  return <section className="border-y py-4 space-y-3" aria-label="Jeu Gestion : classement comptable">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Classement comptable</h3><Badge variant="outline">Entraînement facultatif</Badge></div>
    <Button variant="outline" aria-expanded={ouvert} onClick={() => setOuvert(v => !v)}>{ouvert ? "Fermer le jeu comptable" : "Ouvrir le jeu comptable"}</Button>
    {ouvert && <PlateauComptable key={compteId ?? "apercu"} compteId={compteId} />}
  </section>;
}