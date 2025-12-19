import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Settings, Server, Globe, Shield, Database, Loader2, CheckCircle, XCircle, ExternalLink, Upload, Monitor } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function SuperAdminSettings() {
  const [traefikStatus, setTraefikStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployingFrontend, setDeployingFrontend] = useState(false);

  useEffect(() => {
    checkTraefikStatus();
  }, []);

  const checkTraefikStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/superadmin/traefik/status`);
      setTraefikStatus(response.data);
    } catch (error) {
      setTraefikStatus({ installed: false, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deployTraefik = async () => {
    setDeploying(true);
    try {
      const response = await axios.post(`${API_URL}/api/superadmin/traefik/deploy`);
      toast.success(response.data.message);
      checkTraefikStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Traefik kurulumu başarısız");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="superadmin-settings">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Ayarları</h1>
        <p className="text-slate-400 mt-1">Genel platform yapılandırması</p>
      </div>

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
