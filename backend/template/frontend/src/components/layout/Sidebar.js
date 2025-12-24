import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../ui/button";
import {
  Car,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  LayoutDashboard,
  MapPin,
  FileText,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
  Palette,
  HelpCircle,
  Wallet,
  FileCheck,
  CalendarDays,
  Link2,
  Smartphone,
} from "lucide-react";

// Check if we're on panel subdomain
const isAdminPanel = window.location.hostname.startsWith('panel.');
const pathPrefix = isAdminPanel ? '' : '/admin';

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: `${pathPrefix}/dashboard`, roles: ["firma_admin", "operasyon", "muhasebe"] },
  { icon: Car, label: "Araçlar", path: `${pathPrefix}/vehicles`, roles: ["firma_admin", "operasyon", "personel"] },
  { icon: CalendarDays, label: "Fiyat Takvimi", path: `${pathPrefix}/price-calendar`, roles: ["firma_admin", "operasyon"] },
  { icon: Users, label: "Müşteriler", path: `${pathPrefix}/customers`, roles: ["firma_admin", "operasyon"] },
  { icon: Calendar, label: "Rezervasyonlar", path: `${pathPrefix}/reservations`, roles: ["firma_admin", "operasyon", "personel"] },
  { icon: MapPin, label: "Lokasyonlar", path: `${pathPrefix}/locations`, roles: ["firma_admin", "operasyon"] },
  { icon: Smartphone, label: "Mobil Uygulamalar", path: `${pathPrefix}/mobile-apps`, roles: ["firma_admin"] },
  { icon: MapPin, label: "GPS Takip", path: `${pathPrefix}/gps`, roles: ["firma_admin", "operasyon"] },
  { icon: Wallet, label: "HGS Takip", path: `${pathPrefix}/hgs`, roles: ["firma_admin", "operasyon"] },
  { icon: FileCheck, label: "KABİS", path: `${pathPrefix}/kabis`, roles: ["firma_admin", "operasyon"] },
  { icon: Link2, label: "Entegrasyonlar", path: `${pathPrefix}/integrations`, roles: ["firma_admin"] },
  { icon: CreditCard, label: "Ödemeler", path: `${pathPrefix}/payments`, roles: ["firma_admin", "muhasebe"] },
  { icon: FileText, label: "Raporlar", path: `${pathPrefix}/reports`, roles: ["firma_admin", "muhasebe"] },
  { icon: Palette, label: "Tema Mağazası", path: `${pathPrefix}/theme-store`, roles: ["firma_admin"] },
  { icon: HelpCircle, label: "Destek", path: `${pathPrefix}/support`, roles: ["firma_admin", "operasyon", "personel", "muhasebe"] },
  { icon: Settings, label: "Ayarlar", path: `${pathPrefix}/settings`, roles: ["firma_admin"] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const filteredMenuItems = menuItems.filter(
    (item) => item.roles.includes(user?.role)
  );

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
    
    return (
      <NavLink
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
        data-testid={`nav-${item.path.slice(1)}`}
      >
        <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-6 border-b border-border", collapsed && "justify-center")}>
        <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shrink-0">
          <Car className="h-6 w-6 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight">FleetEase</span>
            <span className="text-xs text-muted-foreground">Araç Kiralama</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredMenuItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-4 space-y-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200",
            "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          data-testid="theme-toggle"
        >
          {theme === "dark" ? (
            <Sun className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
          ) : (
            <Moon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
          )}
          {!collapsed && <span>{theme === "dark" ? "Açık Mod" : "Koyu Mod"}</span>}
        </button>

        {/* User Info */}
        {!collapsed && (
          <div className="px-3 py-2 bg-secondary/50 rounded-lg">
            <p className="text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200",
            "text-destructive hover:bg-destructive/10"
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
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 items-center justify-center bg-background border border-border rounded-full shadow-sm hover:bg-secondary transition-colors"
        data-testid="sidebar-collapse"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border border-border rounded-lg shadow-sm"
        data-testid="mobile-menu-btn"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
