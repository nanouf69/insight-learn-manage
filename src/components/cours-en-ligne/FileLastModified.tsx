import { useEffect, useState } from "react";

interface Props {
  url: string;
  className?: string;
}

/**
 * Affiche la date de dernière modification d'un fichier (header HTTP Last-Modified).
 * Permet de repérer immédiatement quels supports/diapos ont été mis à jour.
 */
export default function FileLastModified({ url, className }: Props) {
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDate(null);
    (async () => {
      try {
        const res = await fetch(url, { method: "HEAD" });
        const raw = res.headers.get("last-modified");
        if (!raw || cancelled) return;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return;
        setDate(
          d.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!date) return null;

  return (
    <span className={className ?? "text-[11px] text-muted-foreground whitespace-nowrap"}>
      Modifié le {date}
    </span>
  );
}
