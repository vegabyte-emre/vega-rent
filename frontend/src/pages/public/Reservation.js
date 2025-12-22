import getApiUrl from '../../config/api';
import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Separator } from "../../components/ui/separator";
import { formatCurrency, formatDate, cn } from "../../lib/utils";
import { differenceInDays } from "date-fns";
import {
  Car,
  Calendar,
  MapPin,
  User,
  CreditCard,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";


export function Reservation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    tc_no: "",
    pickup_location: "",
    return_location: "",
    notes: "",
    terms_accepted: false,
    kvkk_accepted: false,
  });

  const vehicleId = searchParams.get("vehicle");
  const pickupDate = searchParams.get("pickup") ? new Date(searchParams.get("pickup")) : null;
  const returnDate = searchParams.get("return") ? new Date(searchParams.get("return")) : null;

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle();
    }
    
    // Check if user is logged in
    const storedUser = localStorage.getItem("customer_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setFormData((prev) => ({
        ...prev,
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
      }));
    }
  }, [vehicleId]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/public/vehicles/${vehicleId}`);
      setVehicle(response.data);
    } catch (error) {
      toast.error("Araç bilgileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateDays = () => {
    if (!pickupDate || !returnDate) return 0;
    return Math.max(1, differenceInDays(returnDate, pickupDate));
  };

  const calculateTotal = () => {
    if (!vehicle) return 0;
    return calculateDays() * vehicle.daily_rate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.terms_accepted || !formData.kvkk_accepted) {
      toast.error("Lütfen koşulları kabul edin");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("customer_token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      // Create customer if not exists
      let customerId;
      try {
        const customerResponse = await axios.post(`${getApiUrl()}/api/customers`, {
          tc_no: formData.tc_no,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
        });
        customerId = customerResponse.data.id;
      } catch (err) {
        // Customer might already exist, try to find them
        const customersResponse = await axios.get(`${getApiUrl()}/api/customers`);
        const existingCustomer = customersResponse.data.find((c) => c.email === formData.email);
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          throw err;
        }
      }

      // Create reservation
      await axios.post(`${getApiUrl()}/api/reservations`, {
        vehicle_id: vehicleId,
        customer_id: customerId,
        start_date: pickupDate.toISOString(),
        end_date: returnDate.toISOString(),
        pickup_location: formData.pickup_location,
        return_location: formData.return_location,
        notes: formData.notes,
      });

      setStep(3); // Success step
      toast.success("Rezervasyon başarıyla oluşturuldu!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Rezervasyon oluşturulurken hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!vehicle || !pickupDate || !returnDate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Geçersiz rezervasyon bilgileri</p>
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
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Button */}
          <Link to={`/arac/${vehicleId}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Geri Dön
          </Link>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                  step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {step > s ? <CheckCircle className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={cn(
                    "w-24 h-1 mx-2",
                    step > s ? "bg-primary" : "bg-secondary"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>

          {step === 3 ? (
            /* Success State */
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Rezervasyonunuz Alındı!</h2>
                <p className="text-muted-foreground mb-6">
                  Rezervasyon onayı e-posta adresinize gönderildi.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link to="/hesabim">
                    <Button data-testid="view-reservations-btn">
                      Rezervasyonlarım
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button variant="outline">Ana Sayfa</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit}>
                  {step === 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Kişisel Bilgiler
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Ad Soyad *</Label>
                            <Input
                              value={formData.full_name}
                              onChange={(e) => handleChange("full_name", e.target.value)}
                              required
                              data-testid="res-fullname"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>TC Kimlik No *</Label>
                            <Input
                              value={formData.tc_no}
                              onChange={(e) => handleChange("tc_no", e.target.value)}
                              maxLength={11}
                              required
                              data-testid="res-tc"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>E-posta *</Label>
                            <Input
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleChange("email", e.target.value)}
                              required
                              data-testid="res-email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Telefon *</Label>
                            <Input
                              value={formData.phone}
                              onChange={(e) => handleChange("phone", e.target.value)}
                              required
                              data-testid="res-phone"
                            />
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Teslim Alma Yeri</Label>
                            <Input
                              value={formData.pickup_location}
                              onChange={(e) => handleChange("pickup_location", e.target.value)}
                              placeholder="Ör: İstanbul Havalimanı"
                              data-testid="res-pickup"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Teslim Etme Yeri</Label>
                            <Input
                              value={formData.return_location}
                              onChange={(e) => handleChange("return_location", e.target.value)}
                              placeholder="Ör: Sabiha Gökçen"
                              data-testid="res-return"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notlar</Label>
                          <Input
                            value={formData.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            placeholder="Varsa ek notlarınız"
                            data-testid="res-notes"
                          />
                        </div>
                        <Button
                          type="button"
                          className="w-full gradient-accent text-white"
                          onClick={() => setStep(2)}
                          data-testid="continue-btn"
                        >
                          Devam Et
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {step === 2 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          Onay ve Ödeme
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-800 dark:text-blue-200">
                                Güvenli Ödeme
                              </p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Ödeme işleminiz iyzico güvencesiyle gerçekleştirilecektir.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id="terms"
                              checked={formData.terms_accepted}
                              onCheckedChange={(checked) => handleChange("terms_accepted", checked)}
                              data-testid="terms-checkbox"
                            />
                            <label htmlFor="terms" className="text-sm cursor-pointer">
                              <Link to="/kullanim-kosullari" className="text-primary hover:underline">
                                Kullanım Koşulları
                              </Link>
                              'nı okudum ve kabul ediyorum. *
                            </label>
                          </div>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id="kvkk"
                              checked={formData.kvkk_accepted}
                              onCheckedChange={(checked) => handleChange("kvkk_accepted", checked)}
                              data-testid="kvkk-checkbox"
                            />
                            <label htmlFor="kvkk" className="text-sm cursor-pointer">
                              <Link to="/kvkk" className="text-primary hover:underline">
                                KVKK Aydınlatma Metni
                              </Link>
                              'ni okudum ve kabul ediyorum. *
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <Button type="button" variant="outline" onClick={() => setStep(1)}>
                            Geri
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 gradient-accent text-white"
                            disabled={submitting || !formData.terms_accepted || !formData.kvkk_accepted}
                            data-testid="complete-reservation-btn"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                İşleniyor...
                              </>
                            ) : (
                              `${formatCurrency(calculateTotal())} Öde ve Rezervasyonu Tamamla`
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </form>
              </div>

              {/* Summary Sidebar */}
              <div>
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Rezervasyon Özeti</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Vehicle Info */}
                    <div className="flex gap-4">
                      <div className="w-24 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                        <img
                          src={vehicle.image_url || `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200`}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold">{vehicle.brand} {vehicle.model}</h3>
                        <p className="text-sm text-muted-foreground">{vehicle.year} • {vehicle.segment}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Dates */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Alış: {formatDate(pickupDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>İade: {formatDate(returnDate)}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Price Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{formatCurrency(vehicle.daily_rate)} x {calculateDays()} gün</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold text-lg">
                      <span>Toplam</span>
                      <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
