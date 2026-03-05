import { useState, useEffect } from "react";

interface WelcomeBannerProps {
  prenom: string;
  formationLabel: string;
  xp: number;
  xpToday: number;
  streak: number;
  completedCount: number;
  totalModules: number;
  globalProgress: number;
}

export function WelcomeBanner({ prenom, formationLabel, xp, xpToday, streak, completedCount, totalModules, globalProgress }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const remaining = totalModules - completedCount;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-7 md:p-8 mb-6 text-white shadow-xl transition-all duration-[600ms]"
      style={{
        background: "linear-gradient(135deg, #0D2540 0%, #153454 55%, #0e3d57 100%)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-primary/10" />
      <div className="absolute -bottom-8 right-20 w-28 h-28 rounded-full bg-amber-500/10" />
      <div className="absolute top-5 right-6 opacity-[0.06] text-[90px] leading-none select-none">🚗</div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2.5">
          <span className="text-3xl">👋</span>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold">{greeting}, {prenom} !</h2>
            {streak > 0 && (
              <p className="text-xs text-white/50 mt-0.5">
                🔥 {streak} jour{streak > 1 ? "s" : ""} consécutif{streak > 1 ? "s" : ""} — continue comme ça !
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-white/75 mb-5 leading-relaxed">
          Tu as complété <span className="text-amber-400 font-bold">{completedCount}/{totalModules}</span> modules.{" "}
          <span className="text-primary">{remaining} restant{remaining > 1 ? "s" : ""}</span> avant ton examen !
        </p>

        <div className="flex gap-2.5 flex-wrap">
          {[
            { icon: "⚡", val: `${xp} XP`, sub: "total", colorClass: "text-amber-400" },
            { icon: "🎯", val: `${globalProgress}%`, sub: "progression", colorClass: "text-primary" },
            { icon: "✨", val: `+${xpToday} XP`, sub: "aujourd'hui", colorClass: "text-emerald-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
              <div className={`font-extrabold text-[17px] ${stat.colorClass}`}>
                {stat.icon} {stat.val}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-5 max-w-xl">
          <div className="flex justify-between text-[10px] text-blue-200/70 mb-1">
            <span>{formationLabel}</span>
            <span>{globalProgress}% complété</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
