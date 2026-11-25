// Read-only isolated rendering of the real Introduction component. No real identity or transport.
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import { supabase } from "@/integrations/supabase/client";
import "@/index.css";
const params = new URLSearchParams(location.search);
const id = Number(params.get("module") ?? 26);
const admin = params.has("admin");
(supabase.auth as any).getSession = async () => ({ data: { session: null }, error: null });
(supabase as any).rpc = async () => ({ data: [], error: null });
(supabase as any).from = (table: string) => {
  const data = table === "apprenant_module_completion" ? {pages_completees:[0,1,2,3],completed:false} : null;
  const q: any = new Proxy({}, {get: (_, method) => method === "then" ? (resolve: any) => resolve({data: [],error:null}) : method === "maybeSingle" || method === "single" ? async () => ({data,error:null}) : () => q});
  return q;
};
const root = document.getElementById("root");
if (root) createRoot(root).render(<QueryClientProvider client={new QueryClient()}><ModuleDetailView module={{id,nom:"Introduction TAXI/VTC"}} apprenantId="fixture-cma-read-only" studentOnly={!admin} apercuAdmin onBack={() => {}} /></QueryClientProvider>);