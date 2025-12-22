import getApiUrl from '../../config/api';
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Car, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";


export function CustomerRegister() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    tc_no: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First register as user
      const userResponse = await axios.post(`${getApiUrl()}/api/auth/register`, {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        role: "musteri",
      });

      const { access_token, user } = userResponse.data;
      
      // Then create customer record
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      await axios.post(`${getApiUrl()}/api/customers`, {
        tc_no: formData.tc_no,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
      });

      localStorage.setItem("customer_token", access_token);
      localStorage.setItem("customer_user", JSON.stringify(user));

      toast.success("Kayıt başarılı!");
      navigate("/hesabim");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl">FleetEase</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md px-4">
          <Card className="shadow-xl">
            <CardHeader className="space-y-1 text-center">
              <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4">
                <Car className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Hesap Oluştur</CardTitle>
              <CardDescription>
                Hemen üye olun ve araç kiralamaya başlayın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Ad Soyad</Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="Ad Soyad"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    required
                    data-testid="register-fullname"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tc_no">TC Kimlik No</Label>
                  <Input
                    id="tc_no"
                    type="text"
                    placeholder="12345678901"
                    value={formData.tc_no}
                    onChange={(e) => handleChange("tc_no", e.target.value)}
                    maxLength={11}
                    required
                    data-testid="register-tc"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    data-testid="register-email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0555 123 4567"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    required
                    data-testid="register-phone"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Şifre</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                      data-testid="register-password"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gradient-accent text-white font-medium"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kayıt yapılıyor...
                    </>
                  ) : (
                    "Kayıt Ol"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Zaten hesabınız var mı? </span>
                <Link to="/musteri/giris" className="text-accent hover:underline font-medium">
                  Giriş Yapın
                </Link>
              </div>

              <p className="mt-4 text-xs text-center text-muted-foreground">
                Kayıt olarak{" "}
                <Link to="/kullanim-kosullari" className="underline">Kullanım Koşulları</Link>
                {" "}ve{" "}
                <Link to="/gizlilik-politikasi" className="underline">Gizlilik Politikası</Link>
                'nı kabul etmiş olursunuz.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
