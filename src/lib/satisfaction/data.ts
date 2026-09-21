import { supabase } from "@/integrations/supabase/client";

export interface CritereReponse {
  label: string;
  value: number | null;
}

export interface PartieReponse {
  titre: string;
  criteres: CritereReponse[];
}

export interface EnqueteSatisfaction {
  id: string;
  apprenantId: string | null;
  nom: string;
  prenom: string;
  email: string;
  formation: string;
  date: string; // ISO
  annee: number;
  noteGlobale: number | null;
  moyenneCriteres: number | null;
  complete: boolean;
  parties: PartieReponse[];
}

const FORMATION_LABELS: Record<string, string> = {
  vtc: "VTC",
  taxi: "TAXI",
  ta: "Passerelle TA",
  va: "Passerelle VA",
};

export const formationLabel = (t?: string | null) =>
  (t && FORMATION_LABELS[String(t).toLowerCase()]) || (t ? String(t).toUpperCase() : "—");

const asParties = (raw: unknown): PartieReponse[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => ({
      titre: String(p.titre ?? ""),
      criteres: Array.isArray(p.criteres)
        ? (p.criteres as Record<string, unknown>[]).map((c) => ({
            label: String(c?.label ?? ""),
            value: typeof c?.value === "number" ? (c.value as number) : null,
          }))
        : [],
    }));
};

export async function loadEnquetes(): Promise<EnqueteSatisfaction[]> {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("apprenant_documents_completes")
      .select("id, apprenant_id, donnees, created_at, completed_at, updated_at")
      .eq("type_document", "satisfaction")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < pageSize) break;
  }

  const ids = Array.from(
    new Set(rows.map((r) => r.apprenant_id).filter((v): v is string => typeof v === "string")),
  );
  const apprenants = new Map<string, { nom: string; prenom: string; email: string; type: string }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, email, type_apprenant")
      .in("id", ids.slice(i, i + 200));
    (data ?? []).forEach((a) =>
      apprenants.set(a.id, {
        nom: a.nom ?? "",
        prenom: a.prenom ?? "",
        email: a.email ?? "",
        type: a.type_apprenant ?? "",
      }),
    );
  }

  return rows.map((r) => {
    const donnees = (r.donnees ?? {}) as Record<string, unknown>;
    const parties = asParties(donnees.parties);
    const valeurs = parties.flatMap((p) => p.criteres.map((c) => c.value)).filter((v): v is number => typeof v === "number");
    const appr = typeof r.apprenant_id === "string" ? apprenants.get(r.apprenant_id) : undefined;
    const date = String(r.completed_at ?? r.created_at ?? r.updated_at ?? "");
    const formationType = typeof donnees.formationType === "string" ? donnees.formationType : appr?.type ?? "";
    return {
      id: String(r.id),
      apprenantId: typeof r.apprenant_id === "string" ? r.apprenant_id : null,
      nom: appr?.nom ?? "",
      prenom: appr?.prenom ?? "",
      email: appr?.email ?? "",
      formation: formationLabel(formationType),
      date,
      annee: date ? new Date(date).getFullYear() : 0,
      noteGlobale: typeof donnees.noteGlobale === "number" ? (donnees.noteGlobale as number) : null,
      moyenneCriteres: valeurs.length ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : null,
      complete: donnees._status === "completed",
      parties,
    } satisfies EnqueteSatisfaction;
  });
}

export interface CritereStat {
  partie: string;
  label: string;
  moyenne: number;
  reponses: number;
  satisfaits: number; // % de notes >= 4
}

export function statsParCritere(enquetes: EnqueteSatisfaction[]): CritereStat[] {
  const map = new Map<string, { partie: string; label: string; total: number; n: number; sat: number }>();
  for (const e of enquetes) {
    for (const p of e.parties) {
      for (const c of p.criteres) {
        if (typeof c.value !== "number") continue;
        const key = `${p.titre}|${c.label}`;
        const cur = map.get(key) ?? { partie: p.titre, label: c.label, total: 0, n: 0, sat: 0 };
        cur.total += c.value;
        cur.n += 1;
        if (c.value >= 4) cur.sat += 1;
        map.set(key, cur);
      }
    }
  }
  return Array.from(map.values()).map((v) => ({
    partie: v.partie,
    label: v.label,
    moyenne: v.total / v.n,
    reponses: v.n,
    satisfaits: (v.sat / v.n) * 100,
  }));
}

export interface RapportAnnuel {
  annee: number;
  enquetes: EnqueteSatisfaction[];
  nbReponses: number;
  noteGlobaleMoyenne: number | null;
  moyenneCriteres: number | null;
  tauxSatisfaction: number | null; // % de critères notés >= 4
  recommandation: number | null; // moyenne du critère "recommanderais"
  parFormation: { formation: string; nb: number; moyenne: number | null }[];
  parMois: { mois: number; nb: number; moyenne: number | null }[];
  criteres: CritereStat[];
}

const moy = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);

export function buildRapportAnnuel(all: EnqueteSatisfaction[], annee: number): RapportAnnuel {
  const enquetes = all.filter((e) => e.annee === annee);
  const criteres = statsParCritere(enquetes);
  const totalNotes = criteres.reduce((a, c) => a + c.reponses, 0);
  const totalSat = criteres.reduce((a, c) => a + (c.satisfaits / 100) * c.reponses, 0);
  const reco = criteres.filter((c) => /recommander/i.test(c.label));

  const formations = Array.from(new Set(enquetes.map((e) => e.formation)));
  return {
    annee,
    enquetes,
    nbReponses: enquetes.length,
    noteGlobaleMoyenne: moy(enquetes.map((e) => e.noteGlobale).filter((v): v is number => typeof v === "number")),
    moyenneCriteres: moy(enquetes.map((e) => e.moyenneCriteres).filter((v): v is number => typeof v === "number")),
    tauxSatisfaction: totalNotes ? (totalSat / totalNotes) * 100 : null,
    recommandation: reco.length ? moy(reco.map((c) => c.moyenne)) : null,
    parFormation: formations.map((f) => {
      const sub = enquetes.filter((e) => e.formation === f);
      return {
        formation: f,
        nb: sub.length,
        moyenne: moy(sub.map((e) => e.moyenneCriteres).filter((v): v is number => typeof v === "number")),
      };
    }),
    parMois: Array.from({ length: 12 }, (_, i) => {
      const sub = enquetes.filter((e) => e.date && new Date(e.date).getMonth() === i);
      return {
        mois: i + 1,
        nb: sub.length,
        moyenne: moy(sub.map((e) => e.moyenneCriteres).filter((v): v is number => typeof v === "number")),
      };
    }),
    criteres,
  };
}
