import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { formatCurrency, formatDate, cn } from "../lib/utils";
import { CalendarIcon, Car, Users, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";


export function NewReservation() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    customer_id: "",
    start_date: null,
    end_date: null,
    pickup_location: "",
    return_location: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, customersRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/vehicles`, { params: { status: "available" } }),
        axios.get(`${getApiUrl()}/api/customers`),
      ]);
      setVehicles(vehiclesRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    if (!formData.vehicle_id || !formData.start_date || !formData.end_date) return 0;
    const vehicle = vehicles.find((v) => v.id === formData.vehicle_id);
    if (!vehicle) return 0;
    const days = Math.max(1, Math.ceil((formData.end_date - formData.start_date) / (1000 * 60 * 60 * 24)));
    return days * vehicle.daily_rate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_id || !formData.customer_id || !formData.start_date || !formData.end_date) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${getApiUrl()}/api/reservations`, {
        ...formData,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
      });
      toast.success("Rezervasyon başarıyla oluşturuldu");
      navigate("/reservations");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Rezervasyon oluşturulurken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicle_id);
  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl" data-testid="new-reservation-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/reservations")} data-testid="back-btn">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yeni Rezervasyon</h1>
          <p className="text-muted-foreground mt-1">Araç kiralama rezervasyonu oluşturun</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Araç Seçimi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={formData.vehicle_id} onValueChange={(v) => handleChange("vehicle_id", v)}>
                  <SelectTrigger data-testid="select-vehicle">
                    <SelectValue placeholder="Araç seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">Müsait araç yok</div>
                    ) : (
                      vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.brand} {vehicle.model} - {vehicle.plate} ({formatCurrency(vehicle.daily_rate)}/gün)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Müşteri Seçimi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={formData.customer_id} onValueChange={(v) => handleChange("customer_id", v)}>
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">Müşteri bulunamadı</div>
                    ) : (
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.full_name} - {customer.phone}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Tarih Aralığı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Başlangıç Tarihi</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.start_date && "text-muted-foreground"
                          )}
                          data-testid="start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? format(formData.start_date, "PPP", { locale: tr }) : "Tarih seçin"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => handleChange("start_date", date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Bitiş Tarihi</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.end_date && "text-muted-foreground"
                          )}
                          data-testid="end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_date ? format(formData.end_date, "PPP", { locale: tr }) : "Tarih seçin"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => handleChange("end_date", date)}
                          disabled={(date) => date < (formData.start_date || new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lokasyonlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Teslim Alma Yeri</Label>
                  <Input
                    value={formData.pickup_location}
                    onChange={(e) => handleChange("pickup_location", e.target.value)}
                    placeholder="Ör: İstanbul Havalimanı"
                    data-testid="pickup-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teslim Etme Yeri</Label>
                  <Input
                    value={formData.return_location}
                    onChange={(e) => handleChange("return_location", e.target.value)}
                    placeholder="Ör: Sabiha Gökçen Havalimanı"
                    data-testid="return-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notlar</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Ek notlar..."
                    data-testid="notes"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Rezervasyon Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedVehicle && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="font-medium">{selectedVehicle.brand} {selectedVehicle.model}</p>
                    <p className="text-sm text-muted-foreground">{selectedVehicle.plate}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(selectedVehicle.daily_rate)} / gün
                    </p>
                  </div>
                )}

                {selectedCustomer && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="font-medium">{selectedCustomer.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                  </div>
                )}

                {formData.start_date && formData.end_date && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(formData.start_date)} - {formatDate(formData.end_date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.max(1, Math.ceil((formData.end_date - formData.start_date) / (1000 * 60 * 60 * 24)))} gün
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Toplam Tutar</span>
                    <span className="text-2xl font-bold">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-accent text-white"
                  disabled={saving || !formData.vehicle_id || !formData.customer_id || !formData.start_date || !formData.end_date}
                  data-testid="create-reservation-btn"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Rezervasyon Oluştur
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
