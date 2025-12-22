import getApiUrl from '../config/api';
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Textarea } from "../components/ui/textarea";
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
  Upload,
  Trash2,
  Plus,
  GripVertical,
  X,
  MapPin,
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Building,
  FileImage,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";


export function ThemeStore() {
  const [themes, setThemes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewTheme, setPreviewTheme] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSlider, setUploadingSlider] = useState(false);
  const logoInputRef = useRef(null);
  const sliderInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [themesRes, settingsRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/themes`),
        axios.get(`${getApiUrl()}/api/theme-settings`),
      ]);
      setThemes(themesRes.data);
      // Ensure slider_images is always an array
      const settingsData = settingsRes.data;
      if (!settingsData.slider_images) {
        settingsData.slider_images = [];
      }
      setSettings(settingsData);
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
      await axios.put(`${getApiUrl()}/api/theme-settings`, settings);
      toast.success("Ayarlar kaydedildi!");
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
      await axios.put(`${getApiUrl()}/api/theme-settings`, newSettings);
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

  // Logo Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo dosyası 2MB'dan küçük olmalıdır");
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error("Sadece resim dosyaları yüklenebilir");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const response = await axios.post(`${getApiUrl()}/api/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        // Use data_uri for immediate display and persistent storage
        const imageUrl = response.data.data_uri || `${getApiUrl()}${response.data.url}`;
        handleSettingChange('logo_url', imageUrl);
        toast.success("Logo yüklendi!");
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Logo yüklenirken hata oluştu";
      toast.error(errorMsg);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Slider Image Upload
  const handleSliderUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Sadece resim dosyaları yüklenebilir");
      return;
    }

    // Check file size (max 5MB for slider)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Slider resmi 5MB'dan küçük olmalıdır");
      return;
    }

    setUploadingSlider(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'slider');

      const response = await axios.post(`${getApiUrl()}/api/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        // Use data_uri for immediate display and persistent storage
        const imageUrl = response.data.data_uri || `${getApiUrl()}${response.data.url}`;
        const newSlide = {
          url: imageUrl,
          title: "",
          subtitle: ""
        };
        const currentSlides = settings.slider_images || [];
        handleSettingChange('slider_images', [...currentSlides, newSlide]);
        toast.success("Slider resmi eklendi!");
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Resim yüklenirken hata oluştu";
      toast.error(errorMsg);
    } finally {
      setUploadingSlider(false);
    }
  };

  // Remove slider image
  const removeSliderImage = (index) => {
    const newSlides = [...(settings.slider_images || [])];
    newSlides.splice(index, 1);
    handleSettingChange('slider_images', newSlides);
    toast.success("Resim silindi");
  };

  // Update slider image text
  const updateSliderImage = (index, field, value) => {
    const newSlides = [...(settings.slider_images || [])];
    newSlides[index] = { ...newSlides[index], [field]: value };
    handleSettingChange('slider_images', newSlides);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Site Yönetimi</h1>
          <p className="text-sm text-muted-foreground">
            Logo, slider, tema ve içerik ayarlarını yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Kaydet
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="branding" className="gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Marka</span>
          </TabsTrigger>
          <TabsTrigger value="slider" className="gap-2">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Slider</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">İçerik</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">İletişim</span>
          </TabsTrigger>
          <TabsTrigger value="themes" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Temalar</span>
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Logo Yönetimi
              </CardTitle>
              <CardDescription>
                Sitenizin logosunu yükleyin (max 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-6">
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  <div className="w-40 h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {settings?.logo_url ? (
                      <img 
                        src={settings.logo_url} 
                        alt="Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Image className="h-8 w-8 mx-auto mb-1" />
                        <span className="text-xs">Logo Yok</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Logo Yükle
                  </Button>
                  
                  {settings?.logo_url && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleSettingChange('logo_url', '')}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Logoyu Kaldır
                    </Button>
                  )}

                  <p className="text-xs text-muted-foreground">
                    PNG, JPG veya SVG. Önerilen boyut: 200x60 piksel
                  </p>
                </div>
              </div>

              <Separator />

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company_name">Firma Adı</Label>
                <Input
                  id="company_name"
                  value={settings?.company_name || ''}
                  onChange={(e) => handleSettingChange('company_name', e.target.value)}
                  placeholder="Firma adınız"
                />
                <p className="text-xs text-muted-foreground">
                  Logo yoksa bu isim görüntülenir
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slider Tab */}
        <TabsContent value="slider" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5" />
                Hero Slider Yönetimi
              </CardTitle>
              <CardDescription>
                Ana sayfa slider resimlerini yönetin. Sınırsız resim ekleyebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Slider Image */}
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  ref={sliderInputRef}
                  onChange={handleSliderUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button 
                  onClick={() => sliderInputRef.current?.click()}
                  disabled={uploadingSlider}
                >
                  {uploadingSlider ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Slider Resmi Ekle
                </Button>
                <p className="text-sm text-muted-foreground">
                  Önerilen boyut: 1920x800 piksel
                </p>
              </div>

              <Separator />

              {/* Slider Images List */}
              <div className="space-y-4">
                {(settings?.slider_images || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sliders className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Henüz slider resmi eklenmemiş</p>
                    <p className="text-sm">Varsayılan resimler gösterilecek</p>
                  </div>
                ) : (
                  (settings?.slider_images || []).map((slide, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg bg-gray-50">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <img 
                          src={slide.url} 
                          alt={`Slide ${index + 1}`}
                          className="w-32 h-20 object-cover rounded"
                        />
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label className="text-xs">Başlık</Label>
                          <Input
                            value={slide.title || ''}
                            onChange={(e) => updateSliderImage(index, 'title', e.target.value)}
                            placeholder="Slider başlığı"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Alt Başlık</Label>
                          <Input
                            value={slide.subtitle || ''}
                            onChange={(e) => updateSliderImage(index, 'subtitle', e.target.value)}
                            placeholder="Slider alt başlığı"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeSliderImage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                İçerik Ayarları
              </CardTitle>
              <CardDescription>
                Ana sayfa metin ve başlıklarını düzenleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hero Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Hero Bölümü</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Rozet Metni</Label>
                    <Input
                      value={settings?.badge_text || ''}
                      onChange={(e) => handleSettingChange('badge_text', e.target.value)}
                      placeholder="En İyi Fiyat Garantisi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hero Başlık (Varsayılan)</Label>
                    <Input
                      value={settings?.hero_title || ''}
                      onChange={(e) => handleSettingChange('hero_title', e.target.value)}
                      placeholder="Hayalinizdeki Aracı Kiralayın"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hero Alt Başlık (Varsayılan)</Label>
                    <Textarea
                      value={settings?.hero_subtitle || ''}
                      onChange={(e) => handleSettingChange('hero_subtitle', e.target.value)}
                      placeholder="Geniş araç filomuz ve uygun fiyatlarımızla..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Features Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Hizmetler Bölümü</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Bölüm Başlığı</Label>
                    <Input
                      value={settings?.features_title || ''}
                      onChange={(e) => handleSettingChange('features_title', e.target.value)}
                      placeholder="Hizmetlerimiz"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bölüm Açıklaması</Label>
                    <Textarea
                      value={settings?.features_subtitle || ''}
                      onChange={(e) => handleSettingChange('features_subtitle', e.target.value)}
                      placeholder="Müşteri memnuniyetini ön planda tutarak..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">İstatistikler</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Araç Sayısı</Label>
                    <Input
                      value={settings?.stat_vehicles || ''}
                      onChange={(e) => handleSettingChange('stat_vehicles', e.target.value)}
                      placeholder="500+"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Müşteri Sayısı</Label>
                    <Input
                      value={settings?.stat_customers || ''}
                      onChange={(e) => handleSettingChange('stat_customers', e.target.value)}
                      placeholder="10.000+"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>İl Sayısı</Label>
                    <Input
                      value={settings?.stat_cities || ''}
                      onChange={(e) => handleSettingChange('stat_cities', e.target.value)}
                      placeholder="81"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Puan</Label>
                    <Input
                      value={settings?.stat_rating || ''}
                      onChange={(e) => handleSettingChange('stat_rating', e.target.value)}
                      placeholder="4.9"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* CTA Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">CTA Bölümü</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>CTA Başlık</Label>
                    <Input
                      value={settings?.cta_title || ''}
                      onChange={(e) => handleSettingChange('cta_title', e.target.value)}
                      placeholder="Hemen Rezervasyon Yapın"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Alt Başlık</Label>
                    <Textarea
                      value={settings?.cta_subtitle || ''}
                      onChange={(e) => handleSettingChange('cta_subtitle', e.target.value)}
                      placeholder="En uygun fiyatlarla araç kiralama fırsatını kaçırmayın..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Footer */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Footer</h4>
                <div className="space-y-2">
                  <Label>Footer Açıklaması</Label>
                  <Textarea
                    value={settings?.footer_description || ''}
                    onChange={(e) => handleSettingChange('footer_description', e.target.value)}
                    placeholder="Türkiye'nin güvenilir araç kiralama platformu..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  İletişim Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={settings?.contact_phone || ''}
                    onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
                    placeholder="0850 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-posta</Label>
                  <Input
                    type="email"
                    value={settings?.contact_email || ''}
                    onChange={(e) => handleSettingChange('contact_email', e.target.value)}
                    placeholder="info@firma.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adres</Label>
                  <Textarea
                    value={settings?.contact_address || ''}
                    onChange={(e) => handleSettingChange('contact_address', e.target.value)}
                    placeholder="Adres bilgisi..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social Media */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Sosyal Medya
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="h-4 w-4" /> Facebook
                  </Label>
                  <Input
                    value={settings?.social_facebook || ''}
                    onChange={(e) => handleSettingChange('social_facebook', e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" /> Instagram
                  </Label>
                  <Input
                    value={settings?.social_instagram || ''}
                    onChange={(e) => handleSettingChange('social_instagram', e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Twitter className="h-4 w-4" /> Twitter
                  </Label>
                  <Input
                    value={settings?.social_twitter || ''}
                    onChange={(e) => handleSettingChange('social_twitter', e.target.value)}
                    placeholder="https://twitter.com/..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Working Hours */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Çalışma Saatleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Hafta İçi</Label>
                    <Input
                      value={settings?.hours_weekday || ''}
                      onChange={(e) => handleSettingChange('hours_weekday', e.target.value)}
                      placeholder="08:00 - 20:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cumartesi</Label>
                    <Input
                      value={settings?.hours_saturday || ''}
                      onChange={(e) => handleSettingChange('hours_saturday', e.target.value)}
                      placeholder="09:00 - 18:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pazar</Label>
                    <Input
                      value={settings?.hours_sunday || ''}
                      onChange={(e) => handleSettingChange('hours_sunday', e.target.value)}
                      placeholder="10:00 - 16:00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Themes Tab */}
        <TabsContent value="themes" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {themes.map((theme) => (
              <Card 
                key={theme.id} 
                className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  settings?.active_theme_id === theme.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                {settings?.active_theme_id === theme.id && (
                  <Badge className="absolute top-3 right-3 z-10">
                    <Check className="h-3 w-3 mr-1" /> Aktif
                  </Badge>
                )}
                {theme.is_premium && (
                  <Badge variant="secondary" className="absolute top-3 left-3 z-10">
                    <Crown className="h-3 w-3 mr-1" /> Premium
                  </Badge>
                )}
                
                {/* Theme Preview */}
                <div 
                  className="h-32 relative"
                  style={{ backgroundColor: theme.colors?.primary || '#3B82F6' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    {Object.entries(theme.colors || {}).slice(0, 4).map(([key, color]) => (
                      <div 
                        key={key}
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                        title={key}
                      />
                    ))}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{theme.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{theme.description}</p>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openPreview(theme)}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Önizle
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      disabled={settings?.active_theme_id === theme.id}
                      onClick={() => handleActivateTheme(theme.id)}
                    >
                      {settings?.active_theme_id === theme.id ? 'Aktif' : 'Uygula'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Theme Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewTheme?.name} Önizleme</DialogTitle>
            <DialogDescription>
              Bu tema nasıl görüneceğine dair önizleme
            </DialogDescription>
          </DialogHeader>
          {previewTheme && (
            <div className="rounded-lg overflow-hidden border">
              <div 
                className="h-40 p-6"
                style={{ backgroundColor: previewTheme.colors?.primary }}
              >
                <h2 className="text-2xl font-bold text-white">Örnek Başlık</h2>
                <p className="text-white/80">Örnek alt başlık metni</p>
              </div>
              <div className="p-6 bg-white">
                <div className="flex gap-4">
                  {Object.entries(previewTheme.colors || {}).map(([key, color]) => (
                    <div key={key} className="text-center">
                      <div 
                        className="w-12 h-12 rounded-lg mb-2 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-muted-foreground capitalize">{key}</span>
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

export default ThemeStore;
