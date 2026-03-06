import { useState, useMemo } from "react";

const VTC_QUESTIONS = [
  {
    q: "Un VTC doit-il afficher sa carte pro dans le véhicule ?",
    options: ["Oui, obligatoirement", "Non, jamais", "Seulement en Île-de-France", "Uniquement la nuit"],
    answer: 0,
  },
  {
    q: "Quel est le délai minimum de préréservation pour un VTC ?",
    options: ["30 secondes", "5 minutes", "15 minutes", "Pas de délai légal"],
    answer: 3,
  },
  {
    q: "La capacité maximale d'un VTC est de :",
    options: ["4 passagers", "7 passagers", "9 passagers", "Illimitée"],
    answer: 2,
  },
  {
    q: "Un VTC peut-il stationner sur la voie publique en attente de clients ?",
    options: ["Oui, librement", "Non, c'est interdit", "Seulement la nuit", "Seulement en zone rurale"],
    answer: 1,
  },
  {
    q: "La carte professionnelle VTC est délivrée par :",
    options: ["La mairie", "La préfecture", "La CMA (Chambre des Métiers)", "Le ministère des Transports"],
    answer: 1,
  },
  {
    q: "Un VTC doit-il avoir un macaron visible sur son véhicule ?",
    options: ["Non, jamais", "Oui, un macaron vert", "Oui, une signalétique spécifique", "Seulement en Île-de-France"],
    answer: 2,
  },
];

