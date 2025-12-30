import React, { useState, useEffect } from "react";
import axios from "axios";
import getApiUrl from "../config/api";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Link2, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Car,
  Calendar,
  Globe,
  Key,
  Loader2,
  ExternalLink,
  History,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  MapPin,
  Gauge,
  Fuel,
  Wrench,
  Bell,
  Route,
  Navigation,
  Activity,
  AlertTriangle,
  Timer,
  BarChart3,
  Users
} from "lucide-react";
import { toast } from "sonner";

// Platform configurations
const PLATFORMS = [
  {
    id: "obilet",
    name: "O Bilet",
    description: "Türkiye'nin en büyük araç kiralama platformu",
    logo: "🚗",
    website: "https://www.obilet.com",
    color: "from-blue-600 to-blue-800",
    features: ["Araç Senkronizasyonu", "Fiyat Güncellemesi", "Rezervasyon Aktarımı", "Müsaitlik Takvimi"],
    apiDocs: "https://developer.obilet.com",
    requiredFields: ["api_key", "merchant_id", "secret_key"]
  },
  {
    id: "enuygun",
    name: "Enuygun",
    description: "Online seyahat ve araç kiralama platformu",
    logo: "✈️",
    website: "https://www.enuygun.com",
    color: "from-orange-500 to-red-600",
    features: ["Araç Listesi", "Fiyat Karşılaştırma", "Anlık Müsaitlik"],
    apiDocs: "https://api.enuygun.com/docs",
    requiredFields: ["api_key", "partner_id"]
  },
  {
    id: "arabam",
    name: "Arabam.com",
    description: "Araç alım-satım ve kiralama platformu",
    logo: "🚙",
    website: "https://www.arabam.com",
    color: "from-green-500 to-emerald-700",
    features: ["Araç İlanları", "Kiralama Fiyatları"],
    apiDocs: "https://developer.arabam.com",
    requiredFields: ["api_key", "dealer_id"]
  },
  {
    id: "rentalcars",
    name: "Rentalcars.com",
    description: "Uluslararası araç kiralama platformu",
    logo: "🌍",
    website: "https://www.rentalcars.com",
    color: "from-purple-500 to-indigo-700",
    features: ["Global Erişim", "Çoklu Para Birimi", "Uluslararası Müşteriler"],
    apiDocs: "https://affiliate.rentalcars.com",
    requiredFields: ["affiliate_id", "api_key"]
  },
  {
    id: "kayak",
    name: "KAYAK",
    description: "Seyahat arama motoru",
    logo: "🔍",
    website: "https://www.kayak.com.tr",
    color: "from-amber-500 to-orange-600",
    features: ["Araç Karşılaştırma", "Meta Search"],
    apiDocs: "https://developer.kayak.com",
    requiredFields: ["partner_key", "location_id"]
  },
  {
    id: "custom",
    name: "Özel API",
    description: "Kendi API entegrasyonunuzu ekleyin",
    logo: "⚙️",
    website: "",
    color: "from-slate-600 to-slate-800",
    features: ["Özel Endpoint", "Webhook Desteği", "Esnek Yapılandırma"],
    apiDocs: "",
    requiredFields: ["api_url", "api_key", "webhook_url"]
  }
];

