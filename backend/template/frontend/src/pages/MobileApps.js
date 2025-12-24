import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Smartphone, Download, RefreshCw, Clock, CheckCircle, XCircle, Loader2, ExternalLink, Copy, Info } from "lucide-react";
import { toast } from "sonner";
import getApiUrl from "../config/api";

const statusConfig = {
  idle: { label: "Hazır", color: "secondary", icon: Smartphone },
  pending: { label: "Bekliyor", color: "secondary", icon: Clock },
  building: { label: "Oluşturuluyor...", color: "default", icon: Loader2 },
  finished: { label: "Tamamlandı", color: "default", icon: CheckCircle },
  errored: { label: "Hata", color: "destructive", icon: XCircle },
};

// AppCard component moved outside to avoid re-creation on each render
function AppCard({ title, description, appType, appState, icon, mobileConfig, onStartBuild, onCopy }) {
  const StatusIcon = statusConfig[appState.status]?.icon || Smartphone;
  const isBuilding = appState.status === "building";
  const isPending = appState.status === "pending";
  const config = mobileConfig?.[appType === "customer" ? "customer_app" : "operation_app"]?.config;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge variant={statusConfig[appState.status]?.color}>
            <StatusIcon className={`h-3 w-3 mr-1 ${isBuilding ? "animate-spin" : ""}`} />
            {statusConfig[appState.status]?.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => onStartBuild(appType)} 
            disabled={isBuilding}
            className="flex-1"
          >
            {isBuilding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4 mr-2" />
                APK Üret
              </>
            )}
          </Button>
          
          {appState.downloadUrl && (
            <Button variant="outline" asChild>
              <a href={appState.downloadUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                İndir
              </a>
            </Button>
          )}
        </div>
        
        {(isBuilding || isPending) && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 flex items-center mb-2">
              <Info className="h-4 w-4 mr-2" />
              {isBuilding ? "Build işlemi devam ediyor..." : "Build talebi oluşturuldu"}
            </p>
            {appState.expoDashboard && (
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href={appState.expoDashboard} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Expo Dashboard&#39;da Takip Et
                </a>
              </Button>
            )}
          </div>
        )}
        
        {isPending && appState.instructions && appState.instructions.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-2">Manuel Build Adımları:</p>
            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
              {appState.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {config && (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-xs font-medium text-gray-600 mb-2">Uygulama Yapılandırması:</p>
            <div className="space-y-1">
              {Object.entries(config).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{key}:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-white px-1 py-0.5 rounded border text-gray-700">{value}</code>
                    <button onClick={() => onCopy(value)} className="p-0.5 hover:bg-gray-200 rounded">
                      <Copy className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {(isBuilding || isPending) && (
          <p className="text-sm text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            Build süresi yaklaşık 10-20 dakika sürebilir
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function MobileApps() {
  const [customerApp, setCustomerApp] = useState({ status: "idle", buildId: null, downloadUrl: null, expoDashboard: null, instructions: [] });
  const [operationApp, setOperationApp] = useState({ status: "idle", buildId: null, downloadUrl: null, expoDashboard: null, instructions: [] });
  const [builds, setBuilds] = useState([]);
  const [mobileConfig, setMobileConfig] = useState(null);

  const API_URL = getApiUrl();

  const fetchMobileConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/mobile/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMobileConfig(data);
      }
    } catch (error) {
      console.error("Error fetching mobile config:", error);
    }
  }, [API_URL]);

  const fetchBuilds = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/mobile/builds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBuilds(data.builds || []);
      }
    } catch (error) {
      console.error("Error fetching builds:", error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchBuilds();
    fetchMobileConfig();
  }, [fetchBuilds, fetchMobileConfig]);

  const pollBuildStatus = useCallback(async (appType, buildId) => {
    const setApp = appType === "customer" ? setCustomerApp : setOperationApp;
    
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/mobile/build/${buildId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.status === "finished") {
          clearInterval(interval);
          setApp({ status: "finished", buildId, downloadUrl: data.download_url, expoDashboard: null, instructions: [] });
          toast.success("APK hazır!");
          fetchBuilds();
        } else if (data.status === "errored") {
          clearInterval(interval);
          setApp({ status: "errored", buildId, downloadUrl: null, expoDashboard: null, instructions: [] });
          toast.error("Build başarısız oldu");
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    }, 15000);
    
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  }, [API_URL, fetchBuilds]);

  const startBuild = useCallback(async (appType) => {
    const setApp = appType === "customer" ? setCustomerApp : setOperationApp;
    setApp(prev => ({ ...prev, status: "building" }));
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/mobile/build`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ app_type: appType })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${appType === "customer" ? "Müşteri" : "Operasyon"} App build talebi oluşturuldu!`);
        setApp(prev => ({ 
          ...prev, 
          status: data.expo_build_id ? "building" : "pending",
          buildId: data.build_id,
          expoDashboard: data.expo_dashboard,
          instructions: data.instructions || []
        }));
        
        if (data.expo_build_id) {
          pollBuildStatus(appType, data.build_id);
        }
        
        fetchBuilds();
      } else {
        toast.error(data.error || "Build başlatılamadı");
        setApp(prev => ({ ...prev, status: "errored" }));
      }
    } catch (error) {
      toast.error("Build başlatılırken hata oluştu");
      setApp(prev => ({ ...prev, status: "errored" }));
    }
  }, [API_URL, fetchBuilds, pollBuildStatus]);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mobil Uygulamalar</h1>
          <p className="text-muted-foreground">Müşteri ve operasyon uygulamalarını yönetin</p>
        </div>
        <Button variant="outline" onClick={fetchBuilds}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      <Tabs defaultValue="customer" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customer">Müşteri App</TabsTrigger>
          <TabsTrigger value="operation">Operasyon App</TabsTrigger>
          <TabsTrigger value="history">Build Geçmişi</TabsTrigger>
        </TabsList>

        <TabsContent value="customer">
          <AppCard
            title="Müşteri Uygulaması"
            description="Müşterileriniz için araç kiralama uygulaması"
            appType="customer"
            appState={customerApp}
            icon={<Smartphone className="h-8 w-8 text-blue-500" />}
            mobileConfig={mobileConfig}
            onStartBuild={startBuild}
            onCopy={copyToClipboard}
          />
        </TabsContent>

        <TabsContent value="operation">
          <AppCard
            title="Operasyon Uygulaması"
            description="Personel için araç teslim/iade uygulaması"
            appType="operation"
            appState={operationApp}
            icon={<Smartphone className="h-8 w-8 text-green-500" />}
            mobileConfig={mobileConfig}
            onStartBuild={startBuild}
            onCopy={copyToClipboard}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Build Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {builds.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Henüz build yok</p>
              ) : (
                <div className="space-y-3">
                  {builds.map((build, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{build.app_type === "customer" ? "Müşteri" : "Operasyon"} App</p>
                          <p className="text-sm text-muted-foreground">{new Date(build.created_at).toLocaleString("tr-TR")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusConfig[build.status]?.color}>
                          {statusConfig[build.status]?.label}
                        </Badge>
                        {build.download_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={build.download_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