const TAXI_QUESTIONS = [
  {
    q: "De quelle couleur est le lumineux d'un taxi libre ?",
    options: ["Rouge", "Vert", "Blanc", "Bleu"],
    answer: 1,
  },
  {
    q: "Un taxi peut-il refuser une course ?",
    options: ["Oui, toujours", "Non, sauf exceptions légales", "Seulement la nuit", "Seulement pour les courtes distances"],
    answer: 1,
  },
  {
    q: "L'ADS (Autorisation de Stationnement) est délivrée par :",
    options: ["La préfecture", "Le maire de la commune", "La CMA", "Le ministère des Transports"],
    answer: 1,
  },
  {
    q: "Un taxi doit-il appliquer le tarif au compteur (horodateur) ?",
    options: ["Non, il fixe son prix librement", "Oui, obligatoirement", "Seulement pour les longues courses", "Seulement en ville"],
    answer: 1,
  },
  {
    q: "La capacité maximale d'un taxi est de :",
    options: ["4 passagers", "7 passagers", "9 passagers", "Illimitée"],
    answer: 2,
  },
  {
    q: "Quel supplément un taxi peut-il facturer pour les bagages ?",
    options: ["Aucun supplément", "Un forfait libre", "Le 4ème bagage et au-delà", "Tout bagage dès le 1er"],
    answer: 2,
  },
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface QuizBlockProps {
  onXPGained?: (xp: number) => void;
  category?: "vtc" | "taxi";
}

export function QuizBlock({ onXPGained, category = "vtc" }: QuizBlockProps) {
  const questions = useMemo(
    () => pickRandom(category === "taxi" ? TAXI_QUESTIONS : VTC_QUESTIONS, 3),
    [category]
  );

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");
  const [scoreAnim, setScoreAnim] = useState(0);
  const [xpAnim, setXpAnim] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; x: number; delay: number; color: string; size: number }[]>([]);

  const q = questions[qIndex];

  function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    setTimeout(() => {
      const next = [...answers, idx === q.answer];
      setAnswers(next);
      if (qIndex + 1 < questions.length) {
        setQIndex(qIndex + 1);
        setSelected(null);
      } else {
        const score = next.filter(Boolean).length;
        setPhase("result");
        setConfetti(
          Array.from({ length: 28 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            delay: Math.random() * 0.6,
            color: ["#F4A227", "#00B4D8", "#0D2540", "#4ade80", "#f472b6"][Math.floor(Math.random() * 5)],
            size: 6 + Math.random() * 8,
          }))
        );
        let cnt = 0;
        const xpGain = score * 20;
        const interval = setInterval(() => {
          cnt += 2;
          setScoreAnim(Math.min(cnt, xpGain));
          if (cnt >= xpGain) {
            clearInterval(interval);
            setXpAnim(true);
            onXPGained?.(xpGain);
          }
        }, 30);
      }
    }, 700);
  }

  function reset() {
    setQIndex(0);
    setSelected(null);
    setAnswers([]);
    setPhase("quiz");
    setScoreAnim(0);
    setXpAnim(false);
    setConfetti([]);
  }

  const score = answers.filter(Boolean).length;
  const pct = Math.round((score / questions.length) * 100);
  const xpGain = score * 20;
  const resultEmoji = pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "💪";
  const resultMsg = pct >= 70 ? "Excellent ! Tu maîtrises ce sujet !" : pct >= 40 ? "Bien joué, continue tes révisions !" : "Encore un effort, tu vas y arriver !";

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border relative overflow-hidden mb-5">
      <style>{`
        @keyframes fadeSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(240px) rotate(360deg);opacity:0} }
        @keyframes popBounce { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes glow { 0%,100%{box-shadow:0 0 0 rgba(244,162,39,0)} 50%{box-shadow:0 0 22px rgba(244,162,39,0.5)} }
      `}</style>

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute top-0 rounded-full pointer-events-none"
          style={{
            left: `${c.x}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            animation: `fall 1.4s ${c.delay}s ease-in forwards`,
            zIndex: 10,
          }}
        />
      ))}

      {phase === "quiz" ? (
        <div style={{ animation: "fadeSlide 0.35s ease both" }} key={qIndex}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-foreground text-base flex items-center gap-2">
              🎯 Mini Quiz {category === "taxi" ? "TAXI" : "VTC"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {qIndex + 1}/{questions.length}
            </span>
          </div>

          {/* Quiz progress */}
          <div className="bg-muted rounded-full h-1.5 mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-slate-900 rounded-full transition-all duration-400"
              style={{ width: `${(qIndex / questions.length) * 100}%` }}
            />
          </div>

          <p className="text-sm font-semibold text-foreground mb-4 leading-relaxed">{q.q}</p>

          <div className="flex flex-col gap-2.5">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.answer;
              const isSelected = selected === i;
              const revealed = selected !== null;

              let classes = "bg-muted/30 border-border text-foreground";
              if (revealed) {
                if (isCorrect) classes = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200";
                else if (isSelected) classes = "bg-red-50 dark:bg-red-950/30 border-red-300 text-red-900 dark:text-red-200";
              }
              if (isSelected && !revealed) classes = "bg-blue-50 dark:bg-blue-950/30 border-blue-300 text-blue-900 dark:text-blue-200";

              let dotClasses = "bg-muted text-muted-foreground";
              if (revealed && isCorrect) dotClasses = "bg-emerald-500 text-white";
              else if (revealed && isSelected) dotClasses = "bg-red-500 text-white";

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`border-2 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200 flex items-center gap-3 ${classes} ${
                    selected !== null ? "cursor-default" : "cursor-pointer hover:border-primary/40"
                  } ${isSelected ? "scale-[1.01]" : ""}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${dotClasses}`}>
                    {revealed && isCorrect ? "✓" : revealed && isSelected ? "✗" : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center" style={{ animation: "fadeSlide 0.5s ease both" }}>
          <div className="text-6xl mb-2" style={{ animation: "popBounce 0.6s ease both" }}>
            {resultEmoji}
          </div>
          <div
            className="font-extrabold text-4xl leading-none"
            style={{
              color: pct >= 70 ? "#22c55e" : pct >= 40 ? "#F4A227" : "#ef4444",
              animation: "popBounce 0.6s 0.1s ease both",
            }}
          >
            {score}/{questions.length}
          </div>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            bonnes réponses · {pct}% de réussite
          </p>

          <div
            className={`rounded-xl px-4 py-3 mb-4 font-semibold text-sm border-2 ${
              pct >= 70
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 text-emerald-800 dark:text-emerald-200"
                : pct >= 40
                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-400 text-amber-800 dark:text-amber-200"
                  : "bg-red-50 dark:bg-red-950/20 border-red-400 text-red-800 dark:text-red-200"
            }`}
            style={{ animation: "fadeSlide 0.4s 0.2s ease both" }}
          >
            {resultMsg}
          </div>

          {/* XP gained */}
          <div
            className="rounded-2xl px-6 py-4 mb-4"
            style={{
              background: "linear-gradient(135deg, #0D2540, #1a3a5c)",
              animation: xpAnim ? "glow 1s ease" : "popBounce 0.6s 0.4s ease both",
            }}
          >
            <div className="text-amber-400 font-extrabold text-3xl">+{scoreAnim} XP</div>
            <div className="text-white/60 text-xs mt-1">⚡ Points gagnés sur ce quiz</div>
            {xpAnim && pct >= 70 && (
              <div
                className="mt-2 bg-emerald-500/15 rounded-lg px-3 py-1.5 text-emerald-400 text-[11px]"
                style={{ animation: "fadeSlide 0.4s ease both" }}
              >
                🏆 Badge potentiel débloqué !
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="w-full text-white font-bold text-sm rounded-xl px-8 py-3 transition-opacity hover:opacity-85"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), #0D2540)" }}
          >
            Rejouer le quiz →
          </button>
        </div>
      )}
    </div>
  );
}
