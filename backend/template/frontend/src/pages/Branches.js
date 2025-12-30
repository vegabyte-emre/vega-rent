import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  Car,
  Users,
  Loader2,
  Key
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export function Branches() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    working_hours: '09:00 - 18:00',
    latitude: '',
    longitude: '',
    is_pickup: true,
    is_dropoff: true,
    is_active: true,
    // Manager info
    manager_name: '',
    manager_email: '',
    manager_password: '',
    manager_phone: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [branchesRes, vehiclesRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/branches`, { headers }),
        axios.get(`${getApiUrl()}/api/vehicles`, { headers })
      ]);
      
      setBranches(branchesRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      district: '',
      phone: '',
      email: '',
      working_hours: '09:00 - 18:00',
      latitude: '',
      longitude: '',
      is_pickup: true,
      is_dropoff: true,
      is_active: true,
      manager_name: '',
      manager_email: '',
      manager_password: '',
      manager_phone: ''
    });
    setShowPassword(false);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.city) {
      toast.error('Şube adı ve şehir zorunludur');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Create branch
      const branchRes = await axios.post(`${getApiUrl()}/api/branches`, {
        name: formData.name,
        code: formData.code || formData.name.substring(0, 3).toUpperCase(),
        address: formData.address,
        city: formData.city,
        district: formData.district,
        phone: formData.phone,
        email: formData.email,
        working_hours: formData.working_hours,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        is_pickup: formData.is_pickup,
        is_dropoff: formData.is_dropoff,
        is_active: formData.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Create manager user if provided
      if (formData.manager_email && formData.manager_password) {
        await axios.post(`${getApiUrl()}/api/users`, {
          email: formData.manager_email,
          password: formData.manager_password,
          full_name: formData.manager_name || `${formData.name} Yetkilisi`,
          phone: formData.manager_phone,
          role: 'operasyon',
          branch_id: branchRes.data.id,
          is_active: true
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      toast.success('Şube oluşturuldu');
      setIsAddOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Şube oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (branch) => {
    setSelectedBranch(branch);
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      address: branch.address || '',
      city: branch.city || '',
      district: branch.district || '',
      phone: branch.phone || '',
      email: branch.email || '',
      working_hours: branch.working_hours || '09:00 - 18:00',
      latitude: branch.latitude?.toString() || '',
      longitude: branch.longitude?.toString() || '',
      is_pickup: branch.is_pickup !== false,
      is_dropoff: branch.is_dropoff !== false,
      is_active: branch.is_active !== false,
      manager_name: '',
      manager_email: '',
      manager_password: '',
      manager_phone: ''
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedBranch) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${getApiUrl()}/api/branches/${selectedBranch.id}`, {
        name: formData.name,
        code: formData.code,
        address: formData.address,
        city: formData.city,
        district: formData.district,
        phone: formData.phone,
        email: formData.email,
        working_hours: formData.working_hours,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        is_pickup: formData.is_pickup,
        is_dropoff: formData.is_dropoff,
        is_active: formData.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Şube güncellendi');
      setIsEditOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Şube güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Bu şubeyi silmek istediğinize emin misiniz?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${getApiUrl()}/api/branches/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Şube silindi');
      fetchData();
    } catch (error) {
      toast.error('Şube silinemedi');
    }
  };

  const handleViewDetail = (branch) => {
    setSelectedBranch(branch);
    setIsDetailOpen(true);
  };

  const getBranchVehicles = (branchId) => {
    return vehicles.filter(v => v.branch_id === branchId);
  };

  const filteredBranches = branches.filter(b =>
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter for user's branch if not admin
  const visibleBranches = user?.role === 'firma_admin' || !user?.branch_id
    ? filteredBranches
    : filteredBranches.filter(b => b.id === user.branch_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Şubeler</h1>
          <p className="text-muted-foreground mt-1">Alış ve teslim noktalarını yönetin</p>
        </div>
        {(user?.role === 'firma_admin' || !user?.branch_id) && (
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Şube
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Şube ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{visibleBranches.length}</p>
              <p className="text-xs text-muted-foreground">Toplam Şube</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Car className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{vehicles.length}</p>
              <p className="text-xs text-muted-foreground">Toplam Araç</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{visibleBranches.filter(b => b.is_pickup).length}</p>
              <p className="text-xs text-muted-foreground">Alış Noktası</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{visibleBranches.filter(b => b.is_dropoff).length}</p>
              <p className="text-xs text-muted-foreground">Teslim Noktası</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleBranches.map(branch => {
          const branchVehicles = getBranchVehicles(branch.id);
          return (
            <Card key={branch.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{branch.name}</CardTitle>
                    <CardDescription>{branch.city} {branch.district && `/ ${branch.district}`}</CardDescription>
                  </div>
                  <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                    {branch.is_active ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {branch.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.working_hours && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{branch.working_hours}</span>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  {branch.is_pickup && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Alış Noktası
                    </Badge>
                  )}
                  {branch.is_dropoff && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Teslim Noktası
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm border-t pt-3 mt-3">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{branchVehicles.length} araç</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewDetail(branch)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Detay
                  </Button>
                  {(user?.role === 'firma_admin' || !user?.branch_id) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(branch)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(branch.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {visibleBranches.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Henüz şube eklenmemiş</p>
          </CardContent>
        </Card>
      )}

      {/* Add Branch Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Şube Oluştur</DialogTitle>
            <DialogDescription>Yeni bir alış/teslim noktası ekleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Branch Info */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Şube Bilgileri
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Şube Adı *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Merkez Şube"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şube Kodu</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                    placeholder="MRK"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şehir *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="İstanbul"
                  />
                </div>
                <div className="space-y-2">
                  <Label>İlçe</Label>
                  <Input
                    value={formData.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    placeholder="Kadıköy"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Adres</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Tam adres"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="0212 555 55 55"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-posta</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="sube@firma.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Çalışma Saatleri</Label>
                  <Input
                    value={formData.working_hours}
                    onChange={(e) => handleChange('working_hours', e.target.value)}
                    placeholder="09:00 - 18:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Koordinatlar (Enlem, Boylam)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.latitude}
                      onChange={(e) => handleChange('latitude', e.target.value)}
                      placeholder="41.0082"
                    />
                    <Input
                      value={formData.longitude}
                      onChange={(e) => handleChange('longitude', e.target.value)}
                      placeholder="28.9784"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_pickup}
                    onChange={(e) => handleChange('is_pickup', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Alış Noktası</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_dropoff}
                    onChange={(e) => handleChange('is_dropoff', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Teslim Noktası</span>
                </label>
              </div>
            </div>

            {/* Manager Info */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Şube Yetkilisi (Opsiyonel)
              </h3>
              <p className="text-sm text-muted-foreground">
                Şube yetkilisi oluşturursanız, bu kişi sadece bu şubeye ait verileri görebilir ve operasyon app kullanabilir.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ad Soyad</Label>
                  <Input
                    value={formData.manager_name}
                    onChange={(e) => handleChange('manager_name', e.target.value)}
                    placeholder="Yetkili Adı"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.manager_phone}
                    onChange={(e) => handleChange('manager_phone', e.target.value)}
                    placeholder="0555 555 55 55"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-posta (Giriş için)</Label>
                  <Input
                    type="email"
                    value={formData.manager_email}
                    onChange={(e) => handleChange('manager_email', e.target.value)}
                    placeholder="yetkili@firma.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şifre</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.manager_password}
                      onChange={(e) => handleChange('manager_password', e.target.value)}
                      placeholder="Şifre"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>İptal</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Şube Düzenle</DialogTitle>
            <DialogDescription>Şube bilgilerini güncelleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Şube Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Şube Kodu</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Şehir *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>İlçe</Label>
                <Input
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Adres</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Çalışma Saatleri</Label>
                <Input
                  value={formData.working_hours}
                  onChange={(e) => handleChange('working_hours', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_pickup}
                  onChange={(e) => handleChange('is_pickup', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Alış Noktası</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_dropoff}
                  onChange={(e) => handleChange('is_dropoff', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Teslim Noktası</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Aktif</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>İptal</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedBranch?.name}</DialogTitle>
            <DialogDescription>{selectedBranch?.city} {selectedBranch?.district && `/ ${selectedBranch.district}`}</DialogDescription>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Adres</Label>
                  <p>{selectedBranch.address || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Telefon</Label>
                  <p>{selectedBranch.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">E-posta</Label>
                  <p>{selectedBranch.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Çalışma Saatleri</Label>
                  <p>{selectedBranch.working_hours || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Şube Araçları ({getBranchVehicles(selectedBranch.id).length})
                </h4>
                {getBranchVehicles(selectedBranch.id).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plaka</TableHead>
                        <TableHead>Araç</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getBranchVehicles(selectedBranch.id).slice(0, 5).map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.plate}</TableCell>
                          <TableCell>{v.brand} {v.model}</TableCell>
                          <TableCell>
                            <Badge variant={v.status === 'available' ? 'default' : 'secondary'}>
                              {v.status === 'available' ? 'Müsait' : v.status === 'rented' ? 'Kirada' : v.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm">Bu şubede henüz araç yok</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Branches;
