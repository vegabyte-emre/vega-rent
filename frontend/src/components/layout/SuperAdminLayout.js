import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import getApiUrl from "../../config/api";
import axios from "axios";
import {
  Shield,
  Building2,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  CreditCard,
  MessageSquare,
  Store,
  RefreshCw,
  AlertCircle
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/superadmin/dashboard" },
  { icon: Building2, label: "Firmalar", path: "/superadmin/companies" },
  { icon: CreditCard, label: "Abonelikler", path: "/superadmin/subscriptions" },
  { icon: Store, label: "Bayilikler", path: "/superadmin/franchises" },
  { icon: MessageSquare, label: "Destek", path: "/superadmin/tickets" },
  { icon: Settings, label: "Ayarlar", path: "/superadmin/settings" }
];

export function SuperAdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [checkingVersion, setCheckingVersion] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check version on mount
  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    setCheckingVersion(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${getApiUrl()}/api/superadmin/version/check`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVersionInfo(response.data);
    } catch (error) {
      console.error("Version check failed:", error);
      // Fallback to just getting current version
      try {
        const versionResponse = await axios.get(`${getApiUrl()}/api/version`);
        setVersionInfo({
          current_version: versionResponse.data.version,
          github_version: null,
          has_update: false,
          error: "GitHub bağlantısı kurulamadı"
        });
      } catch (e) {
        setVersionInfo({
          current_version: "?.?.?",
          github_version: null,
          has_update: false,
          error: "Versiyon alınamadı"
        });
      }
    } finally {
      setCheckingVersion(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/superadmin/login");
  };

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
    
    return (
      <NavLink
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
            : "text-slate-400 hover:bg-slate-800 hover:text-white"
        )}
        data-testid={`nav-${item.path.split('/').pop()}`}
      >
        <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-6 border-b border-slate-700", collapsed && "justify-center")}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
          <Shield className="h-6 w-6 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-lg text-white">SuperAdmin</span>
            <span className="text-xs text-slate-400">Platform Yönetimi</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 px-3 py-4 space-y-3">
        {/* User Info */}
        {!collapsed && (
          <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-purple-400">SuperAdmin</p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200",
            "text-red-400 hover:bg-red-500/10"
          )}
          data-testid="logout-btn"
        >
          <LogOut className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>

      {/* Collapse Button (Desktop) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 items-center justify-center bg-slate-800 border border-slate-600 rounded-full shadow-sm hover:bg-slate-700 transition-colors"
        data-testid="sidebar-collapse"
      >
        {collapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronLeft className="h-4 w-4 text-slate-400" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg"
        data-testid="mobile-menu-btn"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-700 transform transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col bg-slate-900 border-r border-slate-700 transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300 pt-4 lg:pt-0",
          collapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="lg:hidden" /> {/* Spacer for mobile menu button */}
            <div className="flex items-center gap-4 ml-auto">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-slate-400">Sistem aktif</span>
              </div>
              {/* Version Badge - En sağda */}
              <div className="flex items-center gap-2">
                <div 
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                    versionInfo?.has_update
                      ? "bg-red-500/10 border-red-500/50 text-red-400"
                      : "bg-slate-800/50 border-slate-600 text-slate-300"
                  )}
                  title={versionInfo?.has_update 
                    ? `Yeni versiyon mevcut: ${versionInfo.github_version}` 
                    : "Güncel versiyon"
                  }
                >
                  {versionInfo?.has_update && (
                    <AlertCircle className="h-4 w-4 text-red-400 animate-pulse" />
                  )}
                  <span>v{versionInfo?.current_version || "..."}</span>
                  {versionInfo?.has_update && (
                    <span className="text-xs text-red-300">
                      → v{versionInfo.github_version}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={checkVersion}
                  disabled={checkingVersion}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
                  title="Versiyon kontrolü yap"
                >
                  <RefreshCw className={cn("h-4 w-4", checkingVersion && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
