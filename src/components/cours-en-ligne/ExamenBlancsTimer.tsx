import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Pause, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimTimeWarning, remainingFromAnchor } from "./examUxPolicy";

interface TimerBadgeProps {
  seconds: number;
  onExpire: () => void;
  isPaused?: boolean;
  attemptKey?: string;
  sampledAt?: number;
}

export function TimerBadge({ seconds, onExpire, isPaused = false, attemptKey, sampledAt }: TimerBadgeProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [warning, setWarning] = useState<5 | 2 | null>(null);
  const anchor = useRef({ seconds, at: sampledAt ?? performance.now() });
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    anchor.current = { seconds, at: sampledAt ?? performance.now() };
    setRemaining(seconds);
  }, [seconds, sampledAt]);

  useEffect(() => {
    if (isPaused) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const value = remainingFromAnchor(anchor.current.seconds, anchor.current.at, performance.now());
      setRemaining(value);
      if (value <= 0) {
        if (!expired.current) {
          expired.current = true;
          onExpireRef.current();
        }
        return;
      }
      timer = setTimeout(tick, 250);
    };
    tick();
    const visible = () => { clearTimeout(timer); tick(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, [isPaused, seconds, sampledAt]);

  useEffect(() => {
    if (isPaused || !attemptKey) return;
    const threshold = claimTimeWarning(attemptKey, remaining);
    if (threshold) setWarning(threshold);
  }, [attemptKey, remaining, isPaused]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining <= 120 && !isPaused;

  return (
    <>
    <div role="timer" aria-label="Temps restant" className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
      isPaused
        ? "border-muted bg-muted text-muted-foreground"
        : isUrgent
          ? "border-destructive bg-destructive/10 text-destructive motion-safe:animate-pulse"
          : "border-primary/30 bg-primary/5 text-primary"
    }`}>
      {isPaused ? <Pause className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
      <span className="font-mono font-bold text-2xl">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
      {isPaused && <span className="text-xs font-semibold">PAUSE</span>}
    </div>
    {warning && remaining > 0 && <div role="alert" data-exam-time-warning={warning} className="w-full flex items-start gap-3 rounded-md border-2 border-destructive bg-background p-4 text-destructive">
      <AlertTriangle className="h-7 w-7 shrink-0" />
      <p className="min-w-0 flex-1 text-xl sm:text-2xl font-bold break-words">
        {warning === 2 ? "ATTENTION : IL VOUS RESTE 2 MINUTES !" : "ATTENTION : IL VOUS RESTE 5 MINUTES !"}
      </p>
      <Button aria-label="Fermer l’alerte de temps" title="Fermer l’alerte de temps" variant="ghost" size="icon" className="shrink-0" onClick={() => setWarning(null)}><X /></Button>
    </div>}
    </>
  );
}
