import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { formatCurrency, getStatusColor, getStatusLabel } from "../lib/utils";
import {
  Car,
  Users,
  Calendar,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";


export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      const [statsRes, reservationsRes] = await Promise.all([
        axios.get(`${apiUrl}/api/dashboard/stats`),
        axios.get(`${apiUrl}/api/reservations`),
      ]);
      setStats(statsRes.data);
      setRecentReservations(reservationsRes.data.slice(0, 5));
    } catch (error) {
      toast.error("Veriler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Toplam Araç",
      value: stats?.total_vehicles || 0,
      icon: Car,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Müsait Araç",
      value: stats?.available_vehicles || 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Kirada",
      value: stats?.rented_vehicles || 0,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Aktif Rezervasyon",
      value: stats?.active_reservations || 0,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Toplam Müşteri",
      value: stats?.total_customers || 0,
      icon: Users,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      title: "Toplam Gelir",
      value: formatCurrency(stats?.total_revenue || 0),
      icon: CreditCard,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      isRevenue: true,
    },
  ];

  const pieData = [
    { name: "Müsait", value: stats?.available_vehicles || 0, color: "#10B981" },
    { name: "Kirada", value: stats?.rented_vehicles || 0, color: "#F59E0B" },
    { name: "Serviste", value: stats?.service_vehicles || 0, color: "#EF4444" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hoş Geldiniz, {user?.full_name}</h1>
          <p className="text-muted-foreground mt-1">İşte bugünün özeti</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" data-testid="refresh-dashboard">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="card-interactive" data-testid={`stat-card-${index}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                {stat.isRevenue && <TrendingUp className="h-4 w-4 text-green-500" />}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Araç Durumu Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reservations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Son Rezervasyonlar</CardTitle>
            <Link to="/reservations">
              <Button variant="ghost" size="sm" data-testid="view-all-reservations">
                Tümünü Gör <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Henüz rezervasyon yok</p>
                </div>
              ) : (
                recentReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {reservation.vehicle?.brand} {reservation.vehicle?.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reservation.customer?.full_name}
                        </p>
                      </div>
                    </div>
                    <span className={`status-badge ${getStatusColor(reservation.status)}`}>
                      {getStatusLabel(reservation.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hızlı İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/vehicles">
              <Button variant="outline" className="w-full h-20 flex-col gap-2" data-testid="quick-action-vehicles">
                <Car className="h-6 w-6" />
                <span>Araçlar</span>
              </Button>
            </Link>
            <Link to="/reservations/new">
              <Button variant="outline" className="w-full h-20 flex-col gap-2" data-testid="quick-action-new-reservation">
                <Calendar className="h-6 w-6" />
                <span>Yeni Rezervasyon</span>
              </Button>
            </Link>
            <Link to="/customers">
              <Button variant="outline" className="w-full h-20 flex-col gap-2" data-testid="quick-action-customers">
                <Users className="h-6 w-6" />
                <span>Müşteriler</span>
              </Button>
            </Link>
            <Link to="/gps">
              <Button variant="outline" className="w-full h-20 flex-col gap-2" data-testid="quick-action-gps">
                <AlertCircle className="h-6 w-6" />
                <span>GPS Takip</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