export function Integrations() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [configDialog, setConfigDialog] = useState({ open: false, platform: null });
  const [configForm, setConfigForm] = useState({});
  const [syncLogs, setSyncLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("platforms");
  
  // Arvento GPS state
  const [arventoSettings, setArventoSettings] = useState({
    username: "",
    pin1: "",
    pin2: "",
    language: "tr",
    configured: false
  });
  const [arventoLoading, setArventoLoading] = useState(false);
  const [arventoTesting, setArventoTesting] = useState(false);
  const [arventoVehicles, setArventoVehicles] = useState([]);

  useEffect(() => {
    loadIntegrations();
    loadSyncLogs();
    loadArventoSettings();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/integrations`);
      setIntegrations(response.data || []);
    } catch (error) {
      console.error("Entegrasyonlar yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/integrations/logs`);
      setSyncLogs(response.data || []);
    } catch (error) {
      console.error("Senkronizasyon logları yüklenemedi:", error);
    }
  };

  // Arvento Functions
  const loadArventoSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${getApiUrl()}/api/arvento/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArventoSettings(response.data);
    } catch (error) {
      console.error("Arvento ayarları yüklenemedi:", error);
    }
  };

  const saveArventoSettings = async () => {
    setArventoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${getApiUrl()}/api/arvento/settings`, arventoSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        toast.success("Arvento ayarları kaydedildi!");
        loadArventoSettings();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Arvento ayarları kaydedilemedi");
    } finally {
      setArventoLoading(false);
    }
  };

  const testArventoConnection = async () => {
    setArventoTesting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${getApiUrl()}/api/arvento/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        toast.success(response.data.message || "Arvento bağlantısı başarılı!");
      } else {
        toast.error(response.data.message || "Arvento bağlantısı başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bağlantı test edilemedi");
    } finally {
      setArventoTesting(false);
    }
  };

  const loadArventoVehicles = async () => {
    setArventoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${getApiUrl()}/api/arvento/vehicles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setArventoVehicles(response.data.vehicles || []);
        toast.success(`${response.data.vehicles?.length || 0} araç yüklendi`);
      } else {
        toast.error(response.data.message || "Araçlar yüklenemedi");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Araçlar yüklenemedi");
    } finally {
      setArventoLoading(false);
    }
  };

  const getIntegrationStatus = (platformId) => {
    const integration = integrations.find(i => i.platform_id === platformId);
    return integration || null;
  };

  const openConfigDialog = (platform) => {
    const existing = getIntegrationStatus(platform.id);
    setConfigForm(existing?.config || {});
    setConfigDialog({ open: true, platform });
  };

  const saveIntegration = async () => {
    const platform = configDialog.platform;
    try {
      const response = await axios.post(`${getApiUrl()}/api/integrations`, {
        platform_id: platform.id,
        platform_name: platform.name,
        config: configForm,
        enabled: true
      });
      
      if (response.data.success) {
        toast.success(`${platform.name} entegrasyonu kaydedildi!`);
        loadIntegrations();
        setConfigDialog({ open: false, platform: null });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Entegrasyon kaydedilemedi");
    }
  };

  const toggleIntegration = async (platformId, enabled) => {
    try {
      await axios.patch(`${getApiUrl()}/api/integrations/${platformId}/toggle`, { enabled });
      toast.success(enabled ? "Entegrasyon aktifleştirildi" : "Entegrasyon devre dışı bırakıldı");
      loadIntegrations();
    } catch (error) {
      toast.error("İşlem başarısız");
    }
  };

  const syncVehicles = async (platformId) => {
    setSyncing(prev => ({ ...prev, [platformId]: true }));
    try {
      const response = await axios.post(`${getApiUrl()}/api/integrations/${platformId}/sync`);
      if (response.data.success) {
        toast.success(`${response.data.synced_count || 0} araç senkronize edildi!`);
        loadSyncLogs();
      } else {
        toast.error(response.data.error || "Senkronizasyon başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Senkronizasyon hatası");
    } finally {
      setSyncing(prev => ({ ...prev, [platformId]: false }));
    }
  };

  const deleteIntegration = async (platformId) => {
    if (!window.confirm("Bu entegrasyonu silmek istediğinize emin misiniz?")) return;
    
    try {
      await axios.delete(`${getApiUrl()}/api/integrations/${platformId}`);
      toast.success("Entegrasyon silindi");
      loadIntegrations();
    } catch (error) {
      toast.error("Silme işlemi başarısız");
    }
  };

  const testConnection = async (platformId) => {
    try {
      const response = await axios.post(`${getApiUrl()}/api/integrations/${platformId}/test`);
      if (response.data.success) {
        toast.success("Bağlantı başarılı! ✓");
      } else {
        toast.error(response.data.error || "Bağlantı başarısız");
      }
    } catch (error) {
      toast.error("Bağlantı testi başarısız");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entegrasyonlar</h1>
          <p className="text-muted-foreground mt-1">
            Araç kiralama platformlarıyla entegre olun ve araçlarınızı otomatik senkronize edin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadIntegrations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktif Entegrasyon</p>
                <p className="text-2xl font-bold">{integrations.filter(i => i.enabled).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Senkronize Araç</p>
                <p className="text-2xl font-bold">{integrations.reduce((sum, i) => sum + (i.synced_vehicles || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Globe className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Sayısı</p>
                <p className="text-2xl font-bold">{PLATFORMS.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Son 24 Saat Sync</p>
                <p className="text-2xl font-bold">{syncLogs.filter(l => new Date(l.created_at) > new Date(Date.now() - 86400000)).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="platforms">Platformlar</TabsTrigger>
          <TabsTrigger value="arvento">🛰️ Arvento GPS</TabsTrigger>
          <TabsTrigger value="active">Aktif Entegrasyonlar</TabsTrigger>
          <TabsTrigger value="logs">Senkronizasyon Logları</TabsTrigger>
          <TabsTrigger value="settings">Ayarlar</TabsTrigger>
        </TabsList>

        {/* Arvento GPS Tab */}
        <TabsContent value="arvento" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-500" />
                Arvento GPS Entegrasyonu
              </CardTitle>
              <CardDescription>
                Araçlarınızın canlı konum takibi için Arvento hesap bilgilerinizi girin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="arvento-username">Kullanıcı Adı</Label>
                  <Input
                    id="arvento-username"
                    placeholder="Arvento kullanıcı adınız"
                    value={arventoSettings.username}
                    onChange={(e) => setArventoSettings({...arventoSettings, username: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arvento-pin1">PIN1 (Şifre)</Label>
                  <Input
                    id="arvento-pin1"
                    type="password"
                    placeholder="Arvento PIN1"
                    value={arventoSettings.pin1}
                    onChange={(e) => setArventoSettings({...arventoSettings, pin1: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arvento-pin2">PIN2 (Opsiyonel)</Label>
                  <Input
                    id="arvento-pin2"
                    type="password"
                    placeholder="Arvento PIN2 (opsiyonel)"
                    value={arventoSettings.pin2}
                    onChange={(e) => setArventoSettings({...arventoSettings, pin2: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arvento-language">Dil</Label>
                  <Select 
                    value={arventoSettings.language} 
                    onValueChange={(v) => setArventoSettings({...arventoSettings, language: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Dil seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tr">Türkçe</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveArventoSettings} disabled={arventoLoading}>
                  {arventoLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kaydet
                </Button>
                <Button variant="outline" onClick={testArventoConnection} disabled={arventoTesting}>
                  {arventoTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Bağlantıyı Test Et
                </Button>
                <Button variant="secondary" onClick={loadArventoVehicles} disabled={arventoLoading || !arventoSettings.configured}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${arventoLoading ? 'animate-spin' : ''}`} />
                  Araçları Yükle
                </Button>
              </div>

              {arventoSettings.configured && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-700 dark:text-green-300">
                    Arvento bağlantısı yapılandırılmış - {arventoSettings.vehicle_count || 0} araç
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Arvento Vehicles Table */}
          {arventoVehicles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Canlı Araç Konumları</CardTitle>
                <CardDescription>
                  Arvento'dan alınan son araç verileri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Plaka</th>
                        <th className="p-2 text-left font-medium">Konum</th>
                        <th className="p-2 text-left font-medium">Hız</th>
                        <th className="p-2 text-left font-medium">Kontak</th>
                        <th className="p-2 text-left font-medium">Son Güncelleme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arventoVehicles.map((vehicle, idx) => (
                        <tr key={vehicle.vehicle_id || idx} className="border-b">
                          <td className="p-2 font-medium">{vehicle.plate}</td>
                          <td className="p-2 text-sm">
                            {vehicle.lat && vehicle.lng ? (
                              <a 
                                href={`https://www.google.com/maps?q=${vehicle.lat},${vehicle.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline flex items-center gap-1"
                              >
                                {vehicle.lat?.toFixed(4)}, {vehicle.lng?.toFixed(4)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : '-'}
                          </td>
                          <td className="p-2">{vehicle.speed || 0} km/s</td>
                          <td className="p-2">
                            {vehicle.ignition ? (
                              <Badge variant="success" className="bg-green-100 text-green-800">Açık</Badge>
                            ) : (
                              <Badge variant="secondary">Kapalı</Badge>
                            )}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">{vehicle.last_update}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORMS.map((platform) => {
              const status = getIntegrationStatus(platform.id);
              const isConnected = status?.enabled;
              
              return (
                <Card key={platform.id} className={`relative overflow-hidden ${isConnected ? 'border-green-500/50' : ''}`}>
                  {/* Gradient Header */}
                  <div className={`h-2 bg-gradient-to-r ${platform.color}`} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{platform.logo}</span>
                        <div>
                          <CardTitle className="text-lg">{platform.name}</CardTitle>
                          <CardDescription className="text-xs">{platform.description}</CardDescription>
                        </div>
                      </div>
                      {isConnected && (
                        <Badge className="bg-green-600">Bağlı</Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Features */}
                    <div className="flex flex-wrap gap-1">
                      {platform.features.slice(0, 3).map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Status & Actions */}
                    {isConnected ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Son Sync:</span>
                          <span>{status.last_sync ? new Date(status.last_sync).toLocaleString('tr-TR') : 'Henüz yok'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Araç Sayısı:</span>
                          <span className="font-medium">{status.synced_vehicles || 0}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => syncVehicles(platform.id)}
                            disabled={syncing[platform.id]}
                          >
                            {syncing[platform.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Sync
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openConfigDialog(platform)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => openConfigDialog(platform)}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Bağlan
                      </Button>
                    )}
                    
                    {/* External Link */}
                    {platform.website && (
                      <a 
                        href={platform.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {platform.website.replace('https://', '').replace('www.', '')}
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Active Integrations Tab */}
        <TabsContent value="active" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Henüz entegrasyon yok</h3>
                <p className="text-muted-foreground mt-1">Platformlar sekmesinden bir entegrasyon ekleyin</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => {
                const platform = PLATFORMS.find(p => p.id === integration.platform_id);
                return (
                  <Card key={integration.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">{platform?.logo || '🔗'}</span>
                          <div>
                            <h3 className="font-medium">{integration.platform_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {integration.synced_vehicles || 0} araç senkronize
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Son Sync</p>
                            <p>{integration.last_sync ? new Date(integration.last_sync).toLocaleString('tr-TR') : '-'}</p>
                          </div>
                          
                          <Switch
                            checked={integration.enabled}
                            onCheckedChange={(checked) => toggleIntegration(integration.platform_id, checked)}
                          />
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => syncVehicles(integration.platform_id)}
                              disabled={syncing[integration.platform_id] || !integration.enabled}
                            >
                              {syncing[integration.platform_id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => testConnection(integration.platform_id)}
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteIntegration(integration.platform_id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Senkronizasyon Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz senkronizasyon kaydı yok</p>
              ) : (
                <div className="space-y-3">
                  {syncLogs.slice(0, 20).map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : log.status === 'error' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{log.platform_name}</p>
                          <p className="text-sm text-muted-foreground">{log.message}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{log.synced_count || 0} araç</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Genel Ayarlar</CardTitle>
              <CardDescription>Entegrasyon davranışlarını yapılandırın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Otomatik Senkronizasyon</p>
                  <p className="text-sm text-muted-foreground">Araçları belirli aralıklarla otomatik senkronize et</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Senkronizasyon Aralığı</p>
                  <p className="text-sm text-muted-foreground">Otomatik senkronizasyon sıklığı</p>
                </div>
                <Select defaultValue="1h">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m">15 dakika</SelectItem>
                    <SelectItem value="30m">30 dakika</SelectItem>
                    <SelectItem value="1h">1 saat</SelectItem>
                    <SelectItem value="6h">6 saat</SelectItem>
                    <SelectItem value="24h">24 saat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Fiyat Senkronizasyonu</p>
                  <p className="text-sm text-muted-foreground">Fiyat değişikliklerini platformlara yansıt</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Müsaitlik Senkronizasyonu</p>
                  <p className="text-sm text-muted-foreground">Araç müsaitlik durumunu platformlara yansıt</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Hata Bildirimleri</p>
                  <p className="text-sm text-muted-foreground">Senkronizasyon hatalarında e-posta gönder</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Webhook Ayarları
              </CardTitle>
              <CardDescription>Platformlardan gelen bildirimleri alın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={`${getApiUrl()}/api/integrations/webhook`} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={() => {
                    navigator.clipboard.writeText(`${getApiUrl()}/api/integrations/webhook`);
                    toast.success("URL kopyalandı!");
                  }}>
                    Kopyala
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bu URL'yi platform ayarlarında webhook endpoint olarak kullanın
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configDialog.open} onOpenChange={(open) => !open && setConfigDialog({ open: false, platform: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{configDialog.platform?.logo}</span>
              {configDialog.platform?.name} Entegrasyonu
            </DialogTitle>
            <DialogDescription>
              API bilgilerinizi girerek entegrasyonu yapılandırın
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {configDialog.platform?.requiredFields.map((field) => (
              <div key={field}>
                <Label htmlFor={field} className="capitalize">
                  {field.replace(/_/g, ' ')}
                </Label>
                <Input
                  id={field}
                  type={field.includes('key') || field.includes('secret') ? 'password' : 'text'}
                  placeholder={`${field.replace(/_/g, ' ')} girin`}
                  value={configForm[field] || ''}
                  onChange={(e) => setConfigForm({ ...configForm, [field]: e.target.value })}
                  className="mt-1"
                />
              </div>
            ))}
            
            {configDialog.platform?.apiDocs && (
              <a 
                href={configDialog.platform.apiDocs}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                API Dokümantasyonu
              </a>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog({ open: false, platform: null })}>
              İptal
            </Button>
            <Button onClick={saveIntegration}>
              <Key className="h-4 w-4 mr-2" />
              Kaydet ve Bağlan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Integrations;
