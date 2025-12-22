import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { MapPin, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from "../config";

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
    working_hours: "",
    is_pickup: true,
    is_dropoff: true,
    is_active: true
  });

  const API_URL = getApiUrl();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/locations/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url = editingLocation 
        ? `${API_URL}/api/locations/${editingLocation.id}`
        : `${API_URL}/api/locations`;
      
      const response = await fetch(url, {
        method: editingLocation ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingLocation ? "Lokasyon güncellendi" : "Lokasyon eklendi");
        setDialogOpen(false);
        resetForm();
        fetchLocations();
      }
    } catch (error) {
      toast.error("İşlem başarısız");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu lokasyonu silmek istediğinize emin misiniz?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/locations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Lokasyon silindi");
        fetchLocations();
      }
    } catch (error) {
      toast.error("Silme başarısız");
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || "",
      city: location.city || "",
      address: location.address || "",
      phone: location.phone || "",
      working_hours: location.working_hours || "",
      is_pickup: location.is_pickup ?? true,
      is_dropoff: location.is_dropoff ?? true,
      is_active: location.is_active ?? true
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingLocation(null);
    setFormData({
      name: "",
      city: "",
      address: "",
      phone: "",
      working_hours: "",
      is_pickup: true,
      is_dropoff: true,
      is_active: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lokasyonlar</h1>
          <p className="text-muted-foreground">Alış ve teslim lokasyonlarını yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLocations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Lokasyon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingLocation ? "Lokasyon Düzenle" : "Yeni Lokasyon"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Lokasyon Adı *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Havalimanı Ofisi"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şehir *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Örn: Bitlis"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adres</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Tam adres"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0434 xxx xx xx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Çalışma Saatleri</Label>
                    <Input
                      value={formData.working_hours}
                      onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                      placeholder="09:00 - 18:00"
                    />
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Alış Noktası</Label>
                    <Switch
                      checked={formData.is_pickup}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_pickup: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Teslim Noktası</Label>
                    <Switch
                      checked={formData.is_dropoff}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_dropoff: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Aktif</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingLocation ? "Güncelle" : "Ekle"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Lokasyon Listesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz lokasyon eklenmemiş
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lokasyon</TableHead>
                  <TableHead>Şehir</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">{location.address}</div>
                      </div>
                    </TableCell>
                    <TableCell>{location.city}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {location.is_pickup && <Badge variant="outline">Alış</Badge>}
                        {location.is_dropoff && <Badge variant="outline">Teslim</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? "default" : "secondary"}>
                        {location.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
