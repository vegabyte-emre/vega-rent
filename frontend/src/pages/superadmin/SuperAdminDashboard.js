import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Building2, Car, Users, Calendar, TrendingUp, Activity, Server, Globe } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/superadmin/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error("İstatistikler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Toplam Firma",
      value: stats?.total_companies || 0,
      icon: Building2,
      color: "from-purple-500 to-pink-500",
      description: "Kayıtlı rent a car firmaları"
    },
    {
      title: "Aktif Firma",
      value: stats?.active_companies || 0,
      icon: Activity,
      color: "from-green-500 to-emerald-500",
      description: "Şu an aktif olan firmalar"
    },
    {
      title: "Bekleyen Firma",
      value: stats?.pending_companies || 0,
      icon: Server,
      color: "from-yellow-500 to-orange-500",
      description: "Onay bekleyen başvurular"
    },
    {
      title: "Toplam Araç",
      value: stats?.total_vehicles || 0,
      icon: Car,
      color: "from-blue-500 to-cyan-500",
      description: "Platform genelinde araçlar"
    },
    {
      title: "Toplam Müşteri",
      value: stats?.total_customers || 0,
      icon: Users,
      color: "from-indigo-500 to-purple-500",
      description: "Kayıtlı müşteriler"
    },
    {
      title: "Toplam Rezervasyon",
      value: stats?.total_reservations || 0,
      icon: Calendar,
      color: "from-pink-500 to-rose-500",
      description: "Tüm rezervasyonlar"
    },
    {
      title: "Toplam Kullanıcı",
      value: stats?.total_users || 0,
      icon: Users,
      color: "from-teal-500 to-green-500",
      description: "Sistem kullanıcıları"
    },
    {
      title: "Platform Durumu",
      value: "Aktif",
      icon: Globe,
      color: "from-emerald-500 to-teal-500",
      description: "Tüm sistemler çalışıyor"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="superadmin-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Yönetimi</h1>
        <p className="text-slate-400 mt-1">Tüm rent a car firmalarını tek panelden yönetin</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            Hızlı İşlemler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/superadmin/companies/new"
              className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors group"
            >
              <Building2 className="h-8 w-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-white">Yeni Firma Ekle</h3>
              <p className="text-sm text-slate-400 mt-1">Platforma yeni rent a car firması ekle</p>
            </a>
            <a
              href="/superadmin/companies"
              className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-colors group"
            >
              <Server className="h-8 w-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-white">Firmaları Yönet</h3>
              <p className="text-sm text-slate-400 mt-1">Mevcut firmaları görüntüle ve düzenle</p>
            </a>
            <a
              href="/superadmin/settings"
              className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/40 transition-colors group"
            >
              <Globe className="h-8 w-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-white">Platform Ayarları</h3>
              <p className="text-sm text-slate-400 mt-1">Genel platform yapılandırması</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
