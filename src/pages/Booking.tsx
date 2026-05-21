import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const SLOTS = [
  "11:00","11:15","11:30","11:45",
  "12:00","12:15","12:30","12:45",
  "13:00","13:15","13:30","13:45",
];

interface Apprenant { id: string; nom: string; prenom: string; telephone: string }
interface BookingInfo {
  eligible: boolean;
  reason?: string;
  apprenant?: Apprenant;
  existing?: { slot: string; telephone: string; created_at: string } | null;
  takenSlots?: string[];
}

export default function Booking() {
  const [sp] = useSearchParams();
  const id = sp.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/get-apprenant-booking?id=${encodeURIComponent(id)}`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      const data: BookingInfo = await res.json();
      setInfo(data);
      setTaken(new Set(data.takenSlots ?? []));
      if (data.apprenant?.telephone) setPhone(data.apprenant.telephone);
      if (data.existing?.slot) setConfirmed(data.existing.slot);
    } catch (e) {
      setError("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) loadInfo(); else setLoading(false); }, [id]);

  // Realtime subscription on creneaux_rdv
  useEffect(() => {
    const ch = supabase
      .channel("public:creneaux_rdv")
      .on("postgres_changes", { event: "*", schema: "public", table: "creneaux_rdv" }, (payload: any) => {
        setTaken((prev) => {
          const next = new Set(prev);
          if (payload.eventType === "INSERT" && payload.new?.slot) next.add(payload.new.slot);
          if (payload.eventType === "DELETE" && payload.old?.slot) next.delete(payload.old.slot);
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submit = async () => {
    if (!selected || !info?.apprenant) return;
    if (phone.trim().length < 6) { setError("Merci de saisir un téléphone valide"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/book-creneau-rdv`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({ apprenant_id: info.apprenant.id, slot: selected, telephone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "slot_taken") setError("Ce créneau vient d'être pris à l'instant, merci d'en choisir un autre.");
        else if (data.error === "already_booked") { setConfirmed(data.slot); setError(null); }
        else setError("Erreur : " + (data.error || "inconnue"));
        return;
      }
      setConfirmed(selected);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Shell><p>Chargement…</p></Shell>;
  if (!id || !info) return <Shell><p>Lien invalide.</p></Shell>;
  if (!info.eligible) return (
    <Shell>
      <h2 style={{ color: "#0D2540", marginTop: 0 }}>Ce lien ne vous concerne pas</h2>
      <p>Votre examen n'est pas planifié le 26 mai.</p>
    </Shell>
  );

  const app = info.apprenant!;

  return (
    <Shell>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#0D2540", margin: 0, fontSize: 26 }}>Réservez votre créneau</h1>
        <p style={{ color: "#475569", marginTop: 8 }}>
          Bonjour <strong>{app.prenom} {app.nom}</strong>, choisissez un créneau de 15 minutes pour le <strong>lundi 25 mai</strong>.
        </p>
      </div>

      {confirmed ? (
        <div style={{
          background: "#EAF3DE", border: "2px solid #639922", borderRadius: 12,
          padding: 24, textAlign: "center"
        }}>
          <h2 style={{ color: "#2d5016", marginTop: 0 }}>✅ Créneau confirmé</h2>
          <p style={{ fontSize: 28, fontWeight: 700, color: "#0D2540", margin: "16px 0" }}>
            Lundi 25 mai — {confirmed}
          </p>
          <p style={{ color: "#475569" }}>Vous avez déjà un créneau réservé. Nous vous attendrons à cette heure-là.</p>
        </div>
      ) : (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: 10, marginBottom: 24,
          }}>
            {SLOTS.map((s) => {
              const isTaken = taken.has(s);
              const isSelected = selected === s;
              const styles: React.CSSProperties = isTaken
                ? { background: "#e5e7eb", color: "#9ca3af", textDecoration: "line-through", borderColor: "#d1d5db", cursor: "not-allowed" }
                : isSelected
                  ? { background: "#E6F1FB", borderColor: "#378ADD", color: "#0D2540" }
                  : { background: "#fff", borderColor: "#d1d5db", color: "#0D2540" };
              return (
                <button
                  key={s}
                  disabled={isTaken}
                  onClick={() => setSelected(s)}
                  style={{
                    padding: "14px 8px", borderRadius: 10, border: "2px solid",
                    fontSize: 16, fontWeight: 600, transition: "all .15s", ...styles,
                  }}
                >
                  {s}
                  {isTaken && <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4 }}>Complet</div>}
                </button>
              );
            })}
          </div>

          {selected && (
            <div style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <h3 style={{ marginTop: 0, color: "#0D2540" }}>Confirmer la réservation — {selected}</h3>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#475569" }}>Nom</label>
              <input
                type="text" value={`${app.prenom} ${app.nom}`} disabled
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, marginBottom: 12, background: "#f1f5f9", boxSizing: "border-box" }}
              />
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#475569" }}>Téléphone *</label>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, marginBottom: 16, boxSizing: "border-box" }}
              />
              {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
              <button
                onClick={submit} disabled={submitting}
                style={{
                  background: "#00B4D8", color: "#fff", border: "none", padding: "12px 24px",
                  borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: submitting ? "wait" : "pointer", width: "100%",
                }}
              >
                {submitting ? "Réservation…" : "Confirmer mon créneau"}
              </button>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "32px 16px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ background: "#0D2540", color: "#fff", padding: "20px 24px", borderRadius: "12px 12px 0 0", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>FTRANSPORT</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#cbd5e1" }}>Réservation créneau questions/réponses</p>
        </div>
        <div style={{ background: "#fff", padding: 28, borderRadius: "0 0 12px 12px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
