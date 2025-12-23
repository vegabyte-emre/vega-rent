import getApiUrl from '../../config/api';
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
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
  ChevronRight,
  ChevronLeft,
  Users,
  Fuel,
  Settings2,
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Star,
  Award,
  Headphones,
  CheckCircle,
  ArrowRight,
  Play,
  Quote,
} from "lucide-react";


export function Home() {
  const [vehicles, setVehicles] = useState([]);
  const [themeData, setThemeData] = useState(null);
  const [pickupDate, setPickupDate] = useState(null);
  const [returnDate, setReturnDate] = useState(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, themeRes, locationsRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/public/vehicles?limit=8`).catch(() => ({ data: [] })),
        axios.get(`${getApiUrl()}/api/public/theme-settings`).catch(() => ({ data: {} })),
        axios.get(`${getApiUrl()}/api/locations`).catch(() => ({ data: [] })),
      ]);
      setVehicles(vehiclesRes.data || []);
      setThemeData(themeRes.data || {});
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Theme & Settings with fallbacks
  const theme = themeData?.theme || {
    colors: {
      primary: "#3B82F6",
      secondary: "#1E40AF",
      accent: "#60A5FA",
      background: "#FFFFFF",
      text: "#1F2937",
      hero_overlay: "rgba(0, 0, 0, 0.5)"
    }
  };

  const settings = themeData?.settings || {};

  // Slider images - from settings or defaults
  const sliderImages = settings.slider_images?.length > 0 
    ? settings.slider_images 
    : [
        {
          url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1920",
          title: "Premium Araç Kiralama",
          subtitle: "Lüks ve konforlu araçlarla seyahat edin"
        },
        {
          url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920",
          title: "Geniş Araç Filosu",
          subtitle: "Her bütçeye uygun seçenekler"
        },
        {
          url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1920",
          title: "Güvenli Sürüş",
          subtitle: "Tam sigorta ve 7/24 yol yardımı"
        }
      ];

  // Auto-slide
  useEffect(() => {
    if (sliderImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [sliderImages.length]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
  }, [sliderImages.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);
  }, [sliderImages.length]);

  const features = [
    { icon: Shield, title: "Tam Kasko", description: "Tüm araçlar tam kasko sigortalı" },
    { icon: Clock, title: "7/24 Destek", description: "Kesintisiz müşteri hizmetleri" },
    { icon: CreditCard, title: "Esnek Ödeme", description: "Kredi kartı ve havale seçenekleri" },
    { icon: MapPin, title: "Ücretsiz Teslimat", description: "Şehir içi ücretsiz teslim" },
    { icon: Award, title: "Kalite Garantisi", description: "Bakımlı ve temiz araçlar" },
    { icon: Headphones, title: "Yol Yardımı", description: "7/24 acil yol yardımı" },
  ];

  const stats = [
    { value: settings.stat_vehicles || "500+", label: "Araç Filosu", icon: Car },
    { value: settings.stat_customers || "10.000+", label: "Mutlu Müşteri", icon: Users },
    { value: settings.stat_cities || "81", label: "İl", icon: MapPin },
    { value: settings.stat_rating || "4.9", label: "Müşteri Puanı", icon: Star },
  ];

  const testimonials = settings.testimonials?.length > 0 
    ? settings.testimonials 
    : [
        { name: "Ahmet Yılmaz", role: "İş İnsanı", text: "Harika bir deneyimdi, araç tertemizdi ve personel çok ilgiliydi.", rating: 5 },
        { name: "Ayşe Kaya", role: "Öğretmen", text: "Fiyatlar çok uygun, kesinlikle tekrar tercih edeceğim.", rating: 5 },
        { name: "Mehmet Demir", role: "Mühendis", text: "Profesyonel hizmet, sorunsuz bir kiralama süreci.", rating: 5 },
      ];

  // Dynamic styles
  const dynamicStyles = {
    primaryButton: { backgroundColor: theme.colors.primary, color: "#fff" },
    primaryText: { color: theme.colors.primary },
    primaryBg: { backgroundColor: theme.colors.primary },
    secondaryBg: { backgroundColor: theme.colors.secondary },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/" className="flex items-center gap-3">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-10 md:h-12 object-contain" />
              ) : (
                <>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={dynamicStyles.primaryBg}>
                    <Car className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <span className="font-bold text-xl md:text-2xl text-gray-900">
                    {settings.company_name || "RentaCar"}
                  </span>
                </>
              )}
            </Link>
            
            <nav className="hidden lg:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Ana Sayfa
              </Link>
              <Link to="/araclar" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Araçlar
              </Link>
              <a href="#hizmetler" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Hizmetler
              </a>
              <a href="#hakkimizda" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Hakkımızda
              </a>
              <a href="#iletisim" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                İletişim
              </a>
            </nav>

            <div className="flex items-center gap-3">
              {settings.contact_phone && (
                <a href={`tel:${settings.contact_phone}`} className="hidden md:flex items-center gap-2 text-sm font-medium" style={dynamicStyles.primaryText}>
                  <Phone className="h-4 w-4" />
                  {settings.contact_phone}
                </a>
              )}
              <Link to="/musteri/giris">
                <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                  Giriş Yap
                </Button>
              </Link>
              <Link to="/araclar">
                <Button size="sm" style={dynamicStyles.primaryButton}>
                  Araç Kirala
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Slider */}
      <section className="relative h-[600px] md:h-[700px] lg:h-[800px] pt-16 md:pt-20 overflow-hidden">
        {/* Slider Images */}
        {sliderImages.map((slide, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              index === currentSlide ? "opacity-100" : "opacity-0"
            )}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${slide.url}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
          </div>
        ))}

        {/* Slider Content */}
        <div className="relative h-full container mx-auto px-4 flex items-center">
          <div className="max-w-2xl text-white">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">
              {settings.badge_text || "En İyi Fiyat Garantisi"}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {sliderImages[currentSlide]?.title || settings.hero_title || "Hayalinizdeki Aracı Kiralayın"}
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed">
              {sliderImages[currentSlide]?.subtitle || settings.hero_subtitle || "Geniş araç filomuz ve uygun fiyatlarımızla seyahatlerinizi konforlu hale getiriyoruz."}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/araclar">
                <Button size="lg" className="gap-2" style={dynamicStyles.primaryButton}>
                  Araçları İncele
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="gap-2 text-white border-white hover:bg-white/10">
                <Phone className="h-5 w-5" />
                {settings.contact_phone || "0850 123 4567"}
              </Button>
            </div>
          </div>
        </div>

        {/* Slider Controls */}
        {sliderImages.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {sliderImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all",
                    index === currentSlide ? "bg-white w-8" : "bg-white/50 hover:bg-white/70"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Search Box - Ayrı Section */}
      <section className="relative z-10 -mt-16 pb-8">
        <div className="container mx-auto px-4">
          <Card className="shadow-2xl border-0">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Alış Tarihi</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {pickupDate ? format(pickupDate, "dd MMM yyyy", { locale: tr }) : "Tarih seçin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} locale={tr} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">İade Tarihi</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate ? format(returnDate, "dd MMM yyyy", { locale: tr }) : "Tarih seçin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} locale={tr} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Alış Lokasyonu</label>
                  <select
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Lokasyon seçin</option>
                    {locations.filter(l => l.is_pickup).map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name} - {loc.city}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Teslim Lokasyonu</label>
                  <select
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Lokasyon seçin</option>
                    {locations.filter(l => l.is_dropoff).map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name} - {loc.city}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 hidden lg:block">&nbsp;</label>
                  <Link to="/araclar" className="block">
                    <Button className="w-full h-11" style={dynamicStyles.primaryButton}>
                      Araç Ara
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                  <stat.icon className="h-7 w-7" style={dynamicStyles.primaryText} />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="hizmetler" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4" style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
              Neden Biz?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {settings.features_title || "Hizmetlerimiz"}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {settings.features_subtitle || "Müşteri memnuniyetini ön planda tutarak, sizlere en iyi hizmeti sunmak için çalışıyoruz."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-gray-100">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                    <feature.icon className="h-7 w-7" style={dynamicStyles.primaryText} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Vehicles Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <Badge className="mb-4" style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                Araç Filomuz
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {settings.vehicles_title || "Popüler Araçlar"}
              </h2>
              <p className="text-gray-600">
                {settings.vehicles_subtitle || "En çok tercih edilen araçlarımızı inceleyin"}
              </p>
            </div>
            <Link to="/araclar">
              <Button variant="outline" className="mt-4 md:mt-0 gap-2">
                Tüm Araçlar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {vehicles.slice(0, 8).map((vehicle) => (
              <Link to={`/arac/${vehicle.id}`} key={vehicle.id}>
                <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    <img
                      src={vehicle.image_url || `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400`}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <Badge className="absolute top-3 right-3 bg-white/90 text-gray-900">
                      {vehicle.segment}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">{vehicle.year}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Settings2 className="h-3 w-3" />
                        {vehicle.transmission === 'otomatik' ? 'Otomatik' : 'Manuel'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3 w-3" />
                        {vehicle.fuel_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {vehicle.seat_count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold" style={dynamicStyles.primaryText}>
                          {formatCurrency(vehicle.daily_rate)}
                        </span>
                        <span className="text-sm text-gray-500">/gün</span>
                      </div>
                      <Button size="sm" style={dynamicStyles.primaryButton}>
                        Kirala
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {vehicles.length === 0 && !loading && (
            <div className="text-center py-12">
              <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz araç eklenmemiş</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4" style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
              Müşteri Yorumları
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {settings.testimonials_title || "Müşterilerimiz Ne Diyor?"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-gray-100">
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 mb-4" style={dynamicStyles.primaryText} />
                  <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={dynamicStyles.primaryBg}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {settings.cta_title || "Hemen Rezervasyon Yapın"}
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            {settings.cta_subtitle || "En uygun fiyatlarla araç kiralama fırsatını kaçırmayın. Hemen rezervasyon yapın!"}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/araclar">
              <Button size="lg" variant="secondary" className="gap-2">
                Araçları İncele
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href={`tel:${settings.contact_phone || '08501234567'}`}>
              <Button size="lg" variant="outline" className="gap-2 text-white border-white hover:bg-white/10">
                <Phone className="h-5 w-5" />
                Bizi Arayın
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="iletisim" className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div>
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-10 mb-4 brightness-0 invert" />
              ) : (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={dynamicStyles.primaryBg}>
                    <Car className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold text-xl">{settings.company_name || "RentaCar"}</span>
                </div>
              )}
              <p className="text-gray-400 text-sm mb-4">
                {settings.footer_description || "Türkiye'nin güvenilir araç kiralama platformu. Her bütçeye uygun araçlar ve profesyonel hizmet."}
              </p>
              <div className="flex gap-3">
                {settings.social_facebook && (
                  <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {settings.social_instagram && (
                  <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {settings.social_twitter && (
                  <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-lg mb-4">Hızlı Linkler</h4>
              <ul className="space-y-2">
                <li><Link to="/araclar" className="text-gray-400 hover:text-white transition-colors text-sm">Araçlar</Link></li>
                <li><a href="#hizmetler" className="text-gray-400 hover:text-white transition-colors text-sm">Hizmetler</a></li>
                <li><a href="#hakkimizda" className="text-gray-400 hover:text-white transition-colors text-sm">Hakkımızda</a></li>
                <li><Link to="/musteri/giris" className="text-gray-400 hover:text-white transition-colors text-sm">Müşteri Girişi</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-lg mb-4">İletişim</h4>
              <ul className="space-y-3">
                {settings.contact_phone && (
                  <li className="flex items-center gap-3 text-gray-400 text-sm">
                    <Phone className="h-4 w-4" style={dynamicStyles.primaryText} />
                    {settings.contact_phone}
                  </li>
                )}
                {settings.contact_email && (
                  <li className="flex items-center gap-3 text-gray-400 text-sm">
                    <Mail className="h-4 w-4" style={dynamicStyles.primaryText} />
                    {settings.contact_email}
                  </li>
                )}
                {settings.contact_address && (
                  <li className="flex items-start gap-3 text-gray-400 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5" style={dynamicStyles.primaryText} />
                    {settings.contact_address}
                  </li>
                )}
              </ul>
            </div>

            {/* Working Hours */}
            <div>
              <h4 className="font-semibold text-lg mb-4">Çalışma Saatleri</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex justify-between">
                  <span>Pazartesi - Cuma</span>
                  <span>{settings.hours_weekday || "08:00 - 20:00"}</span>
                </li>
                <li className="flex justify-between">
                  <span>Cumartesi</span>
                  <span>{settings.hours_saturday || "09:00 - 18:00"}</span>
                </li>
                <li className="flex justify-between">
                  <span>Pazar</span>
                  <span>{settings.hours_sunday || "10:00 - 16:00"}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {settings.company_name || "RentaCar"}. Tüm hakları saklıdır.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Gizlilik Politikası</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Kullanım Şartları</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
