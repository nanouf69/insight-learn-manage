import { format, parseISO, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { getSessionEndMs, getSessionDurationMinutes } from "@/lib/reports/session-duration";

const MAX_SESSION_DURATION_MS = 7 * 60 * 60 * 1000;

export interface RapportApprenant {
  nom: string;
  prenom: string;
  email?: string | null;
  type_apprenant?: string | null;
}

export interface RapportConnexion {
  id: string;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string;
  current_module: string | null;
}

export interface RapportActivite {
  id: string;
  module_id: number;
  module_nom: string;
  action_type: string;
  occurred_at: string;
}

export interface RapportQuizResult {
  id: string;
  quiz_titre: string;
  matiere_nom: string | null;
  completed_at: string;
}

export interface BuildRapportArgs {
  apprenant: RapportApprenant;
  connexions: RapportConnexion[];
  activites: RapportActivite[];
  quizResults: RapportQuizResult[];
  completedModuleIds: Set<number>;
}

function getCappedSessionEnd(c: RapportConnexion): Date {
  return new Date(getSessionEndMs(c as any));
}

function getSessionMinutes(c: RapportConnexion): number {
  return getSessionDurationMinutes(c as any);
}

export function buildRapportActiviteHtml({
  apprenant,
  connexions,
  activites,
  quizResults,
  completedModuleIds,
}: BuildRapportArgs): string {
  const totalMinutes = connexions.reduce((s, c) => s + getSessionMinutes(c), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remaining = totalMinutes % 60;

  const uniqueModules = Array.from(
    new Map(activites.filter(a => a.module_id).map(a => [a.module_id, a.module_nom])).entries(),
  );

  const rowsHtml = connexions.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;">Aucune connexion</td></tr>`
    : connexions.map((c) => {
        const start = parseISO(c.started_at);
        const end = getCappedSessionEnd(c);
        const mins = getSessionMinutes(c);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `<tr>
          <td>${format(start, "dd/MM/yyyy", { locale: fr })}</td>
          <td>${format(start, "HH:mm", { locale: fr })}</td>
          <td>${c.ended_at ? format(end, "HH:mm", { locale: fr }) : "En cours"}</td>
          <td>${h}h${m.toString().padStart(2, "0")}</td>
          <td>${c.current_module || "—"}</td>
        </tr>`;
      }).join("");

  const modulesHtml = uniqueModules.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Aucun module</td></tr>`
    : uniqueModules.map(([modId, modNom]) => {
        const modActs = activites.filter(a => a.module_id === modId && a.action_type === "open_module");
        const last = modActs[0];
        const done = completedModuleIds.has(modId as number);
        return `<tr>
          <td>${modNom}</td>
          <td>${modActs.length}</td>
          <td>${last ? format(parseISO(last.occurred_at), "dd/MM/yyyy à HH:mm", { locale: fr }) : "—"}</td>
          <td style="color:${done ? "#16a34a" : "#dc2626"};font-weight:600">${done ? "Oui" : "Non"}</td>
        </tr>`;
      }).join("");

  const quizHtml = quizResults.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Aucun quiz</td></tr>`
    : quizResults.map(q => `<tr>
        <td>${format(parseISO(q.completed_at), "dd/MM/yyyy HH:mm", { locale: fr })}</td>
        <td>${q.matiere_nom || "—"}</td>
        <td>${q.quiz_titre}</td>
      </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport d'activité — ${apprenant.prenom} ${apprenant.nom}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
    .stats { display: flex; gap: 24px; margin-bottom: 20px; }
    .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; flex: 1; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .print-btn { position: fixed; top: 12px; right: 12px; background: #2563eb; color: white; border: 0; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    @media print { .print-btn { display: none; } body { padding: 20px; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
  <h1>Rapport d'activité — ${apprenant.prenom} ${apprenant.nom}</h1>
  <p class="subtitle">
    ${apprenant.email || "Pas d'email"} · ${apprenant.type_apprenant || "—"}<br/>
    Tout l'historique · Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}
  </p>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${connexions.length}</div>
      <div class="stat-label">Connexions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalHours}h${remaining.toString().padStart(2, "0")}</div>
      <div class="stat-label">Temps total</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${uniqueModules.length}</div>
      <div class="stat-label">Modules consultés</div>
    </div>
  </div>

  <h2>Détail des connexions</h2>
  <table>
    <thead><tr><th>Date</th><th>Heure début</th><th>Heure fin</th><th>Durée</th><th>Module consulté</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <h2>Modules consultés</h2>
  <table>
    <thead><tr><th>Module</th><th>Nombre d'accès</th><th>Dernière consultation</th><th>Terminé</th></tr></thead>
    <tbody>${modulesHtml}</tbody>
  </table>

  <h2>Quiz &amp; examens</h2>
  <table>
    <thead><tr><th>Date</th><th>Matière</th><th>Quiz / Examen</th></tr></thead>
    <tbody>${quizHtml}</tbody>
  </table>

  <div class="footer">FTRANSPORT — Rapport généré automatiquement</div>
</body>
</html>`;
}
