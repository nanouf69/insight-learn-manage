import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import { format, startOfWeek, endOfWeek, getISOWeek, getYear, addWeeks, isBefore, parseISO } from "date-fns";
import { generateDocumentIndividuelPdf } from "@/lib/pdf/document-individuel";
import {
  ensureDocumentSignatures,
  findSharedStagiaireSignature,
  findSharedStagiaireSignatureName,
} from "@/lib/pdf/document-signatures";
import { generateProgrammeFormationPdf } from "@/lib/pdf/programme-formation";
import { generateEmargementSemainePdf } from "@/lib/pdf/emargement-semaine";
import { generateReleveConnexionsPdf } from "@/lib/pdf/releve-connexions";
import { buildJourneesPresentiel } from "@/lib/pdf/journees-presentiel";
import { enrichConnexionRows } from "@/lib/reports/connexion-detail-rows";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { generateEmailsApprenantPdf, maskPasswords } from "@/lib/pdf/emails-apprenant";
import { buildRapportActiviteHtml } from "@/lib/reports/rapport-activite-html";
import { generateFicheProgression, type FicheProgressionData, type ProgressionModule } from "@/lib/pdf/fiche-progression";
import { getSessionEndMs, getSessionDurationMinutes, clampConnexionsToAccessEnd } from "@/lib/reports/session-duration";
import { fetchPratiqueSlotDetails } from "@/lib/pratiqueSlots";
import { computePresentielHours } from "@/lib/presentielHours";

const escapeCsv = (v: any) => {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",;\n\r]/.test(s) ? `"${s}"` : s;
};
const toCsv = (rows: any[], columns: string[]) => {
  const header = columns.join(";");
  const lines = rows.map(r => columns.map(c => escapeCsv(r[c])).join(";"));
  return "\uFEFF" + [header, ...lines].join("\r\n");
};

export interface BuildDossierResult {
  weeks: number;
  connexions: number;
  emails: number;
}

/**
 * Ajoute la totalité du dossier d'un apprenant dans le dossier ZIP fourni :
 *  - contrôle qualité (formulaires stagiaire)
 *  - programme officiel de formation
 *  - feuilles d'émargement hebdomadaires (avec règle e-learning)
 *  - relevé de connexions (PDF + CSV) + rapport d'activité HTML
 *  - suivi de progression Qualiopi (PDF)
 *  - emails (PDF + CSV)
 */
