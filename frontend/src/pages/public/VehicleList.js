import getApiUrl from '../../config/api';
import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Slider } from "../../components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { formatCurrency } from "../../lib/utils";
import {
  Car,
  Search,
  Filter,
  Settings2,
  Fuel,
  Users,
  RefreshCw,
  X,
  SlidersHorizontal,
} from "lucide-react";


export function VehicleList() {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    segment: "all",
    transmission: "all",
    fuel_type: "all",
    priceRange: [0, 5000],
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/public/vehicles`);
      setVehicles(response.data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSegment = filters.segment === "all" || vehicle.segment === filters.segment;
    const matchesTransmission = filters.transmission === "all" || vehicle.transmission === filters.transmission;
    const matchesFuel = filters.fuel_type === "all" || vehicle.fuel_type === filters.fuel_type;
    const matchesPrice =
      vehicle.daily_rate >= filters.priceRange[0] && vehicle.daily_rate <= filters.priceRange[1];

    return matchesSearch && matchesSegment && matchesTransmission && matchesFuel && matchesPrice;
  });

  const segments = [...new Set(vehicles.map((v) => v.segment))];

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
              <Link to="/araclar" className="text-sm font-medium text-foreground">
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
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Araçlarımız</h1>
            <p className="text-muted-foreground mt-2">
              {filteredVehicles.length} araç bulundu
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className={`lg:w-72 shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}>
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtreler
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({
                        segment: "all",
                        transmission: "all",
                        fuel_type: "all",
                        priceRange: [0, 5000],
                      })}
                      data-testid="clear-filters-btn"
                    >
                      Temizle
                    </Button>
                  </div>

                  {/* Segment Filter */}
                  <div className="space-y-3 mb-6">
                    <label className="text-sm font-medium">Segment</label>
                    <Select
                      value={filters.segment}
                      onValueChange={(v) => setFilters({ ...filters, segment: v })}
                    >
                      <SelectTrigger data-testid="segment-filter">
                        <SelectValue placeholder="Tümü" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        {segments.map((segment) => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Transmission Filter */}
                  <div className="space-y-3 mb-6">
                    <label className="text-sm font-medium">Vites</label>
                    <Select
                      value={filters.transmission}
                      onValueChange={(v) => setFilters({ ...filters, transmission: v })}
                    >
                      <SelectTrigger data-testid="transmission-filter">
                        <SelectValue placeholder="Tümü" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="otomatik">Otomatik</SelectItem>
                        <SelectItem value="manuel">Manuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fuel Type Filter */}
                  <div className="space-y-3 mb-6">
                    <label className="text-sm font-medium">Yakıt Tipi</label>
                    <Select
                      value={filters.fuel_type}
                      onValueChange={(v) => setFilters({ ...filters, fuel_type: v })}
                    >
                      <SelectTrigger data-testid="fuel-filter">
                        <SelectValue placeholder="Tümü" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="benzin">Benzin</SelectItem>
                        <SelectItem value="dizel">Dizel</SelectItem>
                        <SelectItem value="elektrik">Elektrik</SelectItem>
                        <SelectItem value="hibrit">Hibrit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Günlük Fiyat: {formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])}
                    </label>
                    <Slider
                      value={filters.priceRange}
                      onValueChange={(v) => setFilters({ ...filters, priceRange: v })}
                      min={0}
                      max={5000}
                      step={100}
                      className="mt-2"
                      data-testid="price-slider"
                    />
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Vehicle Grid */}
            <div className="flex-1">
              {/* Search & Mobile Filter Toggle */}
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Marka veya model ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="vehicle-search-input"
                  />
                </div>
                <Button
                  variant="outline"
                  className="lg:hidden"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="toggle-filters-btn"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Car className="h-12 w-12 mb-4 opacity-50" />
                  <p>Araç bulunamadı</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredVehicles.map((vehicle) => (
                    <Link to={`/arac/${vehicle.id}`} key={vehicle.id}>
                      <Card className="overflow-hidden card-interactive group h-full" data-testid={`vehicle-card-${vehicle.id}`}>
                        <div className="aspect-video bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                          <img
                            src={vehicle.image_url || `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600`}
                            alt={`${vehicle.brand} ${vehicle.model}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <Badge className="absolute top-3 left-3 bg-white/90 text-slate-900">
                            {vehicle.segment}
                          </Badge>
                          {vehicle.status === "available" && (
                            <Badge className="absolute top-3 right-3 bg-emerald-500 text-white">
                              Müsait
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{vehicle.brand} {vehicle.model}</h3>
                              <p className="text-sm text-muted-foreground">{vehicle.year} • {vehicle.color}</p>
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
                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div>
                              <p className="text-2xl font-bold text-primary">{formatCurrency(vehicle.daily_rate)}</p>
                              <p className="text-xs text-muted-foreground">/ gün</p>
                            </div>
                            <Button className="gradient-accent text-white" data-testid={`rent-btn-${vehicle.id}`}>
                              Kirala
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
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
