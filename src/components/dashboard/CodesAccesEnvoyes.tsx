import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyRound, ChevronRight, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onNavigateToApprenant?: (id: string) => void;
}

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const typeLabels: Record<string, string> = {
  vtc: "VTC",
  "vtc-e": "VTC E",
  "vtc-e-presentiel": "VTC E Présentiel",
  taxi: "TAXI",
  "taxi-e": "TAXI E",
  "taxi-e-presentiel": "TAXI E Présentiel",
  ta: "TA",
  "ta-e": "TA E",
  "ta-e-presentiel": "TA E Présentiel",
  "va-e": "VA E",
  "va-e-presentiel": "VA E Présentiel",
};

const typeColors: Record<string, string> = {
  vtc: "bg-blue-100 text-blue-800",
  "vtc-e": "bg-blue-50 text-blue-700",
  "vtc-e-presentiel": "bg-blue-200 text-blue-900",
  taxi: "bg-amber-100 text-amber-800",
  "taxi-e": "bg-amber-50 text-amber-700",
  "taxi-e-presentiel": "bg-amber-200 text-amber-900",
  ta: "bg-purple-100 text-purple-800",
  "ta-e": "bg-purple-50 text-purple-700",
  "ta-e-presentiel": "bg-purple-200 text-purple-900",
  "va-e": "bg-emerald-100 text-emerald-800",
  "va-e-presentiel": "bg-emerald-200 text-emerald-900",
};

export function CodesAccesEnvoyes({ onNavigateToApprenant }: Props) {
  // Fenêtre glissante de 7 jours (aujourd'hui inclus)
  const since = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 6);
    return d.toISOString();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["codes-acces-envoyes", since],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // 1) Emails d'identifiants envoyés sur les 7 derniers jours
      const { data: emails, error: emailsError } = await supabase
        .from("emails")
        .select("id, apprenant_id, subject, sent_at")
        .eq("type", "sent")
        .ilike("subject", "%identifiant%")
        .gte("sent_at", since)
        .order("sent_at", { ascending: false });


      if (emailsError) throw emailsError;
      if (!emails || emails.length === 0) return [];

      const apprenantIds = Array.from(
        new Set(emails.map((e) => e.apprenant_id).filter(Boolean))
      ) as string[];

      // 2) Infos des apprenants concernés
      const { data: apprenants, error: apprenantsError } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, type_apprenant, formation_choisie")
        .in("id", apprenantIds)
        .is("deleted_at", null);

      if (apprenantsError) throw apprenantsError;

      const apprenantById = new Map((apprenants || []).map((a) => [a.id, a]));

      // 3) Fusion : un seul enregistrement par apprenant/jour (le plus récent)
      const byDay = new Map<string, Map<string, { sentAt: string; apprenant: any }>>();

      for (const email of emails) {
        const apprenant = apprenantById.get(email.apprenant_id);
        if (!apprenant) continue;

        const day = isoDate(new Date(email.sent_at));
        if (!byDay.has(day)) byDay.set(day, new Map());
        const dayMap = byDay.get(day)!;

        const existing = dayMap.get(apprenant.id);
        if (!existing || new Date(email.sent_at) > new Date(existing.sentAt)) {
          dayMap.set(apprenant.id, { sentAt: email.sent_at, apprenant });
        }
      }

      // 4) Structure finale triée par jour décroissant
      const days = Array.from(byDay.entries())
        .map(([day, map]) => ({
          day,
          label: fmtDate(day),
          rows: Array.from(map.values()).sort(
            (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
          ),
        }))
        .sort((a, b) => b.day.localeCompare(a.day));

      return days;
    },
  });

  const total = useMemo(
    () => (data || []).reduce((sum, d) => sum + d.rows.length, 0),
    [data]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            Codes d&apos;accès envoyés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 opacity-60">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={(data?.length || 0) > 0 ? "border-emerald-300" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700">
          <KeyRound className="h-5 w-5" />
          Codes d&apos;accès envoyés
          {total > 0 && (
            <Badge
              variant="outline"
              className="ml-2 border-emerald-400 text-emerald-700 bg-emerald-50"
            >
              {total}
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Apprenants ayant reçu leurs identifiants de connexion à partir d&apos;aujourd&apos;hui,
          regroupés par jour.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!data || data.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucun code d&apos;accès envoyé aujourd&apos;hui.
          </p>
        ) : (
          data.map(({ day, label, rows }) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-0 bg-card z-10 py-1">
                <h4 className="text-sm font-semibold text-foreground capitalize">
                  {label}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {rows.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {rows.map(({ apprenant: a, sentAt }) => {
                  const typeLabel =
                    typeLabels[a.type_apprenant || ""] || a.type_apprenant || "-";
                  const typeColor =
                    typeColors[a.type_apprenant || ""] ||
                    "bg-muted text-muted-foreground";
                  const time = new Date(sentAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg border bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50 transition-colors cursor-pointer"
                      onClick={() => onNavigateToApprenant?.(a.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {a.prenom} {a.nom}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.formation_choisie || "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-xs ${typeColor}`}>
                            {typeLabel}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-emerald-700">
                          Envoyé à {time}
                        </span>
                        {a.email && (
                          <a
                            href={`mailto:${a.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <Mail className="h-3 w-3" />
                            {a.email}
                          </a>
                        )}
                        {a.telephone && (
                          <a
                            href={`tel:${a.telephone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <Phone className="h-3 w-3" />
                            {a.telephone}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
