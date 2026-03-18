import { useState, useEffect } from "react";

const XP_LEVELS = [
  { level: 1, min: 0, max: 100, label: "Débutant", emoji: "🌱" },
  { level: 2, min: 100, max: 300, label: "En progression", emoji: "📈" },
  { level: 3, min: 300, max: 600, label: "Confirmé", emoji: "⭐" },
  { level: 4, min: 600, max: 1000, label: "Avancé", emoji: "🔥" },
  { level: 5, min: 1000, max: 9999, label: "Expert", emoji: "🏆" },
];

interface XPBarProps {
  xp: number;
  moduleScores?: Record<number, { score_obtenu: number | null; score_max: number | null }>;
}

export function XPBar({ xp, moduleScores }: XPBarProps) {
  const level = XP_LEVELS.find((l) => xp >= l.min && xp < l.max) || XP_LEVELS[4];
  const next = XP_LEVELS.find((l) => l.level === level.level + 1);
  const progress = next ? ((xp - level.min) / (next.min - level.min)) * 100 : 100;
  const [animated, setAnimated] = useState(0);

  // Calcul de la moyenne sur 20
  const averageNote = (() => {
    if (!moduleScores) return null;
    const entries = Object.values(moduleScores).filter(
      (s) => s.score_obtenu != null && s.score_max != null && s.score_max > 0
    );
    if (entries.length === 0) return null;
    const total = entries.reduce((sum, s) => sum + (s.score_obtenu! / s.score_max!) * 20, 0);
    return total / entries.length;
  })();

  useEffect(() => {
    const t = setTimeout(() => setAnimated(progress), 300);
    return () => clearTimeout(t);
  }, [progress]);

  return (
    <div className="bg-card rounded-2xl p-5 mb-5 shadow-sm border">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          {averageNote !== null && (
            <div className="flex items-center gap-1.5">
              <span className="text-3xl font-extrabold text-primary">
                {averageNote.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground font-medium">/20</span>
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{level.emoji}</span>
              <span className="font-bold text-foreground text-sm">
                Niv. {level.level} — {level.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">⚡ {xp} XP</span>
          </div>
        </div>
      </div>
      <div className="bg-muted rounded-full h-3.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 relative"
          style={{
            width: `${animated}%`,
            transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/80" />
        </div>
      </div>
      {next && (
        <p className="mt-2 text-[11px] text-muted-foreground text-right">
          {next.min - xp} XP pour le niveau suivant : <strong>{next.label}</strong>
        </p>
      )}
    </div>
  );
}
