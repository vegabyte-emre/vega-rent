import React, { useState, useEffect } from "react";
import axios from "axios";
import getApiUrl from '../config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
  Info,
  Send,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "../lib/utils";

export function Kabis() {
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(null);
  const [setupInfo, setSetupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [reservations, setReservations] = useState([]);
  
  const [newNotification, setNewNotification] = useState({
    vehicle_plate: "",
    customer_tc: "",
    customer_name: "",
    customer_phone: "",
    rental_start: "",
    rental_end: "",
    pickup_location: "",
    dropoff_location: ""
  });
  
  const [apiSettings, setApiSettings] = useState({
    api_key: "",
    firma_kodu: "",
    api_url: "https://api.kabis.uab.gov.tr/v1",
    is_active: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, notificationsRes, vehiclesRes, customersRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/kabis/settings`),
        axios.get(`${getApiUrl()}/api/kabis/notifications`),
        axios.get(`${getApiUrl()}/api/vehicles`),
        axios.get(`${getApiUrl()}/api/customers`)
      ]);
      
      setSettings(settingsRes.data);
      setSetupInfo(settingsRes.data.setup_info);
      setNotifications(notificationsRes.data);
      setVehicles(vehiclesRes.data);
      setCustomers(customersRes.data);
      
      if (settingsRes.data.settings) {
        setApiSettings({
          ...apiSettings,
          ...settingsRes.data.settings,
          api_key: "" // Don't show existing key
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Veriler yuklenirken hata olustu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    // Validate TC
    if (newNotification.customer_tc.length !== 11) {
      toast.error("T.C. Kimlik No 11 haneli olmalidir");
      return;
    }
    
    try {
      const result = await axios.post(`${getApiUrl()}/api/kabis/notifications`, newNotification);
      
      if (result.data.success) {
        toast.success(result.data.message || "Bildirim olusturuldu");
        if (result.data.source === "local") {
          toast.info("KABIS API yapilandirilmadigi icin bildirim yerel olarak kaydedildi");
        }
        setShowNotificationDialog(false);
        setNewNotification({
          vehicle_plate: "",
          customer_tc: "",
          customer_name: "",
          customer_phone: "",
          rental_start: "",
          rental_end: "",
          pickup_location: "",
          dropoff_location: ""
        });
        fetchData();
      } else {
        toast.error(result.data.error || "Bildirim olusturulamadi");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bildirim olusturulamadi");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await axios.post(`${getApiUrl()}/api/kabis/settings`, apiSettings);
      toast.success("KABIS ayarlari kaydedildi");
      setShowSettingsDialog(false);
      fetchData();
    } catch (error) {
      toast.error("Ayarlar kaydedilemedi");
    }
  };

  const handleCancelNotification = async (notificationId) => {
    try {
      await axios.delete(`${getApiUrl()}/api/kabis/notifications/${notificationId}`);
      toast.success("Bildirim iptal edildi");
      fetchData();
    } catch (error) {
      toast.error("Bildirim iptal edilemedi");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Gonderildi</Badge>;
      case "pending_api":
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />API Bekliyor</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Iptal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="kabis-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KABIS Bildirimleri</h1>
          <p className="text-muted-foreground mt-1">Karayolu Bilgi Sistemi kiralama bildirimleri</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            API Ayarlari
          </Button>
          <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Bildirim Olustur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>KABIS Kiralama Bildirimi</DialogTitle>
                <DialogDescription>Kiralama bilgilerini girin</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Arac Plakasi *</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newNotification.vehicle_plate}
                    onChange={(e) => setNewNotification({...newNotification, vehicle_plate: e.target.value})}
                  >
                    <option value="">Arac Secin</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate}>{v.plate} - {v.brand} {v.model}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>T.C. Kimlik No *</Label>
                  <Input
                    value={newNotification.customer_tc}
                    onChange={(e) => setNewNotification({...newNotification, customer_tc: e.target.value.replace(/\D/g, "").slice(0, 11)})}
                    placeholder="11 haneli T.C. Kimlik No"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label>Musteri Adi Soyadi *</Label>
                  <Input
                    value={newNotification.customer_name}
                    onChange={(e) => setNewNotification({...newNotification, customer_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={newNotification.customer_phone}
                    onChange={(e) => setNewNotification({...newNotification, customer_phone: e.target.value})}
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                <div>
                  <Label>Kiralama Baslangic *</Label>
                  <Input
                    type="datetime-local"
                    value={newNotification.rental_start}
                    onChange={(e) => setNewNotification({...newNotification, rental_start: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Kiralama Bitis *</Label>
                  <Input
                    type="datetime-local"
                    value={newNotification.rental_end}
                    onChange={(e) => setNewNotification({...newNotification, rental_end: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Alis Lokasyonu</Label>
                  <Input
                    value={newNotification.pickup_location}
                    onChange={(e) => setNewNotification({...newNotification, pickup_location: e.target.value})}
                    placeholder="Teslim alinacak adres"
                  />
                </div>
                <div>
                  <Label>Iade Lokasyonu</Label>
                  <Input
                    value={newNotification.dropoff_location}
                    onChange={(e) => setNewNotification({...newNotification, dropoff_location: e.target.value})}
                    placeholder="Iade edilecek adres"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>Iptal</Button>
                <Button onClick={handleCreateNotification}>
                  <Send className="h-4 w-4 mr-2" />
                  Bildirim Gonder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Banner */}
      {!settings?.configured && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">KABIS API Yapilandirilmamis</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Bildirimler yerel olarak kaydedilecektir. Otomatik KABIS entegrasyonu icin API ayarlarini yapilandirin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
          <TabsTrigger value="info">Kurulum Bilgisi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Kiralama Bildirimleri</CardTitle>
              <CardDescription>KABIS'e gonderilen/gonderilecek bildirimler</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Henuz bildirim olusturulmamis</p>
                  <Button className="mt-4" onClick={() => setShowNotificationDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ilk Bildirimi Olustur
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plaka</TableHead>
                      <TableHead>Musteri</TableHead>
                      <TableHead>T.C. No</TableHead>
                      <TableHead>Tarih Araligi</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Olusturma</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono font-medium">{n.rental_data?.vehicle_plate}</TableCell>
                        <TableCell>{n.rental_data?.customer_name}</TableCell>
                        <TableCell className="font-mono">{n.rental_data?.customer_tc}</TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(n.rental_data?.rental_start)} - {formatDateTime(n.rental_data?.rental_end)}
                        </TableCell>
                        <TableCell>{getStatusBadge(n.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(n.created_at)}
                        </TableCell>
                        <TableCell>
                          {n.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleCancelNotification(n.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="info" className="mt-4">
          {setupInfo && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    {setupInfo.title}
                  </CardTitle>
                  <CardDescription>{setupInfo.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Kimler Icin Zorunlu?</h4>
                      <p className="text-sm text-muted-foreground">{setupInfo.required_for}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Kayit Adimlari</h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        {setupInfo.registration_steps?.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Gerekli Belgeler</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {setupInfo.required_documents?.map((doc, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-medium mb-3">Faydali Linkler</h4>
                    <div className="space-y-2">
                      <a 
                        href={setupInfo.links?.portal} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        KABIS Portali
                      </a>
                      <a 
                        href={setupInfo.links?.documentation} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        API Dokumantasyonu
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KABIS API Ayarlari</DialogTitle>
            <DialogDescription>KABIS entegrasyonu icin API bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>API Anahtari</Label>
              <Input
                type="password"
                value={apiSettings.api_key}
                onChange={(e) => setApiSettings({...apiSettings, api_key: e.target.value})}
                placeholder="KABIS API anahtariniz"
              />
            </div>
            <div>
              <Label>Firma Kodu</Label>
              <Input
                value={apiSettings.firma_kodu}
                onChange={(e) => setApiSettings({...apiSettings, firma_kodu: e.target.value})}
                placeholder="KABIS firma kodunuz"
              />
            </div>
            <div>
              <Label>API URL</Label>
              <Input
                value={apiSettings.api_url}
                onChange={(e) => setApiSettings({...apiSettings, api_url: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={apiSettings.is_active}
                onChange={(e) => setApiSettings({...apiSettings, is_active: e.target.checked})}
              />
              <Label htmlFor="is_active">Entegrasyonu Aktif Et</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Iptal</Button>
            <Button onClick={handleSaveSettings}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
