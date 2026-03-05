interface WelcomeBannerProps {
  prenom: string;
  formationLabel: string;
  xp: number;
  completedCount: number;
  totalModules: number;
  globalProgress: number;
}

export function WelcomeBanner({ prenom, formationLabel, xp, completedCount, totalModules, globalProgress }: WelcomeBannerProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const remaining = totalModules - completedCount;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 p-7 md:p-8 mb-6 text-white shadow-xl">
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-primary/10" />
      <div className="absolute -bottom-5 right-16 w-24 h-24 rounded-full bg-amber-500/10" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-2xl">👋</span>
          <h2 className="text-xl md:text-2xl font-bold">{greeting}, {prenom} !</h2>
        </div>
        <p className="text-blue-200/80 text-sm mb-5">
          Tu as encore <strong className="text-amber-400">{remaining} module{remaining > 1 ? "s" : ""}</strong> à compléter.
          {" "}Continue comme ça !
        </p>

        <div className="flex gap-3 flex-wrap">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5">
            <div className="text-amber-400 text-lg font-extrabold">⚡ {xp} XP</div>
            <div className="text-blue-200/60 text-[10px]">Points gagnés</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5">
            <div className="text-primary text-lg font-extrabold">{completedCount}/{totalModules}</div>
            <div className="text-blue-200/60 text-[10px]">Modules faits</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5">
            <div className="text-emerald-400 text-lg font-extrabold">{globalProgress}%</div>
            <div className="text-blue-200/60 text-[10px]">Progression</div>
          </div>
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
