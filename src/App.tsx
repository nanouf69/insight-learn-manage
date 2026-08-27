import "@/lib/scrollJumpDiagnostic";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ReservationPratique from "./pages/ReservationPratique";
import InscriptionFormationContinue from "./pages/InscriptionFormationContinue";
import FournisseurPortal from "./pages/FournisseurPortal";
import CoursPublic from "./pages/CoursPublic";
import ResetPassword from "./pages/ResetPassword";
import PreInformationPublic from "./pages/PreInformationPublic";
import AuthCallback from "./pages/AuthCallback";
import RevolutTransactions from "./pages/RevolutTransactions";
import RevolutConnect from "./pages/RevolutConnect";
import DevisPublic from "./pages/DevisPublic";
import DevisPersonnel from "./pages/DevisPersonnel";
import ReservationCarteVtc from "./pages/ReservationCarteVtc";
import Booking from "./pages/Booking";
import SessionDetailPage from "./pages/SessionDetailPage";
import DiagnosticExamensBlancs from "./pages/DiagnosticExamensBlancs";
import AdminErrorLogs from "./pages/AdminErrorLogs";
import AdminAuditT3P from "./pages/AdminAuditT3P";
import AdminAuditModules from "./pages/AdminAuditModules";
import AdminAuditDBvsLearner from "./pages/AdminAuditDBvsLearner";

import DocumentASignerPublic from "./pages/DocumentASignerPublic";

// Onboarding pages

import OnboardingWelcome from "./pages/onboarding/OnboardingWelcome";
import OnboardingFCFinish from "./pages/onboarding/OnboardingFCFinish";
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
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary><Index /></ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                
                {/* Onboarding routes - public */}
                <Route path="/bienvenue" element={<ErrorBoundary><OnboardingWelcome /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-1" element={<ErrorBoundary><Step1 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-2" element={<ErrorBoundary><Step2 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-3" element={<ErrorBoundary><Step3 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-4" element={<ErrorBoundary><Step4 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-5" element={<ErrorBoundary><Step5 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-6" element={<ErrorBoundary><Step6 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-7" element={<ErrorBoundary><Step7 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-8" element={<ErrorBoundary><Step8 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-9" element={<ErrorBoundary><Step9 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-10" element={<ErrorBoundary><Step10 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-11" element={<ErrorBoundary><Step11 /></ErrorBoundary>} />
                <Route path="/bienvenue/etape-12" element={<ErrorBoundary><Step12 /></ErrorBoundary>} />
                <Route path="/bienvenue/termine" element={<ErrorBoundary><OnboardingFCFinish /></ErrorBoundary>} />
                

                {/* Reservation pratique - public */}
                <Route path="/reservation-pratique" element={<ErrorBoundary><ReservationPratique /></ErrorBoundary>} />
                <Route path="/reservation-carte-vtc" element={<ErrorBoundary><ReservationCarteVtc /></ErrorBoundary>} />
                <Route path="/rdv-carte-vtc-public" element={<ErrorBoundary><ReservationCarteVtc /></ErrorBoundary>} />
                <Route path="/inscription-formation-continue" element={<ErrorBoundary><InscriptionFormationContinue /></ErrorBoundary>} />
                <Route path="/pre-information" element={<ErrorBoundary><PreInformationPublic /></ErrorBoundary>} />
                <Route path="/cours" element={<ErrorBoundary><CoursPublic /></ErrorBoundary>} />
                <Route path="/cours-public" element={<ErrorBoundary><CoursPublic /></ErrorBoundary>} />
                <Route path="/document-a-signer/:token" element={<ErrorBoundary><DocumentASignerPublic /></ErrorBoundary>} />

                <Route path="/reset-password" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
                <Route path="/auth/callback" element={<ErrorBoundary><AuthCallback /></ErrorBoundary>} />
                <Route path="/revolut-connect" element={<ErrorBoundary><RevolutConnect /></ErrorBoundary>} />
                <Route path="/revolut/transactions" element={
                  <ProtectedRoute>
                    <ErrorBoundary><RevolutTransactions /></ErrorBoundary>
                  </ProtectedRoute>
                } />
                
                {/* Fournisseur portal - public */}
                <Route path="/fournisseur/:token" element={<ErrorBoundary><FournisseurPortal /></ErrorBoundary>} />
                <Route path="/devis" element={<ErrorBoundary><DevisPublic /></ErrorBoundary>} />
                <Route path="/devis-personnel" element={<ErrorBoundary><DevisPersonnel /></ErrorBoundary>} />
                <Route path="/booking" element={<ErrorBoundary><Booking /></ErrorBoundary>} />

                <Route path="/sessions/:id" element={
                  <ProtectedRoute>
                    <ErrorBoundary><SessionDetailPage /></ErrorBoundary>
                  </ProtectedRoute>
                } />

                <Route path="/diagnostic-examens-blancs" element={
                  <ErrorBoundary><DiagnosticExamensBlancs /></ErrorBoundary>
                } />

                <Route path="/admin/erreurs" element={
                  <ProtectedRoute>
                    <ErrorBoundary><AdminErrorLogs /></ErrorBoundary>
                  </ProtectedRoute>
                } />

                <Route path="/admin/audit-t3p" element={
                  <ProtectedRoute>
                    <ErrorBoundary><AdminAuditT3P /></ErrorBoundary>
                  </ProtectedRoute>
                } />

                <Route path="/admin/audit-modules" element={
                  <ProtectedRoute>
                    <ErrorBoundary><AdminAuditModules /></ErrorBoundary>
                  </ProtectedRoute>
                } />

                <Route path="/admin/audit-db-vs-apprenant" element={
                  <ProtectedRoute>
                    <ErrorBoundary><AdminAuditDBvsLearner /></ErrorBoundary>
                  </ProtectedRoute>
                } />


                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;