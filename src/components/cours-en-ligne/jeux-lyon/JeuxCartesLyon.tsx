// Deux jeux cartographiques — module PRATIQUE VTC (id 8, partagé avec les parcours VA).
// Entraînement complémentaire : ne crée aucune obligation, n'écrit rien sur le serveur,
// ne touche ni aux quiz, ni aux notes, ni à la progression, aux heures ou aux relevés figés.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, MapPin, Map as MapIcon, Landmark, RefreshCw, XCircle, Trophy } from "lucide-react";
import { CarteLyon, type Touche } from "./CarteLyon";
import { LYON_GEO, type LieuLyon } from "./lyon-geo-data";
import {
  MAX_ESSAIS, enregistrerMeilleurScore, evaluerArrondissement, evaluerLieu, evaluerQuartier,
  ficheLieu, libelleArrondissement, libelleArrondissements, lireMeilleurScore, melanger, pointsEssai,
} from "./jeuxLyonLogic";

type Ton = "ok" | "ko" | "info";
type Item = { id: string; libelle: string };
type Ligne = { item: Item; juste: boolean; points: number; detail: string };

function store(): Storage | null { try { return window.localStorage; } catch { return null; } }

function useMeilleur(compteId: string | null | undefined, jeu: string) {
  const [m, setM] = useState(() => { const s = store(); return s ? lireMeilleurScore(s, compteId, jeu) : null; });
  const enregistrer = (score: number, total: number) => {
    const s = store(); if (!s) return;
    if (enregistrerMeilleurScore(s, compteId, jeu, { score, total, date: new Date().toISOString() })) setM(lireMeilleurScore(s, compteId, jeu));
  };
  return [m, enregistrer] as const;
}

function Etiquettes({ items, choisi, onChoisir, desactive }: { items: Item[]; choisi: string | null; onChoisir: (id: string) => void; desactive?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 rounded-lg" role="listbox" aria-label="Étiquettes à placer">
      {items.map((it) => (
        <button key={it.id} type="button" role="option" aria-selected={choisi === it.id} disabled={desactive}
          onClick={() => onChoisir(it.id)}
          className={`min-h-11 px-3 py-2 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${choisi === it.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"}`}>
          {it.libelle}
        </button>
      ))}
    </div>
  );
}

