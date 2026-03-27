import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Pause, Play } from "lucide-react";

interface TimerBadgeProps {
  seconds: number;
  onExpire: () => void;
  isPaused?: boolean;
}

export function TimerBadge({ seconds, onExpire, isPaused = false }: TimerBadgeProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPaused || remaining <= 0) {
      if (remaining <= 0) onExpireRef.current();
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, remaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining < 60 && !isPaused;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
      isPaused
        ? "border-amber-400 bg-amber-50 text-amber-700"
        : isUrgent
          ? "border-red-500 bg-red-50 text-red-700 animate-pulse"
          : "border-primary/30 bg-primary/5 text-primary"
    }`}>
      {isPaused ? <Pause className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
      <span className="font-mono font-bold text-lg">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
      {isPaused && <span className="text-xs font-semibold">PAUSE</span>}
    </div>
  );
}
