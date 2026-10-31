import "@/index.css";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
const id = Number(new URLSearchParams(location.search).get("m") || 8);
const qc = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}><BrowserRouter><TooltipProvider>
    <ModuleDetailView module={{ id, nom: "M" + id }} onBack={() => {}} studentOnly apprenantType="vtc-e" />
  </TooltipProvider></BrowserRouter></QueryClientProvider>);
