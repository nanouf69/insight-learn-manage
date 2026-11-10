import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lireSources, type CarteSources } from "@/lib/corrigesSources";

export function useCorrigesSources(owner: string | null | undefined, attempts: string[], results: string[]) {
  const key = JSON.stringify([owner, [...new Set(attempts)].sort(), [...new Set(results)].sort()]);
  const [state, setState] = useState<{key:string; map:CarteSources; loading:boolean; error:string|null}>({key:"",map:new Map(),loading:true,error:null});
  useEffect(() => {
    let alive = true, generation = 0;
    const load = async () => {
      const g = ++generation;
      setState({key,map:new Map(),loading:true,error:null});
      try {
        const map = await lireSources(attempts, results);
        if (alive && g === generation) setState({key,map,loading:false,error:null});
      } catch {
        if (alive && g === generation) setState({key,map:new Map(),loading:false,error:"Corrigé officiel actuel indisponible : lecture serveur non confirmée. Le corrigé historique est conservé."});
      }
    };
    void load();
    const focus = () => void load();
    window.addEventListener("focus", focus);
    const channel = supabase.channel(`corriges-sources-${owner}-${Math.random()}`).on("postgres_changes", {event:"*",schema:"public",table:"exam_content_versions"}, focus).subscribe();
    return () => {alive=false; generation++; window.removeEventListener("focus",focus); void supabase.removeChannel(channel);};
    // IDs are serialized to avoid request loops caused by fresh arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : {key,map:new Map() as CarteSources,loading:true,error:null};
}