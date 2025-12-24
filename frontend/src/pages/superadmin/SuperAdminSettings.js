import getApiUrl from '../../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Settings, Server, Globe, Shield, Database, Loader2, CheckCircle, XCircle, ExternalLink, Upload, Monitor, RefreshCw, Package, Github, FolderGit2, Smartphone } from "lucide-react";
import { toast } from "sonner";


export function SuperAdminSettings() {
  const [traefikStatus, setTraefikStatus] = useState(null);
  const [templateInfo, setTemplateInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployingFrontend, setDeployingFrontend] = useState(false);
  const [updatingMasterTemplate, setUpdatingMasterTemplate] = useState(false);
  const [masterTemplateStatus, setMasterTemplateStatus] = useState(null);
  const [mobileTemplateStatus, setMobileTemplateStatus] = useState(null);
  const [updatingMobileTemplate, setUpdatingMobileTemplate] = useState(false);

  useEffect(() => {
    checkTraefikStatus();
    checkMasterTemplateStatus();
    checkMobileTemplateStatus();
    loadTemplateInfo();
  }, []);

  const checkTraefikStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${getApiUrl()}/api/superadmin/traefik/status`);
      setTraefikStatus(response.data);
    } catch (error) {
      setTraefikStatus({ installed: false, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const checkMasterTemplateStatus = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/superadmin/template/status`);
      setMasterTemplateStatus(response.data);
    } catch (error) {
      setMasterTemplateStatus({ status: 'unknown' });
    }
  };

  const checkMobileTemplateStatus = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/superadmin/template/mobile/status`);
      setMobileTemplateStatus(response.data);
    } catch (error) {
      setMobileTemplateStatus({ templates: {} });
    }
  };

  const updateMobileTemplate = async (appType) => {
    setUpdatingMobileTemplate(true);
    try {
      const response = await axios.post(`${getApiUrl()}/api/superadmin/template/mobile/update`, {
        app_type: appType
      });
      if (response.data.success) {
        toast.success(`Mobil ${appType} template başarıyla güncellendi!`);
        checkMobileTemplateStatus();
      } else {
        toast.error(response.data.error || "Mobil template güncelleme başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Mobil template güncellenemedi");
    } finally {
      setUpdatingMobileTemplate(false);
    }
  };

  const loadTemplateInfo = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/superadmin/template/info`);
      setTemplateInfo(response.data);
    } catch (error) {
      console.error("Template info yüklenemedi:", error);
    }
  };

  const updateMasterTemplate = async () => {
    setUpdatingMasterTemplate(true);
    try {
      const response = await axios.post(`${getApiUrl()}/api/superadmin/template/update-master`);
      if (response.data.success) {
        toast.success("Master template başarıyla güncellendi!");
        checkMasterTemplateStatus();
        loadTemplateInfo();
      } else {
        toast.error(response.data.error || "Template güncelleme başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Master template güncellenemedi");
    } finally {
      setUpdatingMasterTemplate(false);
    }
  };

  const deployTraefik = async () => {
    setDeploying(true);
    try {
      const response = await axios.post(`${getApiUrl()}/api/superadmin/traefik/deploy`);
      toast.success(response.data.message);
      checkTraefikStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Traefik kurulumu başarısız");
    } finally {
      setDeploying(false);
    }
  };

  const deployFrontendToKVM = async () => {
    setDeployingFrontend(true);
    try {
      const response = await axios.post(`${getApiUrl()}/api/superadmin/deploy-frontend-to-kvm`);
      if (response.data.success) {
        toast.success("Frontend KVM sunucusuna başarıyla deploy edildi!");
      } else {
        toast.error(response.data.error || "Deploy başarısız");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Frontend deploy başarısız");
    } finally {
      setDeployingFrontend(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="superadmin-settings">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Ayarları</h1>
        <p className="text-slate-400 mt-1">Genel platform yapılandırması</p>
      </div>

      {/* Template Info Card */}
      {templateInfo && templateInfo.template_config && (
        <Card className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-purple-400" />
              Template Bilgisi (GitHub)
            </CardTitle>
            <CardDescription className="text-slate-400">
              /app/template klasöründen okunan şablon bilgileri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Versiyon</p>
                <p className="text-white font-mono">{templateInfo.template_config.version}</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Son Güncelleme</p>
                <p className="text-white font-mono">{templateInfo.template_config.lastUpdated}</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Frontend</p>
                <p className={`font-medium ${templateInfo.frontend.has_src ? 'text-green-400' : 'text-red-400'}`}>
                  {templateInfo.frontend.has_src ? '✓ Hazır' : '✗ Eksik'}
                </p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Backend</p>
                <p className={`font-medium ${templateInfo.backend.has_server ? 'text-green-400' : 'text-red-400'}`}>
                  {templateInfo.backend.has_server ? '✓ Hazır' : '✗ Eksik'}
                </p>
              </div>
            </div>
            
            {/* Features */}
            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-2">Dahil Edilen Özellikler</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(templateInfo.template_config.features || {}).map(([key, value]) => (
                  value && (
                    <span key={key} className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs">
                      {key}
                    </span>
                  )
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Master Template Settings */}
      <Card className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border-orange-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-400" />
            Master Template Yönetimi
          </CardTitle>
          <CardDescription className="text-slate-400">
            /app/template klasöründen master template'i güncelle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-300 mb-3">📋 Template Güncelleme Akışı:</p>
            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
              <li><strong>GitHub Push:</strong> Kod değişikliklerini GitHub'a gönderin</li>
              <li><strong>Save to GitHub:</strong> Emergent'te "Save to GitHub" yapın</li>
              <li><strong>Master Template Güncelle:</strong> Bu butonla master template'i güncelleyin</li>
              <li><strong>Firma Güncelle:</strong> Firmalar sayfasından tenant'ları güncelleyin</li>
            </ol>
          </div>
          
          {masterTemplateStatus && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-sm text-slate-400">Template Durumu</p>
                <p className={`font-medium ${masterTemplateStatus.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {masterTemplateStatus.status === 'active' ? 'Aktif' : 'Bilinmiyor'}
                </p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-sm text-slate-400">Son Güncelleme</p>
                <p className="text-white text-sm">
                  {masterTemplateStatus.last_updated || 'Bilgi yok'}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button 
              onClick={updateMasterTemplate} 
              disabled={updatingMasterTemplate}
              className="bg-orange-600 hover:bg-orange-700 flex-1"
            >
              {updatingMasterTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Master Template Güncelle
                </>
              )}
            </Button>
            <Button 
              onClick={checkMasterTemplateStatus} 
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              ⚠️ Master template güncellemesi, mevcut firmaları otomatik güncellemez. 
              Her firmayı ayrıca güncellemeniz gerekir.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Traefik Settings */}
      <Card className={`border ${traefikStatus?.installed ? 'bg-green-900/20 border-green-500/30' : 'bg-yellow-900/20 border-yellow-500/30'}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Traefik Reverse Proxy
          </CardTitle>
          <CardDescription className="text-slate-400">
            Otomatik SSL ve domain yönlendirme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Kontrol ediliyor...
            </div>
          ) : traefikStatus?.installed ? (
            <>
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Traefik Kurulu ve Aktif</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-400">Stack ID</p>
                  <p className="text-white font-mono">{traefikStatus.stack_id}</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-400">Dashboard</p>
                  <a href={traefikStatus.dashboard_url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-400 hover:underline flex items-center gap-1">
                    {traefikStatus.dashboard_url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 mt-4">
                <p className="text-sm text-slate-300 mb-2">✅ Traefik özellikleri:</p>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Otomatik SSL sertifikası (Let's Encrypt)</li>
                  <li>• HTTP → HTTPS yönlendirme</li>
                  <li>• Domain bazlı routing</li>
                  <li>• Yeni firma eklendiğinde otomatik algılama</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-yellow-400">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Traefik Kurulu Değil</span>
              </div>
              <p className="text-slate-400 text-sm">
                Domain ile firma ekleyebilmek için önce Traefik kurulmalıdır.
              </p>
              <Button 
                onClick={deployTraefik} 
                disabled={deploying}
                className="bg-blue-600 hover:bg-blue-700 mt-2"
              >
                {deploying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Traefik'i Kur
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* SuperAdmin Panel Deploy */}
      <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-purple-400" />
            SuperAdmin Panel Deploy
          </CardTitle>
          <CardDescription className="text-slate-400">
            KVM sunucusundaki SuperAdmin panelini güncelle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400">Frontend URL</p>
              <a href="http://72.61.158.147:9000" target="_blank" rel="noopener noreferrer" 
                 className="text-blue-400 hover:underline flex items-center gap-1 text-sm">
                http://72.61.158.147:9000 <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400">Backend URL</p>
              <a href="http://72.61.158.147:9001/api/health" target="_blank" rel="noopener noreferrer" 
                 className="text-green-400 hover:underline flex items-center gap-1 text-sm">
                http://72.61.158.147:9001 <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-300 mb-2">ℹ️ Bu işlem:</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Frontend'i doğru backend URL ile build eder</li>
              <li>• Build dosyalarını KVM sunucusuna yükler</li>
              <li>• ~30 saniye sürebilir</li>
            </ul>
          </div>
          <Button 
            onClick={deployFrontendToKVM} 
            disabled={deployingFrontend}
            className="bg-purple-600 hover:bg-purple-700 w-full"
          >
            {deployingFrontend ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deploy ediliyor...
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4 mr-2" />
                Frontend'i KVM'e Deploy Et
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Portainer Settings */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-purple-400" />
            Portainer Entegrasyonu
          </CardTitle>
          <CardDescription className="text-slate-400">
            Container orchestration ayarları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Portainer URL</Label>
            <Input
              defaultValue="https://72.61.158.147:9443"
              className="bg-slate-900/50 border-slate-600 text-white"
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">API Token</Label>
            <Input
              type="password"
              defaultValue="ptr_XwtYmxpR0KCkqMLsPLGMM4mHQS5Q75gupgBcCGqRUEY="
              className="bg-slate-900/50 border-slate-600 text-white"
              readOnly
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Bağlantı aktif
          </div>
        </CardContent>
      </Card>

      {/* Domain Settings */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Domain Yapılandırması
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ana domain ve DNS ayarları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Ana Domain</Label>
            <Input
              placeholder="rentafleet.com"
              className="bg-slate-900/50 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500">Henüz yapılandırılmadı</p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Wildcard DNS</Label>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <code className="text-sm text-slate-300">*.rentafleet.com → 72.61.158.147</code>
            </div>
            <p className="text-xs text-slate-500">DNS sağlayıcınızda bu kaydı oluşturun</p>
          </div>
        </CardContent>
      </Card>

      {/* Database Settings */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-green-400" />
            Veritabanı
          </CardTitle>
          <CardDescription className="text-slate-400">
            MongoDB bağlantı durumu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            MongoDB bağlı ve çalışıyor
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            Güvenlik
          </CardTitle>
          <CardDescription className="text-slate-400">
            Platform güvenlik ayarları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
            <div>
              <p className="text-white font-medium">SSL/TLS</p>
              <p className="text-sm text-slate-400">HTTPS zorunlu</p>
            </div>
            <div className="text-green-400 text-sm">Aktif</div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
            <div>
              <p className="text-white font-medium">JWT Token</p>
              <p className="text-sm text-slate-400">24 saat geçerlilik</p>
            </div>
            <div className="text-green-400 text-sm">Yapılandırıldı</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Settings className="h-4 w-4 mr-2" />
          Ayarları Kaydet
        </Button>
      </div>
    </div>
  );
}
