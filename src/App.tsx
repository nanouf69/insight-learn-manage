import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ReservationPratique = lazy(() => import("./pages/ReservationPratique"));
const InscriptionFormationContinue = lazy(() => import("./pages/InscriptionFormationContinue"));
const FournisseurPortal = lazy(() => import("./pages/FournisseurPortal"));
const CoursPublic = lazy(() => import("./pages/CoursPublic"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PreInformationPublic = lazy(() => import("./pages/PreInformationPublic"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const RevolutTransactions = lazy(() => import("./pages/RevolutTransactions"));
const RevolutConnect = lazy(() => import("./pages/RevolutConnect"));
const DevisPublic = lazy(() => import("./pages/DevisPublic"));
const DevisPersonnel = lazy(() => import("./pages/DevisPersonnel"));
const ReservationCarteVtc = lazy(() => import("./pages/ReservationCarteVtc"));
const OnboardingWelcome = lazy(() => import("./pages/onboarding/OnboardingWelcome"));
const Step1 = lazy(() => import("./pages/onboarding/steps/Step1"));
const Step2 = lazy(() => import("./pages/onboarding/steps/Step2"));
const Step3 = lazy(() => import("./pages/onboarding/steps/Step3"));
const Step4 = lazy(() => import("./pages/onboarding/steps/Step4"));
const Step5 = lazy(() => import("./pages/onboarding/steps/Step5"));
const Step6 = lazy(() => import("./pages/onboarding/steps/Step6"));
const Step7 = lazy(() => import("./pages/onboarding/steps/Step7"));
const Step8 = lazy(() => import("./pages/onboarding/steps/Step8"));
const Step9 = lazy(() => import("./pages/onboarding/steps/Step9"));
const Step10 = lazy(() => import("./pages/onboarding/steps/Step10"));
const Step11 = lazy(() => import("./pages/onboarding/steps/Step11"));
const Step12 = lazy(() => import("./pages/onboarding/steps/Step12"));

const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<PageLoading />}>
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
                
                {/* Reservation pratique - public */}
                <Route path="/reservation-pratique" element={<ErrorBoundary><ReservationPratique /></ErrorBoundary>} />
                <Route path="/reservation-carte-vtc" element={<ErrorBoundary><ReservationCarteVtc /></ErrorBoundary>} />
                <Route path="/rdv-carte-vtc-public" element={<ErrorBoundary><ReservationCarteVtc /></ErrorBoundary>} />
                <Route path="/inscription-formation-continue" element={<ErrorBoundary><InscriptionFormationContinue /></ErrorBoundary>} />
                <Route path="/pre-information" element={<ErrorBoundary><PreInformationPublic /></ErrorBoundary>} />
                <Route path="/cours" element={<ErrorBoundary><CoursPublic /></ErrorBoundary>} />
                <Route path="/cours-public" element={<ErrorBoundary><CoursPublic /></ErrorBoundary>} />
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
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;