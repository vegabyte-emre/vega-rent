import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Layout } from "./components/layout/Layout";

// Admin Pages (Company Panel)
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Vehicles } from "./pages/Vehicles";
import { Customers } from "./pages/Customers";
import { Reservations } from "./pages/Reservations";
import { NewReservation } from "./pages/NewReservation";
import { GPS } from "./pages/GPS";
import { HGS } from "./pages/HGS";
import { Kabis } from "./pages/Kabis";
import { PriceCalendar } from "./pages/PriceCalendar";
import { Payments } from "./pages/Payments";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { ThemeStore } from "./pages/ThemeStore";
import { Support } from "./pages/Support";

// Public Pages (Customer Facing)
import { Home } from "./pages/public/Home";
import { VehicleList } from "./pages/public/VehicleList";
import { VehicleDetail } from "./pages/public/VehicleDetail";
import { CustomerLogin } from "./pages/public/CustomerLogin";
import { CustomerRegister } from "./pages/public/CustomerRegister";
import { CustomerDashboard } from "./pages/public/CustomerDashboard";
import { Reservation } from "./pages/public/Reservation";

import { Toaster } from "./components/ui/sonner";

// Check if we're on panel subdomain
const isAdminPanel = window.location.hostname.startsWith('panel.');

// Protected Route Component
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
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Public Route Component
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
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* ============== ROOT ROUTE ============== */}
      <Route path="/" element={
        isAdminPanel ? (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ) : (
          <Home />
        )
      } />
      
      {/* ============== PUBLIC ROUTES (Customer Facing) ============== */}
      <Route path="/araclar" element={<VehicleList />} />
      <Route path="/arac/:id" element={<VehicleDetail />} />
      <Route path="/rezervasyon" element={<Reservation />} />
      <Route path="/musteri/giris" element={<CustomerLogin />} />
      <Route path="/musteri/kayit" element={<CustomerRegister />} />
      <Route path="/hesabim" element={<CustomerDashboard />} />

      {/* ============== COMPANY ADMIN AUTH ROUTES ============== */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* ============== COMPANY ADMIN PROTECTED ROUTES ============== */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["firma_admin", "operasyon", "muhasebe", "personel"]}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/price-calendar" element={<PriceCalendar />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/reservations/new" element={<NewReservation />} />
        <Route path="/gps" element={<GPS />} />
        <Route path="/hgs" element={<HGS />} />
        <Route path="/kabis" element={<Kabis />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/theme-store" element={<ThemeStore />} />
        <Route path="/support" element={<Support />} />
      </Route>

      {/* Catch all - redirect to home */}
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
