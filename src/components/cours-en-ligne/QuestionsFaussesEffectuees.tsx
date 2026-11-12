import { CheckCircle2 } from "lucide-react";
/** Callers supply only a durable, identity-matching server completion proof. */
export function QuestionsFaussesEffectuees({ confirme }: { confirme: boolean }) {
  if (!confirme) return null;
  return <div role="status" className="w-full rounded-md border-2 border-success bg-success/10 p-5 sm:p-6 text-success">
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <CheckCircle2 aria-hidden="true" className="h-8 w-8 sm:h-10 sm:w-10 shrink-0" />
      <p className="min-w-0 break-words text-lg sm:text-2xl font-extrabold leading-snug text-center">QUESTIONS FAUSSES DÉJÀ EFFECTUÉES ✅</p>
    </div>
  </div>;
}