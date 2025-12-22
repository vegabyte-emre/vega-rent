import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { formatCurrency, getStatusColor, getStatusLabel } from "../lib/utils";
import {
  Car,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Fuel,
  Settings2,
  Users as UsersIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";


export function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    plate: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    segment: "Sedan",
    transmission: "otomatik",
    fuel_type: "benzin",
    seat_count: 5,
    door_count: 4,
    daily_rate: 0,
    color: "",
    mileage: 0,
  });

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const response = await axios.get(`${getApiUrl()}/api/vehicles`, { params });
      setVehicles(response.data);
    } catch (error) {
      toast.error("Araçlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${getApiUrl()}/api/vehicles`, formData);
      toast.success("Araç başarıyla eklendi");
      setIsAddOpen(false);
      setFormData({
        plate: "",
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        segment: "Sedan",
        transmission: "otomatik",
        fuel_type: "benzin",
        seat_count: 5,
        door_count: 4,
        daily_rate: 0,
        color: "",
        mileage: 0,
      });
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Araç eklenirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFuelIcon = (fuel) => {
    const icons = {
      benzin: "⛽",
      dizel: "🛢️",
      elektrik: "⚡",
      hibrit: "🔋",
      lpg: "🔵",
    };
    return icons[fuel] || "⛽";
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="vehicles-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Araçlar</h1>
          <p className="text-muted-foreground mt-1">Filo araçlarınızı yönetin</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-accent text-white" data-testid="add-vehicle-btn">
              <Plus className="h-4 w-4 mr-2" />
              Araç Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Araç Ekle</DialogTitle>
              <DialogDescription>Filonuza yeni bir araç ekleyin</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plaka</Label>
                  <Input
                    value={formData.plate}
                    onChange={(e) => handleChange("plate", e.target.value.toUpperCase())}
                    placeholder="34 ABC 123"
                    required
                    data-testid="vehicle-plate"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marka</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    placeholder="Toyota"
                    required
                    data-testid="vehicle-brand"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => handleChange("model", e.target.value)}
                    placeholder="Corolla"
                    required
                    data-testid="vehicle-model"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yıl</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleChange("year", parseInt(e.target.value))}
                    min="2000"
                    max="2030"
                    required
                    data-testid="vehicle-year"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Segment</Label>
                  <Select value={formData.segment} onValueChange={(v) => handleChange("segment", v)}>
                    <SelectTrigger data-testid="vehicle-segment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ekonomi">Ekonomi</SelectItem>
                      <SelectItem value="Sedan">Sedan</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="Hatchback">Hatchback</SelectItem>
                      <SelectItem value="Lüks">Lüks</SelectItem>
                      <SelectItem value="Ticari">Ticari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vites</Label>
                  <Select value={formData.transmission} onValueChange={(v) => handleChange("transmission", v)}>
                    <SelectTrigger data-testid="vehicle-transmission">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manuel">Manuel</SelectItem>
                      <SelectItem value="otomatik">Otomatik</SelectItem>
                      <SelectItem value="yari_otomatik">Yarı Otomatik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Yakıt</Label>
                  <Select value={formData.fuel_type} onValueChange={(v) => handleChange("fuel_type", v)}>
                    <SelectTrigger data-testid="vehicle-fuel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="benzin">Benzin</SelectItem>
                      <SelectItem value="dizel">Dizel</SelectItem>
                      <SelectItem value="elektrik">Elektrik</SelectItem>
                      <SelectItem value="hibrit">Hibrit</SelectItem>
                      <SelectItem value="lpg">LPG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Renk</Label>
                  <Input
                    value={formData.color}
                    onChange={(e) => handleChange("color", e.target.value)}
                    placeholder="Beyaz"
                    data-testid="vehicle-color"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Koltuk Sayısı</Label>
                  <Input
                    type="number"
                    value={formData.seat_count}
                    onChange={(e) => handleChange("seat_count", parseInt(e.target.value))}
                    min="2"
                    max="9"
                    data-testid="vehicle-seats"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kapı Sayısı</Label>
                  <Input
                    type="number"
                    value={formData.door_count}
                    onChange={(e) => handleChange("door_count", parseInt(e.target.value))}
                    min="2"
                    max="5"
                    data-testid="vehicle-doors"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Günlük Ücret (₺)</Label>
                  <Input
                    type="number"
                    value={formData.daily_rate}
                    onChange={(e) => handleChange("daily_rate", parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                    required
                    data-testid="vehicle-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kilometre</Label>
                  <Input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => handleChange("mileage", parseInt(e.target.value))}
                    min="0"
                    data-testid="vehicle-mileage"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-vehicle-btn">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Kaydet
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Plaka, marka veya model ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="vehicle-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="available">Müsait</SelectItem>
                <SelectItem value="rented">Kirada</SelectItem>
                <SelectItem value="service">Serviste</SelectItem>
                <SelectItem value="reserved">Rezerve</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchVehicles} data-testid="refresh-vehicles">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardContent className="p-0">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Araç</TableHead>
                    <TableHead>Plaka</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Özellikler</TableHead>
                    <TableHead>Günlük Ücret</TableHead>
                    <TableHead>Kilometre</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Car className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.year} • {vehicle.color}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{vehicle.plate}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{vehicle.segment}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{getFuelIcon(vehicle.fuel_type)}</span>
                          <span className="capitalize">{vehicle.transmission}</span>
                          <span>• {vehicle.seat_count} kişi</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(vehicle.daily_rate)}</TableCell>
                      <TableCell>{vehicle.mileage.toLocaleString()} km</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(vehicle.status)}>
                          {getStatusLabel(vehicle.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
