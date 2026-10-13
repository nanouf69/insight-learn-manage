import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as RPE, type KeyboardEvent as RKE } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { LYON_GEO } from "./lyon-geo-data";

export type Touche = { x: number; y: number; arrondissement: number | null; zones: string[] };

type Props = {
  /** "arr" : arrondissements cliquables ; "zones" : quartiers cliquables ; "point" : placement libre. */
  cible: "arr" | "zones" | "point";
  onTouche: (t: Touche) => void;
  surlignerArr?: { numero: number; ton: "ok" | "ko" | "info" }[];
  surlignerZones?: { id: string; ton: "ok" | "ko" | "info" }[];
  afficherNumerosArr?: boolean;
  afficherZones?: boolean;
  calques?: ReactNode;
  desactive?: boolean;
};

const W = LYON_GEO.W, H = LYON_GEO.H;
const TON: Record<string, string> = {
  ok: "fill-success/40 stroke-success",
  ko: "fill-destructive/30 stroke-destructive",
  info: "fill-warning/30 stroke-warning",
};
const LETTRES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function CarteLyon({ cible, onTouche, surlignerArr = [], surlignerZones = [], afficherNumerosArr, afficherZones, calques, desactive }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arrRefs = useRef<Record<number, SVGPathElement | null>>({});
  const zoneRefs = useRef<Record<string, SVGPathElement | null>>({});
  const [vb, setVb] = useState({ x: 0, y: 0, w: W, h: H });
  const [curseur, setCurseur] = useState<{ x: number; y: number } | null>(null);
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<{ bouge: boolean; depart: { x: number; y: number }; vb: typeof vb; dist?: number } | null>(null);

  // Ordre des zones au clavier mélangé une fois (les libellés « Zone A… » ne révèlent pas la réponse).
  const ordreArr = useMemo(() => [...LYON_GEO.arr].sort(() => Math.random() - 0.5), []);
  const ordreZones = useMemo(() => [...LYON_GEO.zones].sort(() => Math.random() - 0.5), []);

  const zoomer = useCallback((f: number, cx?: number, cy?: number) => {
    setVb((v) => {
      const w = Math.min(W, Math.max(W / 8, v.w * f));
      const h = (w * H) / W;
      const px = cx ?? v.x + v.w / 2, py = cy ?? v.y + v.h / 2;
      const x = Math.min(W - w, Math.max(0, px - ((px - v.x) * w) / v.w));
      const y = Math.min(H - h, Math.max(0, py - ((py - v.y) * h) / v.h));
      return { x, y, w, h };
    });
  }, []);

  const versCarte = (clientX: number, clientY: number) => {
    const svg = svgRef.current; if (!svg) return null;
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const tester = (x: number, y: number): Touche => {
    const pt = new DOMPoint(x, y);
    let arrondissement: number | null = null;
    for (const a of LYON_GEO.arr) {
      const el = arrRefs.current[a.numero];
      if (el && el.isPointInFill(pt)) { arrondissement = a.numero; break; }
    }
    const zones: string[] = [];
    for (const z of LYON_GEO.zones) {
      const el = zoneRefs.current[z.id];
      // bordure tolérante : remplissage OU trait épais invisible (~15 m par unité → ≈ 120 m)
      if (el && (el.isPointInFill(pt) || el.isPointInStroke(pt))) zones.push(z.id);
    }
    return { x, y, arrondissement, zones };
  };

  const onDown = (e: RPE<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointeurs.current.values()];
    geste.current = { bouge: pts.length > 1, depart: { x: e.clientX, y: e.clientY }, vb, dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined };
  };
  const onMove = (e: RPE<SVGSVGElement>) => {
    if (!pointeurs.current.has(e.pointerId) || !geste.current) return;
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointeurs.current.values()];
    const svg = svgRef.current; if (!svg) return;
    const echelle = geste.current.vb.w / svg.clientWidth;
    if (pts.length === 2 && geste.current.dist) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const g = geste.current.vb; const w = Math.min(W, Math.max(W / 8, (g.w * geste.current.dist) / d));
      const h = (w * H) / W; const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      setVb({ x: Math.min(W - w, Math.max(0, cx - w / 2)), y: Math.min(H - h, Math.max(0, cy - h / 2)), w, h });
      geste.current.bouge = true; return;
    }
    const dx = e.clientX - geste.current.depart.x, dy = e.clientY - geste.current.depart.y;
    if (!geste.current.bouge && Math.hypot(dx, dy) < 8) return;
    geste.current.bouge = true;
    const g = geste.current.vb;
    setVb({ ...g, x: Math.min(W - g.w, Math.max(0, g.x - dx * echelle)), y: Math.min(H - g.h, Math.max(0, g.y - dy * echelle)) });
  };
  const onUp = (e: RPE<SVGSVGElement>) => {
    const g = geste.current;
    pointeurs.current.delete(e.pointerId);
    if (pointeurs.current.size > 0) return;
    geste.current = null;
    if (!g || g.bouge || desactive) return;
    const p = versCarte(e.clientX, e.clientY); if (!p) return;
    setCurseur(p);
    onTouche(tester(p.x, p.y));
  };

  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = versCarte(e.clientX, e.clientY);
      zoomer(e.deltaY > 0 ? 1.2 : 1 / 1.2, p?.x, p?.y);
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [zoomer]);

  const onKeySvg = (e: RKE<SVGSVGElement>) => {
    if (cible !== "point" || desactive) return;
    const pas = vb.w / 40;
    const c = curseur ?? { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
    const m: Record<string, [number, number]> = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] };
    if (m[e.key]) { e.preventDefault(); setCurseur({ x: c.x + m[e.key][0], y: c.y + m[e.key][1] }); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCurseur(c); onTouche(tester(c.x, c.y)); }
  };

  const k = vb.w / W; // facteur pour garder traits/textes lisibles au zoom
  const sArr = new Map(surlignerArr.map((s) => [s.numero, s.ton]));
  const sZone = new Map(surlignerZones.map((s) => [s.id, s.ton]));

  return (
    <div className="relative w-full rounded-xl border bg-card overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="w-full h-auto max-h-[62vh] touch-none select-none bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ aspectRatio: `${W} / ${H}` }}
        role="application"
        aria-label={cible === "point" ? "Carte de Lyon : flèches pour déplacer le repère, Entrée pour placer" : "Carte de Lyon"}
        tabIndex={cible === "point" ? 0 : -1}
        onKeyDown={onKeySvg}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={(e) => { pointeurs.current.delete(e.pointerId); geste.current = null; }}
      >
        {/* Arrondissements (contours officiels) */}
        {LYON_GEO.arr.map((a) => {
          const ton = sArr.get(a.numero);
          return (
            <path key={a.numero} ref={(el) => (arrRefs.current[a.numero] = el)} d={a.d}
              className={ton ? TON[ton] : "fill-card stroke-foreground/50"} strokeWidth={1.6 * k} strokeLinejoin="round" />
          );
        })}
        {/* Rhône et Saône */}
        <g className="fill-primary/35 pointer-events-none">{LYON_GEO.eau.map((d, i) => <path key={i} d={d} />)}</g>
        {/* Quartiers (zones souples) */}
        {LYON_GEO.zones.map((z) => {
          const ton = sZone.get(z.id);
          const visible = afficherZones || ton;
          return (
            <path key={z.id} ref={(el) => (zoneRefs.current[z.id] = el)} d={z.d}
              className={ton ? TON[ton] : visible ? "fill-accent/10 stroke-accent" : "fill-transparent stroke-transparent"}
              strokeWidth={visible ? 1.4 * k : 22 * k} strokeDasharray={visible && !ton ? `${5 * k} ${3 * k}` : undefined}
              style={{ pointerEvents: "none" }} />
          );
        })}
        {afficherNumerosArr && LYON_GEO.arr.map((a) => (
          <text key={a.numero} x={a.lx} y={a.ly} textAnchor="middle" dominantBaseline="middle"
            className="fill-foreground font-bold pointer-events-none" style={{ fontSize: 26 * k, paintOrder: "stroke" }}
            stroke="hsl(var(--card))" strokeWidth={4 * k}>{a.numero === 1 ? "1er" : `${a.numero}e`}</text>
        ))}
        <text x={vb.x + vb.w * 0.5} y={vb.y + vb.h * 0.06} className="hidden" />
        {calques && <g className="pointer-events-none">{typeof calques === "function" ? null : calques}</g>}
        {curseur && cible === "point" && (
          <g className="pointer-events-none">
            <circle cx={curseur.x} cy={curseur.y} r={7 * k} className="fill-foreground/80 stroke-card" strokeWidth={2 * k} />
          </g>
        )}
        {/* Cibles clavier (invisibles, libellés neutres) */}
        {cible === "arr" && ordreArr.map((a, i) => (
          <circle key={`k${a.numero}`} cx={a.lx} cy={a.ly} r={1} className="fill-transparent focus:outline-none"
            tabIndex={desactive ? -1 : 0} role="button" aria-label={`Zone ${LETTRES[i]}`}
            onFocus={() => setCurseur({ x: a.lx, y: a.ly })}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTouche(tester(a.lx, a.ly)); } }} />
        ))}
        {cible === "zones" && ordreZones.map((z, i) => (
          <circle key={`k${z.id}`} cx={0} cy={0} r={0.1} tabIndex={desactive ? -1 : 0} role="button" aria-label={`Quartier ${LETTRES[i]}`}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return; e.preventDefault();
              const el = zoneRefs.current[z.id]; if (!el) return; const b = el.getBBox();
              onTouche({ x: b.x + b.width / 2, y: b.y + b.height / 2, arrondissement: null, zones: [z.id] });
            }} />
        ))}
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <Button type="button" size="icon" variant="secondary" aria-label="Zoomer" onClick={() => zoomer(1 / 1.5)}><Plus className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Dézoomer" onClick={() => zoomer(1.5)}><Minus className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Recentrer" onClick={() => setVb({ x: 0, y: 0, w: W, h: H })}><RotateCcw className="h-4 w-4" /></Button>
      </div>
      <p className="absolute left-2 bottom-1 text-[10px] text-muted-foreground bg-card/80 px-1 rounded">
        Données : Métropole de Lyon (data.grandlyon.com), Base Adresse Nationale — Licence Ouverte
      </p>
    </div>
  );
}

export const UNITE_ZOOM = (vbw: number) => vbw / W;
