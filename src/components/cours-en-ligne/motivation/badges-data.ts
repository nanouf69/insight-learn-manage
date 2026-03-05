import type { BadgeItem } from "./BadgeGrid";

/**
 * Build badges dynamically from completed module IDs.
 * Each badge checks a condition against completedModuleIds & moduleScores.
 */
export function buildBadges(
  completedModuleIds: Set<number>,
  totalModules: number,
  moduleScores: Record<number, { score_obtenu: number | null; score_max: number | null }>,
): BadgeItem[] {
  const completedCount = completedModuleIds.size;
  const pctDone = totalModules > 0 ? completedCount / totalModules : 0;

  // Check if any quiz has a perfect score
  const hasPerfectScore = Object.values(moduleScores).some(
    (s) => s.score_obtenu != null && s.score_max != null && s.score_obtenu === s.score_max && s.score_max > 0,
  );

  // Average score
  const scores = Object.values(moduleScores).filter((s) => s.score_obtenu != null && s.score_max != null && s.score_max! > 0);
  const avgPct = scores.length > 0
    ? scores.reduce((a, s) => a + (s.score_obtenu! / s.score_max!) * 100, 0) / scores.length
    : 0;

  return [
    {
      id: "first",
      icon: "🚀",
      label: "Premier pas",
      desc: "Premier module complété",
      unlocked: completedCount >= 1,
    },
    {
      id: "three",
      icon: "📚",
      label: "Studieux",
      desc: "3 modules complétés",
      unlocked: completedCount >= 3,
    },
    {
      id: "five",
      icon: "💪",
      label: "Motivé",
      desc: "5 modules complétés",
      unlocked: completedCount >= 5,
    },
    {
      id: "halfway",
      icon: "⭐",
      label: "Mi-chemin",
      desc: "50% de la formation complétée",
      unlocked: pctDone >= 0.5,
    },
    {
      id: "perfect",
      icon: "💎",
      label: "Score parfait",
      desc: "Un quiz sans aucune erreur",
      unlocked: hasPerfectScore,
    },
    {
      id: "good-avg",
      icon: "🎯",
      label: "Bon élève",
      desc: "Moyenne générale ≥ 70%",
      unlocked: avgPct >= 70,
    },
    {
      id: "ten",
      icon: "🔥",
      label: "Endurant",
      desc: "10 modules complétés",
      unlocked: completedCount >= 10,
    },
    {
      id: "champion",
      icon: "🏆",
      label: "Champion",
      desc: "Tous les modules complétés",
      unlocked: completedCount >= totalModules && totalModules > 0,
    },
  ];
}

/**
 * Calculate XP from completed modules and scores.
 * Base: 20 XP per completed module + bonus based on quiz score.
 */
export function calculateXP(
  completedModuleIds: Set<number>,
  moduleScores: Record<number, { score_obtenu: number | null; score_max: number | null }>,
): number {
  let xp = 0;
  completedModuleIds.forEach((modId) => {
    xp += 20; // base per module
    const score = moduleScores[modId];
    if (score?.score_obtenu != null && score?.score_max != null && score.score_max > 0) {
      const pct = score.score_obtenu / score.score_max;
      xp += Math.round(pct * 30); // up to 30 bonus XP for perfect score
    }
  });
  return xp;
}