function Correction({ lignes, total, onRejouer, suite }: { lignes: Ligne[]; total: number; onRejouer: () => void; suite?: { libelle: string; action: () => void } }) {
  const score = lignes.reduce((s, l) => s + l.points, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-4">
        <Trophy className="h-6 w-6 text-warning" />
        <p className="font-semibold">Score : {score.toLocaleString("fr-FR")} / {total} <span className="text-muted-foreground font-normal text-sm">(1 point au 1er essai, 0,5 au 2e)</span></p>
      </div>
      <div className="rounded-xl border divide-y">
        {lignes.map((l) => (
          <div key={l.item.id} className="flex items-start gap-2 p-3 text-sm">
            {l.juste ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />}
            <div><p className="font-medium">{l.item.libelle}</p><p className="text-muted-foreground">{l.detail}</p></div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onRejouer} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" />Rejouer (nouveau mélange)</Button>
        {suite && <Button onClick={suite.action}>{suite.libelle}</Button>}
      </div>
    </div>
  );
}

// ================= JEU 1 =================
function JeuArrondissements({ compteId }: { compteId?: string | null }) {
  const [niveau, setNiveau] = useState<1 | 2>(1);
  const [apprentissage, setApprentissage] = useState(false);
  const [tour, setTour] = useState(0);
  const items = useMemo<Item[]>(() => melanger(niveau === 1
    ? LYON_GEO.arr.map((a) => ({ id: String(a.numero), libelle: libelleArrondissement(a.numero) }))
    : LYON_GEO.zones.map((z) => ({ id: z.id, libelle: z.nom }))), [niveau, tour]);
  const [restants, setRestants] = useState<Item[]>(items);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [essai, setEssai] = useState(1);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [retour, setRetour] = useState<{ ton: Ton; texte: string } | null>(null);
  const [sArr, setSArr] = useState<{ numero: number; ton: Ton }[]>([]);
  const [sZones, setSZones] = useState<{ id: string; ton: Ton }[]>([]);
  const [meilleur, enregistrer] = useMeilleur(compteId, `arrondissements-n${niveau}`);

  useEffect(() => { setRestants(items); setChoisi(null); setEssai(1); setLignes([]); setRetour(null); setSArr([]); setSZones([]); }, [items]);

  const termine = restants.length === 0;
  useEffect(() => { if (termine && lignes.length) enregistrer(lignes.reduce((s, l) => s + l.points, 0), lignes.length); }, [termine]); // eslint-disable-line react-hooks/exhaustive-deps

  const valider = (item: Item, juste: boolean, detail: string) => {
    setLignes((l) => (l.some((x) => x.item.id === item.id) ? l : [...l, { item, juste, points: pointsEssai(essai, juste), detail }]));
    setRestants((r) => r.filter((x) => x.id !== item.id));
    setChoisi(null); setEssai(1);
  };

  const onTouche = (t: Touche) => {
    const item = restants.find((x) => x.id === choisi);
    if (!item) { setRetour({ ton: "info", texte: "Choisissez d'abord une étiquette, puis touchez la carte." }); return; }
    if (niveau === 1) {
      const attendu = Number(item.id);
      if (t.arrondissement === null) { setRetour({ ton: "info", texte: "Touchez l'intérieur d'un arrondissement de Lyon (zone hors de Lyon)." }); return; }
      const juste = evaluerArrondissement(attendu, t.arrondissement);
      if (juste) {
        setSArr((s) => [...s, { numero: attendu, ton: "ok" }]);
        setRetour({ ton: "ok", texte: `Exact : ${item.libelle}.` });
        valider(item, true, essai === 1 ? "Placé du premier coup." : "Placé au 2e essai.");
      } else if (essai < MAX_ESSAIS) {
        setEssai(essai + 1);
        setRetour({ ton: "ko", texte: `Non, cette zone est le ${libelleArrondissement(t.arrondissement)}. Encore un essai.` });
      } else {
        setSArr((s) => [...s, { numero: attendu, ton: "ko" }]);
        setRetour({ ton: "ko", texte: `La bonne zone (en rouge) est le ${item.libelle}.` });
        valider(item, false, `Vous aviez touché le ${libelleArrondissement(t.arrondissement)}.`);
      }
    } else {
      const zone = LYON_GEO.zones.find((z) => z.id === item.id)!;
      const juste = evaluerQuartier(zone, t.zones);
      const arr = libelleArrondissements(zone.arrondissements);
      const partage = zone.arrondissements.length > 1 ? ` Ce quartier s'étend sur le ${arr}.` : ` (${arr})`;
      if (juste) {
        setSZones((s) => [...s, { id: zone.id, ton: "ok" }]);
        setRetour({ ton: "ok", texte: `Exact : ${zone.nom}.${partage}` });
        valider(item, true, `${zone.nom} — ${arr}.`);
      } else if (essai < MAX_ESSAIS) {
        setEssai(essai + 1);
        const ici = t.zones.map((id) => LYON_GEO.zones.find((z) => z.id === id)?.nom).filter(Boolean).join(", ");
        setRetour({ ton: "ko", texte: `Pas ici${ici ? ` (vous êtes sur : ${ici})` : t.arrondissement ? ` (${libelleArrondissement(t.arrondissement)})` : ""}. Encore un essai.` });
      } else {
        setSZones((s) => [...s, { id: zone.id, ton: "ko" }]);
        setRetour({ ton: "ko", texte: `${zone.nom} est la zone en rouge.${partage}` });
        valider(item, false, `${zone.nom} — ${arr}.`);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border p-1" role="tablist" aria-label="Niveau">
          <Button size="sm" variant={niveau === 1 ? "default" : "ghost"} role="tab" aria-selected={niveau === 1} onClick={() => setNiveau(1)}>Niveau 1 · 9 arrondissements</Button>
          <Button size="sm" variant={niveau === 2 ? "default" : "ghost"} role="tab" aria-selected={niveau === 2} onClick={() => setNiveau(2)}>Niveau 2 · Quartiers</Button>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="appr-arr" checked={apprentissage} onCheckedChange={setApprentissage} />
          <Label htmlFor="appr-arr">Mode apprentissage (afficher les repères)</Label>
        </div>
        {meilleur && <Badge variant="secondary">Meilleur score sur cet appareil : {meilleur.score.toLocaleString("fr-FR")}/{meilleur.total}</Badge>}
      </div>
      {niveau === 2 && (
        <p className="text-xs text-muted-foreground">Les quartiers n'ont pas de frontière officielle : chaque zone reprend les périmètres des conseils de quartier de la Ville de Lyon. La Croix-Rousse (plateau 4e + pentes 1er) et la Presqu'île (1er + 2e) sont acceptées partout dans leur périmètre.</p>
      )}
      {termine ? (
        <Correction lignes={lignes} total={lignes.length} onRejouer={() => setTour((t) => t + 1)}
          suite={niveau === 1 ? { libelle: "Passer au niveau 2 : quartiers", action: () => setNiveau(2) } : undefined} />
      ) : (
        <>
          <p className="text-sm"><strong>1.</strong> Choisissez une étiquette, <strong>2.</strong> touchez sa zone sur la carte. {lignes.length}/{items.length} placées · essai {essai}/{MAX_ESSAIS}</p>
          <Etiquettes items={restants} choisi={choisi} onChoisir={(id) => { setChoisi(id); setEssai(1); setRetour(null); }} />
          {retour && <p role="status" className={`text-sm font-medium ${retour.ton === "ok" ? "text-success" : retour.ton === "ko" ? "text-destructive" : "text-muted-foreground"}`}>{retour.texte}</p>}
        </>
      )}
      <CarteLyon cible={niveau === 1 ? "arr" : "zones"} onTouche={onTouche} surlignerArr={sArr} surlignerZones={sZones}
        afficherNumerosArr={apprentissage || niveau === 2} afficherZones={niveau === 2 && apprentissage} desactive={termine}
        calques={niveau === 2 && apprentissage ? (k) => LYON_GEO.zones.map((z) => {
          const p = new Path2DCentre(z.d);
          return <text key={z.id} x={p.x} y={p.y} textAnchor="middle" className="fill-accent-foreground font-semibold" style={{ fontSize: 18 * k }} stroke="hsl(var(--accent))" strokeWidth={3 * k} paintOrder="stroke">{z.nom.split(" (")[0]}</text>;
        }) : undefined} />
    </div>
  );
}

/** Centre approximatif (boîte englobante) d'un tracé SVG « M…L…Z ». */
class Path2DCentre {
  x: number; y: number;
  constructor(d: string) {
    const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [0, 0];
    const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
    this.x = (Math.min(...xs) + Math.max(...xs)) / 2; this.y = (Math.min(...ys) + Math.max(...ys)) / 2;
  }
}

// ================= JEU 2 =================
function JeuLieux({ compteId }: { compteId?: string | null }) {
  const [tour, setTour] = useState(0);
  const [apprentissage, setApprentissage] = useState(false);
  const lieux = useMemo(() => melanger(LYON_GEO.lieux), [tour]);
  const [restants, setRestants] = useState<LieuLyon[]>(lieux);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [essai, setEssai] = useState(1);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [retour, setRetour] = useState<{ ton: Ton; texte: string; fiche?: string } | null>(null);
  const [traces, setTraces] = useState<{ lieu: LieuLyon; x: number; y: number; juste: boolean }[]>([]);
  const [meilleur, enregistrer] = useMeilleur(compteId, "lieux");

  useEffect(() => { setRestants(lieux); setChoisi(null); setEssai(1); setLignes([]); setRetour(null); setTraces([]); }, [lieux]);
  const termine = restants.length === 0;
  useEffect(() => { if (termine && lignes.length) enregistrer(lignes.reduce((s, l) => s + l.points, 0), lignes.length); }, [termine]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTouche = (t: Touche) => {
    const lieu = restants.find((l) => l.id === choisi);
    if (!lieu) { setRetour({ ton: "info", texte: "Choisissez d'abord un lieu, puis touchez la carte." }); return; }
    const r = evaluerLieu(lieu, t.x, t.y);
    const dist = r.distanceM >= 1000 ? `${(r.distanceM / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km` : `${r.distanceM} m`;
    const fiche = ficheLieu(lieu);
    const finir = (juste: boolean, detail: string) => {
      setLignes((l) => (l.some((x) => x.item.id === lieu.id) ? l : [...l, { item: { id: lieu.id, libelle: lieu.nom }, juste, points: pointsEssai(essai, juste), detail }]));
      setTraces((tr) => [...tr, { lieu, x: t.x, y: t.y, juste }]);
      setRestants((rs) => rs.filter((x) => x.id !== lieu.id)); setChoisi(null); setEssai(1);
    };
    if (r.juste) { setRetour({ ton: "ok", texte: `Bien placé (à ${dist}).`, fiche }); finir(true, `${fiche} · ${lieu.adresse}`); }
    else if (essai < MAX_ESSAIS) { setEssai(essai + 1); setRetour({ ton: "ko", texte: r.proche ? `Presque : à ${dist}. Encore un essai.` : `Trop loin : à ${dist}. Encore un essai.` }); }
    else { setRetour({ ton: "ko", texte: `À ${dist}. Le bon emplacement est indiqué sur la carte.`, fiche }); finir(false, `${fiche} · ${lieu.adresse}`); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="appr-lieux" checked={apprentissage} onCheckedChange={setApprentissage} />
          <Label htmlFor="appr-lieux">Mode apprentissage (afficher tous les lieux)</Label>
        </div>
        {meilleur && <Badge variant="secondary">Meilleur score sur cet appareil : {meilleur.score.toLocaleString("fr-FR")}/{meilleur.total}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">Juste à moins de 400 m (la précision au mètre n'est pas demandée). Villeurbanne est une commune limitrophe, pas un arrondissement de Lyon.</p>
      {termine ? (
        <Correction lignes={lignes} total={lignes.length} onRejouer={() => setTour((t) => t + 1)} />
      ) : (
        <>
          <p className="text-sm"><strong>1.</strong> Choisissez un lieu, <strong>2.</strong> touchez son emplacement. {lignes.length}/{lieux.length} placés · essai {essai}/{MAX_ESSAIS}</p>
          <Etiquettes items={restants.map((l) => ({ id: l.id, libelle: l.nom }))} choisi={choisi} onChoisir={(id) => { setChoisi(id); setEssai(1); setRetour(null); }} />
        </>
      )}
      {retour && (
        <div role="status" className={`rounded-lg border p-3 text-sm ${retour.ton === "ok" ? "border-success/40 bg-success/10" : retour.ton === "ko" ? "border-destructive/40 bg-destructive/10" : "bg-muted/40"}`}>
          <p className="font-medium">{retour.texte}</p>
          {retour.fiche && <p className="mt-1 flex gap-1"><MapPin className="h-4 w-4 shrink-0 mt-0.5" />{retour.fiche}</p>}
        </div>
      )}
      <CarteLyon cible="point" onTouche={onTouche} afficherNumerosArr desactive={termine}
        calques={(k) => (
          <>
            <text x={880} y={560} textAnchor="middle" className="fill-muted-foreground italic" style={{ fontSize: 20 * k }}>Villeurbanne (commune)</text>
            {apprentissage && LYON_GEO.lieux.map((l, i) => (
              <g key={l.id}>
                <circle cx={l.x} cy={l.y} r={9 * k} className="fill-warning stroke-card" strokeWidth={1.5 * k} />
                <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central" className="fill-warning-foreground font-bold" style={{ fontSize: 10 * k }}>{i + 1}</text>
              </g>
            ))}
            {traces.map((t) => (
              <g key={t.lieu.id}>
                {!t.juste && <line x1={t.x} y1={t.y} x2={t.lieu.x} y2={t.lieu.y} className="stroke-destructive" strokeWidth={1.5 * k} strokeDasharray={`${4 * k} ${3 * k}`} />}
                <circle cx={t.lieu.x} cy={t.lieu.y} r={6 * k} className={t.juste ? "fill-success stroke-card" : "fill-destructive stroke-card"} strokeWidth={1.5 * k} />
              </g>
            ))}
          </>
        )} />
      {apprentissage && (
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs list-decimal pl-5">
          {LYON_GEO.lieux.map((l) => <li key={l.id}>{ficheLieu(l)}</li>)}
        </ol>
      )}
    </div>
  );
}

// ================= ENTRÉE DANS LE MODULE =================
export default function JeuxCartesLyon({ compteId }: { compteId?: string | null }) {
  const [ouvert, setOuvert] = useState<null | "arr" | "lieux">(null);
  const jeux = [
    { id: "arr" as const, titre: "Lyon : arrondissements et quartiers", desc: "Placez les 9 arrondissements puis les principaux quartiers sur la carte.", Icone: MapIcon },
    { id: "lieux" as const, titre: "Lyon : monuments, musées et lieux touristiques", desc: `Placez ${LYON_GEO.lieux.length} lieux et retenez leur quartier et arrondissement.`, Icone: Landmark },
  ];
  return (
    <section className="rounded-xl border bg-card p-4 space-y-3" aria-labelledby="jeux-lyon-titre">
      <div>
        <h3 id="jeux-lyon-titre" className="font-bold">🗺️ Jeux de cartes de Lyon <span className="text-xs font-normal text-muted-foreground">— entraînement libre, non noté dans le module</span></h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {jeux.map(({ id, titre, desc, Icone }) => (
          <button key={id} type="button" onClick={() => setOuvert(id)}
            className="text-left rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center gap-2 font-semibold text-primary"><Icone className="h-5 w-5" />{titre}</div>
            <p className="text-sm text-muted-foreground mt-1">{desc}</p>
          </button>
        ))}
      </div>
      <Dialog open={ouvert !== null} onOpenChange={(o) => !o && setOuvert(null)}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[96vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{jeux.find((j) => j.id === ouvert)?.titre}</DialogTitle>
            <DialogDescription>Glissez la carte pour la déplacer, pincez ou utilisez + / − pour zoomer.</DialogDescription>
          </DialogHeader>
          {ouvert === "arr" && <JeuArrondissements compteId={compteId} />}
          {ouvert === "lieux" && <JeuLieux compteId={compteId} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
