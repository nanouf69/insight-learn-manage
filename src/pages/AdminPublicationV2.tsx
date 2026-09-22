/**
 * PUBLICATION DES SUJETS DANS LE NOYAU V2 — ÉCRAN ADMIN
 * =====================================================
 * Lecture seule par défaut. Une publication n'est possible qu'après une
 * vérification question par question sans aucun écart avec la dernière
 * variante réellement servie. Publier n'active rien pour les apprenants :
 * le raccordement reste une décision serveur, apprenant par apprenant.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiveExamens } from "@/components/cours-en-ligne/useLiveExamens";
import { useAuth } from "@/contexts/AuthContext";
import { publierVersionExamen } from "@/features/noyau-passage/pontV2";
import {
  comparerAvantPublication,
  controlerVersionPubliee,
  lireVersions,
  retirerVersionExamen,
  versionActive,
  type Comparaison,
  type VersionPubliee,
} from "@/features/noyau-passage/publicationV2";
import { useQuery } from "@tanstack/react-query";

/** Examens exclus du périmètre tant que la session en cours n'est pas terminée. */
const EXCLUS = new Set(["EB3", "EB3-TAXI"]);

const VAGUES: { nom: string; examens: string[] }[] = [
  { nom: "Vague 0 — examen de test", examens: ["EB99TEST"] },
  { nom: "Vague 1 — VTC (EB4, EB5, EB6)", examens: ["EB4", "EB5", "EB6"] },
  { nom: "Vague 2 — VTC (EB1, EB2)", examens: ["EB1", "EB2"] },
  { nom: "Vague 3 — TAXI", examens: ["EB1-TAXI", "EB2-TAXI", "EB4-TAXI", "EB5-TAXI", "EB6-TAXI"] },
  {
    nom: "Vague 4 — TA et VA",
    examens: ["eb1-ta", "eb2-ta", "eb3-ta", "eb4-ta", "eb5-ta", "eb6-ta", "eb1-va", "eb2-va", "eb3-va", "eb4-va", "eb5-va", "eb6-va"],
  },
  { nom: "Hors périmètre (session en cours)", examens: ["EB3", "EB3-TAXI"] },
];

const MODULE_PAR_EXAMEN: Record<string, number> = {
  EB1: 90000, EB2: 90001, EB3: 90002, EB4: 90003, EB5: 90004, EB6: 90005,
  "EB1-TAXI": 90006, "EB2-TAXI": 90007, "EB3-TAXI": 90008, "EB4-TAXI": 90009, "EB5-TAXI": 90010, "EB6-TAXI": 90011,
  "eb1-ta": 90012, "eb2-ta": 90018, "eb3-ta": 90019, "eb4-ta": 90020, "eb5-ta": 90021, "eb6-ta": 90022,
  "eb1-va": 90013, "eb2-va": 90023, "eb3-va": 90024, "eb4-va": 90025, "eb5-va": 90026, "eb6-va": 90027,
};

