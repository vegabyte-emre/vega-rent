import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn, formatCurrency } from "../../lib/utils";
import {
  Car,
  CalendarIcon,
  MapPin,
  Shield,
  Clock,
  CreditCard,
  Phone,
  Star,
  ChevronRight,
  CheckCircle,
  Users,
  Fuel,
  Settings2,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function Home() {
  const [vehicles, setVehicles] = useState([]);
  const [pickupDate, setPickupDate] = useState(null);
  const [returnDate, setReturnDate] = useState(null);
  const [location, setLocation] = useState("");

  useEffect(() => {
    fetchFeaturedVehicles();
  }, []);

  const fetchFeaturedVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/public/vehicles?limit=6`);
      setVehicles(response.data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Güvenli Kiralama",
      description: "Tüm araçlarımız sigortalı ve bakımlıdır",
    },
    {
      icon: Clock,
      title: "7/24 Destek",
      description: "Her an yanınızdayız, gece gündüz",
    },
    {
      icon: CreditCard,
      title: "Kolay Ödeme",
      description: "Kredi kartı ile güvenli ödeme",
    },
    {
      icon: MapPin,
      title: "Geniş Ağ",
      description: "Türkiye genelinde teslim noktaları",
    },
  ];

  const stats = [
    { value: "500+", label: "Araç Filosu" },
    { value: "50K+", label: "Mutlu Müşteri" },
    { value: "20+", label: "Şehir" },
    { value: "4.8", label: "Müşteri Puanı" },
  ];

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
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/araclar" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Araçlar
              </Link>
              <Link to="/hakkimizda" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Hakkımızda
              </Link>
              <Link to="/iletisim" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                İletişim
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link to="/musteri/giris">
                <Button variant="ghost" size="sm" data-testid="customer-login-btn">
                  Giriş Yap
                </Button>
              </Link>
              <Link to="/araclar">
                <Button size="sm" className="gradient-accent text-white" data-testid="rent-now-btn">
                  Hemen Kirala
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.9)), url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Hayalinizdeki Aracı
              <span className="text-blue-400"> Kiralayın</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-xl">
              Geniş araç filomuz ve uygun fiyatlarımızla seyahatlerinizi konforlu hale getiriyoruz. 
              Hemen rezervasyon yapın, yola çıkın.
            </p>
          </div>

          {/* Search Box */}
          <Card className="mt-10 max-w-4xl" data-testid="search-box">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Teslim Yeri</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Şehir veya havalimanı"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10"
                      data-testid="location-input"
                    />
                  </div>
                </div>
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
                        data-testid="pickup-date-btn"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {pickupDate ? format(pickupDate, "d MMM", { locale: tr }) : "Tarih seçin"}
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
                        data-testid="return-date-btn"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate ? format(returnDate, "d MMM", { locale: tr }) : "Tarih seçin"}
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
                <div className="space-y-2">
                  <label className="text-sm font-medium invisible">Ara</label>
                  <Link to={`/araclar?location=${location}&pickup=${pickupDate?.toISOString()}&return=${returnDate?.toISOString()}`}>
                    <Button className="w-full gradient-accent text-white h-10" data-testid="search-vehicles-btn">
                      Araç Ara
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold">Neden FleetEase?</h2>
            <p className="text-muted-foreground mt-3">
              Müşteri memnuniyetini ön planda tutarak, kaliteli hizmet sunuyoruz
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center card-interactive">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mx-auto">
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold mt-4">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vehicles */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Popüler Araçlar</h2>
              <p className="text-muted-foreground mt-2">En çok tercih edilen araçlarımız</p>
            </div>
            <Link to="/araclar">
              <Button variant="outline" data-testid="view-all-vehicles-btn">
                Tümünü Gör
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.slice(0, 6).map((vehicle) => (
              <Link to={`/arac/${vehicle.id}`} key={vehicle.id}>
                <Card className="overflow-hidden card-interactive group" data-testid={`vehicle-card-${vehicle.id}`}>
                  <div className="aspect-video bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                    <img
                      src={vehicle.image_url || `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600`}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-3 left-3 bg-white/90 text-slate-900">
                      {vehicle.segment}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{vehicle.brand} {vehicle.model}</h3>
                        <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{formatCurrency(vehicle.daily_rate)}</p>
                        <p className="text-xs text-muted-foreground">/ gün</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Settings2 className="h-4 w-4" />
                        {vehicle.transmission === "otomatik" ? "Otomatik" : "Manuel"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="h-4 w-4" />
                        {vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {vehicle.seat_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 border-0">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-white">
                  <h2 className="text-2xl md:text-3xl font-bold">Kurumsal Müşteri misiniz?</h2>
                  <p className="mt-2 text-blue-100">
                    Filo kiralama ve özel kurumsal çözümler için bizimle iletişime geçin
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Button size="lg" variant="secondary" className="gap-2" data-testid="contact-btn">
                    <Phone className="h-4 w-4" />
                    0850 123 4567
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl text-white">FleetEase</span>
              </div>
              <p className="text-sm">
                Kurumsal araç kiralama çözümleri ile seyahatlerinizi kolaylaştırıyoruz.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Hızlı Linkler</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/araclar" className="hover:text-white transition-colors">Araçlar</Link></li>
                <li><Link to="/hakkimizda" className="hover:text-white transition-colors">Hakkımızda</Link></li>
                <li><Link to="/iletisim" className="hover:text-white transition-colors">İletişim</Link></li>
                <li><Link to="/sss" className="hover:text-white transition-colors">SSS</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">İletişim</h4>
              <ul className="space-y-2 text-sm">
                <li>0850 123 4567</li>
                <li>info@fleetease.com</li>
                <li>İstanbul, Türkiye</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Çalışma Saatleri</h4>
              <ul className="space-y-2 text-sm">
                <li>Pazartesi - Cuma: 09:00 - 18:00</li>
                <li>Cumartesi: 09:00 - 14:00</li>
                <li>Pazar: Kapalı</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm">
            <p>© 2025 FleetEase. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
