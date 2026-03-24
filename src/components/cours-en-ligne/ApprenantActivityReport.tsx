import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, Clock, BookOpen, Calendar, ArrowLeft, BarChart3, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, differenceInMinutes, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
}

interface Connexion {
  id: string;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string;
  current_module: string | null;
}

const MAX_SESSION_DURATION_MS = 7 * 60 * 60 * 1000;

interface ModuleActivite {
  id: string;
  module_id: number;
  module_nom: string;
  action_type: string;
  occurred_at: string;
}

function ApprenantCombobox({ apprenants, selectedId, onSelect }: {
  apprenants: Apprenant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = apprenants.find((a) => a.id === selectedId);
  const label = selected
    ? `${selected.prenom} ${selected.nom} ${selected.type_apprenant ? `(${selected.type_apprenant})` : ""}`
    : "Rechercher un élève...";

  const filtered = search.trim().length >= 2
    ? apprenants.filter((a) => {
        const q = search.toLowerCase();
        return a.nom.toLowerCase().includes(q) || a.prenom.toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q);
      })
    : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Taper un nom ou prénom (min. 2 lettres)..." value={search} onValueChange={setSearch} />
          <CommandList>
            {search.trim().length < 2 ? (
              <CommandEmpty>Tapez au moins 2 lettres pour rechercher.</CommandEmpty>
            ) : filtered.length === 0 ? (
              <CommandEmpty>Aucun élève trouvé.</CommandEmpty>
            ) : (
              <CommandGroup heading={`${filtered.length} résultat(s)`}>
                {filtered.slice(0, 50).map((a) => (
                  <CommandItem
                    key={a.id}
                    value={a.id}
                    onSelect={() => { onSelect(a.id); setOpen(false); setSearch(""); }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedId === a.id ? "opacity-100" : "opacity-0")} />
                    {a.prenom} {a.nom} {a.type_apprenant ? `(${a.type_apprenant})` : ""} — {a.email || "pas d'email"}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  onBack: () => void;
}

export default function ApprenantActivityReport({ onBack }: Props) {
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [connexions, setConnexions] = useState<Connexion[]>([]);
  const [activites, setActivites] = useState<ModuleActivite[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<"7" | "30" | "90" | "all">("30");
  const printRef = useRef<HTMLDivElement>(null);

  // Load apprenants list
  useEffect(() => {
    const load = async () => {
      let all: Apprenant[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("apprenants")
          .select("id, nom, prenom, email, type_apprenant, formation_choisie")
          .not("auth_user_id", "is", null)
          .order("nom")
          .range(from, from + PAGE - 1);
        const batch = (data as Apprenant[]) || [];
        all = all.concat(batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }
      setApprenants(all);
    };
    load();
  }, []);

  // Load connexions & activities for selected apprenant
  useEffect(() => {
    if (!selectedId) {
      setConnexions([]);
      setActivites([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      const since = period === "all" ? "2000-01-01" : format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd");

      const [connRes, actRes] = await Promise.all([
        supabase
          .from("apprenant_connexions" as any)
          .select("id, started_at, ended_at, last_seen_at")
          .eq("apprenant_id", selectedId)
          .gte("started_at", since)
          .order("started_at", { ascending: false }),
        supabase
          .from("apprenant_module_activites" as any)
          .select("id, module_id, module_nom, action_type, occurred_at")
          .eq("apprenant_id", selectedId)
          .gte("occurred_at", since)
          .order("occurred_at", { ascending: false }),
      ]);

      setConnexions(((connRes.data as any[]) || []) as Connexion[]);
      setActivites(((actRes.data as any[]) || []) as ModuleActivite[]);
      setLoading(false);
    };
    load();
  }, [selectedId, period]);

  const selectedApprenant = apprenants.find((a) => a.id === selectedId);

  const getCappedSessionEnd = (connexion: Connexion) => {
    const start = parseISO(connexion.started_at);
    const rawEnd = connexion.ended_at ? parseISO(connexion.ended_at) : parseISO(connexion.last_seen_at);
    const cappedEnd = new Date(start.getTime() + MAX_SESSION_DURATION_MS);
    return rawEnd > cappedEnd ? cappedEnd : rawEnd;
  };

  const getSessionMinutes = (connexion: Connexion) => {
    const start = parseISO(connexion.started_at);
    return Math.max(0, differenceInMinutes(getCappedSessionEnd(connexion), start));
  };

  // Calculate stats
  const totalMinutes = connexions.reduce((sum, c) => {
    return sum + getSessionMinutes(c);
  }, 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Modules consultés (unique)
  const uniqueModules = [...new Map(activites.filter(a => a.action_type === "open_module").map((a) => [a.module_id, a.module_nom])).entries()];

  // Chart data: connexion par jour
  const chartData = (() => {
    const days = period === "all" ? 30 : parseInt(period);
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      map.set(d, 0);
    }
    connexions.forEach((c) => {
      const day = format(parseISO(c.started_at), "yyyy-MM-dd");
      const mins = getSessionMinutes(c);
      map.set(day, (map.get(day) || 0) + mins);
    });
    return [...map.entries()].map(([date, minutes]) => ({
      date: format(parseISO(date), "dd MMM", { locale: fr }),
      minutes,
    }));
  })();

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Rapport d'activité — ${selectedApprenant?.prenom} ${selectedApprenant?.nom}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
          .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
          .stats { display: flex; gap: 24px; margin-bottom: 20px; }
          .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; flex: 1; text-align: center; }
          .stat-value { font-size: 28px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; background: #e0e7ff; color: #3730a3; }
          .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Rapport d'activité — ${selectedApprenant?.prenom} ${selectedApprenant?.nom}</h1>
        <p class="subtitle">
          ${selectedApprenant?.email || "Pas d'email"} · ${selectedApprenant?.type_apprenant || "—"}<br/>
          Période : ${period === "all" ? "Tout l'historique" : `${period} derniers jours`} · Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}
        </p>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${connexions.length}</div>
            <div class="stat-label">Connexions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalHours}h${remainingMinutes.toString().padStart(2, "0")}</div>
            <div class="stat-label">Temps total</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${uniqueModules.length}</div>
            <div class="stat-label">Modules consultés</div>
          </div>
        </div>

        <h2>Détail des connexions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Heure début</th>
              <th>Heure fin</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            ${connexions.map((c) => {
              const start = parseISO(c.started_at);
              const end = getCappedSessionEnd(c);
              const mins = getSessionMinutes(c);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return `<tr>
                <td>${format(start, "dd/MM/yyyy", { locale: fr })}</td>
                <td>${format(start, "HH:mm", { locale: fr })}</td>
                <td>${c.ended_at ? format(end, "HH:mm", { locale: fr }) : "En cours"}</td>
                <td>${h}h${m.toString().padStart(2, "0")}</td>
              </tr>`;
            }).join("")}
            ${connexions.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Aucune connexion</td></tr>' : ""}
          </tbody>
        </table>

        <h2>Modules consultés</h2>
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Nombre d'accès</th>
              <th>Dernière consultation</th>
            </tr>
          </thead>
          <tbody>
            ${uniqueModules.map(([modId, modNom]) => {
              const modActivites = activites.filter(a => a.module_id === modId && a.action_type === "open_module");
              const last = modActivites[0];
              return `<tr>
                <td>${modNom}</td>
                <td>${modActivites.length}</td>
                <td>${last ? format(parseISO(last.occurred_at), "dd/MM/yyyy à HH:mm", { locale: fr }) : "—"}</td>
              </tr>`;
            }).join("")}
            ${uniqueModules.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Aucun module consulté</td></tr>' : ""}
          </tbody>
        </table>

        <h2>Historique des actions</h2>
        <table>
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Module</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${activites.slice(0, 100).map((a) => `<tr>
              <td>${format(parseISO(a.occurred_at), "dd/MM/yyyy HH:mm", { locale: fr })}</td>
              <td>${a.module_nom}</td>
              <td><span class="badge">${a.action_type === "open_module" ? "Ouverture" : a.action_type}</span></td>
            </tr>`).join("")}
            ${activites.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Aucune activité</td></tr>' : ""}
          </tbody>
        </table>

        <div class="footer">
          FTRANSPORT — Rapport généré automatiquement
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Rapport d'activité élève</h2>
            <p className="text-sm text-muted-foreground">Connexions, heures et modules consultés</p>
          </div>
        </div>
        {selectedId && (
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimer le rapport
          </Button>
        )}
      </div>

      {/* Sélection apprenant + période */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px]">
          <label className="text-sm font-medium mb-1 block">Sélectionner un élève :</label>
          <ApprenantCombobox
            apprenants={apprenants}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Période :</label>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="all">Tout l'historique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!loading && selectedId && (
        <div ref={printRef} className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">{connexions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Connexions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">{totalHours}h{remainingMinutes.toString().padStart(2, "0")}</p>
                <p className="text-xs text-muted-foreground mt-1">Temps total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">{uniqueModules.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Modules consultés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <BarChart3 className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">
                  {connexions.length > 0
                    ? `${Math.round(totalMinutes / connexions.length)}min`
                    : "—"
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">Durée moyenne / session</p>
              </CardContent>
            </Card>
          </div>

          {/* Graphique connexion par jour */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Temps de connexion par jour (minutes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} min`, "Temps"]} />
                  <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Détail des connexions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail des connexions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Heure début</TableHead>
                    <TableHead>Heure fin</TableHead>
                    <TableHead>Durée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connexions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Aucune connexion enregistrée
                      </TableCell>
                    </TableRow>
                  )}
                  {connexions.map((c) => {
                    const start = parseISO(c.started_at);
                    const end = getCappedSessionEnd(c);
                    const mins = getSessionMinutes(c);
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>{format(start, "dd/MM/yyyy", { locale: fr })}</TableCell>
                        <TableCell>{format(start, "HH:mm", { locale: fr })}</TableCell>
                        <TableCell>
                          {c.ended_at
                            ? format(end, "HH:mm", { locale: fr })
                            : <Badge variant="secondary" className="text-xs">En cours</Badge>
                          }
                        </TableCell>
                        <TableCell className="font-medium">{h}h{m.toString().padStart(2, "0")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Modules consultés */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modules consultés</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Nombre d'accès</TableHead>
                    <TableHead>Dernière consultation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueModules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Aucun module consulté
                      </TableCell>
                    </TableRow>
                  )}
                  {uniqueModules.map(([modId, modNom]) => {
                    const modActivites = activites.filter(a => a.module_id === modId && a.action_type === "open_module");
                    const last = modActivites[0];
                    return (
                      <TableRow key={modId}>
                        <TableCell className="font-medium">{modNom}</TableCell>
                        <TableCell>{modActivites.length}</TableCell>
                        <TableCell>
                          {last ? format(parseISO(last.occurred_at), "dd/MM/yyyy à HH:mm", { locale: fr }) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedId && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Sélectionnez un élève</p>
          <p className="text-sm">pour voir son rapport d'activité détaillé</p>
        </div>
      )}
    </div>
  );
}
