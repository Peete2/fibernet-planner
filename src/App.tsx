import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import Index from "./pages/Index";
import Coverage from "./pages/Coverage";
import Apply from "./pages/Apply";
import Track from "./pages/Track";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import TechDashboard from "./pages/TechDashboard";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import ServiceDeliveryDashboard from "./pages/ServiceDeliveryDashboard";
import TechnicalDashboard from "./pages/TechnicalDashboard";
import BillingDashboard from "./pages/BillingDashboard";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Distributor from "./pages/Distributor";
import NotFound from "./pages/NotFound";
import Chatbot from "@/components/Chatbot";

const queryClient = new QueryClient();

function InactivityGuard({ children }: { children: React.ReactNode }) {
  useInactivityLogout();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <InactivityGuard>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/coverage" element={<Coverage />} />
            <Route path="/apply" element={<Apply />} />
            <Route
              path="/track"
              element={
                <ProtectedRoute>
                  <Track />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/distributor" element={<Distributor />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole={["main_admin", "admin"]}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/moderator"
              element={
                <ProtectedRoute requiredRole={["moderator", "main_admin", "admin"]}>
                  <ModeratorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/service-delivery"
              element={
                <ProtectedRoute requiredRole={["service_delivery", "main_admin", "admin"]}>
                  <ServiceDeliveryDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/technical"
              element={
                <ProtectedRoute requiredRole={["technical", "main_admin", "admin"]}>
                  <TechnicalDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute requiredRole={["billing", "main_admin", "admin"]}>
                  <BillingDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tech"
              element={
                <ProtectedRoute requiredRole="technician">
                  <TechDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </InactivityGuard>
          <Chatbot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
