import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { startSubjectRetake, type SubjectRetakeReceipt } from '@/lib/examSubjectRetake';

export function RefaireMatiereButton({ owner, account, exam, subject, sourceExercise, sourceAttempt, onStarted }: {
  owner: string; account: string; exam: string; subject: string; sourceExercise: string;
  sourceAttempt?: string | null; onStarted: (r: SubjectRetakeReceipt) => void;
}) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="space-y-2">
    <Button variant="outline" className="gap-2 w-full sm:w-auto whitespace-normal h-auto min-h-10" disabled={busy} onClick={async () => {
      if (lock.current) return;
      lock.current = true; setBusy(true); setError(null);
      try {
        const receipt = await startSubjectRetake({ owner, account, exam, subject, sourceExercise, sourceAttempt });
        onStarted(receipt);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Reprise non confirmée. Réessayez ou demandez une autorisation à l’administration.');
      } finally { lock.current = false; setBusy(false); }
    }}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <RotateCcw className="h-4 w-4 shrink-0" />}
      Refaire la matière
    </Button>
    {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
  </div>;
}