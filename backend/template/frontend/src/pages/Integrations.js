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
  const [arventoActiveSection, setArventoActiveSection] = useState("vehicles");
  const [arventoReportData, setArventoReportData] = useState(null);
  const [arventoSelectedVehicle, setArventoSelectedVehicle] = useState(null);
  const [arventoDateRange, setArventoDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

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

  // New Arvento Functions
  const loadArventoReport = async (reportType, nodeId = null) => {
    setArventoLoading(true);
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";
      let params = new URLSearchParams();
      
      if (nodeId) params.append("node_id", nodeId);
      params.append("start_date", arventoDateRange.start + " 00:00:00");
      params.append("end_date", arventoDateRange.end + " 23:59:59");
      
      switch (reportType) {
        case "trips":
          endpoint = nodeId ? `/api/arvento/vehicle/${nodeId}/trips` : `/api/arvento/kilometer-report`;
          break;
        case "stops":
          endpoint = `/api/arvento/vehicle/${nodeId}/stops`;
          break;
        case "speed":
          endpoint = nodeId ? `/api/arvento/vehicle/${nodeId}/speed` : `/api/arvento/speed-violations`;
          break;
        case "fuel":
          endpoint = `/api/arvento/vehicle/${nodeId}/fuel`;
          break;
        case "maintenance":
          endpoint = `/api/arvento/maintenance`;
          break;
        case "alarms":
          endpoint = `/api/arvento/alarms`;
          break;
        case "drivers":
          endpoint = `/api/arvento/drivers`;
          break;
        case "groups":
          endpoint = `/api/arvento/groups`;
          break;
        default:
          endpoint = `/api/arvento/vehicles`;
      }
      
      const response = await axios.get(`${getApiUrl()}${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setArventoReportData({
        type: reportType,
        data: response.data,
        timestamp: new Date().toISOString()
      });
      
      if (response.data.success) {
        toast.success(`${reportType} raporu yüklendi`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Rapor yüklenemedi");
    } finally {
      setArventoLoading(false);
    }
  };

  const loadArventoSpeedViolations = async () => {
    setArventoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        start_date: arventoDateRange.start + " 00:00:00",
        end_date: arventoDateRange.end + " 23:59:59",
        speed_limit: "120"
      });
      
      const response = await axios.get(`${getApiUrl()}/api/arvento/speed-violations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setArventoReportData({
        type: "speed_violations",
        data: response.data,
        timestamp: new Date().toISOString()
      });
      
      if (response.data.success) {
        toast.success(`${response.data.count || 0} hız ihlali bulundu`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hız ihlalleri yüklenemedi");
    } finally {
      setArventoLoading(false);
    }
  };

  const loadArventoAlarms = async () => {
    setArventoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        start_date: arventoDateRange.start + " 00:00:00",
        end_date: arventoDateRange.end + " 23:59:59"
      });
      
      const response = await axios.get(`${getApiUrl()}/api/arvento/alarms?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setArventoReportData({
        type: "alarms",
        data: response.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Alarmlar yüklenemedi");
    } finally {
      setArventoLoading(false);
    }
  };

  const loadArventoMaintenance = async () => {
    setArventoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${getApiUrl()}/api/arvento/maintenance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setArventoReportData({
        type: "maintenance",
        data: response.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bakım bilgileri yüklenemedi");
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
          {/* Arvento Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-500" />
                Arvento GPS Entegrasyonu
              </CardTitle>
              <CardDescription>
                Araçlarınızın canlı konum takibi için Arvento API bilgilerinizi girin.
                <span className="block mt-1 text-amber-600">Not: Web portal şifresi değil, API PIN kodlarını kullanın!</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="arvento-username">Kullanıcı Adı</Label>
                  <Input
                    id="arvento-username"
                    placeholder="API kullanıcı adı"
                    value={arventoSettings.username}
                    onChange={(e) => setArventoSettings({...arventoSettings, username: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arvento-pin1">PIN1 (API Şifresi)</Label>
                  <Input
                    id="arvento-pin1"
                    type="password"
                    placeholder="API PIN1"
                    value={arventoSettings.pin1}
                    onChange={(e) => setArventoSettings({...arventoSettings, pin1: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arvento-pin2">PIN2 (Opsiyonel)</Label>
                  <Input
                    id="arvento-pin2"
                    type="password"
                    placeholder="API PIN2"
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

              <div className="flex flex-wrap gap-2 pt-4">
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

          {/* Arvento Features Section - Only show if configured */}
          {arventoSettings.configured && (
            <>
              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <Button 
                  variant={arventoActiveSection === "vehicles" ? "default" : "outline"} 
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => { setArventoActiveSection("vehicles"); loadArventoVehicles(); }}
                >
                  <MapPin className="h-5 w-5" />
                  <span className="text-xs">Canlı Konum</span>
                </Button>
                <Button 
                  variant={arventoActiveSection === "trips" ? "default" : "outline"} 
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => { setArventoActiveSection("trips"); loadArventoReport("trips"); }}
                >
                  <Route className="h-5 w-5" />
                  <span className="text-xs">Seferler</span>
                </Button>
                <Button 
                  variant={arventoActiveSection === "speed" ? "default" : "outline"} 
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => { setArventoActiveSection("speed"); loadArventoSpeedViolations(); }}
                >
                  <Gauge className="h-5 w-5" />
                  <span className="text-xs">Hız İhlalleri</span>
                </Button>
                <Button 
                  variant={arventoActiveSection === "fuel" ? "default" : "outline"} 
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => { setArventoActiveSection("fuel"); loadArventoReport("fuel"); }}
                >
                  <Fuel className="h-5 w-5" />
                  <span className="text-xs">Yakıt</span>
                </Button>
                <Button 
                  variant={arventoActiveSection === "maintenance" ? "default" : "outline"} 
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => { setArventoActiveSection("maintenance"); loadArventoMaintenance(); }}
                >
                  <Wrench className="h-5 w-5" />
                  <span className="text-xs">Bakım</span>
                </Button>
                <Button 
                  variant={arventoActiveSection === "alarms" ? "default" : "outline"} 
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => { setArventoActiveSection("alarms"); loadArventoAlarms(); }}
                >
                  <Bell className="h-5 w-5" />
                  <span className="text-xs">Alarmlar</span>
                </Button>
              </div>

              {/* Date Range Filter */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Başlangıç</Label>
                      <Input 
                        type="date" 
                        value={arventoDateRange.start}
                        onChange={(e) => setArventoDateRange({...arventoDateRange, start: e.target.value})}
                        className="w-40"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bitiş</Label>
                      <Input 
                        type="date" 
                        value={arventoDateRange.end}
                        onChange={(e) => setArventoDateRange({...arventoDateRange, end: e.target.value})}
                        className="w-40"
                      />
                    </div>
                    {arventoVehicles.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Araç</Label>
                        <Select 
                          value={arventoSelectedVehicle || "all"}
                          onValueChange={(v) => setArventoSelectedVehicle(v === "all" ? null : v)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Tüm Araçlar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tüm Araçlar</SelectItem>
                            {arventoVehicles.map((v) => (
                              <SelectItem key={v.node_id || v.vehicle_id} value={v.node_id || v.vehicle_id}>
                                {v.plate}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        if (arventoActiveSection === "vehicles") loadArventoVehicles();
                        else if (arventoActiveSection === "speed") loadArventoSpeedViolations();
                        else if (arventoActiveSection === "alarms") loadArventoAlarms();
                        else if (arventoActiveSection === "maintenance") loadArventoMaintenance();
                        else loadArventoReport(arventoActiveSection, arventoSelectedVehicle);
                      }}
                      disabled={arventoLoading}
                    >
                      {arventoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      <span className="ml-2">Yenile</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Content Based on Active Section */}
              {arventoActiveSection === "vehicles" && arventoVehicles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      Canlı Araç Konumları
                    </CardTitle>
                    <CardDescription>
                      {arventoVehicles.length} araç takip ediliyor
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-medium">Plaka</th>
                            <th className="p-3 text-left font-medium">Konum</th>
                            <th className="p-3 text-left font-medium">Hız</th>
                            <th className="p-3 text-left font-medium">Km</th>
                            <th className="p-3 text-left font-medium">Kontak</th>
                            <th className="p-3 text-left font-medium">Grup</th>
                            <th className="p-3 text-left font-medium">Son Güncelleme</th>
                          </tr>
                        </thead>
                        <tbody>
                          {arventoVehicles.map((vehicle, idx) => (
                            <tr key={vehicle.vehicle_id || idx} className="border-b hover:bg-muted/30">
                              <td className="p-3 font-medium">{vehicle.plate || '-'}</td>
                              <td className="p-3 text-sm">
                                {vehicle.lat && vehicle.lng ? (
                                  <a 
                                    href={`https://www.google.com/maps?q=${vehicle.lat},${vehicle.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline flex items-center gap-1"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    Haritada Gör
                                  </a>
                                ) : '-'}
                              </td>
                              <td className="p-3">
                                <span className={`font-medium ${vehicle.speed > 100 ? 'text-red-500' : ''}`}>
                                  {vehicle.speed || 0} km/s
                                </span>
                              </td>
                              <td className="p-3 text-sm">{vehicle.odometer ? `${Math.round(vehicle.odometer).toLocaleString()} km` : '-'}</td>
                              <td className="p-3">
                                {vehicle.ignition ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    <Activity className="h-3 w-3 mr-1" />Açık
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Kapalı</Badge>
                                )}
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">{vehicle.group || '-'}</td>
                              <td className="p-3 text-xs text-muted-foreground">{vehicle.last_update || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Report Data Display */}
              {arventoReportData && arventoActiveSection !== "vehicles" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                      {arventoActiveSection === "speed" && "Hız İhlalleri Raporu"}
                      {arventoActiveSection === "trips" && "Sefer Raporu"}
                      {arventoActiveSection === "fuel" && "Yakıt Raporu"}
                      {arventoActiveSection === "maintenance" && "Bakım Bilgileri"}
                      {arventoActiveSection === "alarms" && "Alarm Geçmişi"}
                    </CardTitle>
                    <CardDescription>
                      {arventoDateRange.start} - {arventoDateRange.end} arası veriler
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {arventoReportData.data?.success ? (
                      <div className="space-y-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">
                              {arventoReportData.data?.count || 
                               arventoReportData.data?.violations?.length ||
                               arventoReportData.data?.trips?.length ||
                               arventoReportData.data?.alarms?.length ||
                               arventoReportData.data?.maintenance?.length ||
                               0}
                            </p>
                            <p className="text-xs text-muted-foreground">Toplam Kayıt</p>
                          </div>
                          {arventoReportData.data?.total_km && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                              <p className="text-2xl font-bold text-blue-600">{Math.round(arventoReportData.data.total_km).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Toplam KM</p>
                            </div>
                          )}
                          {arventoReportData.data?.total_consumption && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                              <p className="text-2xl font-bold text-amber-600">{arventoReportData.data.total_consumption.toFixed(1)} L</p>
                              <p className="text-xs text-muted-foreground">Yakıt Tüketimi</p>
                            </div>
                          )}
                          {arventoReportData.data?.speed_limit && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                              <p className="text-2xl font-bold text-red-600">{arventoReportData.data.speed_limit} km/s</p>
                              <p className="text-xs text-muted-foreground">Hız Limiti</p>
                            </div>
                          )}
                        </div>

                        {/* Data Table */}
                        <div className="rounded-md border overflow-x-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted">
                              <tr className="border-b">
                                {Object.keys(
                                  (arventoReportData.data?.violations?.[0] ||
                                   arventoReportData.data?.trips?.[0] ||
                                   arventoReportData.data?.alarms?.[0] ||
                                   arventoReportData.data?.maintenance?.[0] ||
                                   arventoReportData.data?.report?.[0] ||
                                   {})
                                ).slice(0, 6).map((key) => (
                                  <th key={key} className="p-2 text-left font-medium capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(arventoReportData.data?.violations ||
                                arventoReportData.data?.trips ||
                                arventoReportData.data?.alarms ||
                                arventoReportData.data?.maintenance ||
                                arventoReportData.data?.report ||
                                []).slice(0, 50).map((row, idx) => (
                                <tr key={idx} className="border-b hover:bg-muted/30">
                                  {Object.values(row).slice(0, 6).map((val, i) => (
                                    <td key={i} className="p-2">{String(val || '-')}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                        <p>{arventoReportData.data?.message || "Veri bulunamadı"}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {arventoActiveSection === "vehicles" && arventoVehicles.length === 0 && !arventoLoading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Araç verisi yok</h3>
                    <p className="text-muted-foreground mt-1">
                      "Araçları Yükle" butonuna tıklayarak Arvento'dan araç verilerini çekin
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Not Configured State */}
          {!arventoSettings.configured && (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                <h3 className="text-lg font-medium">Arvento Yapılandırılmamış</h3>
                <p className="text-muted-foreground mt-1">
                  Yukarıdaki formu doldurup "Kaydet" butonuna tıklayın
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  Not: Arvento panelinden API PIN kodlarınızı almanız gerekmektedir.
                </p>
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
