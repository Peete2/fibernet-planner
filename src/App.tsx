import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import RouteFallback from "@/components/RouteFallback";
import Chatbot from "@/components/Chatbot";

const Index = lazy(() => import("./pages/Index"));
const Coverage = lazy(() => import("./pages/Coverage"));
const Apply = lazy(() => import("./pages/Apply"));
const Track = lazy(() => import("./pages/Track"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TechDashboard = lazy(() => import("./pages/TechDashboard"));
const ModeratorDashboard = lazy(() => import("./pages/ModeratorDashboard"));
const ServiceDeliveryDashboard = lazy(() => import("./pages/ServiceDeliveryDashboard"));
const TechnicalDashboard = lazy(() => import("./pages/TechnicalDashboard"));
const BillingDashboard = lazy(() => import("./pages/BillingDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Distributor = lazy(() => import("./pages/Distributor"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
          </InactivityGuard>
          <Chatbot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
