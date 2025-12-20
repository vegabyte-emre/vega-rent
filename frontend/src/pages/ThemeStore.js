import { API_URL } from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Palette,
  Check,
  Eye,
  Sparkles,
  Settings,
  Image,
  Type,
  Phone,
  Mail,
  Globe,
  RefreshCw,
  Loader2,
  ExternalLink,
  Crown,
} from "lucide-react";
import { toast } from "sonner";


export function ThemeStore() {
  const [themes, setThemes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewTheme, setPreviewTheme] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [themesRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/themes`),
        axios.get(`${API_URL}/api/theme-settings`),
      ]);
      setThemes(themesRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/theme-settings`, settings);
      toast.success("Tema ayarları kaydedildi!");
    } catch (error) {
      toast.error("Ayarlar kaydedilirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleActivateTheme = async (themeId) => {
    const newSettings = { ...settings, active_theme_id: themeId };
    setSettings(newSettings);
    
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/theme-settings`, newSettings);
      toast.success("Tema aktifleştirildi!");
    } catch (error) {
      toast.error("Tema aktifleştirilemedi");
    } finally {
      setSaving(false);
    }
  };

  const openPreview = (theme) => {
    setPreviewTheme(theme);
    setPreviewOpen(true);
  };

  const activeTheme = themes.find((t) => t.id === settings?.active_theme_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="theme-store-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-8 w-8" />
            Tema Mağazası
          </h1>
          <p className="text-muted-foreground mt-1">
            Landing sayfanızın görünümünü özelleştirin
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" data-testid="preview-site-btn">
              <ExternalLink className="h-4 w-4 mr-2" />
              Siteyi Görüntüle
            </Button>
          </a>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="gradient-accent text-white"
            data-testid="save-settings-btn"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Değişiklikleri Kaydet
          </Button>
        </div>
      </div>

      {/* Active Theme Banner */}
      {activeTheme && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-lg shadow-lg overflow-hidden"
                  style={{ backgroundColor: activeTheme.colors.primary }}
                >
                  <img
                    src={activeTheme.preview_image}
                    alt={activeTheme.name}
                    className="w-full h-full object-cover mix-blend-overlay"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktif Tema</p>
                  <p className="font-semibold text-lg">{activeTheme.name}</p>
                  <p className="text-sm text-muted-foreground">{activeTheme.description}</p>
                </div>
              </div>
              <Badge className="bg-primary text-primary-foreground">
                <Check className="h-3 w-3 mr-1" />
                Aktif
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="themes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="themes" data-testid="themes-tab">
            <Palette className="h-4 w-4 mr-2" />
            Temalar
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="content-tab">
            <Type className="h-4 w-4 mr-2" />
            İçerik
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="settings-tab">
            <Settings className="h-4 w-4 mr-2" />
            Ayarlar
          </TabsTrigger>
        </TabsList>

        {/* Themes Tab */}
        <TabsContent value="themes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {themes.map((theme) => (
              <Card
                key={theme.id}
                className={`overflow-hidden transition-all duration-300 ${
                  settings?.active_theme_id === theme.id
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-lg"
                }`}
                data-testid={`theme-card-${theme.id}`}
              >
                {/* Theme Preview Image */}
                <div
                  className="aspect-video relative overflow-hidden"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <img
                    src={theme.hero_image}
                    alt={theme.name}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: theme.colors.hero_overlay }}
                  />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                    <h3 className="font-bold text-lg">{theme.name}</h3>
                    <p className="text-sm opacity-80">{theme.description}</p>
                  </div>
                  {theme.is_premium && (
                    <Badge className="absolute top-3 right-3 bg-amber-500 text-white">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {settings?.active_theme_id === theme.id && (
                    <Badge className="absolute top-3 left-3 bg-emerald-500 text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  )}
                </div>

                {/* Color Palette */}
                <CardContent className="p-4">
                  <div className="flex gap-2 mb-4">
                    {Object.entries(theme.colors).slice(0, 4).map(([key, color]) => (
                      <div
                        key={key}
                        className="w-8 h-8 rounded-full shadow-inner border-2 border-white"
                        style={{ backgroundColor: color }}
                        title={key}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openPreview(theme)}
                      data-testid={`preview-${theme.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Önizle
                    </Button>
                    {settings?.active_theme_id === theme.id ? (
                      <Button size="sm" className="flex-1" disabled>
                        <Check className="h-4 w-4 mr-1" />
                        Aktif
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 gradient-accent text-white"
                        onClick={() => handleActivateTheme(theme.id)}
                        data-testid={`activate-${theme.id}`}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Etkinleştir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Hero Bölümü
                </CardTitle>
                <CardDescription>
                  Ana sayfa hero alanındaki başlık ve açıklama metinleri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Ana Başlık</Label>
                  <Input
                    value={settings?.custom_hero_title || ""}
                    onChange={(e) => handleSettingChange("custom_hero_title", e.target.value)}
                    placeholder="Hayalinizdeki Aracı Kiralayın"
                    data-testid="hero-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alt Başlık</Label>
                  <Input
                    value={settings?.custom_hero_subtitle || ""}
                    onChange={(e) => handleSettingChange("custom_hero_subtitle", e.target.value)}
                    placeholder="Geniş araç filomuz ve uygun fiyatlarımızla..."
                    data-testid="hero-subtitle-input"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Logo ve Marka
                </CardTitle>
                <CardDescription>
                  Şirket logosu ve marka öğeleri
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={settings?.custom_logo_url || ""}
                    onChange={(e) => handleSettingChange("custom_logo_url", e.target.value)}
                    placeholder="https://example.com/logo.png"
                    data-testid="logo-url-input"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Önerilen boyut: 200x60 piksel, PNG veya SVG formatı
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  İletişim Bilgileri
                </CardTitle>
                <CardDescription>
                  Footer ve iletişim bölümünde gösterilecek bilgiler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={settings?.contact_phone || ""}
                      onChange={(e) => handleSettingChange("contact_phone", e.target.value)}
                      placeholder="0850 123 4567"
                      data-testid="contact-phone-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-posta</Label>
                    <Input
                      value={settings?.contact_email || ""}
                      onChange={(e) => handleSettingChange("contact_email", e.target.value)}
                      placeholder="info@sirket.com"
                      data-testid="contact-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook</Label>
                    <Input
                      value={settings?.social_facebook || ""}
                      onChange={(e) => handleSettingChange("social_facebook", e.target.value)}
                      placeholder="https://facebook.com/sirket"
                      data-testid="social-facebook-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input
                      value={settings?.social_instagram || ""}
                      onChange={(e) => handleSettingChange("social_instagram", e.target.value)}
                      placeholder="https://instagram.com/sirket"
                      data-testid="social-instagram-input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bölüm Görünürlüğü</CardTitle>
              <CardDescription>
                Landing sayfasında hangi bölümlerin gösterileceğini seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>İstatistikler Bölümü</Label>
                  <p className="text-sm text-muted-foreground">
                    Araç sayısı, müşteri sayısı gibi istatistikleri göster
                  </p>
                </div>
                <Switch
                  checked={settings?.show_stats}
                  onCheckedChange={(checked) => handleSettingChange("show_stats", checked)}
                  data-testid="show-stats-switch"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Özellikler Bölümü</Label>
                  <p className="text-sm text-muted-foreground">
                    "Neden Biz?" özellik kartlarını göster
                  </p>
                </div>
                <Switch
                  checked={settings?.show_features}
                  onCheckedChange={(checked) => handleSettingChange("show_features", checked)}
                  data-testid="show-features-switch"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Popüler Araçlar Bölümü</Label>
                  <p className="text-sm text-muted-foreground">
                    Ana sayfada popüler araçları göster
                  </p>
                </div>
                <Switch
                  checked={settings?.show_popular_vehicles}
                  onCheckedChange={(checked) => handleSettingChange("show_popular_vehicles", checked)}
                  data-testid="show-vehicles-switch"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTheme?.name} - Önizleme</DialogTitle>
            <DialogDescription>{previewTheme?.description}</DialogDescription>
          </DialogHeader>
          {previewTheme && (
            <div className="mt-4">
              {/* Preview Hero */}
              <div
                className="relative rounded-lg overflow-hidden aspect-video"
                style={{ backgroundColor: previewTheme.colors.primary }}
              >
                <img
                  src={previewTheme.hero_image}
                  alt="Hero"
                  className="w-full h-full object-cover opacity-60"
                />
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: previewTheme.colors.hero_overlay }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-white text-center p-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">
                      {settings?.custom_hero_title || "Hayalinizdeki Aracı Kiralayın"}
                    </h2>
                    <p className="text-lg opacity-80">
                      {settings?.custom_hero_subtitle || "Geniş araç filomuz ile hizmetinizdeyiz"}
                    </p>
                    <button
                      className="mt-4 px-6 py-2 rounded-lg font-medium"
                      style={{ backgroundColor: previewTheme.colors.accent, color: "#fff" }}
                    >
                      Araç Kirala
                    </button>
                  </div>
                </div>
              </div>

              {/* Color Palette Display */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Renk Paleti</h4>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(previewTheme.colors).map(([key, color]) => (
                    <div key={key} className="text-center">
                      <div
                        className="w-full h-12 rounded-lg shadow-inner mb-2"
                        style={{ backgroundColor: color }}
                      />
                      <p className="text-xs text-muted-foreground capitalize">{key.replace("_", " ")}</p>
                      <p className="text-xs font-mono">{color}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
