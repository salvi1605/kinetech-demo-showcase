import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

// Pages
import { Login } from "@/pages/Login";
import { CreateClinicPage } from "@/pages/CreateClinicPage";
import { SelectClinic } from "@/pages/SelectClinic";
import { Calendar } from "@/pages/Calendar";
import { Patients } from "@/pages/Patients";
import { PatientDetail } from "@/pages/PatientDetail";
import { Practitioners } from "@/pages/Practitioners";
import { Availability } from "@/pages/Availability";
import { Exceptions } from "@/pages/Exceptions";
import { CopySchedule } from "@/pages/CopySchedule";
import { Settings } from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";
import ClinicSettings from "@/pages/ClinicSettings";
import Architecture from "@/pages/Architecture";
import NotFound from "./pages/NotFound";
import { ResetPassword } from "@/pages/ResetPassword";
import { NoAccess } from "@/pages/NoAccess";
import Welcome from "@/pages/Welcome";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Treatments from "@/pages/Treatments";
import Reports from "@/pages/Reports";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import Home from "@/pages/Home";
import Pricing from "@/pages/Pricing";
import CancellationPolicy from "@/pages/CancellationPolicy";
import Contact from "@/pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes (wrapped in LanguageProvider) */}
              <Route path="/" element={<LanguageProvider><Home /></LanguageProvider>} />
              <Route path="/home" element={<LanguageProvider><Home /></LanguageProvider>} />
              <Route path="/pricing" element={<LanguageProvider><Pricing /></LanguageProvider>} />
              <Route path="/cancellation-policy" element={<LanguageProvider><CancellationPolicy /></LanguageProvider>} />
              <Route path="/contact" element={<LanguageProvider><Contact /></LanguageProvider>} />
              <Route path="/terms" element={<LanguageProvider><Terms /></LanguageProvider>} />
              <Route path="/privacy" element={<LanguageProvider><Privacy /></LanguageProvider>} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
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
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
