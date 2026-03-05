import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface BadgeItem {
  id: string;
  icon: string;
  label: string;
  desc: string;
  unlocked: boolean;
}

interface BadgeGridProps {
  badges: BadgeItem[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="bg-card rounded-2xl p-5 mb-5 shadow-sm border">
      <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
        🏅 Badges & Trophées
        <span className="text-xs font-normal text-muted-foreground">
          {unlockedCount}/{badges.length} débloqués
        </span>
      </h3>
      <TooltipProvider>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
          {badges.map((badge) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div
                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                    badge.unlocked
                      ? "bg-gradient-to-b from-primary/5 to-primary/0 border-primary/30 hover:border-primary/60"
                      : "bg-muted/30 border-muted grayscale opacity-40"
                  }`}
                >
                  <span className={`text-2xl mb-1 transition-transform ${badge.unlocked ? "hover:scale-110" : ""}`}>
                    {badge.icon}
                  </span>
                  <span className="text-[9px] font-semibold text-foreground text-center leading-tight">
                    {badge.label}
                  </span>
                  {!badge.unlocked && (
                    <span className="absolute top-1 right-1 text-[8px]">🔒</span>
                  )}
                  {badge.unlocked && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-[7px]">✓</span>
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                <p className="font-semibold">{badge.label}</p>
                <p className="text-muted-foreground">{badge.desc}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
