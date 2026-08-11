export type JourneePresentiel = { date: string; label?: string };

/**
 * Construit la liste des journees realisees en presentiel :
 * - theorie : a partir des emargements (emargements_fc) non absents
 * - pratique : a partir des sessions de type "pratique" auxquelles l'apprenant est inscrit
 */
export function buildJourneesPresentiel(
  emargements: any[] | null | undefined,
  sessionsInscrites: any[] | null | undefined,
): JourneePresentiel[] {
  const out: JourneePresentiel[] = [];

  const byDate = new Map<string, Set<string>>();
  for (const r of emargements || []) {
    if (r?.absent) continue;
    const date = String(r?.date_emargement || "").slice(0, 10);
    const slot = String(r?.demi_journee || "").trim().toLowerCase();
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, new Set());
    if (slot) byDate.get(date)!.add(slot);
  }
  for (const [d, slots] of byDate.entries()) {
    const labels: string[] = [];
    if (slots.has("matin")) labels.push("matin");
    if (slots.has("apres_midi")) labels.push("apres-midi");
    if (slots.has("soir") || slots.has("soir_1") || slots.has("soir_2")) labels.push("soir");
    out.push({ date: d, label: `theorie${labels.length ? " " + labels.join("+") : ""}` });
  }

  for (const si of sessionsInscrites || []) {
    const sess = si?.sessions || si;
    const type = String(sess?.type_session || "").toLowerCase();
    if (!type.includes("pratique")) continue;
    const d = String(sess?.date_debut || "").slice(0, 10);
    if (d) out.push({ date: d, label: "pratique" });
  }

  const seen = new Set<string>();
  return out
    .filter((j) => {
      const k = `${j.date}|${j.label || ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
