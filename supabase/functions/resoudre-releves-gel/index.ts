// Calcul figé des relevés de jalons, CÔTÉ SERVEUR, appelé par le gel horaire et par
// l'ajout admin d'heures de pratique. Idempotent : ne traite que les gels sans calcul.
// Écrit uniquement dans releve_jalons_calcul_fige (append-only) et alertes_systeme.
// Aucune donnée élève, question ou contenu n'est modifié ; aucun mail/SMS/IA.
import { createClient } from "npm:@supabase/supabase-js@2";
import { CODE_REF } from "./version.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const bilan: any = { calcules: 0, en_attente: 0, echecs: 0, restants: 0 };
  let max = 3; let essai: string | null = null; // petit lot par appel : limite de temps de calcul ; le reste au prochain appel
  try { const b = await req.json(); if (Number.isInteger(b?.max) && b.max > 0 && b.max <= 10) max = b.max; if (typeof b?.essai_gel === "string") essai = b.essai_gel; } catch { /* corps vide */ }
  try {
    // Le calcul regroupé contient du code d'interface : sans page, on évite qu'il cherche un document.
    if (typeof (globalThis as any).document === "undefined") {
      try { delete (globalThis as any).window; } catch { /* non supprimable */ }
      if (typeof (globalThis as any).window !== "undefined") {
        const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, getContext: () => null });
        (globalThis as any).document = { createElement: el, createElementNS: el, head: el(), body: el(), documentElement: el(), addEventListener() {}, querySelector: () => null };
      }
    }
    const { calculerGelInitial, recalculerPratiqueSeule, METHODE_CALCUL_JALONS } = await import("./calcul.bundle.js");
    const { data: gels, error } = await sb.from("releve_jalons_fin_acces")
      .select("id, apprenant_id, version, remplace_id").order("version", { ascending: true }).limit(500);
    if (error) throw error;
    const { data: faits, error: fErr } = await sb.from("releve_jalons_calcul_fige").select("gel_id, calcul");
    if (fErr) throw fErr;
    const calculs = new Map((faits ?? []).map((r: any) => [r.gel_id, r.calcul]));
    const contenus = new Map<string, any>();
    for (const gel of (gels ?? []) as any[]) {
      if (calculs.has(gel.id)) continue;
      if (essai && gel.id !== essai) continue;
      if (bilan.calcules + bilan.echecs >= max) { bilan.restants++; continue; }
      try {
        const { data: g, error: gErr } = await sb.from("releve_jalons_fin_acces").select("contenu, sources").eq("id", gel.id).single();
        if (gErr) throw gErr;
        gel.contenu = g.contenu; gel.sources = g.sources;
        let calcul: any; let base: string | null = null;
        if (gel.version > 1) {
          const prec = calculs.get(gel.remplace_id);
          if (!prec) { bilan.en_attente++; continue; } // la version précédente doit être figée d'abord
          calcul = recalculerPratiqueSeule(prec, gel); base = gel.remplace_id;
        } else {
          const { data: a, error: aErr } = await sb.from("apprenants").select("type_apprenant, formation_choisie").eq("id", gel.apprenant_id).single();
          if (aErr) throw aErr;
          const manquantes = [...new Set(Object.values(gel.contenu ?? {}) as string[])].filter((e) => !contenus.has(e));
          for (let i = 0; i < manquantes.length; i += 20) {
            const { data: rows, error: cErr } = await sb.from("contenu_module_fige")
              .select("empreinte, module_id, module_data, deleted_exercices, deleted_cours, source_updated_at").in("empreinte", manquantes.slice(i, i + 20));
            if (cErr) throw cErr;
            for (const r of rows ?? []) contenus.set(r.empreinte, r);
          }
          calcul = await calculerGelInitial(gel, a, contenus);
        }
        if (essai) {
          // Essai sans écriture : renvoie seulement les chiffres agrégés (aucune donnée personnelle).
          return new Response(JSON.stringify({ essai: true, taux: calcul.resultat.taux, lignes: calcul.resultat.lignes.map((l: any) => [l.moduleId, Math.round(l.poids * 100) / 100, Math.round(l.progression * 100) / 100]), pratique_min: calcul.pratique.minutes, limites: calcul.limites, durees: calcul.durees }), { headers: { ...cors, "Content-Type": "application/json" } });
        }
        const { error: insErr } = await sb.from("releve_jalons_calcul_fige").insert({ gel_id: gel.id, calcul, methode: METHODE_CALCUL_JALONS, code_ref: CODE_REF, base_gel_id: base });
        if (insErr && insErr.code !== "23505") throw insErr;
        calculs.set(gel.id, calcul);
        bilan.calcules++;
      } catch (e) {
        if (essai) return new Response(JSON.stringify({ essai: true, erreur: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
        bilan.echecs++;
        await sb.from("alertes_systeme").insert({ type: "gel_releve_echec", titre: "Calcul figé non réalisé", message: "Le calcul figé d'un relevé a échoué ; nouvel essai à la prochaine exécution horaire.", details: `gel ${gel.id} : ${e instanceof Error ? e.message.slice(0, 200) : "erreur"}` });
      }
    }
    if (bilan.restants > 0 && bilan.calcules > 0) {
      // Lot suivant (même fonction, même code) : jamais de boucle si rien n'avance.
      const suite = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/resoudre-releves-gel`, { method: "POST", headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" }, body: JSON.stringify({ max }) }).catch(() => null);
      (globalThis as any).EdgeRuntime?.waitUntil?.(suite);
    }
    return new Response(JSON.stringify(bilan), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ...bilan, erreur: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
