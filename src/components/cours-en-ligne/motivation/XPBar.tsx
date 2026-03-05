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
}

export function XPBar({ xp }: XPBarProps) {
  const level = XP_LEVELS.find((l) => xp >= l.min && xp < l.max) || XP_LEVELS[4];
  const next = XP_LEVELS.find((l) => l.level === level.level + 1);
  const progress = next ? ((xp - level.min) / (next.min - level.min)) * 100 : 100;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(progress), 300);
    return () => clearTimeout(t);
  }, [progress]);

  return (
    <div className="bg-card rounded-2xl p-5 mb-5 shadow-sm border">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{level.emoji}</span>
          <span className="font-bold text-foreground text-sm">
            Niveau {level.level} — {level.label}
          </span>
        </div>
        <span className="bg-amber-500 text-white rounded-full px-3 py-0.5 text-xs font-bold flex items-center gap-1">
          ⚡ {xp} XP
        </span>
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