export default function AdminPublicationV2() {
  const { user } = useAuth();
  const { examens, isLoading, error } = useLiveExamens();
  const [comparaisons, setComparaisons] = useState<Record<string, Comparaison>>({});
  const [occupe, setOccupe] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { ton: "ok" | "ko"; texte: string }>>({});

  const examIds = useMemo(() => examens.map((e) => e.id), [examens]);
  const { data: versions = [], refetch } = useQuery({
    queryKey: ["publication-v2-versions", examIds.join("|")],
    queryFn: () => lireVersions(examIds),
    enabled: examIds.length > 0,
    staleTime: 0,
  });

  const parId = useMemo(() => new Map(examens.map((e) => [e.id, e])), [examens]);
  const noter = (id: string, ton: "ok" | "ko", texte: string) =>
    setMessages((m) => ({ ...m, [id]: { ton, texte } }));

  async function verifier(id: string) {
    const examen = parId.get(id);
    if (!examen) return;
    setOccupe(id);
    try {
      const c = await comparerAvantPublication(examen);
      setComparaisons((m) => ({ ...m, [id]: c }));
      noter(
        id,
        c.publiable ? "ok" : "ko",
        c.publiable
          ? `Aucun écart. ${c.nbSansReference > 0 ? `${c.nbSansReference} matière(s) jamais servie(s) : aucune référence de comparaison.` : "Contenu actif identique à la dernière variante servie."}`
          : `${c.nbEcarts} écart(s) détecté(s) : publication bloquée, rien n'a été modifié.`,
      );
    } catch (e) {
      noter(id, "ko", `Vérification impossible : ${(e as Error).message}`);
    } finally {
      setOccupe(null);
    }
  }

  async function publier(id: string) {
    const examen = parId.get(id);
    const c = comparaisons[id];
    if (!examen || !c?.publiable || EXCLUS.has(id)) return;
    setOccupe(id);
    try {
      const v = (await publierVersionExamen(examen, MODULE_PAR_EXAMEN[id] ?? null, user?.email ?? undefined)) as unknown as VersionPubliee;
      const ctrl = controlerVersionPubliee(examen, v);
      await refetch();
      noter(
        id,
        ctrl.conforme ? "ok" : "ko",
        ctrl.conforme
          ? `Version ${v.version_number} publiée · ${ctrl.nbQuestions} questions · contrôle après publication conforme au contenu servi.`
          : `Version publiée mais contrôle NON conforme : ${ctrl.ecarts.slice(0, 3).join(" ; ")}. Retirez la version.`,
      );
    } catch (e) {
      noter(id, "ko", `Publication refusée : ${(e as Error).message}`);
    } finally {
      setOccupe(null);
    }
  }

  async function retirer(id: string) {
    setOccupe(id);
    try {
      await retirerVersionExamen(id, "Retour arrière demandé par l'administrateur");
      await refetch();
      noter(id, "ok", "Version retirée : les nouveaux passages repartent sur l'ancien circuit. Aucune donnée effacée.");
    } catch (e) {
      noter(id, "ko", `Retrait impossible : ${(e as Error).message}`);
    } finally {
      setOccupe(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Publication des sujets dans le nouveau moteur</h1>
        <p className="text-sm text-muted-foreground">
          Publier un sujet ne bascule aucun apprenant : le raccordement reste une décision serveur, apprenant par
          apprenant. Une publication est refusée tant qu'un écart existe avec la dernière variante réellement servie.
          Aucune donnée existante n'est effacée ni recalculée.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement du contenu actif…</p>}
      {!!error && <p className="text-sm text-destructive">Contenu actif illisible : aucune publication possible.</p>}

      {VAGUES.map((vague) => {
        const lignes = vague.examens.filter((id) => parId.has(id));
        if (lignes.length === 0) return null;
        return (
          <Card key={vague.nom} className="p-4">
            <h2 className="mb-3 font-semibold">{vague.nom}</h2>
            <div className="space-y-3">
              {lignes.map((id) => {
                const examen = parId.get(id)!;
                const active = versionActive(versions, id);
                const c = comparaisons[id];
                const msg = messages[id];
                const bloque = EXCLUS.has(id);
                return (
                  <div key={id} className="rounded border p-3" data-testid={`ligne-${id}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">{examen.titre}</span>
                      <Badge variant="outline">{id}</Badge>
                      {active ? (
                        <Badge className="bg-success/20 text-success">Publié · version {active.version_number}</Badge>
                      ) : (
                        <Badge variant="secondary">Non publié · ancien circuit</Badge>
                      )}
                      {bloque && <Badge className="bg-warning/20 text-warning">Hors périmètre</Badge>}
                      <div className="ml-auto flex gap-2">
                        <Button size="sm" variant="outline" disabled={occupe === id} onClick={() => verifier(id)}>
                          Vérifier
                        </Button>
                        <Button
                          size="sm"
                          disabled={bloque || occupe === id || !c?.publiable || !!active}
                          onClick={() => publier(id)}
                        >
                          Publier
                        </Button>
                        {active && (
                          <Button size="sm" variant="destructive" disabled={occupe === id} onClick={() => retirer(id)}>
                            Retirer
                          </Button>
                        )}
                      </div>
                    </div>

                    {msg && (
                      <p className={`mt-2 text-sm ${msg.ton === "ok" ? "text-success" : "text-destructive"}`}>
                        {msg.texte}
                      </p>
                    )}

                    {c && (
                      <table className="mt-3 w-full text-xs">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="text-left">Matière</th>
                            <th className="text-left">Dernière variante servie</th>
                            <th className="text-left">Questions servies / actives</th>
                            <th className="text-left">Écarts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.matieres.map((m) => (
                            <tr key={m.matiere} className="border-t">
                              <td className="py-1">{m.matiere}</td>
                              <td>
                                {m.reference === "aucune"
                                  ? "jamais servie"
                                  : new Date(m.dateReference!).toLocaleString("fr-FR")}
                              </td>
                              <td>
                                {m.nbServi} / {m.nbActif}
                              </td>
                              <td className={m.ecarts.length ? "text-destructive" : "text-success"}>
                                {m.ecarts.length === 0
                                  ? "aucun"
                                  : m.ecarts
                                      .slice(0, 3)
                                      .map((e) => `n°${e.position} (${e.nature}${e.detail ? ` : ${e.detail}` : ""})`)
                                      .join(" · ") + (m.ecarts.length > 3 ? ` … +${m.ecarts.length - 3}` : "")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
