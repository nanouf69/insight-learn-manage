import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import AdminCorrectionQrcV2Reel from "@/pages/AdminCorrectionQrcV2Reel";
import "@/index.css";
const node=document.getElementById("root");
if(node)createRoot(node).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AdminCorrectionQrcV2Reel /></QueryClientProvider>);