export async function buildDossierApprenantIntoZip(
  apprenant: any,
  root: JSZip,
  formateur: string,
): Promise<BuildDossierResult> {
  const slug = `${apprenant.prenom || ""}-${apprenant.nom || ""}`
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apprenant";

  // ---------- 1) Documents apprenant (test compétences, projet pro, analyse du besoin) ----------
  const { data: docsData } = await supabase
    .from("apprenant_documents_completes" as any)
    .select("type_document, donnees, completed_at, titre")
    .eq("apprenant_id", apprenant.id);
  const documentsCompletes = (docsData as any[]) || [];
  const getDoc = (t: string) => documentsCompletes.find(d => d.type_document === t);
  const sharedSignature = findSharedStagiaireSignature(documentsCompletes);
  const sharedSignatureName = findSharedStagiaireSignatureName(documentsCompletes);

  const docsIndividuels: { docType: string; titre: string; folder: string }[] = [
    { docType: "test-competences", titre: "Fiche de positionnement stagiaire", folder: "test-competences" },
    { docType: "projet-professionnel", titre: "Questionnaire projet professionnel", folder: "projet-professionnel" },
    { docType: "analyse-besoin", titre: "Analyse du besoin", folder: "analyse-besoin" },
  ];
  for (const it of docsIndividuels) {
    const d = getDoc(it.docType);
    if (!d) continue;
    try {
      const res = generateDocumentIndividuelPdf(
        apprenant,
        {
          type_document: it.docType,
          titre: it.titre,
          donnees: ensureDocumentSignatures(d.donnees, sharedSignature, sharedSignatureName),
          completed_at: d.completed_at,
        },
        { returnBlob: true },
      );
      if (res) root.folder(it.folder)!.file(res.fileName, res.blob);
    } catch (e) { console.error("[dossier] doc individuel failed", it.docType, e); }
  }

  // ---------- 1b) Programme officiel ----------
  try {
    const p = generateProgrammeFormationPdf(apprenant, { returnBlob: true }) as { blob: Blob; fileName: string } | undefined;
    if (p?.blob) root.folder("programme-formation")!.file(p.fileName, p.blob);
  } catch (e) { console.error("[dossier] programme failed", e); }

  // ---------- 2) Feuilles d'émargement hebdomadaires ----------
  const { data: emargData } = await supabase
    .from("emargements_fc" as any)
    .select("*")
    .eq("apprenant_id", apprenant.id)
    .order("date_emargement", { ascending: true });
  const emargements = (emargData as any[]) || [];
  const weekMap = new Map<string, { weekStart: Date; weekEnd: Date; year: number; week: number; sigs: any[] }>();
  const addWeek = (d: Date, sig?: any) => {
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    const we = endOfWeek(d, { weekStartsOn: 1 });
    const year = getYear(ws);
    const week = getISOWeek(ws);
    const key = `${year}-W${String(week).padStart(2, "0")}`;
    if (!weekMap.has(key)) weekMap.set(key, { weekStart: ws, weekEnd: we, year, week, sigs: [] });
    if (sig) weekMap.get(key)!.sigs.push(sig);
  };
  for (const e of emargements) {
    if (!e.date_emargement) continue;
    addWeek(new Date(e.date_emargement + "T00:00:00"), {
      date: e.date_emargement,
      demi_journee: e.demi_journee,
      signed_at: e.signed_at,
      signature: e.signature_data_url,
      confirme_presence_lieu: !!e.confirme_presence_lieu,
      confirme_identite: !!e.confirme_identite,
    });
  }
  const isElearningOnly = /(^|-)e($|-)/i.test(String(apprenant.type_apprenant || ""));
  if (!isElearningOnly) {
    const startStr = apprenant.date_debut_formation || apprenant.date_debut_cours_en_ligne;
    const endStr = apprenant.date_fin_formation || apprenant.date_fin_cours_en_ligne;
    if (startStr && endStr) {
      try {
        let cursor = startOfWeek(parseISO(startStr), { weekStartsOn: 1 });
        const stop = endOfWeek(parseISO(endStr), { weekStartsOn: 1 });
        let safety = 0;
        while ((isBefore(cursor, stop) || +cursor === +stop) && safety < 260) {
          addWeek(cursor);
          cursor = addWeeks(cursor, 1);
          safety++;
        }
      } catch {}
    }
  }
  const emargFolder = root.folder("feuilles-emargement-hebdomadaires")!;
  const sortedWeeks = Array.from(weekMap.values())
    .filter(w => !isElearningOnly || w.sigs.length > 0)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  for (const w of sortedWeeks) {
    const wsStr = format(w.weekStart, "yyyy-MM-dd");
    const weStr = format(w.weekEnd, "yyyy-MM-dd");
    const label = `Semaine ${w.week} - ${w.year}`;
    const sigs = w.sigs.sort((a, b) => a.date.localeCompare(b.date));
    const res = generateEmargementSemainePdf(apprenant, label, wsStr, weStr, sigs, formateur, { returnBlob: true });
    if (res) emargFolder.file(res.fileName, res.blob);
  }

  // ---------- 3) Relevé connexions + rapport activité + suivi progression ----------
  const cnxRawRows = clampConnexionsToAccessEnd(
    await fetchAllRows<any>((from, to) =>
      supabase
        .from("apprenant_connexions")
        .select("started_at, ended_at, last_seen_at, last_action_at, end_reason, source, current_module, ip_address, user_agent")
        .eq("apprenant_id", apprenant.id)
        .order("started_at", { ascending: false })
        .range(from, to),
    ).catch(() => [] as any[]),
    apprenant.date_fin_cours_en_ligne || apprenant.date_fin_formation,
  );

  const releveFolder = root.folder("releve-connexions")!;

  try {
    const [actRows, complRows, qrRows] = await Promise.all([
      fetchAllRows<any>((from, to) => supabase.from("apprenant_module_activites")
        .select("id, module_id, module_nom, action_type, occurred_at")
        .eq("apprenant_id", apprenant.id)
        .order("occurred_at", { ascending: false })
        .range(from, to)),
      fetchAllRows<any>((from, to) => supabase.from("apprenant_module_completion").select("module_id").eq("apprenant_id", apprenant.id).eq("status", "completed").range(from, to)),
      fetchAllRows<any>((from, to) => supabase.from("apprenant_quiz_results")
        .select("id, quiz_titre, matiere_nom, completed_at")
        .eq("apprenant_id", apprenant.id)
        .order("completed_at", { ascending: false })
        .range(from, to)),
    ]);
    const actRes = { data: actRows }; const complRes = { data: complRows }; const qrRes = { data: qrRows };
    const html = buildRapportActiviteHtml({
      apprenant: { nom: apprenant.nom, prenom: apprenant.prenom, email: apprenant.email, type_apprenant: apprenant.type_apprenant },
      connexions: cnxRawRows.map((r: any) => ({ id: r.id || "", started_at: r.started_at, ended_at: r.ended_at, last_seen_at: r.last_seen_at, current_module: r.current_module })),
      activites: ((actRes.data as any[]) || []) as any,
      quizResults: ((qrRes.data as any[]) || []) as any,
      completedModuleIds: new Set(((complRes.data as any[]) || []).map((r: any) => r.module_id as number)),
    });
    releveFolder.file(`rapport-activite_${slug}.html`, html);
  } catch (e) { console.error("[dossier] rapport activite failed", e); }

  let fallbackJourneesPresentiel: { date: string; label?: string }[] = [];
  try {
    const [acts, compls, quizzes, emargAll, sessInscrits, exos] = await Promise.all([
      fetchAllRows<any>((from, to) => supabase.from("apprenant_module_activites").select("module_id, module_nom, action_type, occurred_at").eq("apprenant_id", apprenant.id).order("occurred_at", { ascending: true }).range(from, to)),
      fetchAllRows<any>((from, to) => supabase.from("apprenant_module_completion").select("module_id, completed_at").eq("apprenant_id", apprenant.id).eq("status", "completed").range(from, to)),
      fetchAllRows<any>((from, to) => supabase.from("apprenant_quiz_results").select("quiz_titre, matiere_nom, score_obtenu, score_max, note_sur_20, reussi, duree_secondes, completed_at").eq("apprenant_id", apprenant.id).order("completed_at", { ascending: true }).range(from, to)),
      fetchAllRows<any>((from, to) => supabase.from("emargements_fc" as any).select("date_emargement, demi_journee, absent").eq("apprenant_id", apprenant.id).range(from, to)),
      fetchAllRows<any>((from, to) => supabase.from("session_apprenants").select("session_id, heure_debut_personnalisee, heure_fin_personnalisee, sessions:session_id(type_session, heure_debut, heure_fin, date_debut, date_fin)").eq("apprenant_id", apprenant.id).range(from, to)),
      fetchAllRows<any>((from, to) => supabase.from("reponses_apprenants").select("exercice_id, updated_at").eq("apprenant_id", apprenant.id).eq("completed", true).range(from, to)),
    ]);
    const completedIds = new Set(compls.map((c: any) => c.module_id));

    const modulesMap = new Map<string, { firstDate?: string; lastDate?: string; totalSec: number; moduleId?: number }>();
    const sortedActs = [...acts].sort((a, b) => (a.occurred_at || "").localeCompare(b.occurred_at || ""));
    for (let i = 0; i < sortedActs.length; i++) {
      const a = sortedActs[i];
      const key = a.module_nom || `Module ${a.module_id ?? "?"}`;
      const cur: { firstDate?: string; lastDate?: string; totalSec: number; moduleId?: number } =
        modulesMap.get(key) || { totalSec: 0, moduleId: a.module_id };
      if (!cur.firstDate || (a.occurred_at && a.occurred_at < cur.firstDate)) cur.firstDate = a.occurred_at;
      if (!cur.lastDate || (a.occurred_at && a.occurred_at > cur.lastDate)) cur.lastDate = a.occurred_at;
      const next = sortedActs[i + 1];
      if (next && next.module_id === a.module_id && a.occurred_at && next.occurred_at) {
        const diff = (new Date(next.occurred_at).getTime() - new Date(a.occurred_at).getTime()) / 1000;
        if (diff > 0 && diff < 900) cur.totalSec += diff;
      }
      modulesMap.set(key, cur);
    }
    for (const c of compls) {
      const alreadyIn = Array.from(modulesMap.values()).some(v => v.moduleId === c.module_id);
      if (!alreadyIn) modulesMap.set(`Module ${c.module_id}`, { totalSec: 0, moduleId: c.module_id, firstDate: c.completed_at, lastDate: c.completed_at });
    }
    const quizByMod = new Map<string, any[]>();
    for (const q of quizzes) {
      const key = q.matiere_nom || "Quiz";
      const arr = quizByMod.get(key) || [];
      arr.push(q);
      quizByMod.set(key, arr);
    }
    const fmtDate = (s?: string) => s ? format(new Date(s), "dd/MM/yyyy") : "-";
    const fmtDur = (sec: number) => {
      if (!sec) return "0h00";
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}h${String(m).padStart(2, "0")}`;
    };
    const progModules: ProgressionModule[] = Array.from(modulesMap.entries()).map(([nom, info]) => {
      const lignes: ProgressionModule["lignes"] = [{
        type: "cours", label: nom, date: fmtDate(info.firstDate), duree: fmtDur(Math.round(info.totalSec)),
        statut: info.moduleId && completedIds.has(info.moduleId) ? "Termine" : "En cours",
      }];
      for (const q of quizByMod.get(nom) || []) {
        const pct = q.score_max ? Math.round((Number(q.score_obtenu) / Number(q.score_max)) * 100) : null;
        const scoreLabel = q.note_sur_20 != null ? `${Number(q.note_sur_20).toFixed(1)}/20` : pct !== null ? `${pct}%` : "-";
        lignes.push({
          type: "quiz", label: q.quiz_titre || "Quiz", date: fmtDate(q.completed_at),
          duree: q.duree_secondes ? fmtDur(Number(q.duree_secondes)) : "-",
          score: scoreLabel, statut: q.reussi ? "Reussi" : "Realise",
        });
      }
      return { nom, lignes };
    });

    const MAX_SESSION_MS = 7 * 60 * 60 * 1000;
    const isAccueil = (nom?: string | null) => !!nom && /accueil|liste\s+des\s+modules/i.test(nom);
    const pedagogicalActTs = [
      ...acts.filter((a: any) => (a.action_type === "open_module" || a.action_type === "open_section" || a.action_type === "open_cours") && !isAccueil(a.module_nom)).map((a: any) => Date.parse(a.occurred_at)),
      ...exos.map((e: any) => Date.parse(e.updated_at)),
      ...quizzes.map((q: any) => Date.parse(q.completed_at)),
    ].filter((t: number) => !Number.isNaN(t)).sort((a: number, b: number) => a - b);
    const hasActivityInWindow = (start: number, end: number): boolean => {
      let lo = 0, hi = pedagogicalActTs.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const v = pedagogicalActTs[mid];
        if (v < start) lo = mid + 1;
        else if (v > end) hi = mid - 1;
        else return true;
      }
      return false;
    };
    let onlineMin = 0;
    for (const c of cnxRawRows) {
      const s = c.started_at, e = c.ended_at || c.last_seen_at;
      if (!s || !e) continue;
      const startMs = new Date(s).getTime();
      const rawEndMs = new Date(e).getTime();
      if (!isFinite(startMs) || !isFinite(rawEndMs)) continue;
      const endMs = getSessionEndMs(c as any);
      const ms = endMs - startMs;
      if (ms <= 0) continue;
      if (!hasActivityInWindow(startMs, endMs)) continue;
      onlineMin += Math.floor(ms / 60000);
    }
    const onlineSec = onlineMin * 60;

    const journeesPresentiel = buildJourneesPresentiel(emargAll, sessInscrits);
    fallbackJourneesPresentiel = journeesPresentiel;
    const pratiqueDetails = await fetchPratiqueSlotDetails(apprenant.id).catch(() => []);
    // Presentiel : les feuilles d'emargement font foi (theorie ET pratique)
    const { theorieHours, pratiqueMinutes } = computePresentielHours(emargAll as any[], pratiqueDetails as any[]);
    const theorieSec = Math.round(theorieHours * 3600);
    const pratiqueSec = pratiqueMinutes * 60;
    const presentielTotalSec = theorieSec + pratiqueSec;
    const grandTotalSec = onlineSec + presentielTotalSec;
    const notes = quizzes.filter((q: any) => q.note_sur_20 != null).map((q: any) => Number(q.note_sur_20));
    const avgLabel = notes.length ? `${(notes.reduce((s, v) => s + v, 0) / notes.length).toFixed(1)}/20` : "-";

    const data: FicheProgressionData = {
      nom: apprenant.nom || "", prenom: apprenant.prenom || "",
      formation: apprenant.type_apprenant || apprenant.formation || "-",
      codeFormation: apprenant.code_formation || "-",
      periodeDebut: apprenant.date_debut_cours_en_ligne ? format(new Date(apprenant.date_debut_cours_en_ligne), "dd/MM/yyyy") : (apprenant.date_debut_formation ? format(new Date(apprenant.date_debut_formation), "dd/MM/yyyy") : "-"),
      periodeFin: apprenant.date_fin_cours_en_ligne ? format(new Date(apprenant.date_fin_cours_en_ligne), "dd/MM/yyyy") : (apprenant.date_fin_formation ? format(new Date(apprenant.date_fin_formation), "dd/MM/yyyy") : "-"),
      tempsTotal: fmtDur(grandTotalSec), tempsEnLigne: fmtDur(onlineSec),
      tempsPresentielTheorie: fmtDur(theorieSec), tempsPresentielPratique: fmtDur(pratiqueSec),
      tempsPresentielTotal: fmtDur(presentielTotalSec), modules: progModules,
      recap: {
        modulesCompletes: progModules.filter(m => m.lignes[0]?.statut === "Termine").length,
        modulesTotal: progModules.length, quizCompletes: quizzes.length, quizTotal: quizzes.length,
        scoreMoyen: avgLabel,
        statut: progModules.length > 0 && progModules.every(m => m.lignes[0]?.statut === "Termine") ? "FORMATION ENTIEREMENT COMPLETEE" : "FORMATION EN COURS",
      },
    };
    const prog = generateFicheProgression(data, { returnBlob: true }) as { blob: Blob; fileName: string } | undefined;
    if (prog?.blob) root.folder("suivi-progression")!.file(prog.fileName, prog.blob);

    // Relevé enrichi (mêmes colonnes que l'écran "Détail des connexions")
    try {
      const enrichedRows = enrichConnexionRows(cnxRawRows as any[], acts as any[], quizzes as any[], exos as any[]);


      const reqElearning =
        Number((apprenant as any).heures_elearning) ||
        Math.max(0, (Number((apprenant as any).heures_totales) || 0) - (Number((apprenant as any).heures_presentiel) || 0));
      const reqPresentiel = Number((apprenant as any).heures_presentiel) || 0;
      const reqTotal = Number((apprenant as any).heures_totales) || reqElearning + reqPresentiel;
      const relevePdf = generateReleveConnexionsPdf(apprenant, enrichedRows, {
        returnBlob: true,
        tempsEnLearning: fmtDur(onlineSec),
        tempsPresentielTheorie: fmtDur(theorieSec),
        tempsPratique: fmtDur(pratiqueSec),
        tempsTotal: fmtDur(grandTotalSec),
        heuresPrevuesElearning: reqElearning,
        heuresPrevuesPresentiel: reqPresentiel,
        heuresPrevuesTotal: reqTotal,
        heuresFaitesElearning: onlineSec / 3600,
        heuresFaitesPresentiel: (theorieSec + pratiqueSec) / 3600,
        journeesPresentiel,
      }) as { blob: Blob; fileName: string } | undefined;
      if (relevePdf?.blob) releveFolder.file(relevePdf.fileName, relevePdf.blob);
    } catch (e) { console.error("[dossier] releve PDF failed", e); }
  } catch (e) {
    console.error("[dossier] suivi progression failed", e);
    try {
      const relevePdf = generateReleveConnexionsPdf(apprenant, cnxRawRows, { returnBlob: true, journeesPresentiel: fallbackJourneesPresentiel }) as { blob: Blob; fileName: string } | undefined;
      if (relevePdf?.blob) releveFolder.file(relevePdf.fileName, relevePdf.blob);
    } catch {}
  }

  const cnxRows = cnxRawRows.map(r => ({
    date_debut: r.started_at ? format(new Date(r.started_at), "yyyy-MM-dd HH:mm:ss") : "",
    date_fin: r.ended_at ? format(new Date(r.ended_at), "yyyy-MM-dd HH:mm:ss") : "",
    derniere_activite: r.last_action_at ? format(new Date(r.last_action_at), "yyyy-MM-dd HH:mm:ss") : "",
    duree_min: r.started_at && (r.ended_at || r.last_seen_at)
      ? Math.round((new Date(r.ended_at || r.last_seen_at).getTime() - new Date(r.started_at).getTime()) / 60000) : "",
    module: r.current_module || "", source: r.source || "", fin: r.end_reason || "",
    ip: r.ip_address || "", navigateur: r.user_agent || "",
  }));
  releveFolder.file(`releve-connexions_${slug}.csv`, toCsv(cnxRows, ["date_debut","date_fin","derniere_activite","duree_min","module","source","fin","ip","navigateur"]));

  // ---------- 4) Emails ----------
  const { data: emailsData } = await supabase
    .from("emails")
    .select("type, subject, sender_email, sender_name, recipients, sent_at, received_at, created_at, is_read, has_attachments, body_preview, body_html")
    .eq("apprenant_id", apprenant.id)
    .order("created_at", { ascending: false });
  const emailsRaw = (emailsData as any[]) || [];
  const emailRows = emailsRaw.map(e => ({
    type: e.type === "sent" ? "Envoyé" : "Reçu",
    date: (e.sent_at || e.received_at || e.created_at) ? format(new Date(e.sent_at || e.received_at || e.created_at), "yyyy-MM-dd HH:mm:ss") : "",
    sujet: e.subject || "",
    expediteur: e.sender_name ? `${e.sender_name} <${e.sender_email || ""}>` : (e.sender_email || ""),
    destinataires: Array.isArray(e.recipients) ? e.recipients.join(", ") : (e.recipients || ""),
    lu: e.is_read ? "Oui" : "Non",
    pieces_jointes: e.has_attachments ? "Oui" : "Non",
    apercu: maskPasswords((e.body_preview || "").replace(/\s+/g, " ")).slice(0, 500),
  }));
  const emailsFolder = root.folder("emails")!;
  emailsFolder.file(`emails_${slug}.csv`, toCsv(emailRows, ["type","date","sujet","expediteur","destinataires","lu","pieces_jointes","apercu"]));
  try {
    const emailsPdf = generateEmailsApprenantPdf({ ...apprenant, email: apprenant.email }, emailsRaw, { returnBlob: true }) as { blob: Blob; fileName: string } | undefined;
    if (emailsPdf?.blob) emailsFolder.file(emailsPdf.fileName, emailsPdf.blob);
  } catch (e) { console.error("[dossier] emails PDF failed", e); }

  // ---------- 4bis) Email des identifiants (mot de passe masqué) ----------
  try {
    const isCredentialEmail = (e: any) => {
      const hay = `${e.subject || ""} ${e.body_preview || ""} ${e.body_html || ""}`.toLowerCase();
      return /identifiant|vos codes|compte de cours en ligne|acc[eè]s (?:aux cours|[aà] la plateforme)|mot de passe/.test(hay);
    };
    const credRows = emailsRaw.filter(isCredentialEmail);
    if (credRows.length > 0) {
      const credPdf = generateEmailsApprenantPdf(
        { ...apprenant, email: apprenant.email },
        credRows,
        { returnBlob: true },
      ) as { blob: Blob; fileName: string } | undefined;
      if (credPdf?.blob) {
        emailsFolder.file(`identifiants_${slug}.pdf`, credPdf.blob);
      }
    }
  } catch (e) { console.error("[dossier] identifiants PDF failed", e); }

  // ---------- 5) Documents libres ajoutés au dossier ----------
  try {
    const { data: libres } = await supabase
      .from("documents_inscription")
      .select("titre, nom_fichier, url, type_document")
      .eq("apprenant_id", apprenant.id)
      .like("type_document", "libre%")
      .order("created_at", { ascending: false });
    const libreRows = (libres as any[]) || [];
    if (libreRows.length > 0) {
      const libreFolder = root.folder("documents-ajoutes")!;
      for (const d of libreRows) {
        if (!d.url) continue;
        const path = String(d.url).includes("/documents-inscription/")
          ? String(d.url).split("/documents-inscription/")[1]
          : String(d.url);
        const { data: signed } = await supabase.storage
          .from("documents-inscription")
          .createSignedUrl(path, 3600);
        if (!signed?.signedUrl) continue;
        const resp = await fetch(signed.signedUrl);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const ext = (d.nom_fichier || path).split(".").pop() || "pdf";
        const base = (d.titre || d.nom_fichier || "document").replace(/\.[^.]+$/, "");
        const safe = base.replace(/[^a-zA-Z0-9-_ ]+/g, "_").trim() || "document";
        libreFolder.file(`${safe}.${ext}`, blob);
      }
    }
  } catch (e) { console.error("[dossier] documents libres failed", e); }

  return { weeks: weekMap.size, connexions: cnxRows.length, emails: emailRows.length };
}
