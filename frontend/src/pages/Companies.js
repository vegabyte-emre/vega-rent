import { API_URL } from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "../components/ui/card";
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
import { Building2, Plus, Search, RefreshCw, Loader2, Mail, Phone, FileText } from "lucide-react";
import { toast } from "sonner";


export function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    tax_number: "",
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/companies`);
      setCompanies(response.data);
    } catch (error) {
      toast.error("Firmalar yüklenirken hata oluştu");
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
      await axios.post(`${API_URL}/api/companies`, formData);
      toast.success("Firma başarıyla eklendi");
      setIsAddOpen(false);
      setFormData({
        name: "",
        code: "",
        address: "",
        phone: "",
        email: "",
        tax_number: "",
      });
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Firma eklenirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="companies-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Firmalar</h1>
          <p className="text-muted-foreground mt-1">Sisteme kayıtlı firmaları yönetin</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-accent text-white" data-testid="add-company-btn">
              <Plus className="h-4 w-4 mr-2" />
              Firma Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni Firma Ekle</DialogTitle>
              <DialogDescription>Sisteme yeni bir firma kaydı oluşturun</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firma Adı</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Firma Adı"
                    required
                    data-testid="company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Firma Kodu</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value.toLowerCase())}
                    placeholder="firma-kodu"
                    required
                    data-testid="company-code"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Adres"
                  data-testid="company-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-posta</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="info@firma.com"
                    data-testid="company-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="0212 123 4567"
                    data-testid="company-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Vergi Numarası</Label>
                <Input
                  value={formData.tax_number}
                  onChange={(e) => handleChange("tax_number", e.target.value)}
                  placeholder="1234567890"
                  data-testid="company-tax"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-company-btn">
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
                placeholder="Firma adı veya kodu ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="company-search"
              />
            </div>
            <Button variant="outline" onClick={fetchCompanies} data-testid="refresh-companies">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p>Firma bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Vergi No</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Kayıt Tarihi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <p className="text-xs text-muted-foreground">{company.address}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{company.code}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {company.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {company.email}
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {company.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.tax_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            {company.tax_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={company.is_active 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }>
                          {company.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(company.created_at)}
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
