import getApiUrl from '../../config/api';
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Separator } from "../../components/ui/separator";
import { format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { cn, formatCurrency } from "../../lib/utils";
import {
  Car,
  CalendarIcon,
  Settings2,
  Fuel,
  Users,
  DoorOpen,
  Gauge,
  ArrowLeft,
  CheckCircle,
  Shield,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";


export function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickupDate, setPickupDate] = useState(null);
  const [returnDate, setReturnDate] = useState(null);

  useEffect(() => {
    fetchVehicle();
  }, [id]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/public/vehicles/${id}`);
      setVehicle(response.data);
    } catch (error) {
      toast.error("Araç bilgileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!pickupDate || !returnDate) return 0;
    return Math.max(1, differenceInDays(returnDate, pickupDate));
  };

  const calculateTotal = () => {
    if (!vehicle) return 0;
    return calculateDays() * vehicle.daily_rate;
  };

  const handleReservation = () => {
    if (!pickupDate || !returnDate) {
      toast.error("Lütfen tarih seçin");
      return;
    }
    // Navigate to reservation page with params
    navigate(`/rezervasyon?vehicle=${id}&pickup=${pickupDate.toISOString()}&return=${returnDate.toISOString()}`);
  };

  const features = [
    { icon: Shield, label: "Tam Kasko", included: true },
    { icon: Users, label: "Ek Sürücü", included: true },
    { icon: MapPin, label: "Yol Yardım", included: true },
    { icon: Fuel, label: "Dolu Depo Teslim", included: false },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Araç bulunamadı</p>
          <Link to="/araclar">
            <Button className="mt-4">Araçlara Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl">FleetEase</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/musteri/giris">
                <Button variant="ghost" size="sm">Giriş Yap</Button>
              </Link>
              <Link to="/musteri/kayit">
                <Button size="sm" className="gradient-accent text-white">Kayıt Ol</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Link to="/araclar" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Araçlara Dön
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Vehicle Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image */}
              <Card className="overflow-hidden">
                <div className="aspect-video bg-slate-200 dark:bg-slate-800 relative">
                  <img
                    src={vehicle.image_url || `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200`}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-4 left-4 bg-white/90 text-slate-900 text-base px-3 py-1">
                    {vehicle.segment}
                  </Badge>
                </div>
              </Card>

              {/* Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">
                        {vehicle.brand} {vehicle.model}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        {vehicle.year} • {vehicle.color}
                      </p>
                    </div>
                    <Badge className={vehicle.status === "available" 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-amber-100 text-amber-800"
                    }>
                      {vehicle.status === "available" ? "Müsait" : "Kirada"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Settings2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vites</p>
                        <p className="font-medium capitalize">{vehicle.transmission}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Fuel className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Yakıt</p>
                        <p className="font-medium capitalize">{vehicle.fuel_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Koltuk</p>
                        <p className="font-medium">{vehicle.seat_count} Kişilik</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <DoorOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Kapı</p>
                        <p className="font-medium">{vehicle.door_count} Kapı</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <h3 className="font-semibold mb-4">Kiralama Paketine Dahil</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          feature.included ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                        }`}>
                          {feature.included ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <feature.icon className="h-4 w-4" />
                          )}
                        </div>
                        <span className={feature.included ? "" : "text-muted-foreground"}>
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Card */}
            <div>
              <Card className="sticky top-24" data-testid="booking-card">
                <CardHeader>
                  <CardTitle>Rezervasyon Yap</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{formatCurrency(vehicle.daily_rate)}</p>
                    <p className="text-sm text-muted-foreground">/ gün</p>
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alış Tarihi</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !pickupDate && "text-muted-foreground"
                            )}
                            data-testid="detail-pickup-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {pickupDate ? format(pickupDate, "d MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={pickupDate}
                            onSelect={setPickupDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">İade Tarihi</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !returnDate && "text-muted-foreground"
                            )}
                            data-testid="detail-return-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {returnDate ? format(returnDate, "d MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={returnDate}
                            onSelect={setReturnDate}
                            disabled={(date) => date < (pickupDate || new Date())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Price Summary */}
                  {pickupDate && returnDate && (
                    <div className="space-y-2 p-4 bg-secondary/50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>{formatCurrency(vehicle.daily_rate)} x {calculateDays()} gün</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Toplam</span>
                        <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full gradient-accent text-white"
                    size="lg"
                    onClick={handleReservation}
                    disabled={vehicle.status !== "available"}
                    data-testid="book-now-btn"
                  >
                    {vehicle.status === "available" ? "Rezervasyon Yap" : "Araç Müsait Değil"}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Rezervasyon sonrası 24 saat içinde ücretsiz iptal
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© 2025 FleetEase. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
