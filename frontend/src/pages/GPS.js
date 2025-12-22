import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { MapPin, Car, RefreshCw, Navigation, Clock, Gauge } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "../lib/utils";


export function GPS() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/gps/vehicles`);
      setLocations(response.data);
    } catch (error) {
      toast.error("GPS verileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="gps-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GPS Araç Takip</h1>
          <p className="text-muted-foreground mt-1">Kiradaki araçların anlık konumlarını takip edin</p>
        </div>
        <Button onClick={fetchLocations} variant="outline" data-testid="refresh-gps">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area (Placeholder) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Harita Görünümü
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-96 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
              {/* Mock Map Background */}
              <div 
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              
              {/* Vehicle Markers */}
              <div className="relative h-full p-4">
                {locations.map((loc, index) => (
                  <div
                    key={loc.vehicle_id}
                    className={`absolute cursor-pointer transition-all duration-300 ${
                      selectedVehicle === loc.vehicle_id ? "scale-125 z-10" : "hover:scale-110"
                    }`}
                    style={{
                      left: `${20 + (index * 15) % 60}%`,
                      top: `${20 + (index * 20) % 60}%`,
                    }}
                    onClick={() => setSelectedVehicle(loc.vehicle_id === selectedVehicle ? null : loc.vehicle_id)}
                    data-testid={`vehicle-marker-${loc.vehicle_id}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                      selectedVehicle === loc.vehicle_id 
                        ? "bg-accent text-white" 
                        : "bg-white dark:bg-slate-700 text-primary"
                    }`}>
                      <Car className="h-5 w-5" />
                    </div>
                    {selectedVehicle === loc.vehicle_id && (
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-card p-3 rounded-lg shadow-lg border border-border min-w-48 z-20">
                        <p className="font-bold text-sm">{loc.plate}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Gauge className="h-3 w-3" />
                          {loc.speed} km/h
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Navigation className="h-3 w-3" />
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {locations.length === 0 && !loading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Şu anda kirada araç yok</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
                <p className="text-xs font-medium mb-2">Harita Bilgisi</p>
                <p className="text-xs text-muted-foreground">
                  {locations.length} araç takip ediliyor
                </p>
                <p className="text-xs text-amber-500 mt-1">
                  ⚠️ Test verisi gösteriliyor
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5" />
              Kiradaki Araçlar ({locations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : locations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Car className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">Kirada araç yok</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {locations.map((location) => (
                  <div
                    key={location.vehicle_id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedVehicle === location.vehicle_id 
                        ? "bg-accent/10" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedVehicle(
                      location.vehicle_id === selectedVehicle ? null : location.vehicle_id
                    )}
                    data-testid={`vehicle-item-${location.vehicle_id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium font-mono">{location.plate}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Gauge className="h-3 w-3" />
                            {location.speed} km/h
                          </div>
                        </div>
                      </div>
                      <Badge variant={location.speed > 0 ? "default" : "secondary"}>
                        {location.speed > 0 ? "Hareket" : "Durağan"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Son güncelleme: {formatDateTime(location.last_update)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Test Modu Aktif</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                GPS verileri şu anda simülasyon modunda çalışmaktadır. Gerçek GPS cihaz entegrasyonu için 
                sistem yöneticisi ile iletişime geçin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
