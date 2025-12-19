import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Building2, ArrowLeft, Loader2, User, Globe, CreditCard, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function NewCompany() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Company Info
    name: "",
    code: "",
    subdomain: "",
    domain: "",
    address: "",
    phone: "",
    email: "",
    tax_number: "",
    // Admin Info
    admin_email: "",
    admin_password: "",
    admin_full_name: "",
    // Subscription
    subscription_plan: "free"
  });

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate subdomain from code
      if (field === "code") {
        updated.subdomain = value.toLowerCase().replace(/[^a-z0-9]/g, "");
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Firma oluştur
      const response = await axios.post(`${API_URL}/api/superadmin/companies`, formData);
      const companyId = response.data.id;
      toast.success("Firma oluşturuldu, deploy başlatılıyor...");
      
      // 2. Domain varsa otomatik provision başlat
      if (formData.domain) {
        try {
          await axios.post(`${API_URL}/api/superadmin/companies/${companyId}/provision`);
          toast.success("Firma deploy edildi! Kurulum ~2 dakika sürecek.", { duration: 5000 });
        } catch (provisionError) {
          toast.error("Deploy başlatılamadı: " + (provisionError.response?.data?.detail || "Hata"));
        }
      }
      
      navigate("/superadmin/companies");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Firma oluşturulurken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, title: "Firma Bilgileri", icon: Building2 },
    { number: 2, title: "Domain Ayarları", icon: Globe },
    { number: 3, title: "Admin Hesabı", icon: User },
    { number: 4, title: "Abonelik", icon: CreditCard }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="new-company-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/superadmin/companies")}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Yeni Firma Ekle</h1>
          <p className="text-slate-400 text-sm">Platforma yeni bir rent a car firması ekleyin</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((s, idx) => (
          <React.Fragment key={s.number}>
            <div
              className={`flex items-center gap-2 cursor-pointer ${step >= s.number ? "text-purple-400" : "text-slate-500"}`}
              onClick={() => setStep(s.number)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  step >= s.number
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-slate-600 bg-slate-800/50"
                }`}
              >
                {step > s.number ? (
                  <CheckCircle className="h-5 w-5 text-purple-400" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium">{s.title}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${step > s.number ? "bg-purple-500" : "bg-slate-700"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Step 1: Company Info */}
        {step === 1 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-400" />
                Firma Bilgileri
              </CardTitle>
              <CardDescription className="text-slate-400">
                Rent a car firmasının temel bilgilerini girin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Firma Adı *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="ABC Rent A Car"
                    required
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Firma Kodu *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="abc-rentacar"
                    required
                    className="bg-slate-900/50 border-slate-600 text-white font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Adres</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="İstanbul, Türkiye"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">E-posta</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="info@abcrentacar.com"
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Telefon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="0212 123 4567"
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Vergi Numarası</Label>
                <Input
                  value={formData.tax_number}
                  onChange={(e) => handleChange("tax_number", e.target.value)}
                  placeholder="1234567890"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Devam
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Domain Settings */}
        {step === 2 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-400" />
                Domain Ayarları
              </CardTitle>
              <CardDescription className="text-slate-400">
                Firmanın web adresi yapılandırması (en az birini doldurun)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Custom Domain - Primary Option */}
              <div className="space-y-2 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <Label className="text-purple-300 font-medium">Özel Domain (Önerilen)</Label>
                <Input
                  value={formData.domain}
                  onChange={(e) => handleChange("domain", e.target.value.toLowerCase().replace(/^www\./, ""))}
                  placeholder="bitlisarackiralama.com"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-400">Firmanın kendi domain adresi. DNS ayarları yapılmalıdır.</p>
                {formData.domain && (
                  <div className="mt-3 p-3 bg-slate-900/50 rounded border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">Gerekli DNS Kayıtları (Metunic/Cloudflare):</p>
                    <ul className="text-xs text-slate-300 space-y-1 font-mono">
                      <li>A @ → 72.61.158.147</li>
                      <li>A www → 72.61.158.147</li>
                      <li>A panel → 72.61.158.147</li>
                      <li>A api → 72.61.158.147</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Subdomain - Secondary Option */}
              <div className="space-y-2">
                <Label className="text-slate-300">Subdomain (Alternatif)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.subdomain}
                    onChange={(e) => handleChange("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    placeholder="bitlis"
                    className="bg-slate-900/50 border-slate-600 text-white font-mono max-w-[200px]"
                  />
                  <span className="text-slate-400">.rentafleet.com</span>
                </div>
                <p className="text-xs text-slate-500">Özel domain yoksa bu adres kullanılır</p>
              </div>

              {/* Preview */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h4 className="font-medium text-white mb-2">Oluşturulacak Adresler:</h4>
                {formData.domain ? (
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• Web Sitesi: <span className="text-green-400">https://{formData.domain}</span></li>
                    <li>• Admin Panel: <span className="text-green-400">https://panel.{formData.domain}</span></li>
                    <li>• API: <span className="text-green-400">https://api.{formData.domain}</span></li>
                  </ul>
                ) : formData.subdomain ? (
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• Web Sitesi: <span className="text-purple-400">{formData.subdomain}.rentafleet.com</span></li>
                    <li>• Admin Panel: <span className="text-purple-400">panel.{formData.subdomain}.rentafleet.com</span></li>
                    <li>• API: <span className="text-purple-400">api.{formData.subdomain}.rentafleet.com</span></li>
                  </ul>
                ) : (
                  <p className="text-sm text-yellow-400">⚠️ Domain veya subdomain giriniz</p>
                )}
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Geri
                </Button>
                <Button type="button" onClick={() => setStep(3)} className="bg-purple-600 hover:bg-purple-700">
                  Devam
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Admin Account */}
        {step === 3 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5 text-purple-400" />
                Admin Hesabı
              </CardTitle>
              <CardDescription className="text-slate-400">
                Firma yönetici hesabını oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Admin Adı Soyadı *</Label>
                <Input
                  value={formData.admin_full_name}
                  onChange={(e) => handleChange("admin_full_name", e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  required
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Admin E-posta *</Label>
                <Input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => handleChange("admin_email", e.target.value)}
                  placeholder="admin@abcrentacar.com"
                  required
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Admin Şifresi *</Label>
                <Input
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => handleChange("admin_password", e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-500">En az 6 karakter olmalı</p>
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Geri
                </Button>
                <Button type="button" onClick={() => setStep(4)} className="bg-purple-600 hover:bg-purple-700">
                  Devam
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Subscription */}
        {step === 4 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-400" />
                Abonelik Planı
              </CardTitle>
              <CardDescription className="text-slate-400">
                Firma için uygun planı seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Plan</Label>
                <Select value={formData.subscription_plan} onValueChange={(v) => handleChange("subscription_plan", v)}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="free" className="text-slate-300 hover:bg-slate-700">Free - Ücretsiz</SelectItem>
                    <SelectItem value="starter" className="text-slate-300 hover:bg-slate-700">Starter - Başlangıç</SelectItem>
                    <SelectItem value="professional" className="text-slate-300 hover:bg-slate-700">Professional - Profesyonel</SelectItem>
                    <SelectItem value="enterprise" className="text-slate-300 hover:bg-slate-700">Enterprise - Kurumsal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 mt-6">
                <h4 className="font-medium text-white mb-3">Firma Özeti</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-400">Firma Adı:</span>
                  <span className="text-white">{formData.name || "-"}</span>
                  <span className="text-slate-400">Domain:</span>
                  {formData.domain ? (
                    <span className="text-green-400">{formData.domain}</span>
                  ) : formData.subdomain ? (
                    <span className="text-purple-400">{formData.subdomain}.rentafleet.com</span>
                  ) : (
                    <span className="text-yellow-400">Belirtilmedi</span>
                  )}
                  <span className="text-slate-400">Admin:</span>
                  <span className="text-white">{formData.admin_email || "-"}</span>
                  <span className="text-slate-400">Plan:</span>
                  <span className="text-white capitalize">{formData.subscription_plan}</span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(3)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Geri
                </Button>
                <Button type="submit" disabled={saving} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Firmayı Oluştur
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
