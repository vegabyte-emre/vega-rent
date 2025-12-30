import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
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
import { Checkbox } from "../components/ui/checkbox";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  UserCog,
  Building2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const ROLES = [
  { value: 'firma_admin', label: 'Firma Admin', description: 'Tüm yetkilere sahip', color: 'bg-red-100 text-red-800' },
  { value: 'operasyon', label: 'Operasyon', description: 'Araç ve rezervasyon yönetimi', color: 'bg-blue-100 text-blue-800' },
  { value: 'muhasebe', label: 'Muhasebe', description: 'Finans ve raporlar', color: 'bg-green-100 text-green-800' },
  { value: 'personel', label: 'Personel', description: 'Temel işlemler', color: 'bg-gray-100 text-gray-800' }
];

const PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'Ana sayfa görüntüleme' },
  { key: 'vehicles', label: 'Araçlar', description: 'Araç yönetimi' },
  { key: 'reservations', label: 'Rezervasyonlar', description: 'Rezervasyon yönetimi' },
  { key: 'customers', label: 'Müşteriler', description: 'Müşteri yönetimi' },
  { key: 'finance', label: 'Finans', description: 'Finans görüntüleme' },
  { key: 'reports', label: 'Raporlar', description: 'Rapor görüntüleme' },
  { key: 'settings', label: 'Ayarlar', description: 'Sistem ayarları' },
  { key: 'users', label: 'Kullanıcılar', description: 'Kullanıcı yönetimi' },
  { key: 'branches', label: 'Şubeler', description: 'Şube yönetimi' }
];

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'personel',
    branch_id: '',
    permissions: [],
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [usersRes, branchesRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/users`, { headers }),
        axios.get(`${getApiUrl()}/api/branches`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      setUsers(usersRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (error) {
      toast.error('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role: 'personel',
      branch_id: '',
      permissions: [],
      is_active: true
    });
    setShowPassword(false);
  };

  const handleAdd = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${getApiUrl()}/api/users`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı oluşturuldu');
      setIsAddOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kullanıcı oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'personel',
      branch_id: user.branch_id || '',
      permissions: user.permissions || [],
      is_active: user.is_active !== false
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }
      
      await axios.put(`${getApiUrl()}/api/users/${selectedUser.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı güncellendi');
      setIsEditOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kullanıcı güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${getApiUrl()}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı silindi');
      fetchData();
    } catch (error) {
      toast.error('Kullanıcı silinemedi');
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${getApiUrl()}/api/users/${user.id}`, {
        is_active: !user.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(user.is_active ? 'Kullanıcı devre dışı bırakıldı' : 'Kullanıcı aktif edildi');
      fetchData();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const getRoleBadge = (role) => {
    const roleInfo = ROLES.find(r => r.value === role) || ROLES[3];
    return (
      <Badge className={roleInfo.color}>
        {roleInfo.label}
      </Badge>
    );
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Kullanıcı Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Panel ve mobil uygulama kullanıcılarını yönetin</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {ROLES.map(role => (
            <Badge key={role.value} variant="outline" className="text-xs">
              {role.label}: {users.filter(u => u.role === role.value).length}
            </Badge>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Şube</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        {user.phone && (
                          <p className="text-xs text-muted-foreground">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.branch_id ? (
                      branches.find(b => b.id === user.branch_id)?.name || '-'
                    ) : (
                      <span className="text-muted-foreground">Merkez</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.is_active !== false ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleUserStatus(user)}
                    >
                      {user.is_active !== false ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        disabled={user.id === currentUser?.id || user.role === 'firma_admin'}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı</DialogTitle>
            <DialogDescription>Panel ve mobil uygulama için yeni kullanıcı oluşturun</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Ad Soyad *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="ornek@firma.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="0555 555 55 55"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Şifre *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
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
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <span>{role.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Şube</Label>
                <Select value={formData.branch_id || 'none'} onValueChange={(v) => handleChange('branch_id', v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Merkez" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Merkez (Tüm Şubeler)</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label>Özel İzinler</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map(perm => (
                  <div key={perm.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${perm.key}`}
                      checked={formData.permissions.includes(perm.key)}
                      onCheckedChange={(checked) => handlePermissionChange(perm.key, checked)}
                    />
                    <label htmlFor={`perm-${perm.key}`} className="text-sm cursor-pointer">
                      {perm.label}
                    </label>
                  </div>
                ))}
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

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>Kullanıcı bilgilerini güncelleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Ad Soyad *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="ornek@firma.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="0555 555 55 55"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Yeni Şifre (boş bırakılırsa değişmez)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Yeni şifre"
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
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Şube</Label>
                <Select value={formData.branch_id || 'none'} onValueChange={(v) => handleChange('branch_id', v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Merkez" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Merkez (Tüm Şubeler)</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label>Özel İzinler</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map(perm => (
                  <div key={perm.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-perm-${perm.key}`}
                      checked={formData.permissions.includes(perm.key)}
                      onCheckedChange={(checked) => handlePermissionChange(perm.key, checked)}
                    />
                    <label htmlFor={`edit-perm-${perm.key}`} className="text-sm cursor-pointer">
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
              <label htmlFor="is_active" className="text-sm cursor-pointer">
                Kullanıcı aktif
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
    </div>
  );
}

export default UserManagement;
