import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ReservationPratique from "./pages/ReservationPratique";
import InscriptionFormationContinue from "./pages/InscriptionFormationContinue";
import FournisseurPortal from "./pages/FournisseurPortal";
import CoursPublic from "./pages/CoursPublic";

// Onboarding pages
import OnboardingWelcome from "./pages/onboarding/OnboardingWelcome";
import Step1 from "./pages/onboarding/steps/Step1";
import Step2 from "./pages/onboarding/steps/Step2";
import Step3 from "./pages/onboarding/steps/Step3";
import Step4 from "./pages/onboarding/steps/Step4";
import Step5 from "./pages/onboarding/steps/Step5";
import Step6 from "./pages/onboarding/steps/Step6";
import Step7 from "./pages/onboarding/steps/Step7";
import Step8 from "./pages/onboarding/steps/Step8";
import Step9 from "./pages/onboarding/steps/Step9";
import Step10 from "./pages/onboarding/steps/Step10";
import Step11 from "./pages/onboarding/steps/Step11";
import Step12 from "./pages/onboarding/steps/Step12";

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              
              {/* Onboarding routes - public */}
              <Route path="/bienvenue" element={<OnboardingWelcome />} />
              <Route path="/bienvenue/etape-1" element={<Step1 />} />
              <Route path="/bienvenue/etape-2" element={<Step2 />} />
              <Route path="/bienvenue/etape-3" element={<Step3 />} />
              <Route path="/bienvenue/etape-4" element={<Step4 />} />
              <Route path="/bienvenue/etape-5" element={<Step5 />} />
              <Route path="/bienvenue/etape-6" element={<Step6 />} />
              <Route path="/bienvenue/etape-7" element={<Step7 />} />
              <Route path="/bienvenue/etape-8" element={<Step8 />} />
              <Route path="/bienvenue/etape-9" element={<Step9 />} />
              <Route path="/bienvenue/etape-10" element={<Step10 />} />
              <Route path="/bienvenue/etape-11" element={<Step11 />} />
              <Route path="/bienvenue/etape-12" element={<Step12 />} />
              
              {/* Reservation pratique - public */}
              <Route path="/reservation-pratique" element={<ReservationPratique />} />
              <Route path="/inscription-formation-continue" element={<InscriptionFormationContinue />} />
              <Route path="/cours" element={<CoursPublic />} />
              
              {/* Fournisseur portal - public */}
              <Route path="/fournisseur/:token" element={<FournisseurPortal />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;