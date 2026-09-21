import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchLiveSessionById,
  fetchLiveState,
  type LiveParticipant,
  type LiveResponse,
  type LiveSession,
} from "@/lib/liveChallenge";

/**
 * Temps reel (WebSocket) + rattrapage serveur a l'abonnement, au retour d'onglet
 * et a chaque reconnexion du canal. Aucun rechargement periodique agressif :
 * le filet de securite ne s'active que si le canal est coupe.
 */
export function useLiveChallengeState(sessionId: string | null) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [responses, setResponses] = useState<LiveResponse[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const connectedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [s, state] = await Promise.all([fetchLiveSessionById(sessionId), fetchLiveState(sessionId)]);
      if (s) setSession(s);
      setParticipants(state.participants);
      setResponses(state.responses);
    } catch {
      /* rattrapage silencieux : nouvelle tentative au prochain evenement */
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void refresh();

    const channel = supabase
      .channel(`live-challenge-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_responses", filter: `live_session_id=eq.${sessionId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_participants", filter: `live_session_id=eq.${sessionId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` },
        () => void refresh(),
      )
      .subscribe((status) => {
        if (cancelled) return;
        const ok = status === "SUBSCRIBED";
        connectedRef.current = ok;
        setConnected(ok);
        if (ok) void refresh();
      });

    const onFocus = () => void refresh();
    const onOnline = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onFocus);

    // Filet de securite uniquement quand le temps reel est tombe.
    const fallback = window.setInterval(() => {
      if (!connectedRef.current) void refresh();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(fallback);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onFocus);
      supabase.removeChannel(channel);
    };
  }, [sessionId, refresh]);

  return { session, participants, responses, connected, loading, refresh };
}
