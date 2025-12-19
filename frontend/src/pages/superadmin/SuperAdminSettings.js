import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Settings, Server, Globe, Shield, Database } from "lucide-react";

export function SuperAdminSettings() {
  return (
    <div className="space-y-6" data-testid="superadmin-settings">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Ayarları</h1>
        <p className="text-slate-400 mt-1">Genel platform yapılandırması</p>
      </div>

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
