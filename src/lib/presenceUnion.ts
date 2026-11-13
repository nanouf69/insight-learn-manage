import { parseClockMinutes } from './pratiqueSlots';
export interface IntervallePresence { date: string; categorie: string; debut: string; fin: string }
export interface ValidationExacte extends IntervallePresence { id: string; preuve: string; annulee?: boolean }
const dureeUnion = (ranges: number[][]) => {
  let minutes = 0, fin = -1;
  for (const [a, z] of ranges.sort((x,y) => x[0]-y[0])) { minutes += Math.max(0,z-Math.max(a,fin)); fin = Math.max(fin,z); }
  return minutes;
};
/** A private immutable slot receipt proves a range, never a synthetic signature. */
export function unionPresence(signes: IntervallePresence[], validations: ValidationExacte[], prevus: IntervallePresence[]) {
  const groupes = new Map<string, { signes: number[][]; admin: number[][]; prevus: number[][] }>();
  const groupe = (r: IntervallePresence) => {
    const k = `${r.date}|${r.categorie}`;
    if (!groupes.has(k)) groupes.set(k,{signes:[],admin:[],prevus:[]});
    return groupes.get(k);
  };
  const ajouter = (r: IntervallePresence, type: 'signes'|'admin'|'prevus') => {
    const a = parseClockMinutes(r.debut), z = parseClockMinutes(r.fin);
    if (a == null || z == null || z <= a) return;
    groupe(r)?.[type].push([a,z]);
  };
  prevus.forEach(r=>ajouter(r,'prevus')); signes.forEach(r=>ajouter(r,'signes'));
  const vus = new Set<string>();
  validations.forEach(r=>{if(!r.annulee && r.preuve && !vus.has(r.id)){vus.add(r.id);ajouter(r,'admin');}});
  let signesMinutes=0, manuellesMinutes=0, netMinutes=0, theorieMinutes=0, pratiqueMinutes=0;
  for(const [k,g] of groupes){
    const couper=(ranges:number[][])=>ranges.flatMap(([a,z])=>g.prevus.map(([p,q])=>[Math.max(a,p),Math.min(z,q)]).filter(([p,q])=>q>p));
    const s=couper(g.signes), a=couper(g.admin);
    const signed=dureeUnion(s), manual=dureeUnion(a), total=dureeUnion([...s,...a]);
    signesMinutes+=signed;manuellesMinutes+=manual;netMinutes+=total-signed;
    if(k.endsWith('|theorie'))theorieMinutes+=total;
    if(k.endsWith('|pratique'))pratiqueMinutes+=total;
  }
  return { signesMinutes, manuellesMinutes, netMinutes, theorieMinutes, pratiqueMinutes, totalMinutes:signesMinutes+netMinutes };
}