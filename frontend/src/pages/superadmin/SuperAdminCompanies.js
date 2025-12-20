import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { formatDateTime } from "../../lib/utils";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Eye,
  Car,
  Users,
  Globe,
  ExternalLink,
  Rocket,
  Server,
  Loader2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  provisioning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  deleted: "bg-slate-500/20 text-slate-400 border-slate-500/30"
};

const statusLabels = {
  pending: "Bekliyor",
  provisioning: "Kuruluyor",
  active: "Aktif",
  suspended: "Askıda",
  deleted: "Silindi"
};

const planColors = {
  free: "bg-slate-500/20 text-slate-300",
  starter: "bg-blue-500/20 text-blue-300",
  professional: "bg-purple-500/20 text-purple-300",
  enterprise: "bg-amber-500/20 text-amber-300"
};

export function SuperAdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/superadmin/companies`);
      setCompanies(response.data);
    } catch (error) {
      toast.error("Firmalar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (companyId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/superadmin/companies/${companyId}/status?status=${newStatus}`);
      toast.success("Firma durumu güncellendi");
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Durum güncellenirken hata oluştu");
    }
  };

  const handleDelete = async (companyId, companyName) => {
    if (!window.confirm(`"${companyName}" firmasını silmek istediğinize emin misiniz?\n\nBu işlem:\n- Portainer stack'ini silecek\n- Tüm araçları silecek\n- Tüm müşterileri silecek\n- Tüm rezervasyonları silecek\n- Firma kaydını silecek\n\nBu işlem GERİ ALINAMAZ!`)) return;
    try {
      toast.loading("Firma siliniyor...", { id: "delete" });
      const response = await axios.delete(`${API_URL}/api/superadmin/companies/${companyId}`);
      toast.success(
        <div>
          <p className="font-medium">{response.data.message}</p>
          <p className="text-xs mt-1">Silinen: {response.data.deleted_resources?.join(', ')}</p>
          {response.data.errors && <p className="text-xs text-red-400 mt-1">Hatalar: {response.data.errors.join(', ')}</p>}
        </div>,
        { id: "delete", duration: 5000 }
      );
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Firma silinirken hata oluştu", { id: "delete" });
    }
  };

  const handleProvision = async (companyId, companyName) => {
    if (!window.confirm(`"${companyName}" firmasını Portainer'a deploy etmek istediğinize emin misiniz?`)) return;
    try {
      toast.loading("Firma deploy ediliyor...", { id: "provision" });
      const response = await axios.post(`${API_URL}/api/superadmin/companies/${companyId}/provision`);
      toast.success(
        <div>
          <p className="font-medium">Firma başarıyla deploy edildi!</p>
          <p className="text-xs mt-1">MongoDB Port: {response.data.ports?.mongodb}</p>
        </div>,
        { id: "provision", duration: 5000 }
      );
      
      // Otomatik olarak kod deploy et
      toast.loading("Frontend ve Backend yükleniyor...", { id: "deploy-code" });
      try {
        const deployResponse = await axios.post(`${API_URL}/api/superadmin/companies/${companyId}/deploy-code`);
        if (deployResponse.data.success) {
          toast.success(
            <div>
              <p className="font-medium">Kod başarıyla yüklendi!</p>
              <p className="text-xs mt-1">Login: {deployResponse.data.results?.database?.admin_email}</p>
            </div>,
            { id: "deploy-code", duration: 8000 }
          );
        } else {
          toast.error("Kod yüklenemedi: " + deployResponse.data.error, { id: "deploy-code" });
        }
      } catch (deployError) {
        toast.error("Kod yükleme hatası: " + (deployError.response?.data?.detail || deployError.message), { id: "deploy-code" });
      }
      
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Deploy işlemi başarısız", { id: "provision" });
    }
  };

  const handleDeployCode = async (companyId, companyName) => {
    if (!window.confirm(`"${companyName}" firmasına Frontend ve Backend kodunu yüklemek istediğinize emin misiniz?`)) return;
    try {
      toast.loading("Kod yükleniyor (2-3 dakika sürebilir)...", { id: "deploy-code" });
      const response = await axios.post(`${API_URL}/api/superadmin/companies/${companyId}/deploy-code`);
      if (response.data.success) {
        toast.success(
          <div>
            <p className="font-medium">Kod başarıyla yüklendi!</p>
            <p className="text-xs mt-1">Admin: {response.data.results?.database?.admin_email}</p>
            <p className="text-xs">Şifre: {response.data.results?.database?.admin_password}</p>
          </div>,
          { id: "deploy-code", duration: 10000 }
        );
      } else {
        toast.error("Kod yüklenemedi: " + response.data.error, { id: "deploy-code" });
      }
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Kod yükleme başarısız", { id: "deploy-code" });
    }
  };

  const handleDeprovision = async (companyId, companyName) => {
    if (!window.confirm(`"${companyName}" firmasının Portainer stack'ini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;
    try {
      toast.loading("Stack kaldırılıyor...", { id: "deprovision" });
      await axios.delete(`${API_URL}/api/superadmin/companies/${companyId}/provision`);
      toast.success("Stack başarıyla kaldırıldı", { id: "deprovision" });
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Stack kaldırma işlemi başarısız", { id: "deprovision" });
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subdomain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="superadmin-companies">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Firma Yönetimi</h1>
          <p className="text-slate-400 mt-1">Rent a car firmalarını ekleyin ve yönetin</p>
        </div>
        <Button
          onClick={() => navigate("/superadmin/companies/new")}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          data-testid="add-company-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Firma Ekle
        </Button>
      </div>

      {/* Search & Filter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Firma adı, kodu veya subdomain ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                data-testid="company-search"
              />
            </div>
            <Button variant="outline" onClick={fetchCompanies} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p>Henüz firma bulunmuyor</p>
              <Button
                onClick={() => navigate("/superadmin/companies/new")}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
              >
                İlk Firmayı Ekle
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">Firma</TableHead>
                    <TableHead className="text-slate-300">Domain</TableHead>
                    <TableHead className="text-slate-300">Plan</TableHead>
                    <TableHead className="text-slate-300">İstatistikler</TableHead>
                    <TableHead className="text-slate-300">Durum</TableHead>
                    <TableHead className="text-slate-300">Oluşturulma</TableHead>
                    <TableHead className="text-slate-300 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id} className="border-slate-700 hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{company.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{company.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {company.portainer_stack_id ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm text-green-400">
                                <Server className="h-3 w-3" />
                                Stack #{company.portainer_stack_id}
                              </div>
                              {company.ports && (
                                <div className="text-xs text-slate-400">
                                  MongoDB: {company.ports.mongodb}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-sm text-yellow-400">
                              <XCircle className="h-3 w-3" />
                              Deploy edilmedi
                            </div>
                          )}
                          {company.subdomain && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Globe className="h-3 w-3" />
                              {company.subdomain}.rentafleet.com
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={planColors[company.subscription_plan] || planColors.free}>
                          {company.subscription_plan?.charAt(0).toUpperCase() + company.subscription_plan?.slice(1) || "Free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Car className="h-3 w-3" />
                            <span>{company.vehicle_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Users className="h-3 w-3" />
                            <span>{company.customer_count || 0}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[company.status] || statusColors.pending}>
                          {statusLabels[company.status] || "Bilinmiyor"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDateTime(company.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem
                              className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                              onClick={() => navigate(`/superadmin/companies/${company.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Detaylar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                              onClick={() => navigate(`/superadmin/companies/${company.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            {company.status === "active" ? (
                              <DropdownMenuItem
                                className="text-yellow-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleStatusChange(company.id, "suspended")}
                              >
                                <PowerOff className="h-4 w-4 mr-2" />
                                Askıya Al
                              </DropdownMenuItem>
                            ) : company.status === "suspended" ? (
                              <DropdownMenuItem
                                className="text-green-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleStatusChange(company.id, "active")}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                Aktifleştir
                              </DropdownMenuItem>
                            ) : company.status === "pending" ? (
                              <DropdownMenuItem
                                className="text-green-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleStatusChange(company.id, "active")}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                Onayla & Aktifleştir
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator className="bg-slate-700" />
                            {/* Portainer Actions */}
                            {!company.portainer_stack_id ? (
                              <DropdownMenuItem
                                className="text-cyan-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleProvision(company.id, company.name)}
                              >
                                <Rocket className="h-4 w-4 mr-2" />
                                Portainer'a Deploy Et
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-orange-400 hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleDeprovision(company.id, company.name)}
                              >
                                <Server className="h-4 w-4 mr-2" />
                                Stack'i Kaldır
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem
                              className="text-red-400 hover:bg-slate-700 cursor-pointer"
                              onClick={() => handleDelete(company.id, company.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Tamamen Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
