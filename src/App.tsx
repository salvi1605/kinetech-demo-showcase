import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Context
import { AppProvider } from "@/contexts/AppContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Route Guards
import { PatientRouteGuard } from "@/components/shared/PatientRouteGuard";
import { AuthRouteGuard } from "@/components/shared/AuthRouteGuard";
import { PublicRouteGuard } from "@/components/shared/PublicRouteGuard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

// Layout
import { AppLayout } from "@/components/layout/AppLayout";

// Eager pages (landing LCP + auth entry + 404)
import Home from "@/pages/Home";
import { Login } from "@/pages/Login";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages (code-split per route to reduce initial bundle)
const CreateClinicPage = lazy(() => import("@/pages/CreateClinicPage").then(m => ({ default: m.CreateClinicPage })));
const SelectClinic = lazy(() => import("@/pages/SelectClinic").then(m => ({ default: m.SelectClinic })));
const Calendar = lazy(() => import("@/pages/Calendar").then(m => ({ default: m.Calendar })));
const Patients = lazy(() => import("@/pages/Patients").then(m => ({ default: m.Patients })));
const PatientDetail = lazy(() => import("@/pages/PatientDetail").then(m => ({ default: m.PatientDetail })));
const Practitioners = lazy(() => import("@/pages/Practitioners").then(m => ({ default: m.Practitioners })));
const Availability = lazy(() => import("@/pages/Availability").then(m => ({ default: m.Availability })));
const Exceptions = lazy(() => import("@/pages/Exceptions").then(m => ({ default: m.Exceptions })));
const CopySchedule = lazy(() => import("@/pages/CopySchedule").then(m => ({ default: m.CopySchedule })));
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const ClinicSettings = lazy(() => import("@/pages/ClinicSettings"));
const Architecture = lazy(() => import("@/pages/Architecture"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const NoAccess = lazy(() => import("@/pages/NoAccess").then(m => ({ default: m.NoAccess })));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Treatments = lazy(() => import("@/pages/Treatments"));
const Reports = lazy(() => import("@/pages/Reports"));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const CancellationPolicy = lazy(() => import("@/pages/CancellationPolicy"));
const Contact = lazy(() => import("@/pages/Contact"));
const SessionExpired = lazy(() => import("@/pages/SessionExpired"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-label="Cargando" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Public Routes - redirect to app if authenticated */}
                  <Route path="/" element={<PublicRouteGuard><Home /></PublicRouteGuard>} />
                  <Route path="/home" element={<Navigate to="/" replace />} />
                  <Route path="/pricing" element={<PublicRouteGuard><Pricing /></PublicRouteGuard>} />
                  <Route path="/cancellation-policy" element={<PublicRouteGuard><CancellationPolicy /></PublicRouteGuard>} />
                  <Route path="/contact" element={<PublicRouteGuard><Contact /></PublicRouteGuard>} />
                  <Route path="/terms" element={<PublicRouteGuard><Terms /></PublicRouteGuard>} />
                  <Route path="/privacy" element={<PublicRouteGuard><Privacy /></PublicRouteGuard>} />
                  <Route path="/login" element={<PublicRouteGuard><Login /></PublicRouteGuard>} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/session-expired" element={<SessionExpired />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  {/* Auth Required - No Clinic Setup */}
                  <Route path="/create-clinic" element={
                    <AuthRouteGuard requireClinic={false}>
                      <CreateClinicPage />
                    </AuthRouteGuard>
                  } />

                  <Route path="/select-clinic" element={
                    <AuthRouteGuard requireClinic={false}>
                      <SelectClinic />
                    </AuthRouteGuard>
                  } />

                  <Route path="/super-admin" element={
                    <AuthRouteGuard requireClinic={false}>
                      <SuperAdminDashboard />
                    </AuthRouteGuard>
                  } />

                  <Route path="/no-access" element={
                    <AuthRouteGuard requireClinic={false}>
                      <NoAccess />
                    </AuthRouteGuard>
                  } />

                  {/* Protected Routes - Clinic Required */}
                  <Route path="/" element={<AuthRouteGuard><AppLayout /></AuthRouteGuard>}>
                    <Route path="calendar" element={<Calendar />} />
                    <Route path="patients" element={<Patients />} />
                    <Route path="patients/:id" element={<PatientRouteGuard><PatientDetail /></PatientRouteGuard>} />
                    <Route path="practitioners" element={<Practitioners />} />
                    <Route path="treatments" element={<Treatments />} />
                    <Route path="availability" element={<Availability />} />
                    <Route path="exceptions" element={<Exceptions />} />
                    <Route path="copy-schedule" element={<CopySchedule />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="clinics" element={<ClinicSettings />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="architecture" element={<Architecture />} />
                  </Route>

                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AppProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
