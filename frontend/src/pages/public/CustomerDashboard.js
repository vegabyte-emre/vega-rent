import getApiUrl from '../../config/api';
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "../../lib/utils";
import {
  Car,
  Calendar,
  User,
  LogOut,
  RefreshCw,
  Clock,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";


export function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("customer_user");
    const token = localStorage.getItem("customer_token");

    if (!storedUser || !token) {
      navigate("/musteri/giris");
      return;
    }

    setUser(JSON.parse(storedUser));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    fetchReservations();
  }, [navigate]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/reservations`);
      setReservations(response.data);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_user");
    delete axios.defaults.headers.common["Authorization"];
    toast.success("Çıkış yapıldı");
    navigate("/");
  };

  const activeReservations = reservations.filter(
    (r) => ["created", "confirmed", "delivered"].includes(r.status)
  );
  const pastReservations = reservations.filter(
    (r) => ["returned", "closed", "cancelled"].includes(r.status)
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Merhaba, {user.full_name}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Hesabım</h1>
            <p className="text-muted-foreground mt-2">Rezervasyonlarınızı ve hesap bilgilerinizi yönetin</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="space-y-6">
              {/* User Info Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {user.phone}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Aktif Rezervasyon</span>
                      <span className="font-semibold">{activeReservations.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Toplam Kiralama</span>
                      <span className="font-semibold">{reservations.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <Link to="/araclar">
                <Button className="w-full gradient-accent text-white" data-testid="new-reservation-btn">
                  <Car className="h-4 w-4 mr-2" />
                  Yeni Rezervasyon
                </Button>
              </Link>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="active" data-testid="active-tab">
                    <Clock className="h-4 w-4 mr-2" />
                    Aktif ({activeReservations.length})
                  </TabsTrigger>
                  <TabsTrigger value="past" data-testid="past-tab">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Geçmiş ({pastReservations.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : activeReservations.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Calendar className="h-12 w-12 mb-4 opacity-50" />
                        <p>Aktif rezervasyonunuz bulunmuyor</p>
                        <Link to="/araclar">
                          <Button className="mt-4" variant="outline">
                            Araç Kirala
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {activeReservations.map((reservation) => (
                        <ReservationCard key={reservation.id} reservation={reservation} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="past">
                  {pastReservations.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mb-4 opacity-50" />
                        <p>Geçmiş rezervasyonunuz bulunmuyor</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {pastReservations.map((reservation) => (
                        <ReservationCard key={reservation.id} reservation={reservation} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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

function ReservationCard({ reservation }) {
  return (
    <Card className="overflow-hidden" data-testid={`reservation-card-${reservation.id}`}>
      <div className="flex flex-col md:flex-row">
        {/* Vehicle Image */}
        <div className="md:w-48 h-40 md:h-auto bg-slate-200 dark:bg-slate-800 shrink-0">
          <img
            src={reservation.vehicle?.image_url || `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400`}
            alt="Vehicle"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">
                  {reservation.vehicle?.brand} {reservation.vehicle?.model}
                </h3>
                <Badge className={getStatusColor(reservation.status)}>
                  {getStatusLabel(reservation.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {reservation.vehicle?.plate}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(reservation.start_date)} - {formatDate(reservation.end_date)}
                </span>
              </div>
              {reservation.pickup_location && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {reservation.pickup_location}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(reservation.total_amount)}
              </p>
              <p className="text-xs text-muted-foreground">Toplam Tutar</p>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
