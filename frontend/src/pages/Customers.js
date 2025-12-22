import getApiUrl from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { formatDateTime } from "../lib/utils";
import { Users, Plus, Search, RefreshCw, Loader2, Mail, Phone, CreditCard, MessageCircle } from "lucide-react";
import { toast } from "sonner";

// WhatsApp link helper
const getWhatsAppLink = (phone, message = "") => {
  let cleanPhone = phone.replace(/\s/g, "").replace(/-/g, "").replace(/\(/g, "").replace(/\)/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "90" + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith("90") && !cleanPhone.startsWith("+90")) {
    cleanPhone = "90" + cleanPhone;
  }
  cleanPhone = cleanPhone.replace("+", "");
  const url = `https://wa.me/${cleanPhone}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
};


export function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tc_no: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    license_no: "",
    license_class: "B",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${getApiUrl()}/api/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error("Müşteriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${getApiUrl()}/api/customers`, formData);
      toast.success("Müşteri başarıyla eklendi");
      setIsAddOpen(false);
      setFormData({
        tc_no: "",
        full_name: "",
        email: "",
        phone: "",
        address: "",
        license_no: "",
        license_class: "B",
      });
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Müşteri eklenirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tc_no.includes(searchTerm) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="customers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Müşteriler</h1>
          <p className="text-muted-foreground mt-1">Müşteri kayıtlarınızı yönetin</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-accent text-white" data-testid="add-customer-btn">
              <Plus className="h-4 w-4 mr-2" />
              Müşteri Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
              <DialogDescription>Yeni bir müşteri kaydı oluşturun</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>TC Kimlik No</Label>
                <Input
                  value={formData.tc_no}
                  onChange={(e) => handleChange("tc_no", e.target.value)}
                  placeholder="12345678901"
                  maxLength={11}
                  required
                  data-testid="customer-tc"
                />
              </div>
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  placeholder="Ad Soyad"
                  required
                  data-testid="customer-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-posta</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    data-testid="customer-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="0555 123 4567"
                    required
                    data-testid="customer-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Adres"
                  data-testid="customer-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ehliyet No</Label>
                  <Input
                    value={formData.license_no}
                    onChange={(e) => handleChange("license_no", e.target.value)}
                    placeholder="Ehliyet No"
                    data-testid="customer-license"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ehliyet Sınıfı</Label>
                  <Input
                    value={formData.license_class}
                    onChange={(e) => handleChange("license_class", e.target.value)}
                    placeholder="B"
                    data-testid="customer-license-class"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-customer-btn">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Kaydet
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ad, TC, e-posta veya telefon ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="customer-search"
              />
            </div>
            <Button variant="outline" onClick={fetchCustomers} data-testid="refresh-customers">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>Müşteri bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>TC Kimlik No</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Ehliyet</TableHead>
                    <TableHead>Kayıt Tarihi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.full_name}</p>
                            <p className="text-xs text-muted-foreground">{customer.address}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{customer.tc_no}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                            {customer.phone && (
                              <a
                                href={getWhatsAppLink(customer.phone, `Merhaba ${customer.full_name}, `)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-green-600 hover:text-green-700"
                                title="WhatsApp ile mesaj gonder"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.license_no && (
                          <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            {customer.license_no} ({customer.license_class})
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(customer.created_at)}
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
