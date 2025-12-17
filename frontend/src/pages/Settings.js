import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Moon,
  Sun,
  Building2,
  CreditCard,
  FileText,
} from "lucide-react";

export function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground mt-1">Hesap ve sistem ayarlarınızı yönetin</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Profil Bilgileri
          </CardTitle>
          <CardDescription>Kişisel bilgilerinizi güncelleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input value={user?.full_name || ""} disabled data-testid="profile-name" />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input value={user?.email || ""} disabled data-testid="profile-email" />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={user?.phone || ""} placeholder="Telefon numaranız" data-testid="profile-phone" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Input value={user?.role?.replace("_", " ").toUpperCase() || ""} disabled data-testid="profile-role" />
            </div>
          </div>
          <Button className="mt-4" data-testid="save-profile-btn">Profili Kaydet</Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Görünüm
          </CardTitle>
          <CardDescription>Tema ve görünüm ayarlarını özelleştirin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span className="font-medium">Koyu Mod</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Koyu tema ile göz yorgunluğunu azaltın
              </p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
              data-testid="theme-switch"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="font-medium">Dil</span>
              </div>
              <p className="text-sm text-muted-foreground">Arayüz dilini değiştirin</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Türkçe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirimler
          </CardTitle>
          <CardDescription>Bildirim tercihlerinizi yönetin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-medium">E-posta Bildirimleri</span>
              <p className="text-sm text-muted-foreground">
                Önemli güncellemeler için e-posta alın
              </p>
            </div>
            <Switch defaultChecked data-testid="email-notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-medium">Rezervasyon Hatırlatmaları</span>
              <p className="text-sm text-muted-foreground">
                Yaklaşan teslim ve iade tarihleri için hatırlatma
              </p>
            </div>
            <Switch defaultChecked data-testid="reservation-reminders" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-medium">Sistem Bildirimleri</span>
              <p className="text-sm text-muted-foreground">
                Bakım ve güncellemeler hakkında bilgi alın
              </p>
            </div>
            <Switch data-testid="system-notifications" />
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Entegrasyonlar
          </CardTitle>
          <CardDescription>Üçüncü parti servis entegrasyonları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">iyzico</p>
                  <p className="text-xs text-muted-foreground">Ödeme altyapısı</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full">
                Yapılandır
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium">EDM e-Fatura</p>
                  <p className="text-xs text-muted-foreground">e-Arşiv / e-Fatura</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full">
                Yapılandır
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Güvenlik
          </CardTitle>
          <CardDescription>Hesap güvenliği ayarları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mevcut Şifre</Label>
            <Input type="password" placeholder="••••••••" data-testid="current-password" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <Input type="password" placeholder="••••••••" data-testid="new-password" />
            </div>
            <div className="space-y-2">
              <Label>Şifre Tekrar</Label>
              <Input type="password" placeholder="••••••••" data-testid="confirm-password" />
            </div>
          </div>
          <Button variant="outline" data-testid="change-password-btn">Şifreyi Değiştir</Button>
        </CardContent>
      </Card>

      {/* Company Settings (SuperAdmin/FirmaAdmin only) */}
      {(user?.role === "superadmin" || user?.role === "firma_admin") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Firma Ayarları
            </CardTitle>
            <CardDescription>Firma genel ayarlarını yönetin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Varsayılan Para Birimi</Label>
                <Input value="TRY" disabled data-testid="default-currency" />
              </div>
              <div className="space-y-2">
                <Label>Vergi Oranı (%)</Label>
                <Input type="number" defaultValue="20" data-testid="tax-rate" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5">
                <span className="font-medium">Otomatik Fatura Oluşturma</span>
                <p className="text-sm text-muted-foreground">
                  Rezervasyon kapatıldığında otomatik fatura oluştur
                </p>
              </div>
              <Switch defaultChecked data-testid="auto-invoice" />
            </div>
            <Button className="mt-4" data-testid="save-company-settings-btn">
              Ayarları Kaydet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
