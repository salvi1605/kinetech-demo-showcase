import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Context
import { AppProvider } from "@/contexts/AppContext";

// Route Guards
import { PatientRouteGuard } from "@/components/shared/PatientRouteGuard";
import { AuthRouteGuard } from "@/components/shared/AuthRouteGuard";

// Layout
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import { Login } from "@/pages/Login";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* App Routes with Layout - Protected */}
            <Route path="/" element={<AuthRouteGuard><AppLayout /></AuthRouteGuard>}>
              <Route index element={<Calendar />} />
              <Route path="select-clinic" element={<SelectClinic />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="patients" element={<Patients />} />
              <Route path="patients/:id" element={<PatientRouteGuard><PatientDetail /></PatientRouteGuard>} />
              <Route path="practitioners" element={<Practitioners />} />
              <Route path="availability" element={<Availability />} />
              <Route path="exceptions" element={<Exceptions />} />
              <Route path="copy-schedule" element={<CopySchedule />} />
              <Route path="settings" element={<Settings />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="clinics" element={<ClinicSettings />} />
            </Route>
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
