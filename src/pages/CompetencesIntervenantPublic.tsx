import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CompetencesIntervenantForm, type CompetencesDocument } from "@/components/documents/CompetencesIntervenantForm";

export default function CompetencesIntervenantPublic() {
  const { token } = useParams();
  const [doc, setDoc] = useState<CompetencesDocument | null>(null);
  const [error, setError] = useState("");
  const appel = async (body: Record<string, unknown>) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/competences-intervenant`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ ...body, token }),
    });
    return { ok: response.ok, json: await response.json() };
  };
  const recharger = async () => {
    const result = await appel({ action: "get" });
    if (!result.ok || !result.json.document) throw new Error(result.json.error ?? "Formulaire indisponible");
    setDoc(result.json.document);
  };
  useEffect(() => { setDoc(null); void recharger().catch(e => setError(e.message)); }, [token]);
  if (error) return <main className="p-6"><h1 className="text-xl font-bold">Formulaire indisponible</h1><p role="alert">{error}</p></main>;
  if (!doc) return <p className="p-6">Chargement…</p>;
  return <CompetencesIntervenantForm key={token} doc={doc} appel={appel} recharger={recharger} />;
}