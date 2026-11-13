import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { UNSAFE_NavigationContext } from "react-router-dom";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { EXAM_EXIT_WARNING } from "./examUxPolicy";

const EXIT_REQUEST = "ftransport-exam-exit-request";
export function requestExamExit(action: () => void) {
  const event = new CustomEvent(EXIT_REQUEST, { cancelable: true, detail: action });
  if (window.dispatchEvent(event)) action();
}

/** Guards only navigation; never finishes a subject or touches its timer/answers. */
export function ExamExitGuard({ active }: { active: boolean }) {
  const context = useContext(UNSAFE_NavigationContext);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const bypass = useRef(false);
  const staying = useRef<HTMLButtonElement>(null);
  const ask = useCallback((action: () => void) => {
    if (!activeRef.current || bypass.current) { action(); return; }
    setPending(current => current ?? action);
  }, []);

  useEffect(() => {
    const receive = (event: Event) => {
      if (!activeRef.current) return;
      event.preventDefault();
      ask((event as CustomEvent<() => void>).detail);
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (!activeRef.current || bypass.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener(EXIT_REQUEST, receive);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener(EXIT_REQUEST, receive);
      window.removeEventListener("beforeunload", unload);
    };
  }, [ask]);

  useEffect(() => {
    const navigator = context?.navigator;
    if (!navigator) return;
    const push = navigator.push.bind(navigator);
    const replace = navigator.replace.bind(navigator);
    const go = navigator.go.bind(navigator);
    navigator.push = (...args) => ask(() => push(...args));
    navigator.replace = (...args) => ask(() => replace(...args));
    navigator.go = delta => ask(() => { bypass.current = true; go(delta); });
    // Browser Back/Forward: restore the current history position before asking,
    // then replay exactly the requested delta, without inventing history entries.
    let index = window.history.state?.idx as number | undefined;
    let restoring = false;
    const pop = (event: PopStateEvent) => {
      const next = window.history.state?.idx as number | undefined;
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (!activeRef.current || bypass.current || index === undefined || next === undefined || next === index) { index = next; return; }
      event.stopImmediatePropagation();
      const delta = next - index;
      restoring = true;
      window.history.go(-delta);
      ask(() => { bypass.current = true; window.history.go(delta); });
    };
    window.addEventListener("popstate", pop, true);
    return () => {
      navigator.push = push; navigator.replace = replace; navigator.go = go;
      window.removeEventListener("popstate", pop, true);
    };
  }, [context?.navigator, ask]);

  useEffect(() => { if (!active) setPending(null); }, [active]);
  return <AlertDialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
    <AlertDialogContent className="max-w-[calc(100%_-_2rem)] sm:max-w-lg" onOpenAutoFocus={event => { event.preventDefault(); staying.current?.focus(); }}>
      <AlertDialogTitle>Quitter la matière en cours ?</AlertDialogTitle>
      <AlertDialogDescription className="text-base leading-relaxed">{EXAM_EXIT_WARNING}</AlertDialogDescription>
      <div className="flex flex-col gap-3">
        <AlertDialogCancel ref={staying} className="m-0 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setPending(null)}>Rester et terminer</AlertDialogCancel>
        <AlertDialogAction className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => {
          const action = pending; setPending(null); bypass.current = true; action?.();
        }}>Quitter quand même</AlertDialogAction>
      </div>
    </AlertDialogContent>
  </AlertDialog>;
}