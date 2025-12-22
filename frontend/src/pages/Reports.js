import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { formatCurrency } from "../lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Car,
  Users,
  Calendar,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";


export function Reports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error("Raporlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Mock data for charts
  const revenueData = [
    { name: "Oca", revenue: 45000 },
    { name: "Şub", revenue: 52000 },
    { name: "Mar", revenue: 48000 },
    { name: "Nis", revenue: 61000 },
    { name: "May", revenue: 55000 },
    { name: "Haz", revenue: 67000 },
  ];

  const reservationData = [
    { name: "Oca", completed: 45, cancelled: 5 },
    { name: "Şub", completed: 52, cancelled: 8 },
    { name: "Mar", completed: 48, cancelled: 3 },
    { name: "Nis", completed: 61, cancelled: 7 },
    { name: "May", completed: 55, cancelled: 4 },
    { name: "Haz", completed: 67, cancelled: 6 },
  ];

  const vehicleUtilization = [
    { name: "Ekonomi", value: 35, color: "#3B82F6" },
    { name: "Sedan", value: 40, color: "#10B981" },
    { name: "SUV", value: 15, color: "#F59E0B" },
    { name: "Lüks", value: 10, color: "#EF4444" },
  ];

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Raporlar</h1>
          <p className="text-muted-foreground mt-1">İş analitiği ve performans raporları</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="quarter">Bu Çeyrek</SelectItem>
              <SelectItem value="year">Bu Yıl</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="export-btn">
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Toplam Gelir</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Car className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stats?.total_vehicles || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Toplam Araç</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stats?.active_reservations || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Aktif Rezervasyon</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stats?.total_customers || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Toplam Müşteri</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Gelir Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `₺${value / 1000}K`} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: "#3B82F6", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Rezervasyon İstatistikleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reservationData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="completed" name="Tamamlanan" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="İptal" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Utilization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5" />
              Segment Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleUtilization}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {vehicleUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {vehicleUtilization.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}: %{item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performans Özeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Araç Kullanım Oranı</p>
                <p className="text-2xl font-bold mt-1">
                  {stats?.total_vehicles > 0
                    ? Math.round(((stats?.rented_vehicles || 0) / stats.total_vehicles) * 100)
                    : 0}
                  %
                </p>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${
                        stats?.total_vehicles > 0
                          ? ((stats?.rented_vehicles || 0) / stats.total_vehicles) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Müsait Araç</p>
                <p className="text-2xl font-bold mt-1">{stats?.available_vehicles || 0}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Toplam {stats?.total_vehicles || 0} araçtan
                </p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Bekleyen İade</p>
                <p className="text-2xl font-bold mt-1">{stats?.pending_returns || 0}</p>
                <p className="text-xs text-muted-foreground mt-2">Bugün teslim edilecek</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Servisteki Araç</p>
                <p className="text-2xl font-bold mt-1">{stats?.service_vehicles || 0}</p>
                <p className="text-xs text-muted-foreground mt-2">Bakım/onarım</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
