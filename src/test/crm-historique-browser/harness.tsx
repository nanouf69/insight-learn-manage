import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HistoriqueCopiesMatiere from "@/components/crm/apprenant-sections/HistoriqueCopiesMatiere";
import "@/index.css";
const node = document.getElementById("root");
if (node) createRoot(node).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><main className="p-6"><h1 className="mb-4 text-xl font-bold">CRM — Élève FICTIF — EB3 TAXI</h1><HistoriqueCopiesMatiere account="00000000-0000-4000-8000-000000000001" exam="EB3-TAXI" subject="t3p" nom="A T3P" /></main></QueryClientProvider>);