import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Layout } from "./components/layout/Layout";

// Check if we're on panel subdomain
const isAdminPanel = window.location.hostname.startsWith('panel.');

// Admin Pages (Company Panel)
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Vehicles } from "./pages/Vehicles";
import { Customers } from "./pages/Customers";
import { Reservations } from "./pages/Reservations";
import { NewReservation } from "./pages/NewReservation";
import { GPS } from "./pages/GPS";
import { Payments } from "./pages/Payments";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { ThemeStore } from "./pages/ThemeStore";

// SuperAdmin Pages
import { SuperAdminLogin } from "./pages/superadmin/SuperAdminLogin";
import { SuperAdminDashboard } from "./pages/superadmin/SuperAdminDashboard";
import { SuperAdminCompanies } from "./pages/superadmin/SuperAdminCompanies";
import { NewCompany } from "./pages/superadmin/NewCompany";
import { SuperAdminSettings } from "./pages/superadmin/SuperAdminSettings";
import { SuperAdminLayout } from "./components/layout/SuperAdminLayout";

// Public Pages
import { Home } from "./pages/public/Home";
import { VehicleList } from "./pages/public/VehicleList";
import { VehicleDetail } from "./pages/public/VehicleDetail";
import { CustomerLogin } from "./pages/public/CustomerLogin";
import { CustomerRegister } from "./pages/public/CustomerRegister";
import { CustomerDashboard } from "./pages/public/CustomerDashboard";
import { Reservation } from "./pages/public/Reservation";

import { Toaster } from "./components/ui/sonner";

// Protected Route Component (for admin panel)
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}

// Public Route Component (redirect if authenticated to admin)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}

// SuperAdmin Protected Route Component
function SuperAdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/superadmin/login" replace />;
  }

  if (user?.role !== "superadmin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* ============== PUBLIC ROUTES (Customer Facing) ============== */}
      <Route path="/" element={<Home />} />
      <Route path="/araclar" element={<VehicleList />} />
      <Route path="/arac/:id" element={<VehicleDetail />} />
      <Route path="/rezervasyon" element={<Reservation />} />
      <Route path="/musteri/giris" element={<CustomerLogin />} />
      <Route path="/musteri/kayit" element={<CustomerRegister />} />
      <Route path="/hesabim" element={<CustomerDashboard />} />

      {/* ============== SUPERADMIN ROUTES ============== */}
      <Route path="/superadmin/login" element={<SuperAdminLogin />} />
      <Route
        element={
          <SuperAdminRoute>
            <SuperAdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/companies" element={<SuperAdminCompanies />} />
        <Route path="/superadmin/companies/new" element={<NewCompany />} />
        <Route path="/superadmin/settings" element={<SuperAdminSettings />} />
      </Route>

      {/* ============== COMPANY ADMIN AUTH ROUTES ============== */}
      <Route
        path="/admin/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/admin/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* ============== COMPANY ADMIN PROTECTED ROUTES ============== */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/vehicles" element={<Vehicles />} />
        <Route path="/admin/customers" element={<Customers />} />
        <Route path="/admin/reservations" element={<Reservations />} />
        <Route path="/admin/reservations/new" element={<NewReservation />} />
        <Route path="/admin/gps" element={<GPS />} />
        <Route path="/admin/payments" element={<Payments />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/theme-store" element={<ThemeStore />} />
      </Route>
      
      {/* Legacy redirect for old /login path */}
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
